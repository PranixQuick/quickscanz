'use client';

// QuickScanZ i18n runtime — zero new dependencies.
// Reads the vendored @pranix/i18n catalog and provides a locale + t() to any
// client component. SSR-safe: server renders 'en' (matches <html lang="en">),
// then the stored locale is applied on mount (no hydration mismatch).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import messages from './messages.json';

export type Locale = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
export const LOCALES: Locale[] = ['en', 'hi', 'te', 'ta', 'kn', 'ml'];
const STORAGE_KEY = 'qsz_locale';

type Tables = Record<string, Record<string, string>>;
const TABLES = messages as unknown as Tables;

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  locales: Locale[];
};

const I18nContext = createContext<Ctx | null>(null);

function translate(locale: Locale, key: string): string {
  return TABLES[locale]?.[key] ?? TABLES.en?.[key] ?? key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en'); // SSR-safe default

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && LOCALES.includes(stored)) setLocaleState(stored);
    } catch {
      /* localStorage unavailable — stay on 'en' */
    }
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = locale; } catch { /* noop */ }
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  };

  const t = (key: string) => translate(locale, key);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales: LOCALES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback if used outside the provider.
    return { locale: 'en', setLocale: () => {}, t: (k) => translate('en', k), locales: LOCALES };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
