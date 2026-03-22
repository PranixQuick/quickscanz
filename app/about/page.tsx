import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | QuickScanZ",
  description: "QuickScanZ is India's post-purchase intelligence platform. Track warranties, store invoices, and know exactly what to do when something breaks.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors mb-8">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="font-display text-4xl font-light text-ink-900 leading-tight mb-4">
            About QuickScanZ
          </p>
          <p className="text-ink-400 text-base leading-relaxed">
            Your post-purchase intelligence platform — built for the way Indians actually buy and own things.
          </p>
        </div>

        <div className="space-y-8 text-sm text-ink-600 leading-relaxed">
          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">The problem we solve</h2>
            <p>
              Every Indian household has a drawer of receipts, warranty cards, and invoices — most of which are lost, faded, or forgotten by the time something breaks. When a product fails, you spend hours searching for proof of purchase, calling brand helplines that put you on hold, and realising your warranty expired three months ago.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">What QuickScanZ does</h2>
            <p>
              QuickScanZ is your warranty wallet — a single place to track every product you own, store its invoice, and know exactly when its warranty expires. When something breaks, our AI Claim Assistant walks you through filing the warranty claim step by step. Our service centre locator finds the nearest authorised centre. Our home service finder books a technician.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">Built for India</h2>
            <p>
              We support 99+ products across 59 Indian brands — from Samsung and LG to Voltas, Bajaj, and Havells. Service centres across Mumbai, Delhi, Bangalore, Hyderabad, and Chennai. Support numbers for every major brand. All tuned for how India shops.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">Privacy first</h2>
            <p>
              Your data belongs to you. Invoices are stored securely in Supabase. We never sell data or show ads. QuickScanZ is and will always remain an ad-free product.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-cream-200 flex gap-4">
          <Link href="/products/add" className="btn-primary text-sm px-5 py-2.5">Get started free</Link>
          <Link href="/privacy-policy" className="btn-secondary text-sm px-5 py-2.5">Privacy policy</Link>
        </div>
      </div>
    </div>
  );
}
