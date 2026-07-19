"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { demoSignIn } from "@/lib/actions/auth";

// ─── Safety net: never let an auth call hang forever ─────────────────────────
// Supabase auth promises can stall on a wedged page / flaky network. Racing them
// against a timeout guarantees the UI always resolves (button never stuck on
// "Sending…"). The SMS may still have been sent, so callers fall through to the
// code-entry step rather than dead-ending.
async function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    clearTimeout(timer!);
  }
}

// ─── Google Sign-In Button ─────────────────────────────────────────────────────────────────────
function GoogleSignInButton({ showSeparator = true }: { showSeparator?: boolean }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleGoogleLogin = () => {
    setError("");
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    });
  };

  return (
    <div className="space-y-2">
      {showSeparator && (
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-cream-200" />
          <span className="text-xs text-ink-300 font-medium">{t("common.or")}</span>
          <div className="flex-1 h-px bg-cream-200" />
        </div>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 bg-white border border-cream-300 hover:bg-cream-100 active:scale-[0.98] text-ink-700 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all shadow-sm disabled:opacity-50"
      >
        {isPending ? (
          <svg className="animate-spin h-5 w-5 text-ink-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        <span>{isPending ? t("login.google_connecting") : t("login.google_button")}</span>
      </button>
      {error && <p className="text-xs text-blush-600 text-center">{error}</p>}
    </div>
  );
}

// Country list matching native app
const COUNTRIES = [
  { code: "+91", flag: "🇮🇳", name: "India", length: 10 },
  { code: "+1", flag: "🇺🇸", name: "United States", length: 10 },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", length: 10 },
  { code: "+971", flag: "🇦🇪", name: "UAE", length: 9 },
  { code: "+61", flag: "🇦🇺", name: "Australia", length: 9 },
  { code: "+65", flag: "🇸🇬", name: "Singapore", length: 8 },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", length: 9 },
  { code: "+49", flag: "🇩🇪", name: "Germany", length: 10 },
];

// ─── Phone OTP Flow (primary — works for illiterate users) ───────────────────
function PhoneOTPForm() {
  const t = useT();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  function formatPhone(raw: string, countryCode: string) {
    const digits = raw.replace(/\D/g, "");
    return `${countryCode}${digits}`;
  }

  async function sendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formatted = formatPhone(phone, selectedCountry.code);
    if (phone.length < selectedCountry.length - 2) {
      setError(t("login.phone_invalid") || `Please enter a valid phone number for ${selectedCountry.name}.`);
      return;
    }
    setIsPending(true);
    try {
      const supabase = createClient();
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({ phone: formatted, options: { channel: "sms" } })
      );
      if (error) { setError(error.message); return; }
      setStep("otp");
    } catch {
      // No confirmation came back in time — but the SMS was very likely sent.
      // Never leave the user stuck on "Sending…": advance to the code-entry step.
      setStep("otp");
    } finally {
      setIsPending(false);
    }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formatted = formatPhone(phone, selectedCountry.code);
    setIsPending(true);
    try {
      const supabase = createClient();
      const { error } = await withTimeout(
        supabase.auth.verifyOtp({ phone: formatted, token: otp, type: "sms" })
      );
      if (error) { setError(t("login.otp_wrong")); return; }

      // Get user session to check onboarding status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Failed to retrieve user session");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .single();

      if (!profile?.onboarded_at) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError(t("login.otp_wrong"));
    } finally {
      setIsPending(false);
    }
  }

  if (step === "otp") {
    const formatted = formatPhone(phone, selectedCountry.code);
    return (
      <form onSubmit={verifyOTP} className="card p-6 space-y-5">
        {/* Big friendly checkmark */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="w-14 h-14 rounded-full bg-sage-50 border-2 border-sage-200 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7aa67a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.61 4.56 2 2 0 0 1 3.58 2.34h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.63-1.63a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-ink-800">{t("login.otp_sent")}</p>
          <p className="text-xs text-ink-400 text-center">
            {t("login.otp_sent_to")} <span className="font-medium text-ink-700">{formatted}</span>.{" "}
            {t("login.otp_check_sms")}
          </p>
        </div>

        {/* Big OTP input — easy to tap */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-2 text-center">{t("login.otp_enter")}</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.slice(0, 6))}
            placeholder="_ _ _ _ _ _"
            autoFocus
            className="w-full px-4 py-4 bg-cream-100 border-2 border-cream-200 rounded-2xl text-2xl font-bold tracking-[0.5em] text-center text-ink-900 focus:outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 transition-all"
          />
        </div>

        {error && (
          <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
            <p className="text-xs text-blush-600 text-center">{error}</p>
          </div>
        )}

        <button type="submit" disabled={isPending || otp.length < 6}
          className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-40 rounded-2xl">
          {isPending ? t("login.otp_verifying") : "✓ " + t("login.otp_verify_btn")}
        </button>

        <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
          className="w-full text-sm text-ink-400 hover:text-ink-600 transition-colors py-1">
          ← {t("login.change_number")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOTP} className="card p-6 space-y-5">
      <div>
        {/* Friendly icon */}
        <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <p className="text-sm text-ink-400 text-center">{t("login.enter_phone")}</p>
      </div>

      <div>
        <div className="flex items-center gap-2">
          {/* Dynamic Country Selector */}
          <div className="flex items-center bg-cream-200 border border-cream-200 rounded-xl px-2 py-3.5 flex-shrink-0">
            <span className="mr-1 text-sm">{selectedCountry.flag}</span>
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const country = COUNTRIES.find((c) => c.code === e.target.value);
                if (country) {
                  setSelectedCountry(country);
                  setPhone("");
                }
              }}
              className="bg-transparent border-none text-xs font-semibold text-ink-900 focus:outline-none cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-white text-ink-900">
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, selectedCountry.length))}
            placeholder={"9".repeat(selectedCountry.length)}
            autoFocus
            maxLength={selectedCountry.length}
            className="flex-1 px-4 py-3.5 bg-cream-100 border border-cream-200 rounded-xl text-lg font-medium tracking-wider text-ink-900 focus:outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
          <p className="text-xs text-blush-600 text-center">{error}</p>
        </div>
      )}

      <button type="submit" disabled={isPending || phone.length < selectedCountry.length - 2}
        className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-40 rounded-2xl">
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {t("login.otp_sending")}
          </span>
        ) : t("login.otp_send_btn") + " →"}
      </button>
    </form>
  );
}

// ─── Reviewer / Demo Sign-In (email + password) ────────────────────────────
// Google Play reviewers can't receive an SMS OTP. This restores a narrow,
// allow-listed email+password path (see demoSignIn in lib/actions/auth.ts) so
// reviewers can sign in with the documented demo account. It is not promoted
// to real users, who continue to use Phone OTP or Google — demoSignIn rejects
// any email that isn't on the server-side allow-list before Supabase is ever
// called, so this never weakens auth for real accounts.
function DemoSignInForm() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      // On success demoSignIn calls redirect(), which Next.js implements by
      // throwing a NEXT_REDIRECT signal — that propagates past this await
      // and is handled by the router, so we only ever reach the next line
      // on a genuine (non-redirect) failure.
      const result = await demoSignIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="w-full text-center text-xs text-ink-300 hover:text-ink-500 transition-colors mt-4 py-1"
      >
        Reviewer or demo account? Sign in with email
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mt-4 space-y-3">
      <p className="text-xs text-ink-400 text-center">Demo / reviewer sign-in</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="username"
        required
        className="w-full px-4 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm text-ink-900 focus:outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 transition-all"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        required
        className="w-full px-4 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm text-ink-900 focus:outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 transition-all"
      />
      {error && <p className="text-xs text-blush-600 text-center">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full btn-primary py-3 text-sm font-semibold disabled:opacity-40 rounded-xl"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          setError("");
        }}
        className="w-full text-xs text-ink-400 hover:text-ink-600 transition-colors py-1"
      >
        ← Back
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const t = useT();
  const otpEnabled = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center overflow-y-auto px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-ink-900 flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
              <rect x="1.5" y="1.5" width="8" height="8" rx="2.5" fill="#fdfcf8"/>
              <rect x="12.5" y="1.5" width="8" height="8" rx="2.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="1.5" y="12.5" width="8" height="8" rx="2.5" fill="#fdfcf8" opacity="0.55"/>
              <rect x="12.5" y="12.5" width="8" height="8" rx="2.5" fill="#fdfcf8" opacity="0.25"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-light text-ink-900">QuickScanZ</h1>
          <p className="text-sm text-ink-400 mt-1">{t("login.tagline")}</p>
        </div>

        {otpEnabled ? (
          <>
            <PhoneOTPForm />
            <GoogleSignInButton showSeparator={true} />
          </>
        ) : (
          <GoogleSignInButton showSeparator={false} />
        )}
        <DemoSignInForm />
      </div>
    </div>
  );
}
