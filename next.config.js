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
    // ─── Runtime Caching Strategy ────────────────────────────────────────────
    // This is the key missing piece for offline support.
    // Without this, products don't load when offline.
    runtimeCaching: [
      // API calls to Supabase — cache with network-first, 24hr fallback
      {
        urlPattern: /^https:\/\/yqfwvnrnpydcrzomzdvr\.supabase\.co\/rest\/v1\/products/,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-products",
          expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 50 },
          networkTimeoutSeconds: 5,
        },
      },
      // Supabase auth
      {
        urlPattern: /^https:\/\/yqfwvnrnpydcrzomzdvr\.supabase\.co\/auth/,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-auth",
          expiration: { maxAgeSeconds: 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      // Invoice images from Supabase Storage
      {
        urlPattern: /^https:\/\/yqfwvnrnpydcrzomzdvr\.supabase\.co\/storage/,
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
      // Page HTML — stale-while-revalidate for fast loads
      {
        urlPattern: /^https:\/\/quickscanz\.com\/(?:dashboard|products|claim).*/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "app-pages",
          expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 20 },
        },
      },
    ],
  },
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yqfwvnrnpydcrzomzdvr.supabase.co",
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
