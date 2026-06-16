import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { smsProvider } from "@/lib/sms/sms-provider";

export async function POST(request: NextRequest) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    console.error("SMS webhook secret missing. Webhook is failing closed.");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  // Strip prefix "v1,whsec_" if present to extract pure base64 key
  let cleanSecret = secret;
  if (secret.startsWith("v1,whsec_")) {
    cleanSecret = secret.substring("v1,whsec_".length);
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Extract webhook headers
  const id = request.headers.get("webhook-id");
  const signature = request.headers.get("webhook-signature");
  const timestamp = request.headers.get("webhook-timestamp");

  if (!id || !signature || !timestamp) {
    console.warn("SMS webhook call missing signature headers, rejecting.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify signature using standard-webhooks
  try {
    const wh = new Webhook(cleanSecret);
    wh.verify(rawBody, {
      "webhook-id": id,
      "webhook-signature": signature,
      "webhook-timestamp": timestamp,
    });
  } catch (err) {
    console.warn("SMS webhook signature verification failed, rejecting request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse payload correctly according to Supabase Auth Hook schema
  try {
    const body = JSON.parse(rawBody);
    const phone = body.user?.phone;
    const code = body.sms?.otp;

    if (!phone || !code) {
      console.warn("Payload missing user phone or SMS OTP.");
      return NextResponse.json({ error: "Missing phone or code in payload" }, { status: 400 });
    }

    const success = await smsProvider.sendOTP(phone, code);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "SMS provider delivery failure" }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
