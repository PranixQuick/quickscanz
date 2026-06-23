import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { protocol } from "@/lib/protocol-core";

// Razorpay's hosted /v1/checkout/embedded POSTs the payment result (form-encoded)
// to callback_url AFTER the bank page. This MUST be a POST route handler:
//   • a Next.js page (app/payment/callback/page.tsx) is GET-only → that POST 405s.
//   • the cross-site POST does not carry the SameSite=Lax Supabase session cookie,
//     so we identify the subscription by razorpay_order_id (written at order creation)
//     and use the service role — never getUser().
// On success we 303-redirect (POST → GET) to /account so the user lands on a real page.
// The webhook (payment.captured) independently activates via service role; this route
// converges to the same active state (idempotent, last-write-wins on the same order).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appBase(req: NextRequest): string {
  // Use the host this callback arrived on (matches the checkout origin we sent to
  // Razorpay), so the user is redirected back to the same site they paid from.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.quickscanz.com";
}

export async function POST(req: NextRequest) {
  const base = appBase(req);
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/pricing?error=${reason}`, base), 303);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("verification");
  }

  const orderId = String(form.get("razorpay_order_id") || "");
  const paymentId = String(form.get("razorpay_payment_id") || "");
  const signature = String(form.get("razorpay_signature") || "");
  const planIdFromQuery = req.nextUrl.searchParams.get("plan_id") || "";

  if (!orderId || !paymentId || !signature) return fail("verification");

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET) return fail("config");

  // Verify Razorpay payment signature: HMAC-SHA256(order_id|payment_id)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
  const expectedSig = Array.from(new Uint8Array(sigBuffer as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expectedSig !== signature) return fail("verification");

  // Service role: the redirect POST has no user session. The user_subscriptions row
  // was upserted (status=trial) at order time keyed by razorpay_order_id.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Resolve the plan: prefer the query plan_id, fall back to the row created at order time.
  let planId = planIdFromQuery;
  if (!planId) {
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("razorpay_order_id", orderId)
      .single();
    planId = existing?.plan_id || "";
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("interval")
    .eq("id", planId)
    .single();

  const now = new Date();
  const periodEnd = new Date(now);
  if (plan?.interval === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const patch: Record<string, unknown> = {
    status: "active",
    razorpay_payment_id: paymentId,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  };
  if (planId) patch.plan_id = planId;

  const { error } = await supabase
    .from("user_subscriptions")
    .update(patch)
    .eq("razorpay_order_id", orderId);

  if (error) {
    console.error("[payment/callback] activation failed:", error.message);
    return fail("activation");
  }

  // Protocol Core — fire-and-forget evidence for a verified payment. Inert unless configured.
  protocol?.evidence
    .emit({
      proves: `payment_verified razorpay order:${orderId} payment:${paymentId} plan:${planId}`,
      sourceTable: "user_subscriptions",
      sourceId: paymentId,
      success: true,
    })
    .catch(() => {});

  return NextResponse.redirect(new URL("/account?upgraded=1", base), 303);
}
