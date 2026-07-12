# QuickScanZ Premium — Native App (Expo)

**Status:** M0 (foundation) + M1 (auth/shell) + M2 (wallet/scan) + M3
(claims/Aaria voice/pricing/push) scaffolded on the isolated branch
`native/expo-premium`. Nothing here touches `main` or the live TWA
(Play Store `com.quickscanz.warranty`). See
[`../NATIVE_APP_PLAN.md`](../NATIVE_APP_PLAN.md) for the full architecture and
milestone plan, including the M3 follow-ups list.

## Stack

Expo (managed workflow) + expo-router + TypeScript + nativewind (Tailwind for
React Native), backed by the **same Supabase project** as the web app — no new
backend, no schema changes.

## Prerequisites

- Node 18+
- `npm install -g eas-cli` (only needed for EAS builds)
- Expo Go app on a physical device, or an Android/iOS simulator
- The QuickScanZ Supabase project URL + anon key (same ones the web app uses)

## Setup

```bash
cd native
npm install
npx expo install --fix   # aligns native module versions to the installed Expo SDK
cp .env.example .env     # then fill in the values below
npx expo start
```

## Environment variables (`native/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Same Supabase project URL as the web app's `NEXT_PUBLIC_SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same anon key as the web app's `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_API_BASE_URL` *(optional, M2/M3)* | Base URL of the existing Next.js API (e.g. `https://www.quickscanz.com`) for calling `/api/ai/ocr`, `/api/ai`, and opening `/pricing` |
,

For Google sign-in to work, add `quickscanz://auth/callback` as an allowed
redirect URL in Supabase Dashboard → Authentication → URL Configuration
(additive — the existing web callback URL stays untouched).

## Assets (placeholders)

`app.json` references `./assets/icon.png`, `./assets/splash.png`,
`./assets/adaptive-icon.png`, and `./assets/notification-icon.png`. These
binary files are **not committed yet** — drop real artwork at those paths
before an EAS build. `expo start` against Expo Go will still run without them
(with a warning). `app.json`'s `extra.eas.projectId` is also still the
scaffold placeholder — it needs a real EAS project id before Expo push tokens
(`native/src/lib/push.ts`) will resolve outside Expo Go.

## Scripts

- `npm start` — Expo dev server (Expo Go / dev client)
- `npm run android` / `npm run ios` — open directly on a connected device/simulator
- `npm run build` — `eas build --platform android --profile preview` (internal
  APK, separate `com.quickscanz.premium` package — installs side-by-side with
  the live app)

## What's implemented (M0–M3)

- Expo + expo-router + TypeScript + nativewind scaffold (`app.json`,
  `eas.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`)
- `src/lib/supabase.ts` — supabase-js client, AsyncStorage-persisted session,
  PKCE flow (required for `signInWithOAuth` on native — no shared browser
  cookie jar like on web)
- `src/lib/biometric.ts` — `expo-local-authentication` + `expo-secure-store`
  helpers: `saveSession`, `getSessionWithBiometric`, `hasBiometric`,
  `clearSavedSession`
- `src/lib/calculations.ts` — ported warranty-status/countdown math
- `src/lib/api.ts` *(M3)* — shared `apiFetch` wrapper that attaches
  `Authorization: Bearer <access_token>` to calls against the Next.js API;
  documents which routes are confirmed vs. assumed to accept it
- `src/lib/locale.ts` *(M3)* — AsyncStorage-backed voice-language preference
  (`en`/`hi`/`te`/`ta`/`kn`/`ml`), set from the Account screen
- `src/lib/push.ts` *(M3)* — `expo-notifications` permission request + Expo
  push token registration, best-effort persisted to `push_subscriptions`
  (see the file's doc comment for the delivery-pipeline gap vs. OneSignal)
- `src/features/auth/AuthProvider.tsx` — session context via
  `supabase.auth.onAuthStateChange`, exposes `user` / `session` / `loading` /
  `signOut`; now also triggers push registration once per signed-in user (M3)
- `src/features/aaria/aariaClient.ts` *(M3)* — native port of
  `lib/aaria-client.ts` (`aariaUnderstand`/`aariaSpeak`), called directly
  since pranix-aaria needs no auth
- `src/features/aaria/useAariaSpeech.ts` *(M3)* — `expo-av` playback of
  Aaria's speak response (via a temp file written through
  `expo-file-system`) plus an understand-then-speak `ask()` helper
- `app/(auth)/login.tsx` — email/password + Google (native PKCE OAuth via
  `expo-web-browser`) + **optional, collapsed** phone OTP — no forced phone
  step, matching the fixed web flow
- `app/(auth)/unlock.tsx` — biometric unlock screen
- `app/(tabs)/_layout.tsx` — native tab bar: Home, Wallet, Scan, Claims, Account
- `app/(tabs)/index.tsx` — dashboard placeholder, live product count from Supabase
- `app/(tabs)/wallet.tsx` — product list from the `products` table, grouped by
  warranty status, pull-to-refresh
- `app/(tabs)/scan.tsx` — `expo-camera` capture -> `POST /api/ai/ocr` -> prefilled add-product form
- `app/(tabs)/claims.tsx` *(M3)* — product picker + quick-issue chips +
  free-text chat, `POST /api/ai` for AI guidance with a graceful local
  fallback on auth/network failure, `claim_sessions` persisted via the
  native supabase client
- `app/(tabs)/account.tsx` — signed-in email, sign out (also clears the
  biometric-gated session copy), *(M3)* Upgrade-to-Pro link + Aaria voice
  language picker
- `app/product/[id].tsx` — product detail, *(M3)* "Read aloud" (speaks the
  warranty status via Aaria) and "Ask Aaria" (typed question -> Aaria
  understand -> spoken answer) actions
- `app/product/add.tsx` — manual/OCR-prefilled add-product form
- `app/pricing.tsx` *(M3)* — reads `subscription_plans` +
  `user_subscriptions`, highlights the current plan, opens the existing web
  `/pricing` checkout in an in-app browser for upgrades
- `app/_layout.tsx` — root `Stack`, auth-state redirect gate between
  `(auth)` and `(tabs)`

### Known gaps

- The root layout gates purely on "is there a live Supabase session" — it
  does **not** yet force the `/unlock` biometric screen on cold start/resume
  (M1 gap, still open).
- `POST /api/ai` (claims) and `POST /api/ai/ocr` (scan) both assume/require a
  Bearer-token auth fallback on the Next.js route that isn't confirmed to
  exist on `main` — see `src/lib/api.ts`'s doc comment and
  `../NATIVE_APP_PLAN.md`'s M3 follow-ups. Claims degrades gracefully to
  local guidance when this 401s; scan will show a hard error.
- Push notifications register a real Expo token but nothing currently
  delivers to it — the send pipeline is OneSignal-based and doesn't read the
  table this writes to. See `src/lib/push.ts`.
- Pricing has no native checkout — it hands off to the web `/pricing` page in
  a separate (non-SSO'd) browser session.
- No production EAS project id yet (`app.json`'s `extra.eas.projectId` is a
  placeholder) — required for real Expo push tokens and any EAS build.

## Not implemented yet

- Forced biometric gate on resume (see gap above)
- Full i18n provider reading the shared `messages.json` catalog (Aaria's
  language picker is a narrower, standalone preference — see
  `src/lib/locale.ts`)
- Native Razorpay checkout, `/api/ai*` Bearer-auth backend support, and a
  working push-notification send path (all M3 follow-ups, tracked in
  `../NATIVE_APP_PLAN.md`)
- Splash/transition polish, empty states, device QA (M4)
- EAS production build + Play internal track (M5)

## Safety

- This app targets Android package `com.quickscanz.premium` — a **separate**
  package from the live `com.quickscanz.warranty`, so it installs side-by-side
  without collision.
- No changes were made to `main`, the live TWA, or the Supabase schema to
  produce this scaffold (or any milestone since).
