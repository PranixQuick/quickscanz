import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Usage limits (enforced server-side, cannot be bypassed) ──────────────────
// DATA COLLECTED: message_count per user per product, stored in ai_usage table
// DATA RETENTION: persists until user deletes product or requests account deletion
const FREE_LIMIT = 5;
const PAID_LIMIT = 100;

// Valid Anthropic model, forced server-side. The client used to send an
// invalid id ("claude-sonnet-4-6"), which made every AI call fail and silently
// fall back to canned replies. Matches the model used by the OCR route.
const AI_MODEL = "claude-3-5-sonnet-20241022";

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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const productId: string | null = body.product_id || null;
  const messages: Array<{ role: string; content: string }> = body.messages || [];

  // ── Hard usage limit check (server-side) ─────────────────────────────────
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

  // ── Try Anthropic (if key present) ───────────────────────────────────────
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (ANTHROPIC_API_KEY) {
    try {
      // Force a valid model server-side regardless of what the client sent.
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...body, model: AI_MODEL }),
      });
      if (response.ok) {
        const data = await response.json();
        if (recordUsage) await recordUsage(); // charge only on a real answer
        return NextResponse.json(data);
      }
      // Non-OK response → fall through to rule-based (not charged)
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
