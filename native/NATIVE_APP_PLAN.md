# QuickScanZ Premium — Native App (Path B)

**Status:** Foundation / planning. Isolated branch `native/expo-premium`. **Does not touch the live TWA** (`main` → Play Store `com.quickscanz.warranty`). Nothing here ships until built, tested, and explicitly promoted to a separate Play track.

## Goal
A truly native, premium-feeling app (Amazon/Swiggy/Zepto-class UI: native tab bar, native transitions, splash, biometric unlock) — **reusing the existing Supabase backend untouched**. The backend is where most of the value/cost lives; we rebuild only the client UI.

## Framework decision (confirmed)
**Expo (React Native) + TypeScript.**
Rationale: reuses your existing TypeScript, domain types, and the **same `@supabase/supabase-js` client** already used by the web app — the lowest-burn path. EAS Build produces the AAB for Play. New language/rewrite avoided.

## What is reused vs rebuilt
- **Reused as-is:** Supabase (auth, DB, RLS, edge functions), business logic/types (`lib/types`, warranty math in `lib/utils`), the AI endpoints (OCR scan, Claims, Aaria) — called over HTTPS exactly as the web app does.
- **Rebuilt native:** all screens/navigation/components (no web DOM), native camera for bill scan, native biometric, native push (Expo Notifications), native splash/status bar.

## Zero/minimal-burn stack
- **Expo SDK (managed)** — free; EAS Build free tier for AABs.
- **supabase-js** — same keys/project, no new backend.
- **expo-local-authentication** — fingerprint/Face unlock (the missing "fingerprint" feature).
- **expo-camera** — native bill capture -> existing `/api/ai/ocr`.
- **expo-notifications** — native push (replaces web VAPID path).
- **@react-navigation** (native-stack + bottom-tabs) — native transitions/tab bar.
- **nativewind** (Tailwind for RN) — reuse the existing design tokens/utility classes mental model.
- **i18n:** reuse the existing `messages.json` catalog (same keys), rendered via a lightweight RN i18n provider — one source of translations for web + native.

## Proposed folder (under `/native`)
```
native/
  app/                # expo-router routes (auth, tabs: home/wallet/scan/claims/account)
  src/
    lib/supabase.ts   # supabase-js client (EXPO_PUBLIC_* env)
    lib/api.ts        # typed fetch wrappers to existing /api/* endpoints
    features/         # products, scan, claims, aaria
    ui/               # native design system (nativewind)
    i18n/             # provider reading shared messages.json
  app.json            # name, icon, splash, android package = com.quickscanz.premium (SEPARATE package)
  eas.json            # build profiles (preview/production)
```
**Separate Android package** (`com.quickscanz.premium` or an internal-testing track of the existing package) so it can be installed/tested alongside the live app without collision.

## Biometric / fingerprint login (answers the earlier ask)
Native path: on first login (Supabase email/Google), persist the session securely in `expo-secure-store`; on subsequent launches, `expo-local-authentication` gates access with fingerprint/Face before restoring the session. This is real native biometric — not possible in the current TWA without WebAuthn/passkeys.

## Milestones
1. **M0 Foundation** (this branch): plan + Expo scaffold + Supabase client + auth screen skeleton.
2. **M1 Auth + shell**: Google/email login (phone optional, matching the fixed web flow), biometric unlock, native tab navigation.
3. **M2 Core**: Warranty Wallet list + product detail + native bill scan -> OCR.
4. **M3 Parity**: Claims, Aaria voice (locale-aware), pricing/subscriptions, push.
5. **M4 Polish + QA**: splash, transitions, empty states, device testing.
6. **M5 Release**: EAS production build -> **separate internal/closed Play track**. Live app untouched.

## Safety / non-negotiables
- No changes to `main` or the live TWA.
- Reuse existing signing only when/if promoting; never regenerate keys without founder.
- Backend unchanged — all reads/writes go through existing RLS.
