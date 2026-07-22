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
  const [activeTab, setActiveTab] = useState<"internal" | "candidate">("internal");
  const [selected, setSelected] = useState<string[]>(
    preSelectedId && products.some((p) => p.id === preSelectedId)
      ? [preSelectedId]
      : []
  );

  // Compare-to-Buy v2 State
  const [candidateWalletId, setCandidateWalletId] = useState<string>(
    preSelectedId || (products.length > 0 ? products[0].id : "")
  );
  const [candidateQuery, setCandidateQuery] = useState<string>("");
  const [compareLoading, setCompareLoading] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any | null>(null);

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

  async function handleCompareToBuy() {
    if (!candidateWalletId || !candidateQuery.trim()) return;
    setCompareLoading(true);
    setCompareError(null);

    try {
      const res = await fetch("/api/compare/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletProductId: candidateWalletId,
          candidateQuery: candidateQuery.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.ok) {
        throw new Error(resData?.error || "Failed to fetch market comparison");
      }
      setCompareResult(resData.data);
    } catch (err: any) {
      setCompareError(err.message || "Could not fetch candidate comparison");
    } finally {
      setCompareLoading(false);
    }
  }

  // ── Empty state: no products tracked ──────────────────────
  if (products.length === 0) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">Compare Products</h1>
          <p className="text-sm text-ink-400 mt-1">
            Side-by-side cost, lifespan, and market value analysis
          </p>
        </div>

        <div className="card p-10 text-center">
          <p className="text-4xl mb-4">⚖️</p>
          <p className="text-base font-medium text-ink-800 mb-2">
            You have no products tracked yet
          </p>
          <p className="text-sm text-ink-400 mb-6 max-w-xs mx-auto">
            Start tracking your products first — then compare cost per day, warranty, lifespan, and live market alternatives side by side.
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
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Compare Products</h1>
        <p className="text-sm text-ink-400 mt-1">
          Compare wallet products side-by-side or evaluate new purchase candidates with live market prices
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex p-1 bg-cream-100/70 border border-cream-200 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab("internal")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "internal"
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-800"
          }`}
        >
          📊 Wallet Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("candidate")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "candidate"
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-800"
          }`}
        >
          ⚖️ Compare-to-Buy v2 (Market)
        </button>
      </div>

      {activeTab === "internal" ? (
        <>
          {/* Internal Wallet Product Selector */}
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

            {selected.length === 1 && (
              <p className="text-xs text-ink-400 text-center mt-3 py-2 bg-sand-50 rounded-lg">
                Select one more product to start comparing
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-cream-100 text-center">
              <Link
                href="/products/add"
                className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
              >
                + Track a new product to include in comparison
              </Link>
            </div>
          </div>

          {/* Internal Comparison Results Table */}
          {result && selected.length >= 2 && (
            <div className="space-y-4">
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
        </>
      ) : (
        /* Compare-to-Buy v2 Candidate Search Mode */
        <div className="space-y-6">
          <div className="card p-6 border-cream-200">
            <h2 className="text-base font-semibold text-ink-900 mb-1">
              ⚖️ Evaluate a Purchase Candidate
            </h2>
            <p className="text-xs text-ink-400 mb-5">
              Select one of your tracked products and enter a candidate model to pull real-time prices and user ratings across Amazon & Flipkart with AI recommendations.
            </p>

            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
                  1. Select Existing Product in Wallet
                </label>
                <select
                  value={candidateWalletId}
                  onChange={(e) => setCandidateWalletId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand || "Wallet Product"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
                  2. Enter Purchase Candidate Model
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={candidateQuery}
                    onChange={(e) => setCandidateQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCompareToBuy()}
                    placeholder="e.g. OnePlus 12R or Sony WH-1000XM5"
                    className="flex-1 px-3 py-2.5 text-sm bg-white border border-cream-300 rounded-xl text-ink-800 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
                  />
                  <button
                    onClick={handleCompareToBuy}
                    disabled={compareLoading || !candidateQuery.trim()}
                    className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 disabled:opacity-40"
                  >
                    {compareLoading ? "Analyzing..." : "Compare Market AI"}
                  </button>
                </div>
              </div>
            </div>

            {compareError && (
              <p className="text-xs text-blush-600 mt-3 p-3 bg-blush-50 border border-blush-200 rounded-xl">
                ⚠️ {compareError}
              </p>
            )}
          </div>

          {/* Results Display */}
          {compareResult && (
            <div className="space-y-6 animate-fade-up">
              {/* Primary Candidate Card */}
              <div className="card p-6 bg-white border-cream-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                      Target Candidate
                    </span>
                    <h3 className="text-lg font-bold text-ink-900 mt-0.5">
                      {compareResult.candidate?.name}
                    </h3>
                    <p className="text-xs text-ink-400">{compareResult.candidate?.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-sage-600">
                      {compareResult.candidate?.price}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      ⭐ {compareResult.candidate?.rating}
                    </p>
                  </div>
                </div>

                {compareResult.candidate?.specs && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-cream-100">
                    {Object.entries(compareResult.candidate.specs).map(([key, val]) => (
                      <div key={key} className="bg-cream-50 p-2.5 rounded-xl border border-cream-200">
                        <p className="text-[10px] font-semibold text-ink-400 uppercase">{key}</p>
                        <p className="text-xs font-medium text-ink-800 mt-0.5">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comparable Alternative Options (Top 3) */}
              {compareResult.comparison?.comparables && compareResult.comparison.comparables.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
                    ⚖️ Comparable Alternative Options (Real-Time Market Prices & Ratings)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {compareResult.comparison.comparables.map((item: any, idx: number) => (
                      <div key={idx} className="card p-5 bg-white border-cream-200 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-bold text-ink-900">{item.name}</p>
                          <p className="text-[10px] text-ink-400 mb-3">{item.brand}</p>

                          <div className="space-y-2 mb-3">
                            <div className="bg-cream-50 p-2.5 rounded-xl border border-cream-200">
                              <p className="text-[10px] font-semibold text-ink-400 uppercase">🛒 Amazon</p>
                              <p className="text-xs font-bold text-sage-600 mt-0.5">{item.prices?.amazon || "N/A"}</p>
                              <p className="text-[9px] text-ink-400 mt-0.5">⭐ {item.ratings?.amazon || "N/A"}</p>
                            </div>
                            <div className="bg-cream-50 p-2.5 rounded-xl border border-cream-200">
                              <p className="text-[10px] font-semibold text-ink-400 uppercase">🛒 Flipkart</p>
                              <p className="text-xs font-bold text-sage-600 mt-0.5">{item.prices?.flipkart || "N/A"}</p>
                              <p className="text-[9px] text-ink-400 mt-0.5">⭐ {item.ratings?.flipkart || "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-ink-600 italic leading-relaxed pt-2 border-t border-cream-100">
                          {item.verdict}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pranix AI Better Buy Recommendation */}
              {compareResult.comparison?.betterBuyVerdict && (
                <div className="card p-5 bg-emerald-50/70 border-emerald-200">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
                    🏆 Pranix AI Better Buy Recommendation
                  </p>
                  <p className="text-xs text-ink-800 leading-relaxed">
                    {compareResult.comparison.betterBuyVerdict}
                  </p>
                </div>
              )}

              {/* General Spec Comparison Verdict */}
              {compareResult.comparison?.verdict && (
                <div className="card p-5 bg-sand-50/70 border-sand-200">
                  <p className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                    💡 Specs Comparison Verdict
                  </p>
                  <p className="text-xs text-ink-800 leading-relaxed">
                    {compareResult.comparison.verdict}
                  </p>
                </div>
              )}

              {/* Buy Links */}
              {compareResult.comparison?.buyLinks && compareResult.comparison.buyLinks.length > 0 && (
                <div className="flex gap-3">
                  {compareResult.comparison.buyLinks.map((link: string, idx: number) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs px-5 py-2.5 flex-1 text-center"
                    >
                      View on {link.includes("amazon") ? "Amazon" : "Flipkart"} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
