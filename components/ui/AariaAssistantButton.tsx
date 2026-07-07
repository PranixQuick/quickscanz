"use client";

import { useState } from "react";

// ── Aaria voice-control-plane entry point ────────────────────────────────────
// Distinct from components/ui/VoiceSearchButton.tsx (local browser Web Speech
// API voice search). This component sends free-text to the server-side proxy
// route app/api/aaria-query/route.ts, which forwards it to Aaria
// (pranix-aaria) for intent understanding, e.g. "register_product" or
// "get_warranty_status".

interface AariaVisualCompanion {
  avatar_state?: string;
  expression?: string;
  captions?: Array<Record<string, unknown>>;
}

interface AariaResult {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  engine_used: string;
  spoken_text?: string;
  visual_companion?: AariaVisualCompanion | null;
}

// Best-effort caption text extraction — tolerant of caption objects using
// either a "word" or "text" key, since this is metadata from an external
// service (pranix-aaria) that this UI does not control the exact shape of.
function captionPreview(captions?: Array<Record<string, unknown>>): string | null {
  if (!captions || captions.length === 0) return null;
  const words = captions
    .map((c) => (typeof c.word === "string" ? c.word : typeof c.text === "string" ? c.text : ""))
    .filter(Boolean);
  return words.length > 0 ? words.join(" ") : null;
}

export default function AariaAssistantButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AariaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const text = query.trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/aaria-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang_hint: "en" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Aaria could not be reached");
      } else {
        setResult(data);
      }
    } catch {
      setError("Aaria could not be reached");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-ink-900 text-cream-100 flex items-center justify-center flex-shrink-0 text-base">
          ✦
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">Ask Aaria</p>
          <p className="text-xs text-ink-400 mt-0.5">Voice-assistant powered help, e.g. registering a product or checking warranty status</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`text-ink-300 transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`}>
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
              placeholder="e.g. Register my new product"
              className="flex-1 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-ink-300"
            />
            <button
              type="button"
              onClick={handleAsk}
              disabled={loading || !query.trim()}
              className="px-4 py-2 rounded-xl bg-ink-900 text-cream-100 text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {loading ? "..." : "Ask"}
            </button>
          </div>

          {error && (
            <p className="text-xs text-blush-500">{error}</p>
          )}

{result && (
            <div className="rounded-xl bg-cream-100 p-3 text-xs text-ink-600 space-y-1">
              <p><span className="font-semibold text-ink-900">Intent:</span> {result.intent}</p>
              <p><span className="font-semibold text-ink-900">Confidence:</span> {(result.confidence * 100).toFixed(0)}%</p>
              <p><span className="font-semibold text-ink-900">Engine:</span> {result.engine_used}</p>
              {Object.keys(result.entities || {}).length > 0 && (
                <p><span className="font-semibold text-ink-900">Entities:</span> {JSON.stringify(result.entities)}</p>
              )}
              {result.visual_companion && (
                <div className="pt-2 mt-2 border-t border-cream-200 flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-ink-900 text-cream-100 flex items-center justify-center flex-shrink-0 text-xs">
                    {result.visual_companion.expression === "excited" ? "😊"
                      : result.visual_companion.expression === "concerned" ? "😟"
                      : result.visual_companion.expression === "curious" ? "🤔"
                      : result.visual_companion.expression === "thinking" ? "💭"
                      : "✦"}
                  </span>
                  <div>
                    <p className="text-ink-400">
                      <span className="font-semibold text-ink-900">Aaria</span>
                      {result.visual_companion.avatar_state ? ` is ${result.visual_companion.avatar_state}` : ""}
                      {result.visual_companion.expression ? ` (${result.visual_companion.expression})` : ""}
                    </p>
                    {captionPreview(result.visual_companion.captions) && (
                      <p className="text-ink-600 mt-0.5">{captionPreview(result.visual_companion.captions)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
