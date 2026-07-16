import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import catalog from "./messages.json";
import { getLocale, setLocale as saveLocale } from "../lib/locale";

export const LOCALES = ["en", "hi", "te", "ta", "kn", "ml"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
  te: "తెలుగు",
  ta: "தமிழ்",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
};

type Dict = Record<string, string>;
const DICT = catalog as unknown as Record<string, Dict>;

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  fontFamily: (isBold?: boolean) => string | undefined;
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
    (key: string, params?: Record<string, string | number>) => {
      const en = DICT.en || {};
      const cur = DICT[locale] || {};
      let val = cur[key] ?? en[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(new RegExp(`{${k}}`, "g"), String(v));
        });
      }
      return val;
    },
    [locale]
  );

  const fontFamily = useCallback(
    (isBold = false) => {
      switch (locale) {
        case "hi":
          return isBold ? "NotoSansDevanagari_Bold" : "NotoSansDevanagari_Regular";
        case "te":
          return isBold ? "NotoSansTelugu_Bold" : "NotoSansTelugu_Regular";
        case "ta":
          return isBold ? "NotoSansTamil_Bold" : "NotoSansTamil_Regular";
        case "kn":
          return isBold ? "NotoSansKannada_Bold" : "NotoSansKannada_Regular";
        case "ml":
          return isBold ? "NotoSansMalayalam_Bold" : "NotoSansMalayalam_Regular";
        default:
          return undefined; // English uses default system font (Inter/San Francisco/Roboto)
      }
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t, fontFamily }}>
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

