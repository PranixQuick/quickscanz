import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "About | QuickScanZ",
  description: "QuickScanZ is India's post-purchase intelligence platform. Track warranties, store invoices, and know exactly what to do when something breaks.",
};

export default async function AboutPage() {
  const t = await getT();

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors mb-8">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {t("about.back")}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-light text-ink-900 leading-tight mb-4">
            {t("about.title")}
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {t("about.subtitle")}
          </p>
        </div>

        <div className="space-y-8 text-sm text-ink-600 leading-relaxed">
          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">{t("about.problem_title")}</h2>
            <p>
              {t("about.problem_body")}
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">{t("about.what_title")}</h2>
            <p>
              {t("about.what_body")}
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">{t("about.india_title")}</h2>
            <p>
              {t("about.india_body")}
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-light text-ink-900 mb-2">{t("about.privacy_title")}</h2>
            <p>
              {t("about.privacy_body")}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-cream-200 flex gap-4">
          <Link href="/products/add" className="btn-primary text-sm px-5 py-2.5">{t("about.cta_get_started")}</Link>
          <Link href="/privacy-policy" className="btn-secondary text-sm px-5 py-2.5">{t("about.cta_privacy")}</Link>
        </div>
      </div>
    </div>
  );
}
