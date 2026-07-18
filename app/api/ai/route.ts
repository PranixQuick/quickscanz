import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Usage limits (enforced server-side, cannot be bypassed) ──────────────────
// DATA COLLECTED: message_count per user per product, stored in ai_usage table
// DATA RETENTION: persists until user deletes product or requests account deletion
const FREE_LIMIT = 5;
const PAID_LIMIT = 100;

// ── Rule-based fallback (no external API required) ────────────────────────────
function getRuleBasedResponse(messages: Array<{ role: string; content: string }>, productCtx: string): string {
  const last = messages.filter(m => m.role === "user").pop()?.content?.toLowerCase() || "";

  if (last.includes("stopped working") || last.includes("not turning on") || last.includes("dead") || last.includes("won't start")) {
    return `For a completely non-functional ${productCtx}:\n\n**If under warranty (manufacturing defect):**\n1. Document with photos/video before visiting service centre\n2. Carry: original invoice, warranty card, and government ID\n3. Visit an **authorized** service centre only (not third-party)\n4. Request a written job card — this is your legal record\n5. Repair must be completed within 30 days under Consumer Protection Act\n\n**If they refuse:** Ask for written rejection with reason. Then escalate to National Consumer Helpline: 1800-11-4000 (toll-free) or file at consumerforum.nic.in.\n\nWould you like me to draft a complaint email to the brand?`;
  }

  if (last.includes("screen") || last.includes("display") || last.includes("crack")) {
    return `**Screen/Display issues — warranty coverage:**\n\n✅ **Covered:** Dead pixels, backlight failure, flickering from manufacturing defect\n❌ **Not covered:** Physical cracks, impact damage, water damage\n\n**To claim:**\n1. Confirm no physical damage is visible\n2. Visit authorized service centre with invoice\n3. If rejected, request written refusal with specific reason\n4. You can escalate to Consumer Forum within 2 years of purchase\n\nIs the damage physical or has the screen failed on its own?`;
  }

  if (last.includes("battery") || last.includes("drain")) {
    return `**Battery issues — warranty rules:**\n\n✅ Battery defects typically covered for **6–12 months** (varies by brand)\n❌ Normal capacity degradation (20–30% over 2 years) is NOT covered\n\n**Claim process:**\n1. Most brands require battery diagnostic at service centre\n2. If capacity is below 80% of rated capacity, it's usually claimable\n3. Carry invoice and request battery health test in writing\n\nHow old is the product and what's the battery behaviour?`;
  }

  if (last.includes("email") || last.includes("draft") || last.includes("complaint") || last.includes("letter")) {
    return `**Complaint Email Template:**\n\n---\nSubject: Warranty Claim — [Your Product] [Model No.]\n\nDear Customer Support,\n\nI am requesting a warranty claim for [Product Name] purchased on [Date] from [Store]. The product is within its warranty period.\n\n**Issue:** [Describe defect clearly — be specific]\n**Purchase Invoice No.:** [Invoice Number]\n\nI request repair/replacement under warranty per your terms. Please respond within 7 working days.\n\nIf unresolved, I will escalate to the Consumer Forum under the Consumer Protection Act, 2019.\n\nRegards,\n[Your Name] | [Phone Number]\n---\n\nSend to the brand's official support email. Keep a copy of all correspondence.`;
  }

  if (last.includes("consumer") || last.includes("forum") || last.includes("court") || last.includes("legal")) {
    return `**Consumer Forum process in India:**\n\n1. **District Consumer Forum** — claims up to ₹50 lakhs, file online at edaakhil.nic.in\n2. **Filing fee:** ₹200–₹500 (nominal)\n3. **Documents needed:** Invoice, warranty card, service rejection letter, all communications\n4. **Timeline:** Usually resolved in 90–150 days\n5. **You can claim:** Repair cost + compensation + legal costs\n\n**Before filing:** Send a legal notice to the brand (15-day response window). This often resolves cases without court.\n\nNational Consumer Helpline: **1800-11-4000** (free, Mon–Sat 9am–5pm)`;
  }

  // Default guidance
  return `I can help with your warranty claim for ${productCtx}.\n\n**General steps:**\n1. Verify the product is within warranty period\n2. Document the defect (photos/video)\n3. Gather documents: invoice, warranty card, ID\n4. Visit an authorized service centre (not local repair)\n5. Get a written job card when submitting\n\n**Your rights (India):**\n- Free repair for manufacturing defects within warranty period\n- Replacement if repair fails after 3 attempts\n- Refund if replacement not possible\n- National Consumer Helpline: 1800-11-4000\n\nDescribe the exact issue and I'll give you specific guidance.`;
}

import { createClient as createBasicClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  let user: any = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const client = createBasicClient(supabaseUrl, supabaseAnonKey);
      const { data } = await client.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    user = sessionUser;
  }

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const productId: string | null = body.product_id || null;
  const messages: Array<{ role: string; content: string }> = body.messages || [];

  // ── Hard usage limit check (server-side) ─────────────────────────────────
  // Set once we've confirmed the caller is under quota; called only after a
  // successful AI answer so fallbacks aren't charged.
  let recordUsage: (() => Promise<void>) | null = null;
  if (productId) {
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const isPaid = sub?.plan_id && sub.plan_id !== "free";
    const limit = isPaid ? PAID_LIMIT : FREE_LIMIT;

    const { data: usage } = await supabase
      .from("ai_usage")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    const currentCount = usage?.message_count ?? 0;

    if (currentCount >= limit) {
      // Limit reached — return structured response, no HTTP error
      return NextResponse.json({
        content: [{
          type: "text",
          text: isPaid
            ? `You've reached the ${limit}-message limit for this product. Start a new conversation or contact support.`
            : `You've used all ${FREE_LIMIT} free AI messages for this product. Upgrade to Pro for ${PAID_LIMIT} messages per product.`,
        }],
        _usage_limit_reached: true,
      });
    }

    // Charge the quota only once the real AI actually answers (see below).
    // Previously this incremented eagerly, so failed calls and canned
    // rule-based fallbacks still burned a user's free messages.
    recordUsage = async () => {
      await supabase.from("ai_usage").upsert(
        { user_id: user.id, product_id: productId, message_count: currentCount + 1, last_used_at: new Date().toISOString() },
        { onConflict: "user_id,product_id" }
      );
    };
  }

  // ── Try Gemini (if key present) ─────────────────────────────────────────
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  // gemini-1.5-flash is retired (404). Use gemini-2.0-flash, which works once
  // billing is enabled on the key's Google Cloud project. Overridable via GEMINI_MODEL.
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (GEMINI_API_KEY) {
    try {
      // Convert the Anthropic-style messages to Gemini's format.
      const geminiContents = (messages || []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(body.system ? { systemInstruction: { parts: [{ text: String(body.system) }] } } : {}),
            contents: geminiContents,
            generationConfig: { temperature: 0.4, maxOutputTokens: body.max_tokens || 1024 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p?.text)
          .filter(Boolean)
          .join("");
        if (text) {
          if (recordUsage) await recordUsage(); // charge only on a real answer
          // Return the Anthropic-shaped payload the client already understands.
          return NextResponse.json({ content: [{ type: "text", text }], model: GEMINI_MODEL });
        }
      }
      // No usable answer → fall through to rule-based (not charged)
    } catch {
      // Network error → fall through to rule-based (not charged)
    }
  }

  // ── Rule-based fallback — always works, no external deps ─────────────────
  const productMatch = (body.system || "").match(/Product: ([^\n]+)/);
  const productCtx = productMatch ? productMatch[1].trim() : "your product";

  return NextResponse.json({
    content: [{ type: "text", text: getRuleBasedResponse(messages, productCtx) }],
    model: "quickscanz-assistant",
    _fallback: true,
  });
}
