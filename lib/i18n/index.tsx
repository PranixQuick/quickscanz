// DEPRECATED / QUARANTINED — this was the original vendored "@pranix/i18n"
// client runtime (separate localStorage key "pranix.locale", separate copy
// of the message catalog logic). The app's real i18n implementation is
// lib/i18n/provider.tsx (client) + lib/i18n/server.ts (server), which use
// the qsz_locale cookie and the shared lib/i18n/messages.json +
// lib/i18n/overrides.json catalog. Every real screen (AppHeader, LocaleBar,
// LanguageSwitcher, AddProductForm, OnboardingClient, OnboardingFlow, the
// dashboard/onboarding/etc. server pages) uses that implementation.
//
// This file's only consumer was app/i18n-demo/page.tsx, which has been
// turned into a redirect stub. Having two parallel i18n implementations in
// the same repo (different storage keys, different context, different
// catalog access pattern) was a source of confusion, so this file is being
// quarantined rather than left live.
//
// Not hard-deleted because this gateway has no file-delete tool — leaving
// a no-op export surface here so a stray import fails loudly at compile
// time instead of silently resurrecting a second i18n system.
//
// TODO: once confirmed there are zero remaining imports of "@/lib/i18n"
// (bare path) or "../lib/i18n" (bare path) anywhere in the repo, delete
// this file and app/i18n-demo/ entirely.

export {};
