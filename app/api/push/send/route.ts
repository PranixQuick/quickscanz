// /api/push/send
// Called by pg_cron via pg_net every day at 9am IST.
// Verifies x-cron-secret, looks up Web Push subscription for the user,
// sends a Web Push notification via the web-push library.
//
// Env vars required:
//   CRON_SECRET          — matches app.cron_secret in Postgres
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_EMAIL

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? "support@quickscanz.com"}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

export async function POST(req: NextRequest) {
  // 1. Verify cron secret — reject anything without it
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    user_id: string;
    product_id: string;
    product_name: string;
    brand: string;
    days_left: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, product_name, brand, days_left } = body;
  if (!user_id || !product_name || days_left == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 2. Fetch all push subscriptions for this user
  const supabase = await createClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", user_id);

  if (error || !subs?.length) {
    // User has no push subscription registered — not an error, just skip
    return NextResponse.json({ skipped: true, reason: "no_subscription" });
  }

  // 3. Build notification payload
  const urgency = days_left <= 1 ? "high" : days_left <= 7 ? "normal" : "low";
  const title = days_left === 1
    ? `⚠️ Last day! ${brand} ${product_name} warranty expires today`
    : `⏰ ${brand} ${product_name} warranty ends in ${days_left} day${days_left === 1 ? "" : "s"}`;
  const notifPayload = JSON.stringify({
    title,
    body: days_left <= 7
      ? "Tap to file a claim or extend your warranty now."
      : "Tap to review your warranty details.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `warranty-${body.product_id}`,       // replaces previous notif for same product
    renotify: days_left <= 7,                 // re-alert even if same tag
    data: { url: `/products/${body.product_id}` },
  });

  // 4. Send to all registered endpoints (user may have phone + laptop)
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        notifPayload,
        { urgency, TTL: 86400 }
      )
    )
  );

  const sent    = results.filter((r) => r.status === "fulfilled").length;
  const failed  = results.filter((r) => r.status === "rejected").length;

  // 5. Clean up expired subscriptions (410 Gone responses)
  const expiredEndpoints: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = (r as PromiseRejectedResult).reason;
      if (err?.statusCode === 410) expiredEndpoints.push(subs[i].endpoint);
    }
  });
  if (expiredEndpoints.length) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({ sent, failed, expired_cleaned: expiredEndpoints.length });
}
