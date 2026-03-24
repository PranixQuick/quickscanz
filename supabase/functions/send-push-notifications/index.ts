// supabase/functions/send-push-notifications/index.ts
// Deploy: supabase functions deploy send-push-notifications
//
// ── NOTIFICATION STRATEGY ────────────────────────────────────────────────────
// VAPID Web Push has regional issues + complex Deno crypto.
// We use OneSignal REST API instead:
//   - Free tier: 10,000 notifications/month
//   - No VAPID keys needed
//   - Works perfectly from Deno edge functions
//   - OneSignal handles all platform differences (Android, iOS, Web)
//
// SETUP (5 min):
//   1. Sign up at onesignal.com → Create App → Web Push
//   2. Set Site URL: https://quickscanz.com
//   3. Get: App ID and REST API Key from Settings → Keys & IDs
//   4. Add to Supabase secrets:
//      ONESIGNAL_APP_ID     = your-app-id
//      ONESIGNAL_API_KEY    = your-rest-api-key
//      SUPABASE_URL         = auto-available
//      SUPABASE_SERVICE_ROLE_KEY = auto-available
//      CRON_SECRET          = any random string
//
// NOTE: When using OneSignal, the frontend push subscription is handled by
// the OneSignal SDK (1 script tag in layout.tsx). The existing custom VAPID
// subscription code in NotificationSettings.tsx becomes the OneSignal variant below.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

async function sendPushToUser(externalUserId: string, payload: PushPayload): Promise<boolean> {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [externalUserId],
      headings: { en: payload.title },
      contents: { en: payload.body },
      url: payload.url,
      chrome_web_icon: payload.icon || "/icons/icon-192.png",
      chrome_web_badge: "/icons/icon-192.png",
      // Android channel
      android_channel_id: "warranty-alerts",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[push] OneSignal error:", res.status, text);
    return false;
  }
  const json = await res.json();
  // OneSignal returns errors array for invalid external user IDs
  return !json.errors || json.errors.length === 0;
}

async function sendPushToAll(payload: PushPayload): Promise<{ sent: number }> {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: payload.title },
      contents: { en: payload.body },
      url: payload.url,
      chrome_web_icon: payload.icon || "/icons/icon-192.png",
    }),
  });
  if (!res.ok) return { sent: 0 };
  const json = await res.json();
  return { sent: json.recipients || 0 };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const cronKey = req.headers.get("x-cron-key");
  const body = await req.json().catch(() => ({}));
  const { type = "warranty_check", user_id, custom_message } = body;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    return new Response(JSON.stringify({ error: "OneSignal credentials not set" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let pushCount = 0;

    if (type === "warranty_check") {
      // Get products expiring in 30 days
      const { data: expiring } = await supabase
        .from("products")
        .select("id, user_id, name, brand, expiry_date")
        .gte("expiry_date", new Date().toISOString().split("T")[0])
        .lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .eq("is_demo", false);

      if (!expiring || expiring.length === 0) {
        return new Response(JSON.stringify({ pushed: 0, message: "No expiring products" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Group by user
      const byUser = new Map<string, typeof expiring>();
      for (const p of expiring) {
        if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
        byUser.get(p.user_id)!.push(p);
      }

      for (const [userId, products] of byUser) {
        const first = products[0];
        const daysRemaining = Math.ceil(
          (new Date(first.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const payload: PushPayload = products.length === 1
          ? {
              title: `⏰ ${first.brand} ${first.name} expires in ${daysRemaining} days`,
              body: "Tap to view details and start a claim if needed.",
              url: `https://quickscanz.com/products/${first.id}`,
            }
          : {
              title: `⏰ ${products.length} warranties expiring soon`,
              body: products.map((p) => `${p.brand} ${p.name}`).join(", "),
              url: "https://quickscanz.com/products",
            };

        // In OneSignal, external_user_id = Supabase user.id (set during subscription)
        const ok = await sendPushToUser(userId, payload);
        if (ok) pushCount++;
      }
    } else if (type === "service_reminder" && user_id) {
      const ok = await sendPushToUser(user_id, {
        title: "🔧 Device service due",
        body: custom_message || "One or more devices need servicing.",
        url: "https://quickscanz.com/smart-devices",
      });
      if (ok) pushCount++;
    }

    console.log(`[push-notifications] Sent ${pushCount} push notifications`);
    return new Response(JSON.stringify({ pushed: pushCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[push-notifications] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
