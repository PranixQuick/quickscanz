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
  planId?: string;
  planName?: string;
}

export default function AccountClient({
  email, userId, productCount, smartDeviceCount,
  planId = "free", planName = "Free",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isPro = planId !== "free";
  const username = email.split("@")[0];

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out");
      router.push("/login");
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Account</h1>
        <p className="text-sm text-ink-400 mt-1">Settings and preferences</p>
      </div>

      {/* Profile */}
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
            { label: "Plan", value: planName },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-lg font-light text-ink-900">{s.value}</p>
              <p className="text-[10px] text-ink-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      {!isPro && (
        <Link href="/pricing" className="block card p-4 bg-gradient-to-r from-sand-100 to-cream-100 border-sand-200 group hover:border-sand-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sand-200 flex items-center justify-center text-xl flex-shrink-0">⭐</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">Upgrade to Pro</p>
              <p className="text-xs text-ink-500 mt-0.5">Unlimited products · Family Vault · ₹149/month</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sand-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Link>
      )}

      {/* Notifications */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Notifications</p>
        <NotificationSettings userId={userId} />
        <p className="text-[11px] text-ink-300 mt-2 px-1">Push notifications require installing QuickScanZ to your home screen (PWA).</p>
      </div>

      {/* Warranty Features */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Warranty Features</p>
        <div className="space-y-1">
          {[
            { href: "/products",          icon: "📦", label: "All Products" },
            { href: "/products/lifecycle", icon: "📊", label: "Product Lifecycle" },
            { href: "/claim",             icon: "🤖", label: "AI Claim Assistant" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-ink-700 flex-1">{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Intelligence */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Intelligence</p>
        <p className="text-[10px] text-ink-300 mb-3 px-1">Phase 2 — now available</p>
        <div className="space-y-1">
          {[
            { href: "/compare",          icon: "⚖️", label: "Compare Products" },
            { href: "/buying-assistant", icon: "🛒", label: "Buying Assistant" },
            { href: "/energy",           icon: "⚡", label: "Energy Monitor" },
            { href: "/smart-devices",    icon: "🏠", label: "Smart Devices" },
            { href: "/iot-hub",          icon: "🔗", label: "IoT Hub" },
            { href: "/family",           icon: "👨‍👩‍👧", label: "Family Vault" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-ink-700 flex-1">{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Billing</p>
        <Link href="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
          <span className="text-base">💳</span>
          <span className="text-sm text-ink-700 flex-1">{isPro ? `${planName} Plan · Manage` : "View Plans & Upgrade"}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </Link>
      </div>

      {/* Legal */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Legal</p>
        <div className="space-y-1">
          {[{ href: "/privacy-policy", label: "Privacy Policy" }, { href: "/about", label: "About QuickScanZ" }].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors">
              <span className="text-sm text-ink-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <button onClick={handleSignOut} disabled={isPending} className="w-full py-3.5 text-sm font-medium text-blush-500 hover:text-blush-600 hover:bg-blush-50/50 rounded-xl transition-colors disabled:opacity-40 border border-transparent hover:border-blush-200">
        {isPending ? "Signing out..." : "Sign out"}
      </button>

      {/* Delete account — required by Google Play Data Safety & DPDP Act */}
      <div className="pt-2 border-t border-cream-200">
        <p className="text-[10px] text-ink-300 text-center mb-3">Danger zone</p>
        <a
          href={`mailto:privacy@quickscanz.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20and%20all%20data.%20Registered%20email%3A%20${encodeURIComponent(email)}`}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-medium text-ink-300 hover:text-blush-500 hover:bg-blush-50/30 rounded-xl transition-colors border border-transparent hover:border-blush-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Request account deletion
        </a>
      </div>

      <p className="text-center text-[10px] text-ink-200 pb-2">QuickScanZ · v2.0</p>
    </div>
  );
}
