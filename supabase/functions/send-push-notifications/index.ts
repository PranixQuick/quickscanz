// supabase/functions/send-push-notifications/index.ts
// Deploy: supabase functions deploy send-push-notifications
// Env vars needed: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@quickscanz.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── VAPID helpers (Web Crypto API) ────────────────────────────────────────
async function importVapidKey(base64Key: string, usage: KeyUsage): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(base64Key.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "raw", keyData,
    { name: "ECDH", namedCurve: "P-256" },
    false, [usage]
  );
}

async function buildVapidAuthHeader(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/=/g, "");
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: VAPID_SUBJECT,
  })).replace(/=/g, "");

  const sigData = new TextEncoder().encode(`${header}.${payload}`);
  const privKeyData = Uint8Array.from(
    atob(VAPID_PRIVATE_KEY.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8", privKeyData.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, sigData);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `vapid t=${header}.${payload}.${sigB64},k=${VAPID_PUBLIC_KEY}`;
}

// ─── Send one push notification ─────────────────────────────────────────────
async function sendPush(
  endpoint: string,
  p256dh: string,
  authKey: string,
  payload: object
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const authHeader = await buildVapidAuthHeader(endpoint);
    const body = JSON.stringify(payload);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  // Validate request
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { type = "warranty_check", user_id, product_id, custom_message } = body;

  try {
    let pushCount = 0;
    const errors: string[] = [];

    if (type === "warranty_check") {
      // Get all expiring products and notify via push
      const { data: expiring } = await supabase
        .rpc("get_expiring_products", { days_ahead: 30 });

      if (!expiring || expiring.length === 0) {
        return new Response(JSON.stringify({ pushed: 0 }), { headers: { "Content-Type": "application/json" } });
      }

      // Group by user
      const byUser = new Map<string, typeof expiring>();
      for (const p of expiring) {
        if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
        byUser.get(p.user_id)!.push(p);
      }

      for (const [userId, products] of byUser) {
        // Get push subscriptions for this user
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth_key")
          .eq("user_id", userId);

        if (!subs || subs.length === 0) continue;

        const firstProduct = products[0];
        const notifPayload = {
          title: products.length === 1
            ? `⏰ ${firstProduct.brand} ${firstProduct.product_name} expires in ${firstProduct.days_remaining} days`
            : `⏰ ${products.length} warranties expiring soon`,
          body: products.length === 1
            ? "Tap to view details and start a claim if needed."
            : products.map((p: { brand: string; product_name: string; days_remaining: number }) => `${p.brand} ${p.product_name} (${p.days_remaining}d)`).join(", "),
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          url: products.length === 1 ? `/products/${firstProduct.product_id}` : "/products",
          tag: "warranty-expiry",
          requireInteraction: firstProduct.days_remaining <= 7,
        };

        for (const sub of subs) {
          const result = await sendPush(sub.endpoint, sub.p256dh, sub.auth_key, notifPayload);
          if (result.ok) {
            pushCount++;
          } else {
            // Remove invalid subscriptions (410 Gone)
            if (result.status === 410) {
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
            errors.push(`${sub.endpoint.slice(0, 40)}... : ${result.error}`);
          }
        }
      }
    } else if (type === "service_reminder" && user_id) {
      // Service due reminders
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth_key")
        .eq("user_id", user_id);

      if (subs && subs.length > 0) {
        const payload = {
          title: "🔧 Device service due",
          body: custom_message || "One or more smart devices need servicing. Tap to view.",
          icon: "/icons/icon-192.png",
          url: "/smart-devices",
          tag: "service-reminder",
        };
        for (const sub of subs) {
          const r = await sendPush(sub.endpoint, sub.p256dh, sub.auth_key, payload);
          if (r.ok) pushCount++;
        }
      }
    }

    console.log(`[push-notifications] Sent ${pushCount} push notifications`);
    return new Response(JSON.stringify({ pushed: pushCount, errors }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[push-notifications] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
