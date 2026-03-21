import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — QuickScanZ",
  description: "QuickScanZ privacy policy. Your data is private. We do not sell or share your information.",
};

const sections = [
  { title: "1. Information We Collect", content: "We collect only what you provide: your email address (for login), product details you enter, and invoice files you choose to upload. We do not read your emails, access your SMS, or track your usage beyond basic session management." },
  { title: "2. How We Use Your Information", content: "Your data is used solely to provide QuickScanZ services — displaying your products, calculating warranty dates, and letting you access your invoices. We do not use your data for advertising, profiling, or any purpose beyond operating the app." },
  { title: "3. Data Storage", content: "Product data is stored in a secure cloud database (Supabase). Invoices and receipts are stored in secure cloud storage. All data is associated with your account only." },
  { title: "4. Data Sharing", content: "We do not sell, rent, or share your personal data with any third party. We use infrastructure providers (Supabase, Vercel) bound by their own privacy commitments." },
  { title: "5. Data Deletion", content: "You can delete any product or invoice from within the app at any time. To request full account deletion, contact us at privacy@quickscanz.com." },
  { title: "6. Security", content: "All data is encrypted in transit using TLS. Invoices are stored in private buckets with access controlled to your account." },
  { title: "7. Contact", content: "For any privacy concerns, email us at privacy@quickscanz.com. We respond within 48 hours." },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
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
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8 animate-fade-up">
        <div>
          <h1 className="font-display text-4xl font-light text-ink-900 mb-2">Privacy Policy</h1>
          <p className="text-xs text-ink-400">Last updated: January 2025</p>
        </div>
        {sections.map(({ title, content }) => (
          <div key={title} className="card p-5">
            <h2 className="font-display text-lg font-light text-ink-800 mb-2">{title}</h2>
            <p className="text-sm text-ink-500 leading-relaxed">{content}</p>
          </div>
        ))}
        <div className="pt-4">
          <Link href="/" className="btn-secondary">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
