
/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // Activate a newly deployed service worker immediately instead of leaving
    // it "waiting" until every app window is closed. Without these, installed
    // apps (PWA/TWA) keep running the OLD service worker — and old cached
    // pages — indefinitely, so deployed fixes never appear on device.
    skipWaiting: true,
    clientsClaim: true,
    // ─── Runtime Caching Strategy ────────────────────────────────────────────
    // This is the key missing piece for offline support.
    // Without this, products don't load when offline.
    runtimeCaching: [
      // API calls to Supabase — cache with network-first, 24hr fallback
      {
        urlPattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/rest\/v1\/products/,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-products",
          expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 50 },
          networkTimeoutSeconds: 5,
        },
      },
      // Supabase auth
      {
        urlPattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/auth/,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-auth",
          expiration: { maxAgeSeconds: 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      // Invoice images from Supabase Storage
      {
        urlPattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/storage/,
        handler: "CacheFirst",
        options: {
          cacheName: "invoice-images",
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 100 },
        },
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 10 },
        },
      },
      // Next.js static assets
      {
        urlPattern: /\.(?:js|css|woff2?|eot|ttf|otf)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 100 },
        },
      },
      // Page navigations (documents) — network-first so a fresh deploy is
      // fetched whenever the device is online, falling back to cache only when
      // offline or the network is slow. This covers "/", "/?source=pwa" (the
      // PWA/TWA start_url) and every app route on both quickscanz.com and
      // www.quickscanz.com. The previous StaleWhileRevalidate rule served the
      // OLD page first, so fixes only appeared on a later visit.
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 3,
          expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 30 },
        },
      },
    ],
  },
});

// ─── Security headers (F7) ───────────────────────────────────────────────────
// Enforcing headers below are non-breaking. The Content-Security-Policy is sent
// as Report-Only on purpose: it surfaces violations in the browser console
// without risking a white-screen on a payment app that loads Razorpay, OneSignal,
// Supabase (incl. websockets), Google Fonts/OAuth, GA and Sentry. Once the
// canonical domain is settled (F15) and the console shows no breaking violations,
// flip the key to "Content-Security-Policy" to enforce.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://cdn.onesignal.com https://*.onesignal.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.onesignal.com https://*.razorpay.com https://api.razorpay.com https://www.google-analytics.com https://*.sentry.io",
  "frame-src 'self' https://*.razorpay.com https://checkout.razorpay.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig = {
  experimental: { instrumentationHook: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

const { withSentryConfig } = require("@sentry/nextjs");

// Source-map upload activates only when SENTRY_AUTH_TOKEN + org/project are set.
// Without them this is a safe no-op wrapper around the existing build.
module.exports = withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
});
