"use client";
// OnboardingFlow — shown to new users who have only demo products.
// Three swipeable steps: welcome → scan bill → enable notifications.
// Dismisses to dashboard. State stored in-memory (no localStorage).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOnboardingComplete } from "@/lib/actions/onboarding";

const STEPS = [
  {
    id: "welcome",
    emoji: "📦",
    title: "Your warranty manager",
    body: "QuickScanZ tracks every product you own — so you never miss a warranty claim or service reminder.",
    cta: "Let's go",
    skip: false,
  },
  {
    id: "scan",
    emoji: "📸",
    title: "Scan any bill in seconds",
    body: "Point your camera at a paper receipt, Amazon invoice, or Flipkart order. AI fills in brand, serial number, and purchase date automatically.",
    cta: "Scan my first bill",
    ctaHref: "/products/add",
    skip: true,
    skipLabel: "I'll do it later",
  },
  {
    id: "notify",
    emoji: "🔔",
    title: "Never miss an expiry",
    body: "Get a push notification 30 days, 7 days, and 1 day before your warranty runs out — even when the app is closed.",
    cta: "Enable notifications",
    skip: true,
    skipLabel: "Maybe later",
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface Props {
  /** server action marks profile as onboarded */
  userId: string;
}

export default function OnboardingFlow({ userId }: Props) {
  const [step, setStep] = useState(0);
  const [notifState, setNotifState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleCta() {
    if (current.id === "notify") {
      await requestNotificationPermission();
      return;
    }
    if (current.id === "scan" && "ctaHref" in current) {
      await completeOnboarding();
      router.push(current.ctaHref as string);
      return;
    }
    advance();
  }

  function advance() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  }

  async function requestNotificationPermission() {
    setNotifState("requesting");
    try {
      const permission = await Notification.requestPermission();
      setNotifState(permission === "granted" ? "granted" : "denied");
      if (permission === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });
          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint, keys: (sub.toJSON() as any).keys }),
          });
        }
      }
      setTimeout(() => completeOnboarding(), 1200);
    } catch {
      setNotifState("denied");
      setTimeout(() => completeOnboarding(), 1200);
    }
  }

  function completeOnboarding() {
    startTransition(async () => {
      await markOnboardingComplete(userId);
      router.refresh();
    });
  }

  // Indicator dots
  const dots = STEPS.map((_, i) => (
    <div
      key={i}
      className={`h-1.5 rounded-full transition-all duration-300 ${
        i === step ? "w-6 bg-ink-800" : "w-1.5 bg-cream-300"
      }`}
    />
  ));

  return (
    <div className="fixed inset-0 z-50 bg-cream-50 flex flex-col">
      {/* Skip button (top right) */}
      {"skip" in current && current.skip && (
        <button
          onClick={() => completeOnboarding()}
          className="absolute top-4 right-4 text-xs text-ink-300 hover:text-ink-500 transition-colors z-10"
        >
          Skip
        </button>
      )}

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-14">
        {dots}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
        <div className="text-6xl" role="img" aria-label={current.title}>
          {current.emoji}
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-light text-ink-900 leading-tight">
            {current.title}
          </h1>
          <p className="text-sm text-ink-400 leading-relaxed max-w-xs">
            {current.body}
          </p>
        </div>

        {/* Notification granted/denied feedback */}
        {current.id === "notify" && notifState === "granted" && (
          <div className="flex items-center gap-2 text-sage-600 text-sm font-medium">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#7aa67a"/>
              <path d="M5 8.5l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Notifications enabled!
          </div>
        )}
        {current.id === "notify" && notifState === "denied" && (
          <p className="text-xs text-ink-300">
            You can enable notifications later in your browser settings.
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={handleCta}
          disabled={isPending || notifState === "requesting"}
          className="w-full btn-primary py-4 text-base font-medium disabled:opacity-50"
        >
          {notifState === "requesting" ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Requesting…
            </span>
          ) : current.cta}
        </button>

        {"skip" in current && current.skip && "skipLabel" in current && (
          <button
            onClick={advance}
            className="w-full py-3 text-sm text-ink-300 hover:text-ink-500 transition-colors"
          >
            {current.skipLabel as string}
          </button>
        )}
      </div>
    </div>
  );
}

// Web Push VAPID helper
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
