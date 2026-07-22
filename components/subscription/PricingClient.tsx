"use client";

import { useState, useTransition, useEffect } from "react";
import toast from "react-hot-toast";
import { createRazorpayRedirectUrl, type SubscriptionPlan } from "@/lib/actions/subscriptions";

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string;
  userEmail: string;
}

// Feature comparison rows shown below the plan cards
const FEATURE_ROWS = [
  { label: "Products tracked",        free: "5",           pro: "Unlimited" },
  { label: "AI Claim Assistant",       free: "3 / month",   pro: "Unlimited" },
  { label: "WhatsApp warranty share",  free: "✕",           pro: "✓" },
  { label: "Invoice storage",          free: "5 files",     pro: "Unlimited" },
  { label: "Family Vault",             free: "✕",           pro: "✓" },
  { label: "Expiry push notifications",free: "✓",           pro: "✓" },
  { label: "Energy monitor",           free: "✕",           pro: "✓" },
  { label: "Lifecycle cost analysis",  free: "✕",           pro: "✓" },
  { label: "Priority support",         free: "✕",           pro: "✓" },
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel from Account → Subscription. Your Pro access continues until the end of the billing period.",
  },
  {
    q: "Is my payment data safe?",
    a: "All payments are processed by Razorpay (PCI DSS Level 1 certified). QuickScanZ never stores your card details.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your products and invoices are safe. If you exceed 5 products on the free plan, existing products stay visible but you can’t add new ones until you’re under the limit.",
  },
  {
    q: "Does GST apply?",
    a: "Yes, 18% GST is added at checkout as required by Indian tax law. The price shown is exclusive of GST.",
  },
  {
    q: "Is there a family plan?",
    a: "Pro plan includes Family Vault — share your warranty list with up to 5 family members. Each member needs their own account.",
  },
];

export default function PricingClient({ plans, currentPlanId, userEmail }: Props) {
  const [isPending, startTransition] = useTransition();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR">("INR");

  const monthlyPriceInr = plans.find((p) => p.id === "pro")?.price_inr ?? 149;
  const monthlyPriceUsd = plans.find((p) => p.id === "pro")?.price_usd ?? 1.99;
  const monthlyPriceEur = plans.find((p) => p.id === "pro")?.price_eur ?? 1.89;

  const yearlyPriceInr = plans.find((p) => p.id === "yearly")?.price_inr ?? 999;
  const yearlyPriceUsd = plans.find((p) => p.id === "yearly")?.price_usd ?? 11.99;
  const yearlyPriceEur = plans.find((p) => p.id === "yearly")?.price_eur ?? 10.99;

  const monthlyDisplay = currency === "INR" ? `₹${monthlyPriceInr}` : currency === "USD" ? `$${monthlyPriceUsd}` : `€${monthlyPriceEur}`;
  const yearlyDisplay = currency === "INR" ? `₹${yearlyPriceInr}` : currency === "USD" ? `$${yearlyPriceUsd}` : `€${yearlyPriceEur}`;

  const savingsInr = (monthlyPriceInr * 12) - yearlyPriceInr;
  const savingsUsd = Number(((monthlyPriceUsd * 12) - yearlyPriceUsd).toFixed(2));
  const savingsEur = Number(((monthlyPriceEur * 12) - yearlyPriceEur).toFixed(2));

  const savingsDisplay = currency === "INR" ? `₹${savingsInr}` : currency === "USD" ? `$${savingsUsd}` : `€${savingsEur}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const curr = params.get("currency");
      if (curr === "USD" || curr === "EUR" || curr === "INR") {
        setCurrency(curr);
      }
    }
  }, []);

  const displayed = plans.filter((p) => p.id === "free" || p.interval === interval);

  async function handleUpgrade(plan: SubscriptionPlan) {
    if (plan.price_inr === 0) return;
    setProcessingPlanId(plan.id);
    startTransition(async () => {
      const result = await createRazorpayRedirectUrl(plan.id, currency);
      if ("error" in result) {
        toast.error(result.error);
        setProcessingPlanId(null);
        return;
      }
      try {
        const url = new URL(result.redirectUrl);
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://api.razorpay.com/v1/checkout/embedded";

        url.searchParams.forEach((value, key) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } catch (e) {
        console.error("Failed to redirect to Razorpay:", e);
        toast.error("Failed to redirect to payment page. Please try again.");
        setProcessingPlanId(null);
      }
    });
  }

  return (
    <div className="space-y-8 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Upgrade Your Plan</h1>
        <p className="text-sm text-ink-400 mt-1">
          One app for every product you own. Never lose a warranty again.
        </p>
      </div>

      {/* Social proof row */}
      <div className="flex items-center gap-3 py-3 px-4 bg-sage-50 border border-sage-200 rounded-2xl">
        <div className="flex -space-x-2">
          {["R","P","A","S"].map((initial) => (
            <div key={initial} className="w-7 h-7 rounded-full bg-sand-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-ink-600">{initial}</div>
          ))}
        </div>
        <p className="text-xs text-sage-700 leading-snug">
          <span className="font-semibold">4,200+ families</span> across India track warranties with QuickScanZ
        </p>
      </div>

      {/* Currency Switcher */}
      <div className="card p-3 bg-cream-50 border-cream-200">
        <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-2 font-medium">Currency</p>
        <div className="flex items-center gap-2">
          {(["INR", "USD", "EUR"] as const).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currency === curr 
                  ? "bg-white text-ink-900 shadow-sm border border-cream-200 font-bold" 
                  : "text-ink-400 hover:text-ink-600"
              }`}
            >
              {curr === "INR" ? "INR (₹)" : curr === "USD" ? "USD ($)" : "EUR (€)"}
            </button>
          ))}
        </div>
      </div>

      {/* Billing toggle */}
      <div className="card p-3 bg-cream-50 border-cream-200">
        <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-2 font-medium">Billing cycle</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setInterval("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              interval === "monthly" ? "bg-white text-ink-900 shadow-sm border border-cream-200" : "text-ink-400 hover:text-ink-600"
            }`}>
            Monthly
            <p className="text-[10px] font-normal mt-0.5 opacity-70">
              {monthlyDisplay} / month
            </p>
          </button>
          <button onClick={() => setInterval("yearly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              interval === "yearly" ? "bg-ink-900 text-cream-100 shadow-sm" : "bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100"
            }`}>
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-sage-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap">
              Save {savingsDisplay}
            </span>
            Yearly
            <p className="text-[10px] font-normal mt-0.5 opacity-80">
              {yearlyDisplay} / year
            </p>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {displayed.map((plan) => {
          const isCurrent    = plan.id === currentPlanId;
          const isFree       = plan.price_inr === 0;
          const isProcessing = processingPlanId === plan.id;
          const isPro        = !isFree;
          return (
            <div key={plan.id} className={`card p-5 ${
              isPro ? "border-sand-300 bg-gradient-to-br from-cream-50 to-sand-50" : ""
            }`}>
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
                    {isFree ? (
                      <p className="text-2xl font-light text-ink-900">
                        {currency === "INR" ? "₹0" : currency === "USD" ? "$0" : "€0"}
                      </p>
                    ) : (
                      <>
                        <p className="text-2xl font-light text-ink-900">
                          {currency === "INR" 
                            ? `₹${plan.price_inr.toLocaleString("en-IN")}` 
                            : currency === "USD"
                              ? `$${(plan.price_usd ?? (plan.interval === "yearly" ? 11.99 : 1.99)).toLocaleString("en-US")}`
                              : `€${(plan.price_eur ?? (plan.interval === "yearly" ? 10.99 : 1.89)).toLocaleString("de-DE")}`
                          }
                        </p>
                        <p className="text-[10px] text-ink-400">per {plan.interval === "yearly" ? "year" : "month"} +GST</p>
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

      {/* Feature comparison table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-cream-50 border-b border-cream-200">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">What&apos;s included</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-100">
              <th className="text-left px-4 py-2.5 text-xs text-ink-400 font-medium w-1/2">Feature</th>
              <th className="text-center px-3 py-2.5 text-xs text-ink-400 font-medium">Free</th>
              <th className="text-center px-3 py-2.5 text-xs text-ink-900 font-semibold">Pro</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-cream-50/50"}>
                <td className="px-4 py-2.5 text-xs text-ink-700">{row.label}</td>
                <td className="text-center px-3 py-2.5 text-xs text-ink-400">{row.free}</td>
                <td className="text-center px-3 py-2.5 text-xs font-medium text-sage-700">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Testimonial */}
      <div className="card p-5 bg-sand-50 border-sand-200">
        <p className="text-sm text-ink-700 leading-relaxed italic">
          &ldquo;Mera fridge ka warranty expire ho gaya tha, tab pata nahi chala. Ab QuickScanZ se 30 din pehle hi notification aata hai.&rdquo;
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-7 h-7 rounded-full bg-sand-200 flex items-center justify-center text-xs font-bold text-ink-600">R</div>
          <div>
            <p className="text-xs font-medium text-ink-700">Ramesh K.</p>
            <p className="text-[10px] text-ink-400">Hyderabad &middot; Pro user since 2025</p>
          </div>
          <div className="ml-auto flex gap-0.5">
            {[...Array(5)].map((_,i) => (
              <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#c4956f"><path d="M6 1l1.4 2.8L10.5 4l-2.25 2.2.53 3.1L6 7.77 3.22 9.3l.53-3.1L1.5 4l3.1-.2L6 1z"/></svg>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider px-1 mb-3">FAQ</p>
        {FAQ.map((item, i) => (
          <div key={i} className="card overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-sm font-medium text-ink-800 pr-4">{item.q}</span>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={`flex-shrink-0 transition-transform duration-200 ${
                  openFaq === i ? "rotate-180" : ""
                }`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {openFaq === i && (
              <div className="px-4 pb-4">
                <p className="text-xs text-ink-500 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-ink-300 pb-4">
        Payments processed securely via Razorpay &middot; Cancel anytime &middot; 18% GST applicable
      </p>
    </div>
  );
}
