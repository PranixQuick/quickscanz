import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About QuickScanZ",
  description: "QuickScanZ is a post-purchase intelligence platform built on a simple belief: users need clarity when something breaks.",
};

export default function AboutPage() {
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
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12 space-y-8 animate-fade-up">
        <div>
          <h1 className="font-display text-4xl font-light text-ink-900 mb-4">About QuickScanZ</h1>
          <p className="text-base text-ink-500 leading-relaxed">
            QuickScanZ was built around one simple truth: people don&apos;t lose warranty battles because they forget to register — they lose because they can&apos;t find the invoice when it matters.
          </p>
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl font-light text-ink-800">Our Philosophy</h2>
          <blockquote className="border-l-2 border-sand-400 pl-4 italic font-display text-lg text-ink-600">
            &ldquo;Users don&apos;t need warranty tracking. They need clarity when something breaks.&rdquo;
          </blockquote>
          <p className="text-sm text-ink-500 leading-relaxed">
            We built QuickScanZ to be that clarity — a calm, private, always-available record of everything you own.
          </p>
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl font-light text-ink-800">Privacy first</h2>
          <p className="text-sm text-ink-500 leading-relaxed">
            Your invoices and product data are yours. We don&apos;t sell data. We don&apos;t share it. QuickScanZ is a tool you can trust with your receipts.
          </p>
        </div>
        <div className="flex gap-4 pt-4">
          <Link href="/how-it-works" className="btn-secondary">How it works →</Link>
          <Link href="/login" className="btn-primary">Try QuickScanZ</Link>
        </div>
      </main>
    </div>
  );
}
