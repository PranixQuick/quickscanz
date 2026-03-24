"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash
    // The client SDK auto-handles it when initialized
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match"); return; }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password: form.password });
      if (err) { setError(err.message); return; }
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-3xl bg-sage-100 border border-sage-200 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14l7 7 11-11" stroke="#7aa67a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-light text-ink-900 mb-2">Password updated</h1>
          <p className="text-sm text-ink-400">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-8 h-8 border-2 border-sand-300 border-t-sand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-ink-400">Verifying reset link…</p>
          <p className="text-xs text-ink-300 mt-2">
            If this takes more than 5 seconds,{" "}
            <Link href="/forgot-password" className="text-sand-500 hover:underline">request a new link</Link>
          </p>
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
          <h1 className="font-display text-2xl font-light text-ink-900">New password</h1>
          <p className="text-sm text-ink-400 mt-1">Choose a strong password</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">New password</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              placeholder="At least 8 characters" required autoFocus autoComplete="new-password"
              className="w-full px-3.5 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Confirm password</label>
            <input type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
              placeholder="Same password again" required autoComplete="new-password"
              className={`w-full px-3.5 py-3 bg-cream-100 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 transition-all ${
                form.confirm && form.confirm !== form.password ? "border-blush-300" : "border-cream-200"}`} />
          </div>
          {error && (
            <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
              <p className="text-xs text-blush-600">{error}</p>
            </div>
          )}
          <button type="submit" disabled={isPending}
            className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40">
            {isPending ? "Updating…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
