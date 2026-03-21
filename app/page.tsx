import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QuickScanZ — Never Lose a Warranty Again",
  description:
    "QuickScanZ is your post-purchase intelligence platform. Track warranties, store invoices, and always know what to do when something breaks.",
};

const features = [
  { icon: "🔐", title: "Warranty Wallet", desc: "All your warranties in one secure place. Never scramble for paperwork again." },
  { icon: "📄", title: "Invoice Locker", desc: "Upload and store your purchase invoices. Access them instantly, anytime." },
  { icon: "⏰", title: "Expiry Alerts", desc: "Know which warranties are expiring before it's too late to act." },
  { icon: "📞", title: "Support Info", desc: "Instant access to brand customer care contacts when you need them." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />

      <header className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8"/>
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8" opacity="0.25"/>
            </svg>
          </div>
          <span className="font-display text-lg font-light text-ink-900">QuickScanZ</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/about" className="btn-ghost text-xs hidden sm:inline-flex">About</Link>
          <Link href="/how-it-works" className="btn-ghost text-xs hidden sm:inline-flex">How it works</Link>
          <Link href="/login" className="btn-primary text-xs px-4 py-2">Sign In</Link>
        </nav>
      </header>

      <section className="relative z-10 max-w-2xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cream-200 rounded-full text-xs text-ink-500 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse-soft" />
          Beta · Limited Access
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-light text-ink-900 leading-[1.1] tracking-tight mb-6">
          Your Warranty<br />
          <span className="text-sand-500 italic">Wallet.</span>
        </h1>
        <p className="text-base text-ink-500 leading-relaxed max-w-md mx-auto mb-10">
          Users don&apos;t need warranty tracking. They need{" "}
          <strong className="text-ink-700 font-medium">clarity when something breaks</strong>.
          QuickScanZ gives you exactly that.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/login" className="btn-primary px-8 py-3.5 text-base w-full sm:w-auto">
            Get Started — It&apos;s Free
          </Link>
          <Link href="/how-it-works" className="btn-secondary px-6 py-3.5 text-sm w-full sm:w-auto">
            See how it works →
          </Link>
        </div>
        <p className="text-xs text-ink-300 mt-6">Your invoices are stored privately · No spam</p>
      </section>

      <section className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.title} className="card p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-display text-lg font-light text-ink-900 mb-1">{f.title}</h3>
              <p className="text-sm text-ink-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="card p-10">
          <h2 className="font-display text-3xl font-light text-ink-900 mb-3">Never lose a warranty again.</h2>
          <p className="text-sm text-ink-400 mb-6">Add your first product in under 30 seconds.</p>
          <Link href="/login" className="btn-primary px-8 py-3.5 text-base">Start for Free</Link>
        </div>
      </section>

      <footer className="relative z-10 max-w-5xl mx-auto px-6 py-8 border-t border-cream-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-ink-400">QuickScanZ</span>
          <nav className="flex items-center gap-4 text-xs text-ink-400">
            <Link href="/about" className="hover:text-ink-600 transition-colors">About</Link>
            <Link href="/how-it-works" className="hover:text-ink-600 transition-colors">How it works</Link>
            <Link href="/privacy-policy" className="hover:text-ink-600 transition-colors">Privacy</Link>
          </nav>
          <p className="text-xs text-ink-300">© 2025 QuickScanZ</p>
        </div>
      </footer>
    </div>
  );
}
