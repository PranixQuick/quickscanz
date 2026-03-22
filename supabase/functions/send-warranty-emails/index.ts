// supabase/functions/send-warranty-emails/index.ts
// Deploy: supabase functions deploy send-warranty-emails
// Schedule: supabase functions deploy send-warranty-emails --schedule "0 8 * * *"
// Env vars needed: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
  has_push: boolean;
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
<body style="margin:0;padding:0;background:#fdfcf8;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfcf8;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e8dfd0;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1612;padding:24px 32px;">
            <p style="margin:0;color:#fdfcf8;font-size:20px;font-weight:300;letter-spacing:-0.5px;">QuickScanZ</p>
            <p style="margin:4px 0 0;color:#9a8f83;font-size:12px;">Your Warranty Wallet</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${urgencyColor};">${urgency}</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:300;color:#1a1612;line-height:1.3;">
              Your ${product.brand} ${product.product_name} warranty expires in ${product.days_remaining} day${product.days_remaining !== 1 ? "s" : ""}
            </h1>
            <!-- Product card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2eb;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#1a1612;">${product.brand} ${product.product_name}</p>
                  <p style="margin:0;font-size:12px;color:#786e62;">Warranty expires: <strong style="color:${urgencyColor};">${expiryFormatted}</strong></p>
                </td>
              </tr>
            </table>
            <!-- Action buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${APP_URL}/claim" style="display:block;background:#1a1612;color:#fdfcf8;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;text-align:center;">
                    Start Warranty Claim
                  </a>
                </td>
                <td style="padding-left:8px;">
                  <a href="${APP_URL}/products" style="display:block;background:#f7f2eb;color:#1a1612;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;text-align:center;border:1px solid #e8dfd0;">
                    View All Products
                  </a>
                </td>
              </tr>
            </table>
            <!-- Tips -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#fefaf4;border-radius:12px;border:1px solid #e8dfd0;">
              <tr>
                <td style="padding:16px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#786e62;text-transform:uppercase;letter-spacing:0.5px;">What to do now</p>
                  <ul style="margin:0;padding-left:16px;color:#786e62;font-size:12px;line-height:1.8;">
                    <li>Document any existing issues before warranty ends</li>
                    <li>Use the AI Claim Assistant to file issues</li>
                    <li>Check if extended warranty is available</li>
                    <li>Book a service visit via our service centre locator</li>
                  </ul>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e8dfd0;">
            <p style="margin:0;font-size:11px;color:#c9bfb3;text-align:center;">
              You're receiving this because you track this product on QuickScanZ. 
              <a href="${APP_URL}/dashboard" style="color:#c9bfb3;">Manage notifications</a>
            </p>
          </td>
        </tr>
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
  return res.ok;
}

Deno.serve(async (req) => {
  // Allow manual trigger via POST or scheduled CRON trigger
  if (req.method !== "POST" && req.headers.get("x-cron-key") !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get products expiring in 30 days that haven't been notified
    const { data: expiring, error } = await supabase
      .rpc("get_expiring_products", { days_ahead: 30 });

    if (error) throw error;
    if (!expiring || expiring.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No expiring products" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const product of expiring as ExpiringProduct[]) {
      const type = product.days_remaining <= 7 ? "7_days" : "30_days";
      const subject = product.days_remaining <= 7
        ? `🚨 ${product.brand} ${product.product_name} warranty expires in ${product.days_remaining} days!`
        : `⚠️ ${product.brand} ${product.product_name} warranty expires in 30 days`;

      const html = warrantyEmailHtml(product);
      const ok = await sendEmail(product.user_email, subject, html);

      if (ok) {
        // Record in notification queue as sent
        await supabase.from("notification_queue").upsert({
          user_id: product.user_id,
          product_id: product.product_id,
          email: product.user_email,
          type,
          product_name: product.product_name,
          brand: product.brand,
          expiry_date: product.expiry_date,
          sent: true,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        }, { onConflict: "user_id,product_id" });
        sent++;
      } else {
        errors.push(`Failed to send to ${product.user_email} for ${product.product_name}`);
      }
    }

    console.log(`[warranty-emails] Sent ${sent}/${expiring.length} emails`);
    return new Response(JSON.stringify({ sent, total: expiring.length, errors }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[warranty-emails] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
