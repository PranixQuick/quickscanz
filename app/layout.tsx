import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://quickscanz.com"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "QuickScanZ",
    title: "QuickScanZ — Your Warranty Wallet",
    description: "Never lose a warranty or invoice again.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head />
      <body className="bg-cream-50 text-ink-900 font-body antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#1a1612",
              color: "#fdfcf8",
              borderRadius: "12px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: { iconTheme: { primary: "#7aa67a", secondary: "#fdfcf8" } },
            error: { iconTheme: { primary: "#d95f54", secondary: "#fdfcf8" } },
          }}
        />
      </body>
    </html>
  );
}
