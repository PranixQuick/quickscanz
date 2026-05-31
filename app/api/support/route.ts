import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Stakeholder friction layer entry. Forwards a "Report Issue" / "Ask a question"
// submission to the Pranix engine's existing product-event ingest endpoint.
// Reuse-only: no new tables (writes to control-plane product_events + founder_alerts
// via the engine). Auth uses the shared PRANIX_EVENT_KEY — NOT founder credentials.
// Degrades gracefully (503) when env is not yet configured, so the UI never crashes.
export async function POST(req: Request) {
  const engineUrl = process.env.PRANIX_ENGINE_URL;
  const eventKey = process.env.PRANIX_EVENT_KEY;
  if (!engineUrl || !eventKey) {
    return NextResponse.json({ ok: false, error: "support_not_configured" }, { status: 503 });
  }

  let body: { kind?: string; text?: string; page?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  const kind = body.kind === "question" ? "question" : "issue";

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // anonymous submissions allowed
  }

  try {
    const res = await fetch(`${engineUrl.replace(/\/$/, "")}/api/product-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Pranix-Event-Key": eventKey },
      body: JSON.stringify({
        product: "quickscanz",
        event_type: kind === "question" ? "support_question" : "support_issue",
        entity_type: "support",
        payload: { text: text.slice(0, 2000), page: body.page || null, kind },
        user_id: userId,
        severity: "info",
      }),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
    return NextResponse.json({ ok: true, kind });
  } catch {
    return NextResponse.json({ ok: false, error: "unreachable" }, { status: 502 });
  }
}
