import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

/**
 * Native push registration (M3).
 *
 * SCHEMA / DELIVERY MISMATCH — read before trusting this in production:
 *
 * 1. `public.push_subscriptions` (supabase/migrations/20260612_bootstrap_
 *    quickscanz_schema.sql) is shaped for **Web Push/VAPID**:
 *    `endpoint` (unique), `p256dh` (not null), `auth_key` (not null). Expo
 *    push tokens are a single opaque string (`ExponentPushToken[...]`) with
 *    no p256dh/auth keypair, so they don't map cleanly onto those NOT NULL
 *    columns. This module upserts a row anyway (endpoint = `expo:<token>`,
 *    p256dh/auth_key filled with a placeholder) purely so the token is
 *    durably stored somewhere keyed by user_id — treat the placeholder
 *    columns as unused padding, not real crypto material. It intentionally
 *    does NOT reuse the web `POST /api/push` route, since that route
 *    validates `keys.p256dh`/`keys.auth` and would reject an Expo token's
 *    shape outright; this writes straight to the table via the native
 *    supabase client instead (RLS-scoped to the signed-in user, same
 *    `auth.uid() = user_id` pattern as every other user-owned table here).
 *
 * 2. More importantly: the *actual* send pipeline
 *    (supabase/functions/send-push-notifications/index.ts) does not read
 *    push_subscriptions at all — it sends via **OneSignal**, addressed by
 *    `include_external_user_ids: [supabase user.id]`. Writing an Expo token
 *    into push_subscriptions will not, by itself, cause this user to
 *    receive a push from that function.
 *
 * FOLLOW-UP NEEDED (outside this native-only branch): either (a) add a
 * small Expo Push API sender (POST to https://exp.host/--/api/v2/push/send)
 * that reads whichever table ends up storing these tokens, or (b) integrate
 * the OneSignal Expo plugin on native and call
 * `OneSignal.login(supabaseUserId)` so tokens land directly in OneSignal and
 * ride the existing send-push-notifications function for free — probably
 * the lower-effort correct fix given OneSignal is already the production
 * delivery mechanism. Until one of those lands, this module registers a
 * real Expo push token and persists it, but nothing will actually deliver a
 * notification to it yet.
 *
 * Also note `app.json`'s `extra.eas.projectId` is still the scaffold
 * placeholder (`REPLACE_WITH_EAS_PROJECT_ID`) — `getExpoPushTokenAsync`
 * needs a real EAS project id to mint a usable token outside Expo Go.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("warranty-alerts", {
        name: "Warranty alerts",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenResponse.data;
    if (!token) return null;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: `expo:${token}`,
        p256dh: "expo-push-token",
        auth_key: "expo-push-token",
        user_agent: `expo-native/${Platform.OS}`,
      },
      { onConflict: "endpoint" }
    );
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[push] Failed to persist Expo push token:", error.message);
      return null;
    }

    return token;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] Registration failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
