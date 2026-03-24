"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  email: string;
  userId: string;
  productCount: number;
  smartDeviceCount: number;
}

export default function AccountClient({ email, userId, productCount, smartDeviceCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out");
      router.push("/login");
    });
  }

  const username = email.split("@")[0];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Account</h1>
        <p className="text-sm text-ink-400 mt-1">Settings and preferences</p>
      </div>

      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center text-cream-100 font-display text-xl font-light">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-ink-900">{username}</p>
            <p className="text-xs text-ink-400">{email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-cream-100">
          {[
            { label: "Products", value: productCount },
            { label: "Smart Devices", value: smartDeviceCount },
            { label: "Plan", value: "Free" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-lg font-light text-ink-900">{s.value}</p>
              <p className="text-[10px] text-ink-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Notifications</p>
        <NotificationSettings userId={userId} />
        <p className="text-[11px] text-ink-300 mt-2 px-1">
          Push notifications require installing QuickScanZ to your home screen (PWA).
        </p>
      </div>

      {/* Warranty Features */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Warranty Features</p>
        <div className="space-y-1">
          {[
            { href: "/products",           icon: "📦", label: "All Products" },
            { href: "/products/lifecycle",  icon: "📊", label: "Product Lifecycle" },
            { href: "/claim",              icon: "🤖", label: "AI Claim Assistant" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-ink-700 flex-1">{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Intelligence — Phase 2 + 3 */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Intelligence</p>
        <p className="text-[10px] text-ink-300 mb-3 px-1">Phase 2 — now available</p>
        <div className="space-y-1">
          {[
            { href: "/compare",           icon: "⚖️", label: "Compare Products" },
            { href: "/buying-assistant",  icon: "🛒", label: "Buying Assistant" },
            { href: "/energy",            icon: "⚡", label: "Energy Monitor" },
            { href: "/smart-devices",     icon: "🏠", label: "Smart Devices" },
            { href: "/iot-hub",           icon: "🔗", label: "IoT Hub" },
            { href: "/family",            icon: "👨‍👩‍👧", label: "Family Vault" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-ink-700 flex-1">{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Legal */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Legal</p>
        <div className="space-y-1">
          {[
            { href: "/privacy-policy", label: "Privacy Policy" },
            { href: "/about",          label: "About QuickScanZ" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors">
              <span className="text-sm text-ink-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={isPending}
        className="w-full py-3.5 text-sm font-medium text-blush-500 hover:text-blush-600 hover:bg-blush-50/50 rounded-xl transition-colors disabled:opacity-40 border border-transparent hover:border-blush-200"
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>

      <p className="text-center text-[10px] text-ink-200 pb-2">QuickScanZ · v2.0</p>
    </div>
  );
}
