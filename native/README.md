# QuickScanZ Premium — Native App (Expo)

**Status:** M0 (foundation) + M1 (auth/shell) scaffolded on the isolated branch
`native/expo-premium`. Nothing here touches `main` or the live TWA
(Play Store `com.quickscanz.warranty`). See
[`../NATIVE_APP_PLAN.md`](../NATIVE_APP_PLAN.md) for the full architecture and
milestone plan.

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
cp .env.example .env     # then fill in the two Supabase values below
npx expo start
```

## Environment variables (`native/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Same Supabase project URL as the web app's `NEXT_PUBLIC_SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same anon key as the web app's `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_API_BASE_URL` *(optional, M2)* | Base URL of the existing Next.js API (e.g. `https://www.quickscanz.com`) for calling `/api/ai/ocr` etc. |

`EXPO_PUBLIC_*` vars are inlined at build time by Expo (the RN equivalent of
Next's `NEXT_PUBLIC_*`). Never put a service-role key here.

For Google sign-in to work, add `quickscanz://auth/callback` as an allowed
redirect URL in Supabase Dashboard → Authentication → URL Configuration
(additive — the existing web callback URL stays untouched).

## Assets (placeholders)

`app.json` references `./assets/icon.png`, `./assets/splash.png`,
`./assets/adaptive-icon.png`, and `./assets/notification-icon.png`. These
binary files are **not committed yet** — drop real artwork at those paths
before an EAS build. `expo start` against Expo Go will still run without them
(with a warning).

## Scripts

- `npm start` — Expo dev server (Expo Go / dev client)
- `npm run android` / `npm run ios` — open directly on a connected device/simulator
- `npm run build` — `eas build --platform android --profile preview` (internal
  APK, separate `com.quickscanz.premium` package — installs side-by-side with
  the live app)

## What's implemented (M0 + M1)

- Expo + expo-router + TypeScript + nativewind scaffold (`app.json`,
  `eas.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`)
- `src/lib/supabase.ts` — supabase-js client, AsyncStorage-persisted session,
  PKCE flow (required for `signInWithOAuth` on native — no shared browser
  cookie jar like on web)
- `src/lib/biometric.ts` — `expo-local-authentication` + `expo-secure-store`
  helpers: `saveSession`, `getSessionWithBiometric`, `hasBiometric`,
  `clearSavedSession`
- `src/features/auth/AuthProvider.tsx` — session context via
  `supabase.auth.onAuthStateChange`, exposes `user` / `session` / `loading` /
  `signOut`
- `app/(auth)/login.tsx` — email/password + Google (native PKCE OAuth via
  `expo-web-browser`) + **optional, collapsed** phone OTP — no forced phone
  step, matching the fixed web flow
- `app/(auth)/unlock.tsx` — biometric unlock screen
- `app/(tabs)/_layout.tsx` — native tab bar: Home, Wallet, Scan, Claims, Account
- `app/(tabs)/index.tsx` — dashboard placeholder, live product count from Supabase
- `app/(tabs)/wallet.tsx` — product list from the `products` table, pull-to-refresh
- `app/(tabs)/scan.tsx` — `expo-camera` capture placeholder (OCR wiring is M2)
- `app/(tabs)/claims.tsx` — placeholder (Aaria claim flow is M3)
- `app/(tabs)/account.tsx` — shows signed-in email, sign out (also clears the
  biometric-gated session copy)
- `app/_layout.tsx` — root `Stack`, auth-state redirect gate between
  `(auth)` and `(tabs)`

### Known M1 gap

The root layout gates purely on "is there a live Supabase session" — it does
**not** yet force the `/unlock` biometric screen on cold start/resume. Wiring
that in means: bootstrap from `SecureStore` (via `src/lib/biometric.ts`)
*before* trusting the AsyncStorage-persisted session, and require a successful
`getSessionWithBiometric()` call before rendering `(tabs)`. Left as a
follow-up so M1 ships a working, testable auth shell first.

## Not implemented yet

- Native bill scan → OCR wiring (M2)
- Warranty Wallet detail screens, add-product flow (M2)
- Forced biometric gate on resume (see gap above)
- Claims/Aaria, push notifications, subscriptions (M3)
- Splash/transition polish, empty states, device QA (M4)
- EAS production build + Play internal track (M5)

## M2 — next steps (wallet + native scan → OCR)

1. **Wallet detail + add-product.** Build `app/(tabs)/wallet/[id].tsx` and an
   add-product flow. Mirror the `Product` shape from the web app's
   `lib/types.ts` into `native/src/lib/types.ts` (or generate types from the
   Supabase schema with `supabase gen types typescript`).

2. **Wire `scan.tsx` to `/api/ai/ocr`.** The existing route
   (`app/api/ai/ocr/route.ts` on `main`) authenticates via `createClient()`
   from `lib/supabase/server.ts`, which reads the **Supabase SSR cookie** set
   by `@supabase/ssr` in a browser. React Native's `fetch` has no shared
   cookie jar with that session, so calling this endpoint as-is from the
   native app will 401.
   - **Required backend change (separate PR, not this branch):** add an
     `Authorization: Bearer <access_token>` fallback to
     `app/api/ai/ocr/route.ts` (and any other `/api/*` route the app will
     call) — e.g. call `supabase.auth.getUser(bearerToken)` when no cookie
     session is present. This is additive and does not change existing
     cookie-based web behavior.
   - **Native side:** after
     `cameraRef.current.takePictureAsync({ base64: true })`, `POST` to
     `${EXPO_PUBLIC_API_BASE_URL}/api/ai/ocr` with
     `{ image_base64, mime_type }` and header
     `Authorization: Bearer ${session.access_token}` (session from
     `useAuth()`).

3. **Save the scanned product.** After OCR returns fields, prefill an
   add-product form and insert into `products` via
   `supabase.from("products").insert(...)` — reuses the same RLS-protected
   table the web app uses, no schema changes needed.

4. **Wallet list polish.** Replace the flat list in `wallet.tsx` with
   warranty-status grouping (active / expiring / expired) by porting the pure
   functions from the web app's `lib/calculations.ts` into
   `native/src/lib/calculations.ts`.

5. Update `../NATIVE_APP_PLAN.md`'s milestone table once M2 lands.

## Safety

- This app targets Android package `com.quickscanz.premium` — a **separate**
  package from the live `com.quickscanz.warranty`, so it installs side-by-side
  without collision.
- No changes were made to `main`, the live TWA, or the Supabase schema to
  produce this scaffold.
