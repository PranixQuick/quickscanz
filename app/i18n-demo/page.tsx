// DEPRECATED / QUARANTINED — this route demoed the old vendored
// "@pranix/i18n" runtime (lib/i18n/index.tsx), which has been superseded
// by lib/i18n/provider.tsx + lib/i18n/server.ts (cookie-based, 6 locales,
// shared lib/i18n/messages.json + overrides.json catalog — see AppHeader,
// LocaleBar, LanguageSwitcher, and every server page for the real pattern).
//
// This page and lib/i18n/index.tsx were each other's only consumer, so
// having a live route that imports the legacy runtime was confusing and
// no longer serves a purpose. Kept as a redirect stub (rather than
// deleted outright — this gateway has no file-delete tool) so the route
// doesn't 404 unexpectedly if it was bookmarked anywhere.
//
// TODO: once confirmed safe, delete this file and lib/i18n/index.tsx.
import { redirect } from "next/navigation";

export default function I18nDemoPage() {
  redirect("/dashboard");
}
