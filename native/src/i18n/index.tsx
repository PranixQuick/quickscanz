import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import catalog from "../../../lib/i18n/messages.json";
import { getLocale, setLocale as saveLocale } from "../lib/locale";

export const LOCALES = ["en", "hi", "te", "ta", "kn", "ml"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
  te: "తెలుగు",
  ta: "தமிழ்",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളం",
};

type Dict = Record<string, string>;
const DICT = catalog as unknown as Record<string, Dict>;

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load saved locale on mount
  useEffect(() => {
    getLocale().then((saved) => {
      if ((LOCALES as readonly string[]).includes(saved)) {
        setLocaleState(saved as Locale);
      }
    });
  }, []);

  const changeLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    await saveLocale(l);
  }, []);

  const t = useCallback(
    (key: string) => {
      const en = DICT.en || {};
      const cur = DICT[locale] || {};
      return cur[key] ?? en[key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
