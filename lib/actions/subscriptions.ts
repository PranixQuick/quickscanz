"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_inr: number;
  interval: "monthly" | "yearly";
  product_limit: number;
  features: string[];
  razorpay_plan_id: string | null;
}

export interface UserSubscription {
  id: string;
  plan_id: string;
  status: "active" | "cancelled" | "expired" | "trial";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan: SubscriptionPlan;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_inr");
  return (data || []) as SubscriptionPlan[];
}

export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle(); // BUG-006 fix: .single() throws on no row; .maybeSingle() returns null safely

  return data as UserSubscription | null;
}

export async function createRazorpayOrder(
  planId: string,
  currency: string = "INR"
): Promise<{ orderId: string; amount: number; currency: string; key: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: plan } = await supabase
    .from("subscription_plans").select("*").eq("id", planId).single();
  if (!plan || plan.price_inr === 0) return { error: "Invalid plan" };

  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error("[Razorpay] Keys not set in Vercel environment variables");
    return { error: "Payment not configured — please contact support" };
  }

  if (!RAZORPAY_KEY_ID.startsWith("rzp_live_") && !RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
    console.error("[Razorpay] Invalid key format:", RAZORPAY_KEY_ID.slice(0, 12));
    return { error: "Payment configuration error — please contact support" };
  }

  let amount = plan.price_inr * 100;
  if (currency !== "INR") {
    const priceVal = plan.interval === "yearly"
      ? (currency === "USD" ? 11.99 : 10.99)
      : (currency === "USD" ? 1.99 : 1.89);
    amount = Math.round(priceVal * 100);
  }
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  let orderRes: Response;
  try {
    orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount, currency: currency,
        receipt: `qs_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, plan_id: planId },
      }),
    });
  } catch (fetchErr) {
    console.error("[Razorpay] Network error:", fetchErr);
    return { error: "Could not reach payment server — check your internet and retry" };
  }

  if (!orderRes.ok) {
    const errBody = await orderRes.text();
    let friendlyError = "Payment initiation failed — please try again";
    try {
      const parsed = JSON.parse(errBody);
      const code = parsed?.error?.code || "";
      const description = parsed?.error?.description || "";
      console.error("[Razorpay] Order creation failed:", { httpStatus: orderRes.status, errorCode: code, description, keyPrefix: RAZORPAY_KEY_ID.slice(0, 12) + "...", planId, amountPaise });
      if (orderRes.status === 401) friendlyError = "Payment credentials are invalid — please contact support";
      else if (code === "BAD_REQUEST_ERROR" && description.toLowerCase().includes("amount")) friendlyError = "Invalid payment amount — please contact support";
      else if (code === "GATEWAY_ERROR") friendlyError = "Payment gateway error — please try again in a moment";
    } catch {
      console.error("[Razorpay] Order error (raw):", orderRes.status, errBody.slice(0, 500));
    }
    return { error: friendlyError };
  }

  const order = await orderRes.json();
  // user_subscriptions is SELECT-only under RLS (P0 lockdown), so the user's own
  // client cannot insert this pending row. Write it with the service role instead:
  // user.id comes from the verified session above (cannot be forged), and the status
  // is fixed to 'trial' so this path can never self-grant an 'active' subscription.
  // Prefer the product-specific key. In the shared Doppler vault the plain
  // SUPABASE_SERVICE_ROLE_KEY points at a DIFFERENT project (pranix-agents),
  // while Quickscanz's real key is SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY.
  const SERVICE_ROLE_KEY =
    process.env.SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE_KEY) {
    console.error("[Razorpay] No service-role key found (SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY) — cannot record the pending subscription.");
    return { error: "Payment not configured — please contact support" };
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVICE_ROLE_KEY
  );
  const { error: pendingErr } = await admin.from("user_subscriptions").upsert(
    { user_id: user.id, plan_id: planId, status: "trial", razorpay_order_id: order.id },
    { onConflict: "user_id" }
  );
  if (pendingErr) {
    console.error("[Razorpay] Failed to record pending subscription:", pendingErr.message);
    return { error: "Could not start checkout — please try again" };
  }
  return { orderId: order.id, amount: amount, currency: currency, key: RAZORPAY_KEY_ID };
}

export async function verifyRazorpayPayment(params: {
  orderId: string; paymentId: string; signature: string; planId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET) return { success: false, error: "Payment not configured" };

  const body = `${params.orderId}|${params.paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(RAZORPAY_KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedSignature !== params.signature) {
    console.error("[Razorpay] Signature mismatch", { orderId: params.orderId, paymentId: params.paymentId });
    return { success: false, error: "Payment verification failed" };
  }

  const now = new Date();
  const { data: plan } = await supabase.from("subscription_plans").select("interval").eq("id", params.planId).single();
  const periodEnd = new Date(now);
  if (plan?.interval === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error } = await supabase.from("user_subscriptions").update({
    status: "active", plan_id: params.planId,
    razorpay_payment_id: params.paymentId, razorpay_order_id: params.orderId,
    current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  }).eq("user_id", user.id);

  if (error) {
    console.error("[Razorpay] Failed to activate subscription:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/pricing");
  return { success: true };
}

// ── Redirect-based checkout (TWA/WebView safe) ────────────────────────────────
// Works in Android TWA, iOS PWA standalone, and all browsers.
// No window.open(), no JS modal — full-page redirect to Razorpay hosted checkout.
export async function createRazorpayRedirectUrl(
  planId: string,
  currency: string = "INR"
): Promise<{ redirectUrl: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: plan } = await supabase
    .from("subscription_plans").select("*").eq("id", planId).single();
  if (!plan || plan.price_inr === 0) return { error: "Invalid plan" };

  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)
    return { error: "Payment not configured — please contact support" };

  let amount = plan.price_inr * 100;
  if (currency !== "INR") {
    const priceVal = plan.interval === "yearly"
      ? (currency === "USD" ? 11.99 : 10.99)
      : (currency === "USD" ? 1.99 : 1.89);
    amount = Math.round(priceVal * 100);
  }
  // Return the user to the exact host they're on (e.g. www.quickscanz.com), so the
  // post-payment redirect + session/entitlement stay on the same origin. Avoids the
  // old NEXT_PUBLIC_APP_URL (which pointed at the vercel.app domain).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "https://www.quickscanz.com");
  // Razorpay embedded checkout POSTs the result here; must be the POST route (not the GET page).
  const callbackUrl = `${appUrl}/api/payment/callback?plan_id=${planId}`;
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  let orderRes: Response;
  try {
    orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount, currency: currency,
        receipt: `qs_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, plan_id: planId },
      }),
    });
  } catch {
    return { error: "Could not reach payment server — check your connection and retry" };
  }

  if (!orderRes.ok) {
    const errText = await orderRes.text();
    console.error("[Razorpay] Order creation failed:", orderRes.status, errText.slice(0, 300));
    return { error: "Payment initiation failed — please try again" };
  }

  const order = await orderRes.json();
  // user_subscriptions is SELECT-only under RLS (P0 lockdown), so the user's own
  // client cannot insert this pending row. Write it with the service role instead:
  // user.id comes from the verified session above (cannot be forged), and the status
  // is fixed to 'trial' so this path can never self-grant an 'active' subscription.
  // Prefer the product-specific key. In the shared Doppler vault the plain
  // SUPABASE_SERVICE_ROLE_KEY points at a DIFFERENT project (pranix-agents),
  // while Quickscanz's real key is SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY.
  const SERVICE_ROLE_KEY =
    process.env.SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE_KEY) {
    console.error("[Razorpay] No service-role key found (SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY) — cannot record the pending subscription.");
    return { error: "Payment not configured — please contact support" };
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVICE_ROLE_KEY
  );
  const { error: pendingErr } = await admin.from("user_subscriptions").upsert(
    { user_id: user.id, plan_id: planId, status: "trial", razorpay_order_id: order.id },
    { onConflict: "user_id" }
  );
  if (pendingErr) {
    console.error("[Razorpay] Failed to record pending subscription:", pendingErr.message);
    return { error: "Could not start checkout — please try again" };
  }

  const searchParams = new URLSearchParams({
    key_id: RAZORPAY_KEY_ID, order_id: order.id,
    amount: String(amount), currency: currency,
    name: "QuickScanZ", description: `${plan.name} — ${plan.interval} plan`,
    prefill_email: user.email || "",
    callback_url: callbackUrl,
    cancel_url: `${appUrl}/pricing?cancelled=1&currency=${currency}`,
  });

  return { redirectUrl: `https://api.razorpay.com/v1/checkout/embedded?${searchParams.toString()}` };
}
