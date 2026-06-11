"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createRazorpayRedirectUrl, type SubscriptionPlan } from "@/lib/actions/subscriptions";

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string;
  userEmail: string;
}

// Feature comparison rows
const FEATURES = [
  { label: "Products tracked",         free: "8",         pro: "Unlimited" },
  { label: "AI Claim Assistant",        free: "3/month",   pro: "Unlimited" },
  { label: "Bill OCR scan",             free: "✓",         pro: "✓" },
  { label: "Barcode / QR scan",         free: "✓",         pro: "✓" },
  { label: "Expiry push notifications", free: "✓",         pro: "✓ Priority" },
  { label: "Family Vault sharing",      free: "—",         pro: "✓" },
  { label: "WhatsApp warranty card",    free: "—",         pro: "✓" },
  { label: "Service centre direct call",free: "✓",         pro: "✓" },
  { label: "Lifecycle & cost analytics",free: "Basic",     pro: "Full" },
  { label: "Energy monitor",            free: "—",         pro: "✓" },
  { label: "Extended warranty upsell",  free: "—",         pro: "✓" },
  { label: "Invoice storage",           free: "8 bills",   pro: "Unlimited" },
  { label: "Priority support",          free: "—",         pro: "✓" },
];

// FAQ items
const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel anytime from your account settings. You keep Pro access until your billing period ends.",
  },
  {
    q: "Will my data be deleted if I downgrade?",
    a: "Never. Your products and invoices are always yours. On downgrade, editing is paused on products beyond the free limit — they stay visible and searchable.",
  },
  {
    q: "Is GST included in the price?",
    a: "Prices shown are exclusive of GST (18%). The final charge will include applicable GST as per Indian tax law.",
  },
  {
    q: "How secure is my invoice data?",
    a: "All invoices are stored in a private Supabase Storage bucket. Only you can access them via temporary signed URLs. We never expose your files publicly.",
  },
  {
    q: "Does it work offline?",
    a: "QuickScanZ is a PWA. Install it on your phone and your product list loads instantly, even offline. New additions sync when you reconnect.",
  },
];

export default function PricingClient({ plans, currentPlanId, userEmail }: Props) {
  const [isPending, startTransition] = useTransition();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      window.location.href = result.redirectUrl;
    });
  }

  return (
    <div className="space-y-8 animate-fade-up pb-10">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Simple, honest pricing</h1>
        <p className="text-sm text-ink-400 mt-1 leading-relaxed">
          Start free. Upgrade when your household grows beyond 8 products.
        </p>
      </div>

      {/* Social proof strip */}
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-none">
        {[
          { stat: "12,000+", label: "families protected" },
          { stat: "₹4.2 Cr",  label: "in claims filed" },
          { stat: "4.8 ★",    label: "Play Store rating" },
        ].map((s) => (
          <div key={s.label} className="flex-shrink-0 text-center bg-cream-100 rounded-2xl px-5 py-3">
            <p className="text-base font-semibold text-ink-900">{s.stat}</p>
            <p className="text-[11px] text-ink-400 mt-0.5">{s.label}</p>
          </div>
        ))}
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
            <p className="text-[10px] font-normal mt-0.5 opacity-70">&#8377;149 / month</p>
          </button>
          <button onClick={() => setInterval("yearly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              interval === "yearly" ? "bg-ink-900 text-cream-100 shadow-sm" : "bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100"
            }`}>
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-sage-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap">
              Save 44%
            </span>
            Yearly
            <p className="text-[10px] font-normal mt-0.5 opacity-80">&#8377;999 / year &middot; save &#8377;789</p>
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
                  {isFree
                    ? <p className="text-2xl font-light text-ink-900">&#8377;0</p>
                    : (
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

      {/* Feature comparison table */}
      <div className="card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">What you get</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200">
              <th className="text-left px-4 py-2 text-xs text-ink-400 font-medium">Feature</th>
              <th className="text-center px-3 py-2 text-xs text-ink-500 font-medium">Free</th>
              <th className="text-center px-3 py-2 text-xs text-sand-700 font-semibold bg-sand-50">Pro</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-cream-50/50"}>
                <td className="px-4 py-2.5 text-xs text-ink-600">{row.label}</td>
                <td className="px-3 py-2.5 text-center text-xs text-ink-400">{row.free}</td>
                <td className="px-3 py-2.5 text-center text-xs font-medium text-ink-800 bg-sand-50/60">
                  {row.pro}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Testimonials */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">What users say</p>
        {[
          { name: "Arjun S., Hyderabad",  text: "Saved ₹18,000 on my Samsung TV claim — the AI Claim Assistant knew exactly what documents to submit." },
          { name: "Priya M., Bengaluru",   text: "My husband and I both have the app. Family Vault means neither of us forgets which products we own." },
          { name: "Ravi K., Chennai",      text: "Scanned 11 bills in one afternoon. Finally know when every appliance expires." },
        ].map((t) => (
          <div key={t.name} className="card p-4">
            <p className="text-xs text-ink-600 leading-relaxed mb-2">&ldquo;{t.text}&rdquo;</p>
            <p className="text-[11px] text-ink-400 font-medium">&mdash; {t.name}</p>
          </div>
        ))}
      </div>

      {/* FAQ accordion */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Questions</p>
        {FAQS.map((faq, i) => (
          <div key={i} className="card overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-sm font-medium text-ink-800 pr-4">{faq.q}</span>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={`flex-shrink-0 transition-transform duration-200 text-ink-400 ${
                  openFaq === i ? "rotate-180" : ""
                }`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {openFaq === i && (
              <div className="px-4 pb-4">
                <p className="text-xs text-ink-500 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-ink-300">
        Payments processed securely via Razorpay &middot; Cancel anytime &middot; GST applicable
      </p>
    </div>
  );
}
