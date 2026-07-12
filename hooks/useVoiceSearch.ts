"use client";

import { useState, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";

// Maps QuickScanZ's app locale codes (lib/i18n/provider.tsx, Locale =
// 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml') to the BCP-47 codes the browser's
// Web Speech API (SpeechRecognition.lang) expects.
const VOICE_SEARCH_BCP47: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  ml: "ml-IN",
};

interface UseVoiceSearchReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

export function useVoiceSearch(onResult?: (text: string) => void): UseVoiceSearchReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // any is intentional — SpeechRecognition is a browser Web API, not in Next.js default tsconfig lib
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Voice input not supported on this browser");
      return;
    }
    setError(null);
    setTranscript("");

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(current);
      if (event.results[event.results.length - 1].isFinal) {
        onResult?.(current);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access denied — enable in browser settings");
      } else if (event.error === "no-speech") {
        setError("No speech detected — try again");
      } else {
        setError(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening, resetTranscript, error };
}
