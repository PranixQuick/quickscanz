# QuickScanZ Premium — Native App (Path B)

**Status:** M0–M3 scaffolded on the isolated branch `native/expo-premium`. **Does not touch the live TWA** (`main` → Play Store `com.quickscanz.warranty`). Nothing here ships until built, tested, and explicitly promoted to a separate Play track.

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
- **expo-notifications** — native push (M3: token registration is wired; delivery pipeline is a follow-up, see below).
- **expo-av** / **expo-file-system** — Aaria "read aloud" audio playback (M3).
- **expo-web-browser** — native bill capture UX and, as of M3, the pricing screen's web-checkout handoff.
- **@react-navigation** (native-stack + bottom-tabs, via expo-router) — native transitions/tab bar.
- **nativewind** (Tailwind for RN) — reuse the existing design tokens/utility classes mental model.
- **i18n:** reuse the existing `messages.json` catalog (same keys), rendered via a lightweight RN i18n provider — one source of translations for web + native. **Not yet built** — M3's locale picker (`native/src/lib/locale.ts`) is a narrower, standalone AsyncStorage-backed preference used only by the Aaria voice features, not a full i18n provider.

## Proposed folder (under `/native`)
```
native/
  app/                # expo-router routes (auth, tabs: home/wallet/scan/claims/account, product/[id]+add, pricing)
  src/
    lib/supabase.ts   # supabase-js client (EXPO_PUBLIC_* env)
    lib/api.ts         # typed fetch wrapper to existing /api/* endpoints (Bearer-auth caveat documented inline)
    lib/locale.ts      # device-local locale preference (Aaria voice language)
    lib/push.ts         # expo-notifications registration
    features/          # auth, aaria (understand/speak client + playback hook)
    ui/               # native design system (nativewind)
    i18n/             # provider reading shared messages.json — still a follow-up
  app.json            # name, icon, splash, android package = com.quickscanz.premium (SEPARATE package)
  eas.json            # build profiles (preview/production)
```
**Separate Android package** (`com.quickscanz.premium` or an internal-testing track of the existing package) so it can be installed/tested alongside the live app without collision.

## Biometric / fingerprint login (answers the earlier ask)
Native path: on first login (Supabase email/Google), persist the session securely in `expo-secure-store`; on subsequent launches, `expo-local-authentication` gates access with fingerprint/Face before restoring the session. This is real native biometric — not possible in the current TWA without WebAuthn/passkeys.

## Milestones
1. **M0 Foundation** (this branch): plan + Expo scaffold + Supabase client + auth screen skeleton. ✅
2. **M1 Auth + shell**: Google/email login (phone optional, matching the fixed web flow), biometric unlock, native tab navigation. ✅
3. **M2 Core**: Warranty Wallet list + product detail + native bill scan -> OCR. ✅
4. **M3 Parity**: Claims, Aaria voice (locale-aware), pricing/subscriptions, push. ✅ (see follow-ups below)
5. **M4 Polish + QA**: splash, transitions, empty states, device testing.
6. **M5 Release**: EAS production build -> **separate internal/closed Play track**. Live app untouched.

### M3 follow-ups (tracked, not blocking this branch from progressing to M4)
- **`/api/ai` Bearer auth (backend, separate PR):** `app/api/ai/route.ts` on `main` authenticates purely via the Supabase SSR cookie (`createClient()` from `lib/supabase/server.ts`), with no `Authorization: Bearer` fallback. `native/app/(tabs)/claims.tsx` sends the header and degrades to local rule-based guidance on a 401 — real AI claim replies won't reach the app until that route gets the same additive fallback already assumed (but itself unconfirmed) for `/api/ai/ocr`.
- **Push delivery pipeline mismatch (backend, separate PR):** `native/src/lib/push.ts` registers a real Expo push token and best-effort-persists it into `push_subscriptions` (a Web Push/VAPID-shaped table), but the actual send path (`supabase/functions/send-push-notifications`) delivers via OneSignal `external_user_id`, which never reads that table. No push will actually reach a device until either an Expo Push API sender is added, or native switches to the OneSignal Expo SDK so tokens land where the existing function already looks.
- **Native Razorpay checkout:** `native/app/pricing.tsx` reads real plans/subscription state but hands off upgrades to the existing web `/pricing` checkout via `expo-web-browser` (separate browser session — no SSO with the native app's Supabase session yet). Full native checkout (`react-native-razorpay` + Bearer-auth order/verify routes) is future work.
- **Full i18n:** the Aaria language picker is a standalone locale preference, not the shared `messages.json` provider described above — still to build if native screens need full localized copy.

## Safety / non-negotiables
- No changes to `main` or the live TWA.
- Reuse existing signing only when/if promoting; never regenerate keys without founder.
- Backend unchanged — all reads/writes go through existing RLS.
