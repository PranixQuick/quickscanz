import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/actions/products";
import { seedDemoProducts } from "@/lib/actions/seed";
import { getWarrantyStatus } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import StatsGrid from "@/components/products/StatsGrid";
import ProductCard from "@/components/products/ProductCard";
import PWAInstallBanner from "@/components/ui/PWAInstallBanner";
import Link from "next/link";
import type { DashboardStats } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your warranty dashboard — all your products at a glance.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await seedDemoProducts();

  const products = await getProducts();

  const stats: DashboardStats = {
    total: products.length,
    active: products.filter((p) => getWarrantyStatus(p.expiry_date) === "active").length,
    expiringSoon: products.filter((p) => getWarrantyStatus(p.expiry_date) === "expiring_soon").length,
    expired: products.filter((p) => getWarrantyStatus(p.expiry_date) === "expired").length,
    withInvoice: products.filter((p) => p.invoice_url).length,
  };

  const userName = user?.email?.split("@")[0] || "there";

  const sortedProducts = [...products].sort((a, b) => {
    const order = { expiring_soon: 0, active: 1, expired: 2 };
    return order[getWarrantyStatus(a.expiry_date)] - order[getWarrantyStatus(b.expiry_date)];
  });

  const expiringProducts = products.filter((p) => getWarrantyStatus(p.expiry_date) === "expiring_soon");
  const hasDemoProducts = products.some((p) => p.is_demo);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">
            Hello, <span className="capitalize">{userName}</span> 👋
          </h1>
          <p className="text-sm text-ink-400 mt-1">
            {stats.active} active {stats.active === 1 ? "warranty" : "warranties"}
            {stats.expiringSoon > 0 ? ` · ${stats.expiringSoon} expiring soon` : " · all looking good"}
          </p>
        </div>

        <StatsGrid stats={stats} />
        <PWAInstallBanner />

        {hasDemoProducts && (
          <div className="flex items-start gap-3 px-4 py-3 bg-cream-200/60 border border-cream-300 rounded-2xl">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-ink-400">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8 5v3M8 10v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-ink-500 leading-relaxed">
              We added 3 sample products so you can explore.{" "}
              <Link href="/products/add" className="font-medium text-ink-700 underline underline-offset-2">
                Add your own
              </Link>{" "}
              and delete these anytime.
            </p>
          </div>
        )}

        {expiringProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="#d97706" strokeWidth="1.2"/>
                  <path d="M8 5v3.5l2 1.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {expiringProducts.length} {expiringProducts.length === 1 ? "warranty expires" : "warranties expire"} within 30 days
                </p>
                <p className="text-xs text-amber-600 mt-0.5">{expiringProducts.map((p) => p.name).join(", ")}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-light text-ink-800">Your Products</h2>
            {products.length > 0 && (
              <Link href="/products" className="text-xs text-sand-500 hover:text-sand-400 font-medium transition-colors">
                View all →
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {sortedProducts.slice(0, 5).map((product, i) => (
              <div key={product.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <ProductCard product={product} />
              </div>
            ))}
            {products.length > 5 && (
              <Link href="/products" className="block text-center py-3 text-sm text-ink-400 hover:text-ink-600 transition-colors">
                + {products.length - 5} more products
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-4 text-ink-200">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L10.5 3v3c0 2.5-1.8 4.5-4.5 5C3.3 10.5 1.5 8.5 1.5 6V3L6 1Z" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <span className="text-[11px]">All data is private and stored securely</span>
        </div>
      </div>
    </AppLayout>
  );
}
