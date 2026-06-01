import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — QuickScanZ",
  description: "QuickScanZ Terms of Service governing use of the app, subscriptions, and your account.",
};

const sections = [
  { title: "1. Acceptance of Terms", content: "By creating an account or using QuickScanZ, you agree to these Terms of Service. If you do not agree, please do not use the app. These terms apply to all users of QuickScanZ." },
  { title: "2. The Service", content: "QuickScanZ is a warranty and product-tracking application that lets you store product details, upload invoices, calculate warranty periods, receive reminders, and manage warranty claims. Features may evolve over time." },
  { title: "3. Your Account", content: "You are responsible for keeping your login credentials secure and for all activity under your account. You must provide a valid email address and use the app only for lawful purposes." },
  { title: "4. Subscriptions and Billing", content: "QuickScanZ offers a free plan and paid Pro plans (monthly and yearly). Paid subscriptions are processed securely via Razorpay. Prices are shown in INR and may include applicable GST. Subscriptions renew for the billing period selected unless cancelled; you can cancel at any time and retain access until the end of the current period." },
  { title: "5. Refunds and Cancellation", content: "You may cancel your subscription at any time from within the app. Cancellation stops future renewals. For refund requests, contact support@pranixailabs.com; refunds are handled case by case in line with applicable law." },
  { title: "6. Acceptable Use", content: "You agree not to misuse the service, attempt to disrupt it, access other users' data, or upload unlawful content. We may suspend accounts that violate these terms." },
  { title: "7. Your Content", content: "You retain ownership of the product details and invoices you upload. You grant QuickScanZ permission to store and process this content solely to provide the service, as described in our Privacy Policy." },
  { title: "8. Disclaimers", content: "QuickScanZ is provided on an \u201Cas is\u201D basis. Warranty dates and reminders are aids for your convenience and may not reflect a manufacturer's official terms. Always verify warranty details with the seller or manufacturer." },
  { title: "9. Limitation of Liability", content: "To the maximum extent permitted by law, Pranix AI Labs Pvt Ltd is not liable for indirect or consequential damages arising from use of the app. Our total liability is limited to the amount you paid for the service in the preceding twelve months." },
  { title: "10. Termination", content: "You may stop using QuickScanZ and delete your account at any time. We may suspend or terminate access for violations of these terms or to comply with legal requirements." },
  { title: "11. Changes to These Terms", content: "We may update these terms from time to time. Material changes will be reflected by updating the date below. Continued use after changes constitutes acceptance." },
  { title: "12. Governing Law", content: "These terms are governed by the laws of India. Any disputes are subject to the jurisdiction of the courts of Hyderabad, Telangana." },
  { title: "13. Contact", content: "Questions about these terms? Email support@pranixailabs.com. QuickScanZ is operated by Pranix AI Labs Pvt Ltd." },
];

export default function TermsPage() {
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
          <h1 className="font-display text-4xl font-light text-ink-900 mb-2">Terms of Service</h1>
          <p className="text-xs text-ink-400">Last updated: June 2026</p>
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
