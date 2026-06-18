import { cookies } from "next/headers";
import messages from "./messages.json";
import overrides from "./overrides.json";

// Server-side counterpart to lib/i18n/provider.tsx (client).
// Lets server components translate using the same catalog + the locale
// stored in a cookie (so the language is known at first server render).

export type Locale = "en" | "hi" | "te" | "ta" | "kn" | "ml";
export const LOCALES: Locale[] = ["en", "hi", "te", "ta", "kn", "ml"];
export const LOCALE_COOKIE = "qsz_locale";

const TABLES = messages as unknown as Record<string, Record<string, string>>;
// Human-approved corrections applied on top of the machine catalog.
const OVERRIDES = overrides as unknown as Record<string, Record<string, string>>;

export function translate(locale: Locale, key: string): string {
  return (
    OVERRIDES[locale]?.[key] ??
    TABLES[locale]?.[key] ??
    TABLES.en?.[key] ??
    key
  );
}

/** Read the active locale from the cookie (defaults to 'en'). Server-only. */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
    if (value && LOCALES.includes(value)) return value;
  } catch {
    /* cookies() unavailable in this context — fall back to English */
  }
  return "en";
}

/** Returns a t() bound to the request's locale, for use in server components. */
export async function getT(): Promise<(key: string) => string> {
  const locale = await getLocale();
  return (key: string) => translate(locale, key);
}
