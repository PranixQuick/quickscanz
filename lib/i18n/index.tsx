'use client';

// @pranix/i18n — vendored client runtime (provider + hook + switcher).
// Reuses the shared message catalog. SSR-safe: starts at 'en', reads the saved
// locale on mount, falls back EN -> key so missing translations never break UI.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import catalog from './messages.json';

export const LOCALES = ['en', 'hi', 'te', 'ta', 'kn', 'ml'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English', hi: 'हिंदी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', ml: 'മലയാളം',
};

type Dict = Record<string, string>;
const DICT = catalog as unknown as Record<string, Dict>;
const STORAGE_KEY = 'pranix.locale';

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  children,
  initialLocale = 'en',
}: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (LOCALES as readonly string[]).includes(saved)) setLocaleState(saved);
    } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = locale; } catch { /* no-op */ }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* no-op */ }
  }, []);

  const t = useCallback((key: string) => {
    const en = DICT.en || {};
    const cur = DICT[locale] || {};
    return cur[key] ?? en[key] ?? key;
  }, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

export function useT() { return useI18n().t; }

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={className}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
      ))}
    </select>
  );
}
