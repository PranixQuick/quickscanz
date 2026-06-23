import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono, Noto_Sans_Devanagari, Noto_Sans_Telugu, Noto_Sans_Tamil, Noto_Sans_Kannada, Noto_Sans_Malayalam } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { I18nProvider } from "../lib/i18n/provider";
import { getLocale } from "../lib/i18n/server";
import LocaleBar from "../components/LocaleBar";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-dm-mono",
  display: "swap",
});
const notoHi = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-hi",
  display: "swap",
  preload: false,
});
const notoTe = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-te",
  display: "swap",
  preload: false,
});
const notoTa = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-ta",
  display: "swap",
  preload: false,
});
const notoKn = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-kn",
  display: "swap",
  preload: false,
});
const notoMl = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-ml",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "QuickScanZ — Your Warranty Wallet",
    template: "%s | QuickScanZ",
  },
  description:
    "Never lose a warranty or invoice again. QuickScanZ is your post-purchase intelligence platform — track warranties, store invoices, and know exactly what to do when something breaks.",
  keywords: [
    "warranty tracker", "warranty wallet", "invoice storage",
    "product warranty", "warranty management", "warranty expiry reminder", "QuickScanZ",
  ],
  authors: [{ name: "QuickScanZ" }],
  creator: "QuickScanZ",
  metadataBase: new URL("https://www.quickscanz.com"),
  alternates: {
    canonical: "https://www.quickscanz.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "QuickScanZ",
    url: "https://quickscanz.com",
    title: "QuickScanZ — Your Warranty Wallet",
    description: "Never lose a warranty or invoice again. Track warranties, store invoices, get AI-guided claims.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "QuickScanZ — Your Warranty Wallet",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "QuickScanZ — Your Warranty Wallet",
    description: "Never lose a warranty or invoice again. Track warranties, store invoices, get AI-guided claims.",
    images: ["/icons/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuickScanZ",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdfcf8",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // OneSignal SDK only loads when the env var is set in Vercel.
  // Safe: if var is absent, no SDK, no change to existing behaviour.
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Read the active language from the cookie so server-rendered pages and the
  // font cascade (globals.css [data-locale]) are correct on the very first paint.
  const locale = await getLocale();

  return (
    <html lang={locale} data-locale={locale} className={`scroll-smooth ${cormorant.variable} ${dmSans.variable} ${dmMono.variable} ${notoHi.variable} ${notoTe.variable} ${notoTa.variable} ${notoKn.variable} ${notoMl.variable}`}>
      <body className="bg-cream-50 text-ink-900 font-body antialiased">
        <I18nProvider initialLocale={locale}>
          <LocaleBar />
          {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#1a1612",
              color: "#fdfcf8",
              borderRadius: "12px",
              fontFamily: "inherit",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: { iconTheme: { primary: "#7aa67a", secondary: "#fdfcf8" } },
            error: { iconTheme: { primary: "#d95f54", secondary: "#fdfcf8" } },
          }}
        />
        </I18nProvider>

        {/*
          OneSignal Web Push SDK
          ─────────────────────
          • Loaded ONLY when NEXT_PUBLIC_ONESIGNAL_APP_ID is set in Vercel env vars.
          • strategy="lazyOnload" → non-blocking; loads after page is interactive.
          • notifyButton disabled → we use our own UI toggle in NotificationSettings.tsx.
          • The SDK registers the browser with OneSignal and sets external_user_id
            to the Supabase user.id so send-push-notifications edge function can
            target users by their Supabase UUID via include_external_user_ids.
          • When NEXT_PUBLIC_ONESIGNAL_APP_ID is absent (current state without
            OneSignal account), this block renders nothing → zero impact.
        */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="lazyOnload"
            />
            <Script id="ga-init" strategy="lazyOnload">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}</Script>
          </>
        )}

        {oneSignalAppId && (
          <>
            <Script
              src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
              strategy="lazyOnload"
            />
            <Script id="onesignal-init" strategy="lazyOnload">{`
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                try {
                  await OneSignal.init({
                    appId: "${oneSignalAppId}",
                    notifyButton: { enable: false },
                    allowLocalhostAsSecureOrigin: false,
                  });
                } catch (e) {
                  // OneSignal throws if the runtime origin doesn't match the
                  // configured site URL (e.g. www vs apex). Swallow it so push
                  // setup can never throw on load and wedge the page/login flow.
                  console.warn("[onesignal] init skipped:", (e && e.message) ? e.message : e);
                }
              });
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
