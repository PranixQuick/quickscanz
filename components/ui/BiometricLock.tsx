"use client";
// BiometricLock — renders a full-screen lock overlay that sits above the
// authenticated app. On mount it immediately calls authenticate(). If the
// device has no enrolled credential yet, it shows the enroll prompt.
// The component is mount-gated: it only appears when the app re-focuses
// after >5 min of inactivity (configurable via LOCK_AFTER_MS).

import { useEffect, useState, useCallback } from "react";
import { useBiometric } from "@/hooks/useBiometric";

const LOCK_AFTER_MS = 5 * 60 * 1000; // 5 minutes
const PREF_KEY = "qsz_bio_enabled";

interface Props {
  /** Render children only when unlocked */
  children: React.ReactNode;
  /** Opt-out: skip the lock entirely (e.g. for public pages) */
  skip?: boolean;
}

export default function BiometricLock({ children, skip = false }: Props) {
  const bio = useBiometric();
  const [locked, setLocked]   = useState(false);
  const [enabled, setEnabled] = useState(false);
  const lastActiveRef         = { current: Date.now() };

  // Read user preference
  useEffect(() => {
    if (skip) return;
    try {
      const pref = localStorage.getItem(PREF_KEY);
      setEnabled(pref === "1");
    } catch { /* noop */ }
  }, [skip]);

  // Lock on visibility change / focus after inactivity
  useEffect(() => {
    if (skip || !enabled || bio.state === "unsupported") return;

    const onHide = () => { lastActiveRef.current = Date.now(); };
    const onShow = () => {
      if (Date.now() - lastActiveRef.current > LOCK_AFTER_MS) setLocked(true);
    };
    const onBlur  = onHide;
    const onFocus = onShow;

    document.addEventListener("visibilitychange", () =>
      document.hidden ? onHide() : onShow()
    );
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", () =>
        document.hidden ? onHide() : onShow()
      );
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [skip, enabled, bio.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlock = useCallback(async () => {
    const ok = await bio.authenticate();
    if (ok) setLocked(false);
  }, [bio]);

  const handleEnroll = useCallback(async () => {
    await bio.register();
    // After registration, state becomes 'authenticated' — auto-unlock
    if (bio.state === "authenticated") setLocked(false);
  }, [bio]);

  // Not enabled or device unsupported — render children normally
  if (skip || !enabled || bio.state === "unsupported") return <>{children}</>;

  if (!locked) return <>{children}</>;

  return (
    <>
      {/* Blur backdrop */}
      <div
        className="fixed inset-0 z-50 bg-cream-50/90 backdrop-blur-lg flex flex-col items-center justify-center px-6"
        role="dialog" aria-modal="true" aria-label="App locked"
      >
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-ink-900 flex items-center justify-center mb-6 shadow-lg">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="5" y="13" width="18" height="12" rx="3" fill="#fdfcf8"/>
            <path d="M9 13V9a5 5 0 0 1 10 0v4" stroke="#fdfcf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="14" cy="19" r="2" fill="#1a1612"/>
          </svg>
        </div>

        <h1 className="font-display text-2xl font-light text-ink-900 mb-1">QuickScanZ is locked</h1>
        <p className="text-sm text-ink-400 text-center mb-8 max-w-xs">
          Verify your identity to continue
        </p>

        {bio.state === "unenrolled" ? (
          <div className="w-full max-w-xs space-y-3">
            <button onClick={handleEnroll} disabled={bio.loading}
              className="w-full btn-primary py-3.5 text-sm font-medium flex items-center justify-center gap-2">
              {bio.loading
                ? <span className="animate-spin w-4 h-4 border-2 border-cream-50/40 border-t-cream-50 rounded-full" />
                : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/>
                  </svg>
                )
              }
              Enable Fingerprint / Face ID
            </button>
            <button onClick={() => setLocked(false)}
              className="w-full btn-secondary py-2.5 text-sm">
              Continue without biometrics
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-3">
            <button onClick={handleUnlock} disabled={bio.loading}
              className="w-full btn-primary py-3.5 text-sm font-medium flex items-center justify-center gap-2">
              {bio.loading
                ? <span className="animate-spin w-4 h-4 border-2 border-cream-50/40 border-t-cream-50 rounded-full" />
                : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/>
                  </svg>
                )
              }
              Unlock with Fingerprint
            </button>
            {bio.error && (
              <p className="text-xs text-blush-500 text-center">{bio.error} — tap to retry</p>
            )}
          </div>
        )}
      </div>
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none" aria-hidden="true" style={{ filter: "blur(8px)", opacity: 0.4 }}>
        {children}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// BiometricToggle — small settings row component
// Used in AccountClient / Settings page
// ─────────────────────────────────────────────
export function BiometricToggle() {
  const bio = useBiometric();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try { setEnabled(localStorage.getItem("qsz_bio_enabled") === "1"); } catch { /* noop */ }
  }, []);

  if (!bio.supported) return null; // Hide entirely on unsupported devices

  const handleToggle = async () => {
    setLoading(true);
    if (enabled) {
      bio.unenroll();
      try { localStorage.setItem("qsz_bio_enabled", "0"); } catch { /* noop */ }
      setEnabled(false);
    } else {
      await bio.register();
      if (bio.state !== "error") {
        try { localStorage.setItem("qsz_bio_enabled", "1"); } catch { /* noop */ }
        setEnabled(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-ink-800">Fingerprint / Face ID</p>
        <p className="text-xs text-ink-400 mt-0.5">
          Lock the app after 5 min of inactivity
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        role="switch"
        aria-checked={enabled}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 ${
          enabled ? "bg-ink-900" : "bg-ink-200"
        } disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}
