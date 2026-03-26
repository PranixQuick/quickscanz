export async function createRazorpayRedirectUrl(
  planId: string
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

  const amountPaise = plan.price_inr * 100;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://quickscanz.com";
  const callbackUrl = `${appUrl}/payment/callback?plan_id=${planId}`;
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  let orderRes: Response;
  try {
    orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountPaise, currency: "INR",
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
  await supabase.from("user_subscriptions").upsert(
    { user_id: user.id, plan_id: planId, status: "trial", razorpay_order_id: order.id },
    { onConflict: "user_id" }
  );

  const params = new URLSearchParams({
    key_id: RAZORPAY_KEY_ID, order_id: order.id,
    amount: String(amountPaise), currency: "INR",
    name: "QuickScanZ", description: `${plan.name} — ${plan.interval} plan`,
    prefill_email: user.email || "",
    callback_url: callbackUrl,
    cancel_url: `${appUrl}/pricing?cancelled=1`,
  });

  return { redirectUrl: `https://api.razorpay.com/v1/checkout/embedded?${params.toString()}` };
}
