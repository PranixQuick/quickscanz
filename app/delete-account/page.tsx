import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Your Account & Data — QuickScanZ",
  description:
    "How to delete your QuickScanZ account and all associated data, including how to request deletion if you no longer have the app installed.",
};

const sections = [
  {
    title: "Delete from inside the app (fastest)",
    content:
      "Open QuickScanZ, go to Account, and tap \u201cDelete my account.\u201d Confirm when prompted. Your account and all associated data are deleted immediately and permanently. This is irreversible.",
  },
  {
    title: "If you no longer have the app installed",
    content:
      "Email support@pranixailabs.com (or privacy@quickscanz.com) from the email address or with the phone number registered to your QuickScanZ account, with the subject \u201cDelete my account.\u201d We will verify your identity and permanently delete your account and data within 7 days.",
  },
  {
    title: "What gets deleted",
    content:
      "Everything tied to your account is permanently removed: your profile (name, email, phone number), every product you added, all uploaded invoice and receipt images, your warranty and claim history, your notification settings, and your subscription record. None of this is recoverable after deletion.",
  },
  {
    title: "What is retained, and why",
    content:
      "We do not retain any of your personal data after deletion, except where we are legally required to keep limited transaction records. Note that QuickScanZ never stores your payment card or UPI details \u2014 those are handled directly by our payment processor (Razorpay) and are subject to their retention policies, not ours.",
  },
  {
    title: "Questions",
    content:
      "If you have any trouble deleting your account or data, email support@pranixailabs.com and we will help. QuickScanZ is operated by Pranix AI Labs Pvt Ltd, Hyderabad, India.",
  },
];

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ink-900 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="#fdfcf8" />
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.3" />
            </svg>
          </div>
          <span className="font-display text-base font-light text-ink-900">QuickScanZ</span>
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8 animate-fade-up">
        <div>
          <h1 className="font-display text-4xl font-light text-ink-900 mb-2">
            Delete Your Account &amp; Data
          </h1>
          <p className="text-sm text-ink-700 mt-3">
            QuickScanZ (operated by Pranix AI Labs Pvt Ltd) lets you delete your account and all
            associated data at any time. Here is how.
          </p>
        </div>
        {sections.map(({ title, content }) => (
          <div key={title}>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">{title}</h2>
            <p className="text-sm text-ink-700 leading-relaxed">{content}</p>
          </div>
        ))}
        <div className="pt-4 border-t border-ink-100">
          <Link href="/privacy-policy" className="text-sm text-ink-500 underline">
            Read our Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
