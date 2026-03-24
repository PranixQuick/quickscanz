"use client";

import { useState, useTransition } from "react";
import { getBuyingRecommendations, type BuyingRecommendation } from "@/lib/actions/phase3";

const BUDGET_PRESETS = [
  { label: "Under 15K", value: 15000 },
  { label: "15K–30K", value: 30000 },
  { label: "30K–60K", value: 60000 },
  { label: "60K–1L", value: 100000 },
  { label: "1L+", value: 200000 },
];

interface Props {
  categories: string[];
}

export default function BuyingAssistantClient({ categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [budget, setBudget] = useState<number>(30000);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    recommendations: BuyingRecommendation[];
    summary: string;
    disclaimer: string;
    error?: string;
  } | null>(null);

  function handleSearch() {
    if (!category) return;
    startTransition(async () => {
      const res = await getBuyingRecommendations({ budget, category, query });
      setResult(res);
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Buying Assistant</h1>
        <p className="text-sm text-ink-400 mt-1">
          Recommendations based on warranty data and expected lifespan
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full">
          <span>ℹ️</span>
          <span>Phase 3 · Catalog-based · No real-time prices · Check retailer links for pricing</span>
        </div>
      </div>

      {/* Input card */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-2">Your budget</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {BUDGET_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setBudget(p.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  budget === p.value
                    ? "bg-ink-900 text-cream-100"
                    : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
            placeholder="Enter exact budget (₹)"
            min={1000}
            className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          >
            <option value="">Select category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            {["Electronics", "Home Appliance", "Vehicle"].map((c) => (
              !categories.includes(c) ? <option key={c} value={c}>{c}</option> : null
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">
            Specific requirements <span className="text-ink-300">(optional)</span>
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 5-star energy rating, inverter, Samsung brand"
            className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={!category || !budget || isPending}
          className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40"
        >
          {isPending ? "Finding recommendations…" : "Find best options →"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {result.error ? (
            <div className="card p-4 border-blush-200 bg-blush-50/30">
              <p className="text-sm text-blush-600">{result.error}</p>
            </div>
          ) : (
            <>
              {result.summary && (
                <div className="card p-4 bg-sage-50/50 border-sage-200">
                  <p className="text-sm text-sage-700">💡 {result.summary}</p>
                </div>
              )}

              {/* FIX: Honest disclaimer - no fake prices */}
              {result.disclaimer && (
                <div className="card p-3 bg-amber-50/50 border-amber-200">
                  <p className="text-xs text-amber-700">⚠️ {result.disclaimer}</p>
                </div>
              )}

              {result.recommendations.length === 0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-ink-500">No matches found. Try Electronics, Home Appliance, or Vehicle.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="card p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          {i === 0 && (
                            <span className="text-[10px] bg-sand-100 text-sand-700 px-2 py-0.5 rounded-full font-medium">
                              Best lifespan
                            </span>
                          )}
                          <h3 className="text-sm font-medium text-ink-900 mt-1">{rec.brand} {rec.name}</h3>
                          <p className="text-xs text-ink-400 mt-0.5">{rec.whyRecommended}</p>
                        </div>
                        {/* FIX: Show cost/day at budget, not a fake product price */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-ink-400">{rec.budgetContext}</p>
                          <p className="text-sm font-medium text-ink-800">₹{rec.costPerDayAtBudget}/day</p>
                          <p className="text-[10px] text-ink-300">at your budget</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-cream-100 rounded-xl p-2 text-center">
                          <p className="text-xs font-medium text-ink-800">{rec.warrantyMonths}m</p>
                          <p className="text-[9px] text-ink-400">Warranty</p>
                        </div>
                        <div className="bg-cream-100 rounded-xl p-2 text-center">
                          <p className="text-xs font-medium text-ink-800">{rec.avgLifespanYears}yr</p>
                          <p className="text-[9px] text-ink-400">Lifespan</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {rec.whereToCheck.map((url, j) => {
                          const domain = url.includes("amazon") ? "Amazon" : "Flipkart";
                          return (
                            <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-center text-xs btn-secondary py-2">
                              Check {domain} →
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
