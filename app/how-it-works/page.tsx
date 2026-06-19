import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works — QuickScanZ",
  description: "QuickScanZ takes under 30 seconds to set up. Add your product, upload the invoice, and you are protected.",
};

const steps = [
  { step: "01", title: "Add your product", desc: "Enter the product name, brand, purchase date, and warranty duration. Takes under 30 seconds.", icon: "📦" },
  { step: "02", title: "Upload your invoice", desc: "Photograph or upload your receipt or invoice. JPG, PNG, or PDF — we store it securely.", icon: "📄" },
  { step: "03", title: "We calculate everything", desc: "QuickScanZ automatically calculates the expiry date and monitors when it is getting close.", icon: "⏳" },
  { step: "04", title: "Find it when it matters", desc: "When something breaks, open QuickScanZ. See your warranty status, invoice, and support contacts instantly.", icon: "🔍" },
];

export default function HowItWorksPage() {
  console.log("BYPASS_SECRET=" + process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />
      <header className="relative z-10 max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ink-900 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="#fdfcf8"/>
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.6"/>
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.6"/>
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.3"/>
            </svg>
          </div>
          <span className="font-display text-base font-light text-ink-900">QuickScanZ</span>
        </Link>
        <Link href="/login" className="btn-primary text-xs px-4 py-2">Sign In</Link>
      </header>
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12 space-y-10 animate-fade-up">
        <div>
          <h1 className="font-display text-4xl font-light text-ink-900 mb-3">How it works</h1>
          <p className="text-base text-ink-400 leading-relaxed">From purchase to protection in under a minute.</p>
        </div>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.step} className="card p-5 flex items-start gap-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center text-xl">{s.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-sand-500 font-medium">{s.step}</span>
                  <h3 className="font-display text-lg font-light text-ink-900">{s.title}</h3>
                </div>
                <p className="text-sm text-ink-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 pt-4">
          <Link href="/login" className="btn-primary">Get Started Free</Link>
          <Link href="/about" className="btn-secondary">About us</Link>
        </div>
      </main>
    </div>
  );
}
