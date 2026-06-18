'use client';

import { useRouter } from 'next/navigation';
import { useI18n, type Locale } from '../lib/i18n/provider';

const LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
};

export default function LanguageSwitcher() {
  const { locale, setLocale, locales } = useI18n();
  const router = useRouter();

  const handleChange = (next: Locale) => {
    setLocale(next);   // updates client state + writes the qsz_locale cookie
    router.refresh();  // re-render server components with the new cookie locale
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
      aria-label="Language"
      className="rounded-md border border-black/10 bg-cream-50 text-ink-900 text-xs px-2 py-1 focus:outline-none"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{LABELS[l]}</option>
      ))}
    </select>
  );
}
