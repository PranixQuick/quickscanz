"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { completeOnboarding } from "@/lib/actions/onboarding";

interface Props {
  userId: string;
  initialName: string;
  email: string;
  phone: string;
  preferredLocale: string;
}

export default function OnboardingClient({
  userId,
  initialName,
  email,
  phone,
  preferredLocale,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleContinue = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await completeOnboarding({
        userId,
        displayName: displayName.trim(),
        email,
        phone,
        preferredLocale,
      });
      if (!res.success) {
        setError(res.error || "Failed to update profile");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  const handleSkip = () => {
    setError("");
    startTransition(async () => {
      const res = await completeOnboarding({
        userId,
        displayName: "",
        email,
        phone,
        preferredLocale,
      });
      if (!res.success) {
        setError(res.error || "Failed to update profile");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
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
          <h1 className="font-display text-2xl font-light text-ink-900">{t("onboarding.title")}</h1>
        </div>

        <form onSubmit={handleContinue} className="card p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">{t("onboarding.name_label")}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("onboarding.name_placeholder")}
              autoFocus
              className="w-full px-3.5 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
              <p className="text-xs text-blush-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full btn-primary py-3.5 text-sm font-medium disabled:opacity-40 rounded-xl"
          >
            {isPending ? "..." : t("onboarding.continue")}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isPending}
              className="text-xs text-ink-400 hover:text-ink-600 transition-colors underline underline-offset-2"
            >
              {t("onboarding.skip")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
