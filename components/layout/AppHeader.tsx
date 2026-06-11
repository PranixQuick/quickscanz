"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n/provider";
import toast from "react-hot-toast";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN", hi: "हि", te: "తె", ta: "த", kn: "ಕ", ml: "മ",
};
const LOCALE_NAMES: Record<Locale, string> = {
  en: "English", hi: "हिन्दी", te: "తెలుగు", ta: "தமிழ்", kn: "ಕನ್ನಡ", ml: "മലയാളം",
};

interface AppHeaderProps {
  userName?: string;
}

export default function AppHeader({ userName }: AppHeaderProps) {
  const router = useRouter();
  const t = useT();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-cream-50/80 backdrop-blur-md border-b border-cream-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-ink-900 flex items-center justify-center group-hover:bg-ink-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="#fdfcf8"/>
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.6"/>
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.6"/>
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="#fdfcf8" opacity="0.3"/>
            </svg>
          </div>
          <span className="font-display text-base font-medium text-ink-900 tracking-tight">
            QuickScanZ
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/products/add" className="btn-primary text-xs px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {t("app.add_product")}
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn-ghost text-xs px-3 py-2 ml-1"
            title="Sign out"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M9 10l3-3-3-3M5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
