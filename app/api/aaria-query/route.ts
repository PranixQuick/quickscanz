import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Aaria voice-control-plane integration ────────────────────────────────────
// This is a DISTINCT integration from hooks/useVoiceSearch.ts +
// components/ui/VoiceSearchButton.tsx, which are local browser Web Speech API
// voice search for product search only. This route instead proxies natural
// language text to Aaria (pranix-aaria), Pranix's shared voice/intent
// understanding service, so QuickScanZ can support Aaria-routed intents such
// as "register_product" and "get_warranty_status".
const AARIA_BASE_URL = "https://pranix-aaria.onrender.com";

interface AariaUnderstandResponse {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  engine_used: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const text: string = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
  }

  const langHint: string = typeof body?.lang_hint === "string" ? body.lang_hint : "en";

  try {
    const res = await fetch(`${AARIA_BASE_URL}/api/voice/understand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        product: "QuickScanZ",
        lang_hint: langHint,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Aaria returned status ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as AariaUnderstandResponse;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reach Aaria" },
      { status: 502 }
    );
  }
}
