import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QuickScanZ — Your Warranty Wallet",
  description:
    "Never lose a warranty or invoice again. Track warranties, store invoices, get AI-guided claims. Free forever.",
  openGraph: {
    title: "QuickScanZ — Your Warranty Wallet",
    description: "Never lose a warranty or invoice again.",
    url: "https://quickscanz.com",
    siteName: "QuickScanZ",
    images: [{ url: "/icons/icon-512.png" }],
    type: "website",
    locale: "en_IN",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Nav */}
      <nav className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between sticky top-0 z-40 bg-cream-50/95 backdrop-blur-sm border-b border-cream-200/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#fdfcf8"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#fdfcf8" opacity="0.25"/>
            </svg>
          </div>
          <span className="font-display text-base font-medium text-ink-900">QuickScanZ</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-ink-800 border border-ink-400 hover:border-ink-700 hover:bg-ink-50 hover:text-ink-900 transition-colors px-4 py-2 rounded-xl">Sign in</Link>
          <Link href="/signup" className="btn-primary text-sm px-4 py-2">Get started free</Link>
        </div>
      </nav>

      {/* main landmark required for accessibility (WCAG 2.4.1 — screen readers need this) */}
      <main>
        {/* Hero */}
        <section className="max-w-2xl mx-auto px-5 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-sage-50 border border-sage-200 text-sage-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
            Free for Indian households
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-light text-ink-900 leading-tight mb-4">
            Never lose a warranty again
          </h1>
          <p className="text-ink-400 text-base leading-relaxed max-w-md mx-auto mb-8">
            Track every product, store invoices, get warranty alerts, and know exactly what to do when something breaks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
              Start for free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/how-it-works" className="btn-secondary text-base px-8 py-3.5">How it works</Link>
          </div>
          <p className="text-xs text-ink-300 mt-4">No credit card · No app store · Works on any phone</p>
          <p className="text-xs text-ink-400 mt-3">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink-600 underline underline-offset-2 hover:text-ink-900 transition-colors">
              Sign in →
            </Link>
          </p>
        </section>

        {/* Stats — numbers match live DB: 53 service centres, 12 brands, 100+ catalog products */}
        <section className="max-w-2xl mx-auto px-5 mb-16" aria-label="Platform statistics">
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: "100+", label: "Products in catalog" },
              { n: "12+",  label: "Indian brands" },
              { n: "53+",  label: "Service centres" },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <p className="font-display text-2xl font-light text-ink-900">{s.n}</p>
                <p className="text-[11px] text-ink-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-2xl mx-auto px-5 mb-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="font-display text-2xl font-light text-ink-900 mb-6 text-center">Everything in one place</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "📦", title: "Track warranties", desc: "Add any product in 30 seconds. We calculate expiry automatically." },
              { icon: "🧾", title: "Store invoices", desc: "Upload PDF or photo. Stored securely. Find it when you need it." },
              { icon: "⏰", title: "Expiry alerts", desc: "Get notified 30 days and 7 days before warranties expire." },
              { icon: "🤖", title: "AI Claim Assistant", desc: "Step-by-step guidance to file warranty claims with any brand." },
              { icon: "📍", title: "Service centres", desc: "Find authorized service centres near you for 12+ brands including Samsung, LG, Sony, HP, Whirlpool, and more." },
              { icon: "🏠", title: "Smart devices", desc: "Track AC, TV, washing machine service schedules and energy use." },
            ].map((f) => (
              <div key={f.title} className="card p-4">
                <span className="text-2xl mb-2 block" role="img" aria-label={f.title}>{f.icon}</span>
                <p className="text-sm font-medium text-ink-900 mb-1">{f.title}</p>
                <p className="text-xs text-ink-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-2xl mx-auto px-5 mb-16" aria-label="Call to action">
          <div className="card p-8 bg-ink-900 border-ink-800 text-center">
            <h2 className="font-display text-2xl font-light text-cream-100 mb-2">Ready to get started?</h2>
            <p className="text-sm text-cream-400 mb-6">Free forever. No app store needed — works on any phone.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-cream-50 text-ink-900 text-sm font-medium px-8 py-3 rounded-xl hover:bg-white transition-colors">
              Create free account →
            </Link>
            <p className="text-xs text-cream-500 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-cream-300 underline underline-offset-2 hover:text-cream-100 transition-colors font-medium">
                Sign in →
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-5 py-8 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-ink-300">© 2026 QuickScanZ</p>
        <nav aria-label="Footer navigation">
          <div className="flex gap-5">
            {[
              { href: "/about", label: "About" },
              { href: "/how-it-works", label: "How it works" },
              { href: "/privacy-policy", label: "Privacy" },
              { href: "/login", label: "Sign in" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-ink-300 hover:text-ink-500 transition-colors">{l.label}</Link>
            ))}
          </div>
        </nav>
      </footer>
    </div>
  );
}
