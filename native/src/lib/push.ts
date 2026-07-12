import { OneSignal } from "react-native-onesignal";

/**
 * Native push registration (OneSignal).
 *
 * WHY ONESIGNAL (not expo-notifications): the production send pipeline
 * (supabase/functions/send-push-notifications/index.ts, on main) sends
 * every notification through the OneSignal REST API, addressed by
 * `include_external_user_ids: [supabase user.id]`. That function does not
 * read expo push tokens or `public.push_subscriptions` at all. The old
 * expo-notifications-based implementation here stored a real Expo push
 * token, but nothing in the send pipeline ever delivered to it.
 *
 * With this module + `OneSignal.login(user.id)` (see
 * src/features/auth/AuthProvider.tsx), the device's OneSignal subscription
 * is tagged with `external_id = supabase user.id`. That's exactly what
 * `include_external_user_ids` targets server-side, so the existing edge
 * function reaches this device with zero changes on the backend.
 *
 * Requires `EXPO_PUBLIC_ONESIGNAL_APP_ID` (see native/.env.example — found
 * in OneSignal dashboard under Settings -> Keys & IDs -> App ID). This
 * module is defensive: if the env var is missing, it logs a warning and
 * no-ops instead of crashing, so the app still builds/runs without it.
 */

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

let initialized = false;

function ensureInitialized(): boolean {
  if (initialized) return true;

  if (!ONESIGNAL_APP_ID) {
    // eslint-disable-next-line no-console
    console.warn(
      "[push] EXPO_PUBLIC_ONESIGNAL_APP_ID is not set — OneSignal will not " +
        "initialize and push notifications are disabled. Set it in your " +
        ".env (see native/.env.example)."
    );
    return false;
  }

  try {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    initialized = true;
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] OneSignal.initialize failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Initializes OneSignal (if needed) and requests notification permission.
 * Safe to call multiple times; safe to call with no App ID configured.
 */
export async function registerPush(): Promise<boolean> {
  if (!ensureInitialized()) return false;

  try {
    await OneSignal.Notifications.requestPermission(true);
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] Failed to request notification permission:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Associates the current device's OneSignal subscription with the given
 * Supabase user id (OneSignal "external id"). This is what lets the
 * existing send-push-notifications edge function target this device via
 * `include_external_user_ids`.
 */
export function setPushExternalId(userId: string): void {
  if (!ensureInitialized()) return;

  try {
    OneSignal.login(userId);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] OneSignal.login failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Clears the external id association on sign-out so a shared/reused device
 * doesn't keep receiving the previous user's notifications.
 */
export function clearPushExternalId(): void {
  if (!initialized) return;

  try {
    OneSignal.logout();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] OneSignal.logout failed:", e instanceof Error ? e.message : e);
  }
}
