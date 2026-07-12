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
  const { t, locale, setLocale } = useI18n();
  const [signingOut, setSigningOut] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success(t("account.signed_out_toast"));
    router.push("/login");
    router.refresh();
  };

  const handleLocale = (l: Locale) => {
    setLocale(l);
    setLangOpen(false);
    toast.success(LOCALE_NAMES[l], { duration: 1500 });
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
            {t("app.brand_name")}
          </span>
        </Link>

        <div className="flex items-center gap-1">

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              aria-label={t("app.change_language")}
              aria-expanded={langOpen}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-600 hover:bg-cream-200 hover:text-ink-900 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>{LOCALE_LABELS[locale]}</span>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M1.5 3l2.5 2.5L6.5 3"/>
              </svg>
            </button>

            {langOpen && (
              <>
                {/* Backdrop to close */}
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-cream-50 border border-cream-200 rounded-xl shadow-lg overflow-hidden">
                  {LOCALES.map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLocale(l)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-cream-100 ${
                        l === locale ? "bg-cream-100 font-medium text-ink-900" : "text-ink-600"
                      }`}
                    >
                      <span className="w-6 text-center font-medium text-xs text-ink-400">{LOCALE_LABELS[l]}</span>
                      <span>{LOCALE_NAMES[l]}</span>
                      {l === locale && (
                        <svg className="ml-auto" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#1a1612" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Link href="/products/add" className="btn-primary text-xs px-3 py-2 rounded-lg whitespace-nowrap shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {t("app.add_product")}
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn-ghost text-xs px-3 py-2 ml-1"
            title={t("account.sign_out_btn")}
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
