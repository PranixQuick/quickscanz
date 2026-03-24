"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Enter a valid email address"); return; }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (err) {
        // Don't reveal if email exists — always show success
        console.error("Reset error:", err.message);
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-3xl bg-sand-100 border border-sand-200 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 7h20M4 7l3-3M4 7l3 3M24 21H4M24 21l-3 3M24 21l-3-3M14 7v14" stroke="#c9a87c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-light text-ink-900 mb-2">Check your email</h1>
          <p className="text-sm text-ink-400 leading-relaxed mb-6">
            If <strong className="text-ink-700">{email}</strong> is registered, we sent a password reset link.
            Check your inbox and spam folder.
          </p>
          <p className="text-xs text-ink-300 mb-6">The link expires in 1 hour.</p>
          <Link href="/login" className="btn-secondary text-sm px-6 py-2.5">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="7" height="7" rx="2" fill="#fdfcf8"/>
              <rect x="12" y="1" width="7" height="7" rx="2" fill="#fdfcf8" opacity="0.55"/>
              <rect x="1" y="12" width="7" height="7" rx="2" fill="#fdfcf8" opacity="0.55"/>
              <rect x="12" y="12" width="7" height="7" rx="2" fill="#fdfcf8" opacity="0.25"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-light text-ink-900">Reset password</h1>
          <p className="text-sm text-ink-400 mt-1">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
              className="w-full px-3.5 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 transition-all"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
              <p className="text-xs text-blush-600">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isPending}
            className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40">
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-400 mt-6">
          Remember it?{" "}
          <Link href="/login" className="text-sand-500 hover:text-sand-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
