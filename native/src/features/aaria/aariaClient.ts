// ── Aaria voice-control-plane client (native) ────────────────────────────────
// Ports lib/aaria-client.ts for direct client-side use in the Expo app.
// Unlike the web app — which proxies through app/api/aaria-query/route.ts
// because that route is server-only and also closes the loop against the
// user's own product data server-side — pranix-aaria's
// /api/voice/understand and /api/voice/speak endpoints take no auth/secret:
// the web client's `aariaFetch` just POSTs JSON to a public Render URL with
// no Authorization header. That means the native app can call Aaria
// directly and sidestep the cookie-vs-Bearer auth gap that blocks
// `/api/ai` (see src/lib/api.ts) — there's no Next.js hop in between, so no
// session token is needed at all for this feature.
//
// Locale mapping and endpoint shapes are kept identical to lib/aaria-client.ts
// so native + web stay in lockstep if pranix-aaria's contract changes.

const AARIA_BASE_URL = process.env.EXPO_PUBLIC_AARIA_BASE_URL || "https://pranix-aaria.onrender.com";

export const AARIA_PRODUCT = "QuickScanZ";

// Same locale set as native/src/lib/locale.ts and lib/i18n (web) — keep the
// lists in sync if either changes.
const AARIA_LANG_MAP: Record<string, string> = {
  en: "en",
  hi: "hi",
  te: "te",
  ta: "ta",
  kn: "kn",
  ml: "ml",
};

export function toAariaLang(locale?: string | null): string {
  if (!locale) return "en";
  return AARIA_LANG_MAP[locale] ?? "en";
}

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
  visual_companion?: AariaVisualCompanion | null;
}

export class AariaClientError extends Error {
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
    const controller = new AbortController();
    // 5-second max budget for Aaria requests so cold-starts or network hangs
    // fail fast and never lock up the native UI.
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      res = await fetch(`${AARIA_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
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
    lang_hint: toAariaLang(opts.langHint),
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
    lang: toAariaLang(opts.lang),
    product: opts.product || AARIA_PRODUCT,
    quality_tier: opts.qualityTier || "standard",
  });
  return {
    audio_base64: res.audio_base64 || res.audio_ref,
    lang: res.lang || toAariaLang(opts.lang),
    engine_used: res.engine_used,
    visual_companion: res.visual_companion ?? null,
  };
}

export interface AariaListenResponse {
  text: string;
  confidence: number;
  engine_used: string;
  language: string;
}

export async function aariaListen(
  audioBase64: string,
  opts: { langHint?: string; product?: string } = {}
): Promise<AariaListenResponse> {
  return aariaFetch<AariaListenResponse>("/api/voice/listen", {
    audio_base64: audioBase64,
    product: opts.product || AARIA_PRODUCT,
    lang_hint: toAariaLang(opts.langHint),
  });
}

export { AARIA_BASE_URL };

