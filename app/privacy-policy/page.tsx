import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — QuickScanZ",
  description: "QuickScanZ privacy policy. Your data is private. We do not sell or share your information.",
};

const sections = [
  { title: "1. Information We Collect", content: "We collect: your email address (for login and account management); product details you enter (name, brand, model, serial number, purchase date, price, store, notes); invoice images or PDFs you choose to upload; a push notification token if you enable reminders; and your subscription plan and status. We do not collect your location, contacts, SMS, microphone audio, or browsing history. Payment card/UPI details are entered on Razorpay and are never stored by us." },
  { title: "2. How We Use Your Information", content: "Your data is used solely to provide QuickScanZ services — tracking warranties, sending expiry reminders, storing invoices, powering the AI Claim Assistant, processing subscriptions, and responding to support. We do not use your data for advertising or profiling, and we do not sell it." },
  { title: "3. Data Storage", content: "Product data is stored in a secure cloud database (Supabase). Invoices are stored in private cloud storage accessible only via short-lived links scoped to your account. All data is associated with your account only." },
  { title: "4. Data Sharing & Processors", content: "We do not sell, rent, or share your personal data. We use these processors to operate the app, each handling data only to provide their service: Supabase (database and invoice storage), Vercel (hosting), Resend (transactional email such as reminders and support), and Razorpay (payment processing — card/UPI details are handled directly by Razorpay)." },
  { title: "5. Data Retention", content: "We keep your data while your account is active. You can delete individual products and their invoices at any time. On account deletion, your products, invoices, claim history, and account data are permanently removed." },
  { title: "6. Data Deletion", content: "You can delete any product or invoice from within the app at any time. To request full account deletion, email privacy@quickscanz.com or support@pranixailabs.com from your registered address; deletion is permanent." },
  { title: "7. Your Rights", content: "You may request access to, correction of, export of, or deletion of your data, and you can disable notifications at any time. Contact privacy@quickscanz.com to exercise any of these rights." },
  { title: "8. Security", content: "All data is encrypted in transit using TLS. Invoices are stored in private buckets with access controlled to your account. Each user can access only their own records." },
  { title: "9. Children", content: "QuickScanZ is not directed at children under 13 and we do not knowingly collect their data." },
  { title: "10. Contact", content: "For any privacy concerns, email privacy@quickscanz.com or support@pranixailabs.com. Operated by Pranix AI Labs Pvt Ltd, Hyderabad, India. We respond within a reasonable period." },
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
