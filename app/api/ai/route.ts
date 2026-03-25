import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proxies ALL Anthropic API calls server-side.
// ANTHROPIC_API_KEY is server-only — never exposed to the browser.
// ClaimAssistant and ProductReviews both call /api/ai instead of Anthropic directly.

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error("[ai-proxy] ANTHROPIC_API_KEY not set in Vercel env vars");
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai-proxy] Anthropic error:", response.status, errText.slice(0, 300));
    return NextResponse.json(
      { error: "AI service error", status: response.status },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
