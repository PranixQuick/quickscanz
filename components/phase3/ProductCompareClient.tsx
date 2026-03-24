"use client";

import { useState } from "react";
import { compareProducts, type ComparisonItem } from "@/lib/actions/phase3";
import { formatCurrency, formatDate, getWarrantyStatus } from "@/lib/utils";
import Link from "next/link";

interface Props {
  products: ComparisonItem[];
}

export default function ProductCompareClient({ products }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4 // max 4 comparisons
        ? [...prev, id]
        : prev
    );
  }

  const selectedProducts = products.filter((p) => selected.includes(p.id));
  const result = selected.length >= 2 ? compareProducts(selectedProducts) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Compare Products</h1>
        <p className="text-sm text-ink-400 mt-1">
          Select 2–4 products to compare cost, lifespan, and value
        </p>
      </div>

      {products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">⚖️</p>
          <p className="text-sm font-medium text-ink-800 mb-1">No products to compare</p>
          <p className="text-xs text-ink-400 mb-4">Add real products to start comparing them</p>
          <Link href="/products/add" className="btn-primary text-sm px-5 py-2.5">Add Product</Link>
        </div>
      ) : (
        <>
          {/* Product selector */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
              Select Products ({selected.length}/4)
            </p>
            <div className="space-y-2">
              {products.map((p) => {
                const isSelected = selected.includes(p.id);
                const status = getWarrantyStatus(p.warranty_status === "active" ? "active" : p.warranty_status);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
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
                        {p.brand} {p.name}
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
          </div>

          {/* Comparison table */}
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
                      {/* Price row */}
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
                      {/* Cost/day row */}
                      <tr className="bg-cream-50/50">
                        <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Cost/day</td>
                        {result.items.map((p) => (
                          <td key={p.id} className="px-4 py-3">
                            <span className={`text-sm font-medium ${result.winner.bestValue === p.id ? "text-sage-600" : "text-ink-800"}`}>
                              {p.cost_per_day ? `₹${p.cost_per_day}/day` : "—"}
                              {result.winner.bestValue === p.id && <span className="ml-1 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-full">Best</span>}
                            </span>
                          </td>
                        ))}
                      </tr>
                      {/* Warranty */}
                      <tr>
                        <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Warranty</td>
                        {result.items.map((p) => (
                          <td key={p.id} className="px-4 py-3">
                            <span className={`text-sm font-medium ${result.winner.longestWarranty === p.id ? "text-sage-600" : "text-ink-800"}`}>
                              {p.warranty_months}m
                              {result.winner.longestWarranty === p.id && <span className="ml-1 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-full">Best</span>}
                            </span>
                          </td>
                        ))}
                      </tr>
                      {/* Lifespan */}
                      <tr className="bg-cream-50/50">
                        <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Lifespan</td>
                        {result.items.map((p) => (
                          <td key={p.id} className="px-4 py-3">
                            <span className={`text-sm font-medium ${result.winner.bestLifespan === p.id ? "text-sage-600" : "text-ink-800"}`}>
                              {p.avg_lifespan_years ? `~${p.avg_lifespan_years}yr` : "—"}
                              {result.winner.bestLifespan === p.id && <span className="ml-1 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-full">Best</span>}
                            </span>
                          </td>
                        ))}
                      </tr>
                      {/* Days owned */}
                      <tr>
                        <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Age</td>
                        {result.items.map((p) => (
                          <td key={p.id} className="px-4 py-3 text-sm text-ink-600">{p.days_owned}d</td>
                        ))}
                      </tr>
                      {/* Status */}
                      <tr className="bg-cream-50/50">
                        <td className="px-4 py-3 text-[10px] text-ink-400 uppercase tracking-wider">Warranty</td>
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

              {/* Clear selection */}
              <button
                onClick={() => setSelected([])}
                className="w-full py-2.5 text-sm text-ink-400 hover:text-ink-600 transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}

          {selected.length === 1 && (
            <div className="card p-4 text-center bg-sand-50/50 border-sand-200">
              <p className="text-sm text-sand-700">Select at least one more product to compare</p>
            </div>
          )}
        </>
      )}
    </div>
  );
                        }
