"use client";

import { useState } from "react";
import { compareProducts, type ComparisonResult } from "@/lib/calculations";
import type { ComparisonItem } from "@/lib/types";
import { formatCurrency, getWarrantyStatus } from "@/lib/utils";
import Link from "next/link";

interface Props {
  products: ComparisonItem[];
  preSelectedId?: string;
}

export default function ProductCompareClient({ products, preSelectedId }: Props) {
  const [selected, setSelected] = useState<string[]>(
    preSelectedId && products.some((p) => p.id === preSelectedId)
      ? [preSelectedId]
      : []
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
        ? [...prev, id]
        : prev
    );
  }

  const selectedProducts = products.filter((p) => selected.includes(p.id));
  const result: ComparisonResult | null = selected.length >= 2 ? compareProducts(selectedProducts) : null;

  // ── Empty state: no products or only 1 product tracked ──────────────────────
  // Compare is a downstream intelligence feature — user must track products first.
  // Never send them to /products/add here; send them to their products list.
  if (products.length < 2) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">Compare Products</h1>
          <p className="text-sm text-ink-400 mt-1">
            Side-by-side cost, lifespan, and value analysis
          </p>
        </div>

        <div className="card p-10 text-center">
          <p className="text-4xl mb-4">⚖️</p>
          <p className="text-base font-medium text-ink-800 mb-2">
            {products.length === 0
              ? "You have no products tracked yet"
              : "You need at least 2 products to compare"}
          </p>
          <p className="text-sm text-ink-400 mb-6 max-w-xs mx-auto">
            {products.length === 0
              ? "Start tracking your products first — then compare cost per day, warranty, and lifespan side by side."
              : `You're tracking ${products.length} product. Add one more to start comparing.`}
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link href="/products" className="btn-primary text-sm px-6 py-2.5">
              View My Products
            </Link>
            <Link href="/products/add" className="text-xs text-ink-400 hover:text-ink-600 transition-colors">
              + Track a new product
            </Link>
          </div>
        </div>

        {/* What this feature does — educate users so they know why to track more */}
        <div className="card p-4 bg-sand-50/50 border-sand-200">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">What you can compare</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "💰", label: "Cost per day", desc: "Which gives best daily value" },
              { icon: "📅", label: "Warranty period", desc: "Longest coverage wins" },
              { icon: "⏳", label: "Expected lifespan", desc: "Category avg lifespan" },
              { icon: "🏆", label: "Overall value", desc: "Price vs age vs warranty" },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-2 p-2">
                <span className="text-base flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-xs font-medium text-ink-700">{f.label}</p>
                  <p className="text-[10px] text-ink-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main compare UI: products exist, show selector ───────────────────────────
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Compare Products</h1>
        <p className="text-sm text-ink-400 mt-1">
          Select 2–4 products to compare cost, lifespan, and value
        </p>
      </div>

      {/* Product selector */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
          Select Products ({selected.length}/4)
        </p>
        <div className="space-y-2">
          {products.map((p) => {
            const isSelected = selected.includes(p.id);
            const isDisabled = !isSelected && selected.length >= 4;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${
                  isSelected
                    ? "bg-ink-900 border-ink-800"
                    : "bg-cream-50 border-cream-200 hover:border-sand-300"
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                  isSelected ? "bg-cream-100 border-cream-300" : "border-cream-300"
                }`}>
                  {isSelected && <span className="text-ink-900 text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-cream-100" : "text-ink-800"}`}>
                    {p.name}
                  </p>
                  <p className={`text-[10px] ${isSelected ? "text-cream-400" : "text-ink-400"}`}>
                    {p.category || "Electronics"}
                    {p.cost_per_day ? ` · ₹${p.cost_per_day}/day` : ""}
                    {p.price ? ` · ${formatCurrency(p.price)}` : ""}
                  </p>
                </div>
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  p.warranty_status === "active" ? "bg-sage-400" :
                  p.warranty_status === "expiring_soon" ? "bg-amber-400" : "bg-blush-400"
                }`} />
              </button>
            );
          })}
        </div>

        {/* Hint when only 1 selected */}
        {selected.length === 1 && (
          <p className="text-xs text-ink-400 text-center mt-3 py-2 bg-sand-50 rounded-lg">
            Select one more product to start comparing
          </p>
        )}

        {/* Add more products link — contextually correct */}
        <div className="mt-3 pt-3 border-t border-cream-100 text-center">
          <Link
            href="/products/add"
            className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
          >
            + Track a new product to include in comparison
          </Link>
        </div>
      </div>

      {/* Comparison results */}
      {result && selected.length >= 2 && (
        <div className="space-y-4">
          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="card p-4 bg-sage-50/50 border-sage-200">
              <p className="text-xs font-semibold text-sage-700 uppercase tracking-wider mb-2">Key Insights</p>
              <div className="space-y-1.5">
                {result.insights.map((insight, i) => (
                  <p key={i} className="text-sm text-sage-700">{insight}</p>
                ))}
              </div>
            </div>
          )}

          {/* Side by side table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream-100 border-b border-cream-200">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider w-28">
                      Metric
                    </th>
                    {result.items.map((p) => (
                      <th key={p.id} className="px-4 py-3 text-left">
                        <Link href={`/products/${p.id}`} className="hover:underline">
                          <p className="text-xs font-semibold text-ink-800 truncate max-w-28">{p.name}</p>
                          <p className="text-[10px] text-ink-400">{p.brand}</p>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  <tr>
                    <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Price paid</td>
                    {result.items.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        <span className={`text-sm font-medium ${result.winner.mostExpensive === p.id ? "text-blush-500" : "text-ink-800"}`}>
                          {p.price ? formatCurrency(p.price) : "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-cream-50/50">
                    <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Cost/day</td>
                    {result.items.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        <span className={`text-sm font-medium ${result.winner.bestValue === p.id ? "text-sage-600" : "text-ink-800"}`}>
                          {p.cost_per_day ? `₹${p.cost_per_day}/day` : "—"}
                          {result.winner.bestValue === p.id && (
                            <span className="ml-1 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-full">Best</span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Warranty</td>
                    {result.items.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        <span className={`text-sm font-medium ${result.winner.longestWarranty === p.id ? "text-sage-600" : "text-ink-800"}`}>
                          {p.warranty_months}m
                          {result.winner.longestWarranty === p.id && (
                            <span className="ml-1 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-full">Best</span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-cream-50/50">
                    <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Lifespan</td>
                    {result.items.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        <span className={`text-sm font-medium ${result.winner.bestLifespan === p.id ? "text-sage-600" : "text-ink-800"}`}>
                          {p.avg_lifespan_years ? `~${p.avg_lifespan_years}yr` : "—"}
                          {result.winner.bestLifespan === p.id && (
                            <span className="ml-1 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-full">Best</span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Age</td>
                    {result.items.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-sm text-ink-600">{p.days_owned}d</td>
                    ))}
                  </tr>
                  <tr className="bg-cream-50/50">
                    <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Status</td>
                    {result.items.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.warranty_status === "active" ? "bg-sage-100 text-sage-700" :
                          p.warranty_status === "expiring_soon" ? "bg-amber-100 text-amber-700" :
                          "bg-blush-100 text-blush-700"
                        }`}>
                          {p.warranty_status === "active" ? "Active" :
                           p.warranty_status === "expiring_soon" ? "Expiring" : "Expired"}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={() => setSelected([])}
            className="w-full py-2.5 text-sm text-ink-400 hover:text-ink-600 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
                                                    }
