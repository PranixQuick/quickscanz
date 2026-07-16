import { supabase } from "./supabase";

// Base URL of the live Next.js API (same Supabase project as the web app).
// Set EXPO_PUBLIC_API_BASE_URL in native/.env for local/dev API targets;
// falls back to production. Mirrors the constant already inlined in
// app/(tabs)/scan.tsx (M2) — centralized here so M3 screens share one
// definition instead of re-declaring it.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://www.quickscanz.com";

export class ApiAuthError extends Error {}

/**
 * Authenticated fetch to the existing Next.js `/api/*` routes.
 *
 * IMPORTANT / KNOWN GAP (same one flagged in scan.tsx and
 * native/README.md's M2 notes): every `/api/*` route on `main` authenticates
 * via `createClient()` from `lib/supabase/server.ts`, which reads the
 * Supabase SSR **cookie** set by `@supabase/ssr` in a browser. React
 * Native's `fetch` has no shared cookie jar with that session, so calling a
 * route as-is from this app will 401 UNLESS that specific route has an
 * additive `Authorization: Bearer <access_token>` fallback (checked
 * server-side only when no cookie session is present).
 *
 * As of this milestone that fallback is only ASSUMED to exist for
 * `/api/ai/ocr` (see scan.tsx's comment, referencing a `feat/ocr-bearer-auth`
 * change that is NOT present on `main` as read from this branch — i.e. even
 * the M2 assumption is unconfirmed). Reading `app/api/ai/route.ts` on `main`
 * directly shows it calls `supabase.auth.getUser()` with no bearer-token
 * branch at all, so POST /api/ai (used by the M3 claims screen) WILL 401 in
 * production until a backend PR (outside this native-only branch) adds the
 * same additive fallback there.
 *
 * This function still sends the header — so calls start working the moment
 * that backend PR lands — and callers must treat a 401 as expected/handled,
 * not a hard failure (see app/(tabs)/claims.tsx's graceful fallback).
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new ApiAuthError("Not signed in");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
