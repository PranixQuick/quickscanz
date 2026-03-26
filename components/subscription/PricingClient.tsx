"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createRazorpayRedirectUrl, type SubscriptionPlan } from "@/lib/actions/subscriptions";

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string;
  userEmail: string;
}

export default function PricingClient({ plans, currentPlanId, userEmail }: Props) {
  const [isPending, startTransition] = useTransition();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");

  const displayed = plans.filter((p) => p.id === "free" || p.interval === interval);

  async function handleUpgrade(plan: SubscriptionPlan) {
    if (plan.price_inr === 0) return;
    setProcessingPlanId(plan.id);
    startTransition(async () => {
      const result = await createRazorpayRedirectUrl(plan.id);
      if ("error" in result) {
        toast.error(result.error);
        setProcessingPlanId(null);
        return;
      }
      // Full-page redirect — works in Android TWA, iOS PWA, all browsers
      window.location.href = result.redirectUrl;
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Upgrade Your Plan</h1>
        <p className="text-sm text-ink-400 mt-1">Unlock unlimited products, smart tracking, and AI-powered insights</p>
      </div>

      <div className="card p-3 bg-cream-50 border-cream-200">
        <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-2 font-medium">Billing cycle</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setInterval("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              interval === "monthly" ? "bg-white text-ink-900 shadow-sm border border-cream-200" : "text-ink-400 hover:text-ink-600"
            }`}>
            Monthly
            <p className="text-[10px] font-normal mt-0.5 opacity-70">&#8377;149 / month</p>
          </button>
          <button onClick={() => setInterval("yearly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              interval === "yearly" ? "bg-ink-900 text-cream-100 shadow-sm" : "bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100"
            }`}>
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-sage-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap">
              Best value
            </span>
            Yearly
            <p className="text-[10px] font-normal mt-0.5 opacity-80">&#8377;999 / year &middot; save &#8377;789</p>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {displayed.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.price_inr === 0;
          const isProcessing = processingPlanId === plan.id;
          const isPro = !isFree;
          return (
            <div key={plan.id} className={`card p-5 ${isPro ? "border-sand-300 bg-gradient-to-br from-cream-50 to-sand-50" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-ink-900">{plan.name}</h2>
                    {isCurrent && <span className="text-[10px] bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-medium">Current</span>}
                    {isPro && !isCurrent && <span className="text-[10px] bg-sand-100 text-sand-700 px-2 py-0.5 rounded-full font-medium">Recommended</span>}
                  </div>
                  <p className="text-xs text-ink-400">{plan.description}</p>
                </div>
                <div className="text-right">
                  {isFree ? <p className="text-2xl font-light text-ink-900">&#8377;0</p> : (
                    <>
                      <p className="text-2xl font-light text-ink-900">&#8377;{plan.price_inr.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-ink-400">per {plan.interval === "yearly" ? "year" : "month"}</p>
                    </>
                  )}
                </div>
              </div>
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
              {isCurrent ? (
                <div className="w-full py-2.5 text-center text-sm text-ink-400 bg-cream-100 rounded-xl">&#10003; Your current plan</div>
              ) : isFree ? (
                <div className="w-full py-2.5 text-center text-xs text-ink-300">Free forever &middot; No credit card needed</div>
              ) : (
                <button onClick={() => handleUpgrade(plan)} disabled={isPending || !!processingPlanId}
                  className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-50">
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Redirecting to payment&hellip;
                    </span>
                  ) : `Upgrade to ${plan.name} \u2192`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-ink-300">Payments processed securely via Razorpay &middot; Cancel anytime &middot; GST applicable</p>
    </div>
  );
}
