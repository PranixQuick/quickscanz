"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  /** Called when the user dismisses the modal without finishing (X, backdrop, Cancel). Never blocks. */
  onClose: () => void;
  /** Called once the phone number has been verified and linked. */
  onSuccess: () => void;
}

/**
 * Non-blocking, dismissible modal that lets an already-signed-in user link a
 * phone number to their existing account from Account settings.
 *
 * This reuses the exact `updateUser({ phone }) -> verifyOtp({ type: "phone_change" })`
 * manual-linking pattern already proven in production by
 * `components/auth/PhoneBindingOverlay.tsx`, but as an opt-in, closable modal
 * rather than a forced full-screen gate. It does not replace or modify
 * PhoneBindingOverlay, which stays wired to its existing
 * NEXT_PUBLIC_FORCE_PHONE_BINDING-gated call site.
 */
export default function PhoneLinkModal({ userId, onClose, onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }

  function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formatted = formatPhone(phone);
    if (formatted.length < 13) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      // Manual link: updateUser triggers phone-verification natively via Supabase.
      const { error } = await supabase.auth.updateUser({
        phone: formatted,
      });

      if (error) {
        // 422 / "already registered" = this number belongs to a different
        // account already — never present this as a dead/broken button.
        if (
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already linked") ||
          error.status === 422
        ) {
          setError(
            "This number is already linked to a QuickScanZ account. Sign out and sign in with that phone number instead, or use a different number here."
          );
        } else if (error.message.toLowerCase().includes("manual linking")) {
          setError(
            "Account linking isn't turned on for QuickScanZ yet. Please try again later."
          );
        } else {
          setError(error.message);
        }
        return;
      }
      setStep("otp");
    });
  }

  function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formatted = formatPhone(phone);
    startTransition(async () => {
      const supabase = createClient();
      // type: 'phone_change' is standard for confirming updateUser phone bindings
      const { error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: otp,
        type: "phone_change",
      });

      if (error) {
        setError("Invalid OTP code. Please try again.");
        return;
      }

      // Sync verified phone to the profiles table (same as PhoneBindingOverlay).
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, phone: formatted });

      if (profileError) {
        setError("Phone linked, but we couldn't update your profile. Refresh to see the change.");
      }

      onSuccess();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-cream-50 rounded-3xl border border-cream-200 p-6 shadow-2xl space-y-6 animate-fade-up relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-ink-300 hover:text-ink-600 hover:bg-cream-200 transition-colors"
        >
          ✕
        </button>

        {step === "phone" ? (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-4 text-2xl">
                📱
              </div>
              <h2 className="font-display text-xl font-light text-ink-900">Link a phone number</h2>
              <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">
                Add a verified mobile number as another way to sign in. This is optional and won&apos;t change how you sign in today.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-3.5 bg-cream-200 border border-cream-200 rounded-xl text-sm font-medium text-ink-700 flex-shrink-0">
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  className="flex-1 px-4 py-3.5 bg-cream-100 border border-cream-200 rounded-xl text-lg font-medium tracking-wider text-ink-900 focus:outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
                <p className="text-xs text-blush-600 text-center leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || phone.length < 10}
              className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-40 rounded-2xl transition-all"
            >
              {isPending ? "Sending OTP…" : "Send Verification OTP →"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-sm text-ink-400 hover:text-ink-600 transition-colors py-1"
            >
              Not now
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center mx-auto mb-4 text-2xl">
                🔐
              </div>
              <h2 className="font-display text-xl font-light text-ink-900">Enter Verification Code</h2>
              <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">
                We sent a 6-digit code to <span className="font-medium text-ink-700">{phone}</span>.
              </p>
            </div>

            <div>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="______"
                autoFocus
                className="w-full px-4 py-4 bg-cream-100 border-2 border-cream-200 rounded-2xl text-2xl font-bold tracking-[0.5em] text-center text-ink-900 focus:outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 transition-all"
                required
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
                <p className="text-xs text-blush-600 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || otp.length < 6}
              className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-40 rounded-2xl transition-all"
            >
              {isPending ? "Verifying…" : "Verify & Link Number"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="w-full text-sm text-ink-400 hover:text-ink-600 transition-colors py-1"
            >
              ← Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
