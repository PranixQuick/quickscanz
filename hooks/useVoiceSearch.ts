"use client";

import { useState, useRef, useCallback } from "react";

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition: SpeechRecognition = new SpeechRecognitionAPI();

    recognition.lang = "en-IN"; // Indian English
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(current);
      if (event.results[event.results.length - 1].isFinal) {
        onResult?.(current);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access denied — enable it in browser settings");
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

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
  };
}

// ─── Voice Search Button Component ───────────────────────────────────────────
// Drop this button anywhere alongside a search input

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export function VoiceSearchButton({ onResult, className = "" }: VoiceSearchButtonProps) {
  const { isListening, isSupported, startListening, stopListening, error } = useVoiceSearch(onResult);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      title={isListening ? "Stop listening" : "Search by voice"}
      className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
        isListening
          ? "bg-blush-100 text-blush-500 animate-pulse"
          : "bg-cream-100 text-ink-400 hover:bg-cream-200 hover:text-ink-600"
      } ${className}`}
    >
      {isListening ? (
        // Mic-active icon
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" fill="currentColor"/>
          <path d="M3 7.5A5 5 0 0 0 13 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M8 12.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ) : (
        // Mic icon
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M3 7.5A5 5 0 0 0 13 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M8 12.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
        }
