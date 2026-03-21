"use client";

import { useState, useTransition } from "react";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ink-900 flex items-center justify-center shadow-glow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="8.5" height="8.5" rx="2" fill="#fdfcf8"/>
              <rect x="13.5" y="2" width="8.5" height="8.5" rx="2" fill="#fdfcf8" opacity="0.55"/>
              <rect x="2" y="13.5" width="8.5" height="8.5" rx="2" fill="#fdfcf8" opacity="0.55"/>
              <rect x="13.5" y="13.5" width="8.5" height="8.5" rx="2" fill="#fdfcf8" opacity="0.25"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-light text-ink-900 tracking-tight">QuickScanZ</h1>
            <p className="text-sm text-ink-400 mt-1">Your Warranty Wallet</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="card p-7 shadow-card">
            <div className="mb-6">
              <h2 className="font-display text-xl font-light text-ink-900">Welcome back</h2>
              <p className="text-xs text-ink-400 mt-1">Beta access · sign in to continue</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email" name="email" type="email" required
                  autoComplete="email" className="input-field"
                  placeholder="you@example.com"
                  defaultValue="test1@quickscanz.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <input
                    id="password" name="password"
                    type={showPass ? "text" : "password"}
                    required autoComplete="current-password"
                    className="input-field pr-10" placeholder="••••••••"
                    defaultValue="123456"
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8Z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blush-100 border border-blush-200 rounded-xl">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    <circle cx="7" cy="7" r="6" stroke="#d95f54" strokeWidth="1.2"/>
                    <path d="M7 4.5v3M7 9.5v.5" stroke="#d95f54" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <p className="text-xs text-blush-600">{error}</p>
                </div>
              )}
              <button type="submit" disabled={isPending} className="btn-primary w-full mt-2 py-3">
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="18 6"/>
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </form>
            <div className="mt-6 pt-5 border-t border-cream-200 flex items-center justify-center gap-1.5 text-ink-300">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4 6 1Z" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
              <span className="text-xs">Your data is private and secure</span>
            </div>
          </div>
          <p className="text-center text-xs text-ink-300 mt-4">Beta access only · No public signups yet</p>
        </div>
      </div>
    </div>
  );
}
