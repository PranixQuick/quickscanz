import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const planId = req.nextUrl.searchParams.get("plan_id");
  const currency = req.nextUrl.searchParams.get("currency") || "INR";

  if (!token || !planId) {
    return new NextResponse("Missing token or plan_id parameters", { status: 400 });
  }

  // Validate the user token using Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new NextResponse("Authentication failed or expired. Please sign in again.", { status: 401 });
  }

  // Service role key to read plan and write subscription record
  const SERVICE_ROLE_KEY =
    process.env.SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE_KEY) {
    console.error("[checkout-redirect] No service-role key found (SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY).");
    return new NextResponse("Payment not configured — please contact support", { status: 500 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      }
    }
  );

  const { data: plan } = await admin
    .from("subscription_plans").select("*").eq("id", planId).single();
  if (!plan || plan.price_inr === 0) {
    return new NextResponse("Invalid plan", { status: 400 });
  }

  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return new NextResponse("Payment gateway not configured on server", { status: 500 });
  }

  let amount = plan.price_inr * 100;
  if (currency !== "INR") {
    const priceVal = plan.interval === "yearly"
      ? (currency === "USD" ? 11.99 : 10.99)
      : (currency === "USD" ? 1.99 : 1.89);
    amount = Math.round(priceVal * 100);
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "https://www.quickscanz.com");
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
  } catch (err) {
    console.error("[checkout-redirect] Razorpay network error:", err);
    return new NextResponse("Could not reach payment server — please try again", { status: 500 });
  }

  if (!orderRes.ok) {
    const errText = await orderRes.text();
    console.error("[checkout-redirect] Order creation failed:", orderRes.status, errText.slice(0, 300));
    return new NextResponse("Payment gateway initialization failed", { status: 500 });
  }

  const order = await orderRes.json();

  const { error: pendingErr } = await admin.from("user_subscriptions").upsert(
    { user_id: user.id, plan_id: planId, status: "trial", razorpay_order_id: order.id },
    { onConflict: "user_id" }
  );
  if (pendingErr) {
    console.error("[checkout-redirect] Failed to record pending subscription:", pendingErr.message);
    return new NextResponse("Could not record subscription transaction", { status: 500 });
  }

  const params = {
    key_id: RAZORPAY_KEY_ID,
    order_id: order.id,
    amount: String(amount),
    currency: currency,
    name: "QuickScanZ",
    description: `${plan.name} — ${plan.interval} plan`,
    prefill_email: user.email || "",
    callback_url: callbackUrl,
    cancel_url: `${appUrl}/pricing?cancelled=1`,
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecting to Payment...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #fdfcf8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
          color: #1a1612;
        }
        .spinner {
          border: 4px solid rgba(11, 110, 79, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #0B6E4F;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { margin-top: 16px; font-size: 14px; font-weight: 500; }
      </style>
    </head>
    <body onload="document.forms[0].submit()">
      <div class="spinner"></div>
      <p>Redirecting to secure payment gateway...</p>
      <form method="POST" action="https://api.razorpay.com/v1/checkout/embedded">
        ${Object.entries(params)
          .map(([key, val]) => `<input type="hidden" name="${key}" value="${val.replace(/"/g, '&quot;')}" />`)
          .join("\n")}
      </form>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" }
  });
}
