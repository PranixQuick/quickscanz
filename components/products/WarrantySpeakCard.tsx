"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { useI18n } from "@/lib/i18n/provider";

// ── Aaria voice-control-plane entry point (spoken warranty status) ──────────
// Distinct from components/ui/AariaAssistantButton.tsx (free-text "Ask Aaria"
// input) and components/ui/VoiceSearchButton.tsx (local browser Web Speech
// API search — not Aaria). This card is scoped to a single product: one tap
// asks Aaria "what's the warranty status for <product>?" via the existing
// /api/aaria-query proxy, and plays back Aaria's spoken answer.

interface Props {
  product: Pick<Product, "id" | "name" | "brand">;
}

type State = "idle" | "loading" | "playing" | "error";

export default function WarrantySpeakCard({ product }: Props) {
  const { locale } = useI18n();
  const [state, setState] = useState<State>("idle");
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleSpeak() {
    setState("loading");
    setError(null);
    setSpokenText(null);

    try {
      const res = await fetch("/api/aaria-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `What's the warranty status for my ${product.brand} ${product.name}?`,
          lang_hint: "en",
          product_id: product.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Aaria could not be reached");
        setState("error");
        return;
      }

      setSpokenText(data.spoken_text || null);

      if (data.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
        audioRef.current = audio;
        audio.onended = () => setState("idle");
        audio.onerror = () => setState("idle");
        setState("playing");
        await audio.play();
      } else {
        setState("idle");
      }
    } catch {
      setError("Aaria could not be reached");
      setState("error");
    }
  }

  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-ink-900 text-cream-100 flex items-center justify-center flex-shrink-0">
        <Volume2 size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900">Speak warranty status</p>
        <p className="text-xs text-ink-400 mt-0.5">
          Ask Aaria to read out this product&apos;s warranty status out loud.
        </p>

        <button
          type="button"
          onClick={handleSpeak}
          disabled={state === "loading" || state === "playing"}
          className="mt-3 px-4 py-2 rounded-xl bg-ink-900 text-cream-100 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {state === "loading" ? "Asking Aaria..." : state === "playing" ? "Speaking..." : "Speak status"}
        </button>

        {error && <p className="text-xs text-blush-500 mt-2">{error}</p>}

        {spokenText && (
          <p className="text-xs text-ink-600 mt-2 rounded-xl bg-cream-100 p-3">{spokenText}</p>
        )}
      </div>
    </div>
  );
}
