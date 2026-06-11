import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/actions/products";
import { seedDemoProducts } from "@/lib/actions/seed";
import { getAllDueMaintenance } from "@/lib/actions/phase2";
import { getUserSubscription } from "@/lib/actions/subscriptions";
import { getWarrantyStatus } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import StatsGrid from "@/components/products/StatsGrid";
import ProductCard from "@/components/products/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import PWAInstallBanner from "@/components/ui/PWAInstallBanner";
import Link from "next/link";
import DashboardNudge from "@/components/DashboardNudge";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import type { Metadata } from "next";
import type { DashboardStats } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard | QuickScanZ" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Seed demo products ONLY if user has no products at all (first login).
  // The seed RPC is idempotent — it uses FOR UPDATE SKIP LOCKED to prevent
  // race conditions and will no-op if products already exist.
  // We check product count first to avoid running the RPC on every page load.
  const { count: existingCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((existingCount ?? 0) === 0) {
    // New user — seed demo products in background, don't block page render
    void seedDemoProducts().catch(() => undefined);
  }

  // Check if user has completed onboarding (profiles.onboarded_at is set)
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();
  const needsOnboarding = !profile?.onboarded_at;

  const [products, dueMaintenance, subscription] = await Promise.all([
    getProducts(),
    getAllDueMaintenance(),
    getUserSubscription(),
  ]);

  const isPro = !!subscription && subscription.plan_id !== "free";

  const stats: DashboardStats = {
    total: products.length,
    active: products.filter((p) => getWarrantyStatus(p.expiry_date) === "active").length,
    expiringSoon: products.filter((p) => getWarrantyStatus(p.expiry_date) === "expiring_soon").length,
    expired: products.filter((p) => getWarrantyStatus(p.expiry_date) === "expired").length,
    withInvoice: products.filter((p) => p.invoice_url).length,
  };

  const sortedProducts = [...products].sort((a, b) => {
    const order: Record<string, number> = { expiring_soon: 0, active: 1, expired: 2 };
    return order[getWarrantyStatus(a.expiry_date)] - order[getWarrantyStatus(b.expiry_date)];
  });

  const expiringProducts = products.filter((p) => getWarrantyStatus(p.expiry_date) === "expiring_soon");
  const realProducts = products.filter((p) => !p.is_demo);
  const overdueMaintenance = dueMaintenance.filter(
    (t) => t.next_due_at && new Date(t.next_due_at) < new Date()
  );
  const userName = user?.email?.split("@")[0] || "there";

  const exploreTiles = [
    { href: "/products/lifecycle", icon: "📊", title: "Lifecycle",        sub: "Cost & lifespan" },
    { href: "/compare",            icon: "⚖️",  title: "Compare",          sub: "Side-by-side products" },
    { href: "/buying-assistant",   icon: "🛒", title: "Buying Assistant", sub: "Budget recommendations" },
    { href: "/smart-devices",      icon: "🏠", title: "Smart Devices",    sub: "IoT service alerts" },
    { href: "/energy",             icon: "⚡", title: "Energy Monitor",   sub: "Power & cost" },
    { href: "/family",             icon: "👨‍👩‍👧", title: "Family Vault",    sub: "Share with family" },
    isPro
      ? { href: "/account",  icon: "⭐", title: "Pro Plan",        sub: "Manage subscription" }
      : { href: "/pricing",  icon: "⭐", title: "Upgrade to Pro",  sub: "Unlimited · ₹149/mo" },
    { href: "/products/add", icon: "➕", title: "Add Product",      sub: "30 seconds" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <PWAInstallBanner />

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-light text-ink-900">
              Hello, {userName.charAt(0).toUpperCase() + userName.slice(1)} 👋
            </h1>
            <p className="text-sm text-ink-400 mt-0.5">
              {stats.total} product{stats.total !== 1 ? "s" : ""} tracked
              {stats.expiringSoon > 0 ? ` · ${stats.expiringSoon} expiring soon` : " · all looking good"}
            </p>
          </div>
          <Link href="/products/add" className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add
          </Link>
        </div>

        <StatsGrid stats={stats} />

        {/* AI-personalised next-action nudge (competitive-edge-v2) */}
        <DashboardNudge />

        {/* Demo banner — shown only when ALL products are demo, so new users know the stats aren't real */}
        {products.length > 0 && products.every((p) => p.is_demo) && (
          <div className="card p-4 border-sand-200 bg-sand-50/50">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📝</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-800">These are sample products</p>
                <p className="text-xs text-ink-400 mt-0.5 leading-relaxed">
                  The stats above show demo data so you can explore the app.
                  Add your first real product to start tracking your actual warranties.
                </p>
                <a href="/products/add" className="mt-2.5 inline-flex items-center gap-1.5 text-xs btn-primary px-3 py-1.5">
                  + Add my first product
                </a>
              </div>
            </div>
          </div>
        )}

        {expiringProducts.length > 0 && (
          <Link href="/products?status=expiring_soon" className="block card p-4 border-amber-200 bg-amber-50/50 hover:border-amber-300 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">⏰</span>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {expiringProducts.length} warrant{expiringProducts.length === 1 ? "y expires" : "ies expire"} within 30 days
                </p>
                <p className="text-xs text-amber-600 mt-0.5">{expiringProducts.map((p) => p.name).join(", ")}</p>
              </div>
            </div>
          </Link>
        )}

        {overdueMaintenance.length > 0 && (
          <Link href="/products" className="block card p-4 border-blush-200 bg-blush-50/40 hover:border-blush-300 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">🔧</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blush-700">
                  {overdueMaintenance.length} maintenance task{overdueMaintenance.length !== 1 ? "s" : ""} overdue
                </p>
                <p className="text-xs text-blush-500 mt-0.5 truncate">
                  {overdueMaintenance.map((t) => `${t.product_name} — ${t.task_name}`).join(" · ")}
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* RETENTION: Weekly check-in card — picks the oldest-opened product and nudges a quick health check */}
        {realProducts.length > 0 && (() => {
          const oldest = [...realProducts].sort((a, b) =>
            new Date(a.purchase_date ?? a.created_at).getTime() - new Date(b.purchase_date ?? b.created_at).getTime()
          )[0];
          const daysSincePurchase = oldest
            ? Math.floor((Date.now() - new Date(oldest.purchase_date ?? oldest.created_at).getTime()) / 86_400_000)
            : 0;
          const showCheckin = daysSincePurchase > 0 && daysSincePurchase % 7 < 2; // show on day 7, 8, 14, 15 etc.
          return showCheckin ? (
            <Link href={`/products/${oldest.id}`} className="block card p-4 border-sage-200 bg-sage-50/40 hover:border-sage-300 transition-colors group">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-800">Weekly check-in: {oldest.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    You&apos;ve owned this for {daysSincePurchase} days — still running well? Tap to log a note or start a claim.
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sage-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ) : null;
        })()}

        {realProducts.length > 0 && (
          <Link href="/claim" className="block card p-4 bg-gradient-to-r from-ink-900 to-ink-800 border-ink-800 group hover:from-ink-800 hover:to-ink-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-cream-100">Something broke? Try AI Claim Assistant</p>
                <p className="text-xs text-cream-400 mt-0.5">Step-by-step warranty claim guidance</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-cream-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )}

        {!isPro && realProducts.length >= 4 && (
          <Link href="/pricing" className="block card p-4 border-sand-200 bg-gradient-to-r from-sand-50 to-cream-50 hover:border-sand-300 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sand-100 flex items-center justify-center flex-shrink-0 text-xl">⭐</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">You&apos;re nearing the free limit</p>
                <p className="text-xs text-ink-500 mt-0.5">Upgrade to Pro for unlimited products · ₹149/mo</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sand-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )}

        {products.length === 0 ? (
          <EmptyState
            title="Your warranty wallet is empty"
            description="Add a product to track its warranty and store the invoice. Takes under 30 seconds."
            actionLabel="Add your first product"
            actionHref="/products/add"
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Products</h2>
              <Link href="/products" className="text-xs text-sand-500 hover:text-sand-400 transition-colors">View all →</Link>
            </div>
            <div className="space-y-3">
              {sortedProducts.slice(0, 4).map((p, i) => (
                <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Explore</h2>
          <div className="grid grid-cols-2 gap-3">
            {exploreTiles.map((item) => (
              <Link key={item.href} href={item.href}
                className={`card p-4 flex items-center gap-3 hover:border-sand-300 transition-colors group ${
                  item.href === "/pricing" ? "border-sand-200 bg-gradient-to-br from-sand-50 to-cream-50" : ""
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg group-hover:bg-sand-100 transition-colors flex-shrink-0 ${
                  item.href === "/pricing" ? "bg-sand-100" : "bg-cream-100"
                }`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-800">{item.title}</p>
                  <p className="text-[11px] text-ink-400 truncate">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
