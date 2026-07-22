// ── Aaria voice-control-plane client ─────────────────────────────────────────
// Shared server-side wrapper around Pranix's Aaria voice-assistant engine
// (https://pranix-aaria.onrender.com). Server-only: never import this from a
// "use client" component — call it from route handlers / server actions and
// expose results to the client via your own API routes (see
// app/api/aaria-query/route.ts for the existing pattern).
//
// This is unrelated to hooks/useVoiceSearch.ts + components/ui/VoiceSearchButton.tsx,
// which are local browser Web Speech API product search and do not talk to Aaria.

const AARIA_BASE_URL = process.env.AARIA_BASE_URL || "https://pranix-aaria.onrender.com";

export const AARIA_PRODUCT = "QuickScanZ";

export interface AariaUnderstandResponse {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  engine_used: string;
}

export interface AariaVisualCompanion {
  avatar_state?: string;
  expression?: string;
  captions?: Array<Record<string, unknown>>;
}

export interface AariaSpeakResponse {
  audio_base64: string;
  lang: string;
  engine_used: string;
  // Optional multi-modal companion metadata (avatar_state/expression/captions)
  // returned by pranix-aaria's src/contracts/speak.py. Present on newer
  // responses; may be absent/null on cache hits or older engine paths.
  visual_companion?: AariaVisualCompanion | null;
}

export interface AariaHealthResponse {
  status: string;
  [key: string]: unknown;
}

class AariaClientError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AariaClientError";
    this.status = status;
  }
}

async function aariaFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AARIA_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 5-second budget for Aaria requests so slow server responses fail fast.
      signal: AbortSignal.timeout(5_000),
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new AariaClientError("Aaria server took too long to respond (timeout).");
    }
    throw new AariaClientError(
      e instanceof Error ? `Failed to reach Aaria: ${e.message}` : "Failed to reach Aaria"
    );
  }

  if (!res.ok) {
    throw new AariaClientError(`Aaria returned status ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}

/**
 * Natural-language understanding: resolves free text to an intent + entities.
 */
export async function aariaUnderstand(
  text: string,
  opts: { langHint?: string; product?: string } = {}
): Promise<AariaUnderstandResponse> {
  return aariaFetch<AariaUnderstandResponse>("/api/voice/understand", {
    text,
    product: opts.product || AARIA_PRODUCT,
    lang_hint: opts.langHint || "en",
  });
}

/**
 * Text-to-speech: turns a spoken-confirmation string into audio.
 */
export async function aariaSpeak(
  text: string,
  opts: { lang?: string; qualityTier?: string; product?: string } = {}
): Promise<AariaSpeakResponse> {
  const res = await aariaFetch<any>("/api/voice/speak", {
    text,
    lang: opts.lang || "en",
    product: opts.product || AARIA_PRODUCT,
    quality_tier: opts.qualityTier || "standard",
  });
  return {
    audio_base64: res.audio_base64 || res.audio_ref,
    lang: res.lang || opts.lang || "en",
    engine_used: res.engine_used,
    visual_companion: res.visual_companion ?? null,
  };
}

export { AariaClientError, AARIA_BASE_URL };
