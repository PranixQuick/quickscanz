import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";

const SESSION_KEY = "quickscanz.biometric-session.v1";

/** Whether this device has biometric hardware AND at least one enrolled biometric. */
export async function hasBiometric(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/**
 * Persist a Supabase session in the OS keychain/keystore so it can later be
 * restored behind a biometric prompt (used right after a successful sign-in).
 */
export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Clear the biometric-gated session copy — call this on sign-out. */
export async function clearSavedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/**
 * Prompt Face/Touch ID (falling back to device passcode) and, on success,
 * return the previously saved session so it can be handed to
 * supabase.auth.setSession(). Returns null if there's nothing saved, or the
 * user cancels/fails the biometric prompt.
 */
export async function getSessionWithBiometric(): Promise<Session | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;

  const available = await hasBiometric();
  if (available) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock QuickScanZ",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    if (!result.success) return null;
  }

  try {
    return JSON.parse(stored) as Session;
  } catch {
    return null;
  }
}

/** Check if a session is currently saved in SecureStore. */
export async function hasSavedSession(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  return !!stored;
}

let appUnlocked = false;
let redirectPathAfterUnlock: string | null = null;

export function isAppUnlocked(): boolean {
  return appUnlocked;
}

export function setAppUnlocked(val: boolean): void {
  appUnlocked = val;
}

export function getRedirectPathAfterUnlock(): string | null {
  return redirectPathAfterUnlock;
}

export function setRedirectPathAfterUnlock(val: string | null): void {
  redirectPathAfterUnlock = val;
}

