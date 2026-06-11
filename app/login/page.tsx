"use client";

import { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

// Must be isolated — useSearchParams requires Suspense boundary for static gen
function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    urlError === "auth_callback_failed"
      ? "Verification link expired. Please sign in and request a new one."
      : ""
  );
  const [form, setForm] = useState({ email: "", password: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.append("email", form.email);
    fd.append("password", form.password);

    startTransition(async () => {
      const result = await signIn(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Email address</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="you@example.com"
          required
          autoFocus
          autoComplete="email"
          className="w-full px-3.5 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 transition-all"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-ink-500">Password</label>
          <Link href="/forgot-password" className="text-xs text-sand-500 hover:text-sand-400 transition-colors">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Your password"
            required
            autoComplete="current-password"
            className="w-full px-3.5 py-3 pr-11 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
          <p className="text-xs text-blush-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center overflow-y-auto px-5 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1.5" y="1.5" width="8" height="8" rx="2.5" fill="#fdfcf8"/>
              <rect x="12.5" y="1.5" width="8" height="8" rx="2.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="1.5" y="12.5" width="8" height="8" rx="2.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="12.5" y="12.5" width="8" height="8" rx="2.5" fill="#fdfcf8" opacity="0.25"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-light text-ink-900">Welcome back</h1>
          <p className="text-sm text-ink-400 mt-1">Sign in to your warranty wallet</p>
        </div>

        {/* Suspense wraps the form that uses useSearchParams */}
        <Suspense fallback={
          <div className="card p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-cream-200 rounded-xl" />
            <div className="h-10 bg-cream-200 rounded-xl" />
            <div className="h-11 bg-cream-200 rounded-xl" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-ink-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-sand-500 hover:text-sand-400 font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
