"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-blush-50 border border-blush-200 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="11" stroke="#d4706a" strokeWidth="1.5"/>
          <path d="M14 9v6M14 18v1" stroke="#d4706a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-ink-400 max-w-xs leading-relaxed mb-6">
        We hit an unexpected error. Your data is safe — this is just a display issue.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary text-sm px-5 py-2.5">Try again</button>
        <Link href="/dashboard" className="btn-secondary text-sm px-5 py-2.5">Go home</Link>
      </div>
    </div>
  );
}
