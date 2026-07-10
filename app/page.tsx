import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

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

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string }> | { source?: string };
}) {
  // If the visitor is already signed in, don't show the public marketing page —
  // send them straight into the app. This is what makes the installed app open
  // to the dashboard instead of the website homepage.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // When opened from the installed app (its launch URL is "/?source=pwa"), a
  // logged-out user should land on the login screen — not the public marketing
  // page. Normal web visitors (no source=pwa) still get the marketing homepage,
  // so browser landing / SEO is unaffected.
  const sp = searchParams ? await searchParams : undefined;
  if (sp?.source === "pwa") redirect("/login");

  const t = await getT();

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
          <span className="font-display text-base font-medium text-ink-900">{t("landing.logo_text")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-ink-800 border border-ink-400 hover:border-ink-700 hover:bg-ink-50 hover:text-ink-900 transition-colors px-4 py-2 rounded-xl">{t("landing.nav_signin")}</Link>
          <Link href="/login" className="btn-primary text-sm px-4 py-2">{t("landing.nav_signup")}</Link>
        </div>
      </nav>

      {/* main landmark required for accessibility (WCAG 2.4.1 — screen readers need this) */}
      <main>
        {/* Hero */}
        <section className="max-w-2xl mx-auto px-5 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-sage-50 border border-sage-200 text-sage-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
            {t("landing.hero_badge")}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-light text-ink-900 leading-tight mb-4">
            {t("landing.hero_title")}
          </h1>
          <p className="text-ink-400 text-base leading-relaxed max-w-md mx-auto mb-8">
            {t("landing.hero_sub")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
              {t("landing.hero_cta_primary")}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/how-it-works" className="btn-secondary text-base px-8 py-3.5">{t("landing.hero_cta_secondary")}</Link>
          </div>
          <p className="text-xs text-ink-300 mt-4">{t("landing.hero_caption")}</p>
          <p className="text-xs text-ink-400 mt-3">
            {t("landing.hero_already_account")}{" "}
            <Link href="/login" className="font-medium text-ink-600 underline underline-offset-2 hover:text-ink-900 transition-colors">
              {t("landing.hero_signin_link")}
            </Link>
          </p>
        </section>

        {/* Stats — numbers match live DB: 53 service centres, 12 brands, 100+ catalog products */}
        <section className="max-w-2xl mx-auto px-5 mb-16" aria-label="Platform statistics">
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: t("landing.stats_products_n"), label: t("landing.stats_products_label") },
              { n: t("landing.stats_brands_n"),  label: t("landing.stats_brands_label") },
              { n: t("landing.stats_centres_n"),  label: t("landing.stats_centres_label") },
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
          <h2 id="features-heading" className="font-display text-2xl font-light text-ink-900 mb-6 text-center">{t("landing.features_heading")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "📦", title: t("landing.feature_1_title"), desc: t("landing.feature_1_desc") },
              { icon: "🧾", title: t("landing.feature_2_title"), desc: t("landing.feature_2_desc") },
              { icon: "⏰", title: t("landing.feature_3_title"), desc: t("landing.feature_3_desc") },
              { icon: "🤖", title: t("landing.feature_4_title"), desc: t("landing.feature_4_desc") },
              { icon: "📍", title: t("landing.feature_5_title"), desc: t("landing.feature_5_desc") },
              { icon: "🏠", title: t("landing.feature_6_title"), desc: t("landing.feature_6_desc") },
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
            <h2 className="font-display text-2xl font-light text-cream-100 mb-2">{t("landing.cta_title")}</h2>
            <p className="text-sm text-cream-400 mb-6">{t("landing.cta_sub")}</p>
            <Link href="/login" className="inline-flex items-center gap-2 bg-cream-50 text-ink-900 text-sm font-medium px-8 py-3 rounded-xl hover:bg-white transition-colors">
              {t("landing.cta_btn")}
            </Link>
            <p className="text-xs text-cream-500 mt-4">
              {t("landing.cta_already_account")}{" "}
              <Link href="/login" className="text-cream-300 underline underline-offset-2 hover:text-cream-100 transition-colors font-medium">
                {t("landing.cta_signin_link")}
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-5 py-8 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-ink-300">{t("landing.footer_copyright")}</p>
        <nav aria-label="Footer navigation">
          <div className="flex gap-5">
            {[
              { href: "/about", label: t("landing.footer_about") },
              { href: "/how-it-works", label: t("landing.footer_how") },
              { href: "/privacy-policy", label: t("landing.footer_privacy") },
              { href: "/login", label: t("landing.footer_signin") },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-ink-300 hover:text-ink-500 transition-colors">{l.label}</Link>
            ))}
          </div>
        </nav>
      </footer>
    </div>
  );
}
