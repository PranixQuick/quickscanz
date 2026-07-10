import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/actions/products";
import { getWarrantyStatus, formatWarrantyCountdown } from "@/lib/utils";
import {
  aariaUnderstand,
  aariaSpeak,
  AariaClientError,
  AARIA_PRODUCT,
  type AariaVisualCompanion,
} from "@/lib/aaria-client";

// ── Aaria voice-control-plane integration ────────────────────────────────────
// This is a DISTINCT integration from hooks/useVoiceSearch.ts +
// components/ui/VoiceSearchButton.tsx, which are local browser Web Speech API
// voice search for product search only. This route instead proxies natural
// language text to Aaria (pranix-aaria), Pranix's shared voice/intent
// understanding service, so QuickScanZ can support Aaria-routed intents such
// as "register_product" and "get_warranty_status".
//
// get_warranty_status is closed-loop: once Aaria understands the intent, we
// resolve it against the caller's own products and ask Aaria to speak the
// answer back, rather than just returning the raw NLU result. See
// components/products/WarrantySpeakCard.tsx for the entry point that uses
// this end-to-end flow.

interface AariaQueryResponse {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  engine_used: string;
  spoken_text?: string;
  audio_base64?: string;
  matched_product?: { id: string; name: string; brand: string };
  visual_companion?: AariaVisualCompanion | null;
}

function extractProductHint(entities: Record<string, unknown>): string | null {
  const candidateKeys = ["product", "product_name", "item", "name", "brand"];
  for (const key of candidateKeys) {
    const value = entities[key];
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return null;
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
  // Optional: the exact product the UI already resolved (e.g. WarrantySpeakCard).
  // When present we answer for THIS product directly and skip NLU fuzzy matching.
  const productId: string | null = typeof body?.product_id === "string" ? body.product_id : null;

  let understood: Awaited<ReturnType<typeof aariaUnderstand>>;
  try {
    understood = await aariaUnderstand(text, { langHint, product: AARIA_PRODUCT });
  } catch (e) {
    const status = e instanceof AariaClientError && e.status ? 502 : 502;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reach Aaria" },
      { status }
    );
  }

  const response: AariaQueryResponse = { ...understood };

  // Close the loop for warranty-status queries: resolve against the user's
  // real products and have Aaria speak back a concrete answer.
  if (understood.intent === "get_warranty_status" || productId) {
    const hint = extractProductHint(understood.entities || {});
    // Exclude demo/sample seed products so Aaria only speaks about real ones.
    const products = (await getProducts()).filter((p) => !(p as any).is_demo);

    const match = productId
      ? products.find((p) => p.id === productId)
      : hint
      ? products.find(
          (p) =>
            p.name.toLowerCase().includes(hint) ||
            p.brand.toLowerCase().includes(hint) ||
            hint.includes(p.name.toLowerCase())
        )
      : products.length === 1
      ? products[0]
      : undefined;

    let spokenText: string;
    if (match) {
      const status = getWarrantyStatus(match.expiry_date);
      const countdown = formatWarrantyCountdown(match.expiry_date);
      const statusPhrase =
        status === "expired"
          ? "has expired"
          : status === "expiring_soon"
          ? "is expiring soon"
          : "is active";
      spokenText = `Your ${match.brand} ${match.name} warranty ${statusPhrase}. ${countdown}.`;
      response.matched_product = { id: match.id, name: match.name, brand: match.brand };
    } else if (products.length === 0) {
      spokenText = "You don't have any products tracked yet, so I can't check a warranty status.";
    } else {
      spokenText =
        "I couldn't tell which product you meant. Try naming the product, like 'check warranty for my Samsung fridge'.";
    }

    response.spoken_text = spokenText;

    try {
      const speech = await aariaSpeak(spokenText, { lang: langHint, product: AARIA_PRODUCT });
      response.audio_base64 = speech.audio_base64;
      response.visual_companion = speech.visual_companion ?? null;
    } catch {
      // Speech synthesis is best-effort — the client still has spoken_text
      // to render/read even if Aaria's TTS endpoint is unavailable.
    }
  }

  return NextResponse.json(response);
}
