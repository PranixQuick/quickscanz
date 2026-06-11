"use client";
// useBiometric — WebAuthn credential-based app lock.
// Creates a platform authenticator credential on first use (registration),
// then uses it to authenticate on subsequent app opens.
// Falls back silently on unsupported devices (old Android WebView, Firefox
// on some platforms). Never blocks the user — biometric is opt-in.

import { useState, useEffect, useCallback } from "react";

const RP_ID   = typeof window !== "undefined" ? window.location.hostname : "quickscanz.com";
const RP_NAME = "QuickScanZ";
const STORAGE_KEY = "qsz_bio_cred"; // stores base64url credential id only

function buf2b64(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64toBuf(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export type BiometricState =
  | "unsupported"   // WebAuthn not available
  | "unenrolled"    // supported but user hasn't registered yet
  | "enrolled"      // credential registered, ready to authenticate
  | "authenticated" // passed this session
  | "error";        // registration/auth failed

export function useBiometric() {
  const [state, setState]       = useState<BiometricState>("unenrolled");
  const [supported, setSupported] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Detect support + read stored credential id on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      !!(window.PublicKeyCredential) &&
      !!(navigator.credentials?.create) &&
      !!(navigator.credentials?.get);
    setSupported(ok);
    if (!ok) { setState("unsupported"); return; }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setState(stored ? "enrolled" : "unenrolled");
    } catch {
      setState("unenrolled");
    }
  }, []);

  // Register a new biometric credential
  const register = useCallback(async () => {
    if (!supported) return;
    setLoading(true); setError(null);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId    = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { id: RP_ID, name: RP_NAME },
          user: { id: userId, name: "user", displayName: "QuickScanZ User" },
          pubKeyCredParams: [
            { type: "public-key", alg: -7  }, // ES256
            { type: "public-key", alg: -257 }, // RS256 (Windows Hello)
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error("No credential returned");
      const credId = buf2b64(credential.rawId);
      localStorage.setItem(STORAGE_KEY, credId);
      setState("authenticated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      // User cancelled — not an error we surface loudly
      if (msg.includes("NotAllowedError") || msg.includes("cancelled")) {
        setState("unenrolled");
      } else {
        setError(msg); setState("error");
      }
    } finally {
      setLoading(false);
    }
  }, [supported]);

  // Authenticate using stored credential
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!supported) return true; // unsupported → treat as passed
    const storedId = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
    if (!storedId) { setState("unenrolled"); return false; }

    setLoading(true); setError(null);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: "public-key", id: b64toBuf(storedId) }],
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error("No credential");
      setState("authenticated");
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      if (!msg.includes("NotAllowedError") && !msg.includes("cancelled")) {
        setError(msg);
      }
      setState("enrolled"); // stay enrolled — user can retry
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  // Remove stored credential (disable biometric)
  const unenroll = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    setState("unenrolled");
  }, []);

  return { state, supported, loading, error, register, authenticate, unenroll };
}
