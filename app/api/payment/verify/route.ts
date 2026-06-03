import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { protocol } from "@/lib/protocol-core";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET)
    return NextResponse.json({ success: false, error: "Payment not configured" }, { status: 500 });

  let body: { orderId?: string; paymentId?: string; signature?: string; planId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 }); }

  const { orderId, paymentId, signature, planId } = body;
  if (!orderId || !paymentId || !signature || !planId)
    return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });

  const signatureBody = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signatureBody));
  const expectedSig = Array.from(new Uint8Array(sigBuffer as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedSig !== signature)
    return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });

  const { data: plan } = await supabase
    .from("subscription_plans").select("interval").eq("id", planId).single();

  const now = new Date();
  const periodEnd = new Date(now);
  if (plan?.interval === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error } = await supabase.from("user_subscriptions").update({
    status: "active", plan_id: planId,
    razorpay_payment_id: paymentId, razorpay_order_id: orderId,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  }).eq("user_id", user.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  // Protocol Core — fire-and-forget evidence for a verified payment / activated subscription.
  // Best-effort only: never awaited, never throws into the request path; no retries, no queues.
  // protocol is null unless PRANIX_PROTOCOL_ENDPOINT + PRANIX_PROTOCOL_TOKEN are set (inert otherwise).
  protocol?.evidence.emit({
    proves: `payment_verified razorpay order:${orderId} payment:${paymentId} plan:${planId}`,
    sourceTable: "user_subscriptions",
    sourceId: paymentId,
    success: true,
  }).catch(() => {});

  revalidatePath("/account");
  revalidatePath("/pricing");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
