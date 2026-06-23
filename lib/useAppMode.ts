"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the web app is currently running inside the installed
 * Android app (Trusted Web Activity) or any installed standalone PWA.
 *
 * Used to hide in-app purchase / "Upgrade to Pro" CTAs so the installed
 * Android build stays compliant with Google Play's billing policy (which
 * does not allow third-party processors like Razorpay for digital
 * subscriptions purchased inside the app). The normal website — opened in
 * a browser tab — returns false here and keeps Pro exactly as before.
 *
 * Reversible: deleting this gate (or always returning false) restores the
 * in-app purchase CTAs.
 */
export function useAppMode(): boolean {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    try {
      const mm = (q: string) => window.matchMedia?.(q)?.matches === true;
      const detected =
        mm("(display-mode: standalone)") ||
        mm("(display-mode: fullscreen)") ||
        mm("(display-mode: minimal-ui)") ||
        // iOS standalone (added-to-home-screen) flag
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        // TWA initial navigation referrer
        (typeof document !== "undefined" &&
          document.referrer.startsWith("android-app://"));
      setIsApp(detected);
    } catch {
      setIsApp(false);
    }
  }, []);

  return isApp;
}
