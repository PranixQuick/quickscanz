"use client";

import { useVoiceSearch } from "@/hooks/useVoiceSearch";

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export function VoiceSearchButton({ onResult, className = "" }: VoiceSearchButtonProps) {
  const { isListening, isSupported, startListening, stopListening } = useVoiceSearch(onResult);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      title={isListening ? "Stop listening" : "Search by voice"}
      className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0 ${
        isListening
          ? "bg-blush-100 text-blush-500 animate-pulse"
          : "bg-cream-100 text-ink-400 hover:bg-cream-200 hover:text-ink-600"
      } ${className}`}
    >
      {isListening ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" fill="currentColor"/>
          <path d="M3 7.5A5 5 0 0 0 13 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M8 12.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M3 7.5A5 5 0 0 0 13 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M8 12.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}
