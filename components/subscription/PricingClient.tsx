"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createRazorpayOrder, verifyRazorpayPayment, type SubscriptionPlan } from "@/lib/actions/subscriptions";

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string;
  userEmail: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingClient({ plans, currentPlanId, userEmail }: Props) {
  const [isPending, startTransition] = useTransition();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  const displayed = plans.filter(
    (p) => p.id === "free" || p.interval === interval
  );

  async function handleUpgrade(plan: SubscriptionPlan) {
    if (plan.price_inr === 0) return; // Already on free
    setProcessingPlanId(plan.id);

    startTransition(async () => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Payment system unavailable — try again");
        setProcessingPlanId(null);
        return;
      }

      const result = await createRazorpayOrder(plan.id);

      if ("error" in result) {
        toast.error(result.error);
        setProcessingPlanId(null);
        return;
      }

      const { orderId, amount, currency, key } = result;

      const options = {
        key,
        amount,
        currency,
        name: "QuickScanZ",
        description: `${plan.name} — ${plan.interval} plan`,
        order_id: orderId,
        prefill: { email: userEmail },
        theme: { color: "#1a1612" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verify = await verifyRazorpayPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            planId: plan.id,
          });

          if (verify.success) {
            toast.success("🎉 Welcome to QuickScanZ Pro!");
            // Reload to reflect new plan
            window.location.href = "/account";
          } else {
            toast.error(verify.error || "Payment verification failed");
          }
          setProcessingPlanId(null);
        },
        modal: {
          ondismiss: () => setProcessingPlanId(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed — please try again");
        setProcessingPlanId(null);
      });
      rzp.open();
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Upgrade Your Plan</h1>
        <p className="text-sm text-ink-400 mt-1">
          Unlock unlimited products, smart tracking, and AI-powered insights
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setInterval("monthly")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            interval === "monthly" ? "bg-ink-900 text-cream-100" : "bg-cream-100 text-ink-500"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("yearly")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            interval === "yearly" ? "bg-ink-900 text-cream-100" : "bg-cream-100 text-ink-500"
          }`}
        >
          Yearly
          <span className="ml-1.5 text-[10px] bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-semibold">
            Save 33%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {displayed.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.price_inr === 0;
          const isProcessing = processingPlanId === plan.id;
          const isPro = !isFree;

          return (
            <div
              key={plan.id}
              className={`card p-5 ${isPro ? "border-sand-300 bg-gradient-to-br from-cream-50 to-sand-50" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-ink-900">{plan.name}</h2>
                    {isCurrent && (
                      <span className="text-[10px] bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-medium">
                        Current
                      </span>
                    )}
                    {isPro && !isCurrent && (
                      <span className="text-[10px] bg-sand-100 text-sand-700 px-2 py-0.5 rounded-full font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-400">{plan.description}</p>
                </div>
                <div className="text-right">
                  {isFree ? (
                    <p className="text-2xl font-light text-ink-900">₹0</p>
                  ) : (
                    <>
                      <p className="text-2xl font-light text-ink-900">
                        ₹{plan.price_inr.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-ink-400">
                        per {plan.interval === "yearly" ? "year" : "month"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Features list */}
              <ul className="space-y-2 mb-4">
                {(plan.features as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-ink-600">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      <circle cx="7" cy="7" r="6" fill={isPro ? "#7aa67a" : "#e8dfd0"}/>
                      <path d="M4.5 7l2 2 3-3" stroke={isPro ? "#fff" : "#786e62"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full py-2.5 text-center text-sm text-ink-400 bg-cream-100 rounded-xl">
                  ✓ Your current plan
                </div>
              ) : isFree ? (
                <div className="w-full py-2.5 text-center text-xs text-ink-300">
                  Free forever · No credit card needed
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isPending || !!processingPlanId}
                  className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Opening payment…
                    </span>
                  ) : (
                    `Upgrade to ${plan.name} →`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-ink-300">
        Payments processed securely via Razorpay · Cancel anytime · GST applicable
      </p>
    </div>
  );
}
