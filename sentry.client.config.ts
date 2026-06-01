// Sentry client-side init. No-op until NEXT_PUBLIC_SENTRY_DSN is set in the
// environment, so this file is safe to merge before a DSN exists.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Keep volume/cost low by default; raise once you watch real traffic.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "production",
  });
}
