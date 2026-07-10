import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { protocol } from "@/lib/protocol-core";

export async function POST(req: NextRequest) {
  // Create supabase client INSIDE the handler — not at module level.
  // Module-level init crashes Next.js build because SUPABASE_SERVICE_ROLE_KEY
  // is not available during the build-time page data collection phase.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
  );

  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // Verify HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSig = Array.from(new Uint8Array(signatureBuffer as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedSig !== signature) {
    console.error("Webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload: any };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[razorpay-webhook] Event: ${event.event}`);

  switch (event.event) {
    case "payment.captured": {
      const payment = event.payload?.payment?.entity;
      if (!payment) break;

      const userId = payment.notes?.user_id;
      const planId = payment.notes?.plan_id;
      if (!userId || !planId) break;

      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("interval")
        .eq("id", planId)
        .single();

      const now = new Date();
      const periodEnd = new Date(now);
      if (plan?.interval === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      console.log(`[razorpay-webhook] Activated ${planId} for user ${userId}`);

      // Protocol Core — fire-and-forget evidence for a confirmed subscription payment.
      // Best-effort only: never awaited, never throws into the webhook path; no retries, no queues.
      // protocol is null unless PRANIX_PROTOCOL_ENDPOINT + PRANIX_PROTOCOL_TOKEN are set (inert otherwise).
      protocol?.evidence.emit({
        proves: `subscription_payment_confirmed razorpay payment:${payment.id} plan:${planId} user:${userId}`,
        sourceTable: "user_subscriptions",
        sourceId: payment.id,
        success: true,
      }).catch(() => {});

      break;
    }

    case "payment.failed": {
      const payment = event.payload?.payment?.entity;
      const userId = payment?.notes?.user_id;
      if (userId) {
        await supabase.from("user_subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("status", "trial");
      }
      break;
    }

    case "subscription.cancelled": {
      const sub = event.payload?.subscription?.entity;
      if (sub?.notes?.user_id) {
        await supabase.from("user_subscriptions")
          .update({ status: "cancelled", cancel_at_period_end: true, updated_at: new Date().toISOString() })
          .eq("user_id", sub.notes.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
