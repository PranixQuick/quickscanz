"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
    .single();

  return data as UserSubscription | null;
}

export async function createRazorpayOrder(
  planId: string
): Promise<{ orderId: string; amount: number; currency: string; key: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan || plan.price_inr === 0) return { error: "Invalid plan" };

  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return { error: "Payment not configured yet — contact support" };
  }

  const amountPaise = plan.price_inr * 100;
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: `qs_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, plan_id: planId },
    }),
  });

  if (!orderRes.ok) {
    const err = await orderRes.text();
    console.error("Razorpay order error:", err);
    return { error: "Payment initiation failed — try again" };
  }

  const order = await orderRes.json();

  // Save pending order to DB
  await supabase.from("user_subscriptions").upsert({
    user_id: user.id,
    plan_id: planId,
    status: "trial",
    razorpay_order_id: order.id,
  }, { onConflict: "user_id" });

  return {
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
    key: RAZORPAY_KEY_ID,
  };
}

export async function verifyRazorpayPayment(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  planId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET) return { success: false, error: "Payment not configured" };

  // Verify signature using Web Crypto
  const body = `${params.orderId}|${params.paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedSignature !== params.signature) {
    return { success: false, error: "Payment verification failed" };
  }

  // Activate subscription
  const now = new Date();
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("interval")
    .eq("id", params.planId)
    .single();

  const periodEnd = new Date(now);
  if (plan?.interval === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: "active",
      plan_id: params.planId,
      razorpay_payment_id: params.paymentId,
      razorpay_order_id: params.orderId,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/account");
  revalidatePath("/pricing");
  return { success: true };
}
