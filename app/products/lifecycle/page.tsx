import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Lifecycle | QuickScanZ",
};

interface LifecycleProduct {
  id: string;
  name: string;
  brand: string;
  category: string | null;
  purchase_date: string;
  expiry_date: string;
  price: number | null;
  warranty_days_remaining: number;
  days_owned: number;
  cost_per_day: number | null;
  avg_lifespan_years: number | null;
  lifespan_percent_used: number | null;
  warranty_status: string;
}

function LifecycleBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-sage-400",
    expiring_soon: "bg-amber-400 animate-pulse",
    expired: "bg-blush-400",
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${styles[status] || "bg-ink-300"}`} />;
}

export default async function LifecyclePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: products } = await supabase
    .from("product_lifecycle")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_demo", false)
    .order("lifespan_percent_used", { ascending: false, nullsFirst: false });

  const items = (products as LifecycleProduct[]) || [];
  const totalValue = items.reduce((s, p) => s + (p.price || 0), 0);
  const avgCostPerDay = items.filter((p) => p.cost_per_day).reduce((s, p) => s + (p.cost_per_day || 0), 0) / Math.max(items.filter((p) => p.cost_per_day).length, 1);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">Product Lifecycle</h1>
          <p className="text-sm text-ink-400 mt-1">Track lifespan, cost efficiency, and replacement timing</p>
        </div>

        {items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-sm font-medium text-ink-800 mb-1">No lifecycle data yet</p>
            <p className="text-xs text-ink-400 mb-4">Add real products to see cost-per-day, lifespan, and analytics</p>
            <Link href="/products/add" className="btn-primary text-sm px-5 py-2.5">Add Product</Link>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <p className="font-display text-xl font-light text-ink-900">
                  ₹{totalValue.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider">Total invested</p>
              </div>
              <div className="card p-4 text-center">
                <p className="font-display text-xl font-light text-ink-900">{items.length}</p>
                <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider">Products tracked</p>
              </div>
              <div className="card p-4 text-center">
                <p className="font-display text-xl font-light text-ink-900">
                  ₹{avgCostPerDay.toFixed(1)}
                </p>
                <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider">Avg cost/day</p>
              </div>
            </div>

            {/* Product cards */}
            <div className="space-y-3">
              {items.map((p) => {
                const lifePct = p.lifespan_percent_used || 0;
                const warrantyPct = Math.max(0, Math.min(100,
                  p.warranty_days_remaining > 0
                    ? (p.warranty_days_remaining / (p.warranty_days_remaining + p.days_owned)) * 100
                    : 0
                ));

                const lifeColor =
                  lifePct > 80 ? "bg-blush-400" :
                  lifePct > 60 ? "bg-amber-400" :
                  "bg-sage-400";

                return (
                  <Link href={`/products/${p.id}`} key={p.id}>
                    <div className="card p-4 hover:border-sand-300 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusDot status={p.warranty_status} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-900 truncate">{p.name}</p>
                            <p className="text-xs text-ink-400">{p.brand}{p.category ? ` · ${p.category}` : ""}</p>
                          </div>
                        </div>
                        {p.cost_per_day && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium text-ink-800">₹{p.cost_per_day}/day</p>
                            <p className="text-[10px] text-ink-400">{p.days_owned} days owned</p>
                          </div>
                        )}
                      </div>

                      {/* Lifespan bar */}
                      {p.lifespan_percent_used !== null && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-ink-400 uppercase tracking-wider">Life used</p>
                            <p className="text-[10px] font-medium text-ink-600">{lifePct}%{p.avg_lifespan_years ? ` of ~${p.avg_lifespan_years}yr lifespan` : ""}</p>
                          </div>
                          <LifecycleBar percent={lifePct} color={lifeColor} />
                        </div>
                      )}

                      {/* Warranty bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-ink-400 uppercase tracking-wider">Warranty</p>
                          <p className={`text-[10px] font-medium ${
                            p.warranty_status === "expired" ? "text-blush-500" :
                            p.warranty_status === "expiring_soon" ? "text-amber-600" :
                            "text-sage-600"
                          }`}>
                            {p.warranty_days_remaining > 0
                              ? `${p.warranty_days_remaining} days left`
                              : "Expired"}
                          </p>
                        </div>
                        <LifecycleBar percent={warrantyPct} color={
                          p.warranty_status === "expired" ? "bg-blush-300" :
                          p.warranty_status === "expiring_soon" ? "bg-amber-300" :
                          "bg-sage-300"
                        } />
                      </div>

                      {/* Replacement hint */}
                      {lifePct >= 75 && p.avg_lifespan_years && (
                        <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs text-amber-700">
                            ⚡ {lifePct >= 90 ? "Consider replacing soon" : "Approaching end of expected lifespan"} — {Math.round((p.avg_lifespan_years * 365 - p.days_owned) / 365 * 10) / 10}yr estimated remaining
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
