// supabase/functions/send-warranty-emails/index.ts
// Deploy: supabase functions deploy send-warranty-emails
// Env vars needed in Supabase secrets:
//   RESEND_API_KEY       — from resend.com (free: 3000 emails/month)
//   SUPABASE_URL         — auto-available in edge functions
//   SUPABASE_SERVICE_ROLE_KEY — auto-available in edge functions
//   CRON_SECRET          — any random string you set (used to authorise cron trigger)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const FROM_EMAIL = "QuickScanZ <noreply@quickscanz.com>";
const APP_URL = "https://quickscanz.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ExpiringProduct {
  product_id: string;
  user_id: string;
  user_email: string;
  product_name: string;
  brand: string;
  expiry_date: string;
  days_remaining: number;
}

function warrantyEmailHtml(product: ExpiringProduct): string {
  const urgency = product.days_remaining <= 7 ? "🚨 Critical" : "⚠️ Reminder";
  const urgencyColor = product.days_remaining <= 7 ? "#d95f54" : "#d97706";
  const expiryFormatted = new Date(product.expiry_date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdfcf8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfcf8;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e8dfd0;overflow:hidden;">
        <tr><td style="background:#1a1612;padding:24px 32px;">
          <p style="margin:0;color:#fdfcf8;font-size:20px;font-weight:300;">QuickScanZ</p>
          <p style="margin:4px 0 0;color:#9a8f83;font-size:12px;">Your Warranty Wallet</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${urgencyColor};">${urgency}</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:300;color:#1a1612;line-height:1.3;">
            Your ${product.brand} ${product.product_name} warranty expires in ${product.days_remaining} day${product.days_remaining !== 1 ? "s" : ""}
          </h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2eb;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#1a1612;">${product.brand} ${product.product_name}</p>
              <p style="margin:0;font-size:12px;color:#786e62;">Expires: <strong style="color:${urgencyColor};">${expiryFormatted}</strong></p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:8px;">
                <a href="${APP_URL}/claim" style="display:block;background:#1a1612;color:#fdfcf8;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;text-align:center;">Start Warranty Claim</a>
              </td>
              <td style="padding-left:8px;">
                <a href="${APP_URL}/products" style="display:block;background:#f7f2eb;color:#1a1612;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;text-align:center;border:1px solid #e8dfd0;">View Products</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e8dfd0;">
          <p style="margin:0;font-size:11px;color:#c9bfb3;text-align:center;">
            You receive this because you track this product on QuickScanZ.
            <a href="${APP_URL}/account" style="color:#c9bfb3;">Manage notifications</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[warranty-emails] Resend error:", res.status, text);
  }
  return res.ok;
}

Deno.serve(async (req) => {
  // Accept POST from pg_cron via http extension, or manual trigger
  const cronKey = req.headers.get("x-cron-key");
  if (req.method !== "POST" && cronKey !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Use direct SQL query instead of RPC (more reliable)
    const { data: expiring, error } = await supabase
      .from("products")
      .select(`
        id,
        user_id,
        name,
        brand,
        expiry_date
      `)
      .gte("expiry_date", new Date().toISOString().split("T")[0])
      .lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .eq("is_demo", false);

    if (error) throw error;
    if (!expiring || expiring.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No expiring products" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const product of expiring) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(product.user_id);
      if (!userData?.user?.email) continue;

      const daysRemaining = Math.ceil(
        (new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Check if already notified within last 7 days
      const { data: existing } = await supabase
        .from("notification_queue")
        .select("id")
        .eq("user_id", product.user_id)
        .eq("product_id", product.id)
        .eq("sent", true)
        .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (existing) continue; // Skip if notified recently

      const type = daysRemaining <= 7 ? "7_days" : "30_days";
      const subject = daysRemaining <= 7
        ? `🚨 ${product.brand} ${product.name} warranty expires in ${daysRemaining} days!`
        : `⚠️ ${product.brand} ${product.name} warranty expires in 30 days`;

      const productData: ExpiringProduct = {
        product_id: product.id,
        user_id: product.user_id,
        user_email: userData.user.email,
        product_name: product.name,
        brand: product.brand,
        expiry_date: product.expiry_date,
        days_remaining: daysRemaining,
      };

      const ok = await sendEmail(userData.user.email, subject, warrantyEmailHtml(productData));

      if (ok) {
        await supabase.from("notification_queue").upsert({
          user_id: product.user_id,
          product_id: product.id,
          email: userData.user.email,
          type,
          product_name: product.name,
          brand: product.brand,
          expiry_date: product.expiry_date,
          sent: true,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        }, { onConflict: "user_id,product_id" });
        sent++;
      } else {
        errors.push(`Failed: ${userData.user.email} / ${product.name}`);
      }
    }

    console.log(`[warranty-emails] Sent ${sent}/${expiring.length} emails`);
    return new Response(JSON.stringify({ sent, total: expiring.length, errors }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[warranty-emails] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
