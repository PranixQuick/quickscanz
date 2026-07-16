import AsyncStorage from "@react-native-async-storage/async-storage";

// Mirrors the locale set lib/i18n/provider.tsx (web) and lib/aaria-client.ts
// support. The web app persists the active locale in a `qsz_locale` cookie
// (see components/LanguageSwitcher.tsx); native has no cookie jar, so this
// persists the same value to AsyncStorage instead. `profiles.preferred_locale`
// exists in the DB (see supabase/migrations/20260612_bootstrap_quickscanz_
// schema.sql) but the web LanguageSwitcher does not appear to write to it —
// it's cookie-only — so this is treated as a device-local preference rather
// than something to sync through that column. A follow-up could reconcile
// the two (e.g. write both) if server-rendered locale-aware content ever
// needs to know the native app's choice.

export type Locale = "en" | "hi" | "te" | "ta" | "kn" | "ml";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
];

const STORAGE_KEY = "qsz_locale";
const DEFAULT_LOCALE: Locale = "en";

function isLocale(v: string | null): v is Locale {
  return !!v && LOCALES.some((l) => l.code === v);
}

export async function getLocale(): Promise<Locale> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function setLocale(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, locale);
}
