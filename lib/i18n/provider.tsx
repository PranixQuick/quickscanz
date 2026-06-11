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

// BUG-005: Indic font cascade — defined at module scope so it is never a
// reactive dependency and never triggers the exhaustive-deps lint warning.
const INDIC_FONTS: Partial<Record<Locale, string>> = {
  hi: 'Noto+Sans+Devanagari:wght@400;500;600',
  te: 'Noto+Sans+Telugu:wght@400;500;600',
  ta: 'Noto+Sans+Tamil:wght@400;500;600',
  kn: 'Noto+Sans+Kannada:wght@400;500;600',
  ml: 'Noto+Sans+Malayalam:wght@400;500;600',
};

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
    try {
      // 1. Set lang attribute for screen readers and browser heuristics
      document.documentElement.lang = locale;

      // 2. Set data-locale so CSS rules in globals.css can override font-family
      //    on body and all child elements via the cascade (BUG-005 fix).
      document.documentElement.setAttribute('data-locale', locale);

      // 3. Dynamically inject the Noto font <link> for Indic locales so we
      //    don't bloat the initial bundle. The link is idempotent: if a <link>
      //    with the same href already exists we skip insertion.
      const fontParam = INDIC_FONTS[locale];
      if (fontParam) {
        const href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        if (!document.querySelector(`link[href="${href}"]`)) {
          // Ensure preconnect hints exist
          ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach((origin) => {
            if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
              const pre = document.createElement('link');
              pre.rel = 'preconnect';
              pre.href = origin;
              if (origin.includes('gstatic')) pre.crossOrigin = 'anonymous';
              document.head.appendChild(pre);
            }
          });
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        }
      }
    } catch { /* noop — SSR or restricted environment */ }
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
