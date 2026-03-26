"use client";

import { useState, useEffect, useTransition } from "react";
import toast from "react-hot-toast";

// VAPID key controls push notification availability.
// DATA COLLECTED: push subscription endpoint + keys, stored in push_subscriptions table.
// DATA RETENTION: deleted when user disables push or deletes account.
// If NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set, push toggle is completely hidden.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output.buffer;
}

function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready
        .then((r) => r.pushManager.getSubscription())
        .then((sub) => setIsSubscribed(!!sub))
        .catch(() => {});
    }
  }, []);

  async function subscribe(): Promise<boolean> {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) { setIsSubscribed(true); return true; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) { setIsSubscribed(true); return true; }
      return false;
    } catch { return false; }
  }

  async function unsubscribe(): Promise<boolean> {
    if (!isSupported) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setIsSubscribed(false); return true; }
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch { return false; }
  }

  async function requestPermission(): Promise<NotificationPermission> {
    if (!isSupported) return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  return { permission, isSubscribed, isSupported, subscribe, unsubscribe, requestPermission };
}

interface NotificationSettingsProps {
  userId?: string;
}

export default function NotificationSettings({ userId: _userId }: NotificationSettingsProps = {}) {
  const { permission, isSubscribed, isSupported, subscribe, unsubscribe, requestPermission } = usePushNotifications();
  const [isPending, startTransition] = useTransition();

  // HIDE ENTIRELY if VAPID not configured — no deceptive UI
  if (!VAPID_PUBLIC_KEY) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-xl">📧</div>
          <div>
            <p className="text-sm font-medium text-ink-800">Warranty Alerts</p>
            <p className="text-xs text-ink-400">Email alerts are active at your registered address. You'll be notified 30 days and 7 days before warranties expire.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="card p-4 opacity-70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-xl">🔔</div>
          <div>
            <p className="text-sm font-medium text-ink-800">Push Notifications</p>
            <p className="text-xs text-ink-400">Not supported on this browser. Try Chrome or Safari 16.4+.</p>
          </div>
        </div>
      </div>
    );
  }

  function handleToggle() {
    startTransition(async () => {
      if (isSubscribed) {
        const ok = await unsubscribe();
        if (ok) toast.success("Push notifications disabled");
        else toast.error("Failed to unsubscribe");
        return;
      }
      if (permission === "denied") {
        toast.error("Notifications blocked — enable in browser settings", { duration: 5000 });
        return;
      }
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          toast(result === "denied" ? "Notifications blocked" : "Permission not granted", { icon: "ℹ️" });
          return;
        }
      }
      const ok = await subscribe();
      if (ok) toast.success("🔔 Push notifications enabled!");
      else toast.error("Failed to enable push notifications");
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isSubscribed ? "bg-sage-100" : "bg-cream-100"}`}>
            🔔
          </div>
          <div>
            <p className="text-sm font-medium text-ink-800">Push Notifications</p>
            <p className="text-xs text-ink-400">
              {isSubscribed
                ? "Enabled — you'll be notified before warranties expire"
                : permission === "denied"
                ? "Blocked in browser settings"
                : "Get alerts 30 days before warranties expire"}
            </p>
          </div>
        </div>
        <button onClick={handleToggle} disabled={isPending || permission === "denied"}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 flex-shrink-0 ${isSubscribed ? "bg-sage-400" : "bg-cream-200"}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isSubscribed ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {isSubscribed && (
        <div className="mt-3 pt-3 border-t border-cream-100">
          <p className="text-xs text-ink-400">You&apos;ll receive:</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {["30-day expiry warning", "7-day urgent alert", "Service due reminders"].map((item) => (
              <span key={item} className="text-[10px] bg-sage-50 text-sage-600 border border-sage-200 px-2 py-0.5 rounded-full">
                ✓ {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {permission === "denied" && (
        <p className="mt-3 pt-3 border-t border-cream-100 text-xs text-amber-600">
          To enable: browser Settings → Site Settings → Notifications → Allow for quickscanz.com
        </p>
      )}
    </div>
  );
}
