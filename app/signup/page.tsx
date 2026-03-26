"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function validate(): string | null {
    if (!form.email.includes("@")) return "Enter a valid email address";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirm) return "Passwords don't match";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center overflow-y-auto px-5 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-3xl bg-sage-100 border border-sage-200 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14l7 7 11-11" stroke="#7aa67a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-light text-ink-900 mb-2">Check your email</h1>
          <p className="text-sm text-ink-400 leading-relaxed mb-6">
            We sent a confirmation link to <strong className="text-ink-700">{form.email}</strong>.
            Click it to activate your account — it expires in 1 hour.
          </p>
          <div className="card p-4 text-left space-y-2 mb-6">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Didn&apos;t get it?</p>
            <p className="text-xs text-ink-400">Check your spam folder. If it&apos;s not there,{" "}
              <button onClick={() => setDone(false)} className="text-sand-500 hover:underline">try again</button> with the same email.
            </p>
          </div>
          <Link href="/login" className="text-xs text-ink-400 hover:text-ink-600 transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="font-display text-2xl font-light text-ink-900">Create account</h1>
          <p className="text-sm text-ink-400 mt-1">Your warranty wallet, free forever</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-3.5 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 focus:border-transparent transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 focus:border-transparent transition-all"
            />
            {/* Strength indicator */}
            {form.password.length > 0 && (
              <div className="flex gap-1 mt-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    form.password.length >= i * 3
                      ? form.password.length >= 12 ? "bg-sage-400"
                        : form.password.length >= 8 ? "bg-amber-400" : "bg-blush-400"
                      : "bg-cream-200"
                  }`} />
                ))}
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Confirm password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Same password again"
              required
              autoComplete="new-password"
              className={`w-full px-3.5 py-3 bg-cream-100 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 focus:border-transparent transition-all ${
                form.confirm && form.confirm !== form.password ? "border-blush-300" : "border-cream-200"
              }`}
            />
            {form.confirm && form.confirm !== form.password && (
              <p className="text-xs text-blush-500 mt-1">Passwords don&apos;t match</p>
            )}
          </div>

          {/* Error */}
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
            {isPending ? "Creating account…" : "Create free account"}
          </button>

          <p className="text-center text-xs text-ink-300 leading-relaxed">
            By signing up you agree to our{" "}
            <Link href="/privacy-policy" className="text-ink-400 hover:underline">Privacy Policy</Link>
          </p>
        </form>

        <p className="text-center text-sm text-ink-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-sand-500 hover:text-sand-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
