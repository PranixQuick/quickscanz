"use client";

import { useState, useTransition } from "react";
import { getBuyingRecommendations, type BuyingRecommendation } from "@/lib/actions/phase3";

const BUDGET_PRESETS = [
  { label: "Under 15K", value: 15000 },
  { label: "15K–30K", value: 30000 },
  { label: "30K–60K", value: 60000 },
  { label: "60K–1L", value: 100000 },
  { label: "1L+",    value: 200000 },
];

// Rank labels for result cards
const RANK_LABELS = ["🥇 Best pick", "🥈 Runner up", "🥉 Also good", "4th", "5th"];

// Format raw DB category string → display label
function formatCategory(c: string): string {
  return c
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

interface Props {
  categories: string[];
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="h-4 w-1/3 rounded-lg bg-cream-200 animate-pulse" />
          <div className="h-3 w-2/3 rounded-lg bg-cream-200 animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-cream-200 animate-pulse" />
            <div className="h-10 rounded-xl bg-cream-200 animate-pulse" />
          </div>
          <div className="h-9 rounded-xl bg-cream-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function RecCard({ rec, rank }: { rec: BuyingRecommendation; rank: number }) {
  // Format cost/day clearly so ₹0.08 shows as "< ₹1"
  const cpd = rec.costPerDayAtBudget;
  const cpdDisplay = cpd < 1 ? "< ₹1" : `₹${cpd.toLocaleString("en-IN")}`;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] bg-sand-100 text-sand-700 px-2 py-0.5 rounded-full font-medium">
            {RANK_LABELS[rank] ?? `#${rank + 1}`}
          </span>
          <h3 className="text-sm font-medium text-ink-900 mt-1 truncate">
            {rec.brand} {rec.name}
          </h3>
          <p className="text-xs text-ink-400 mt-0.5 leading-relaxed">{rec.whyRecommended}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-ink-400">{rec.budgetContext}</p>
          <p className="text-sm font-medium text-ink-800">{cpdDisplay}/day</p>
          <p className="text-[10px] text-ink-300">at your budget</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-cream-100 rounded-xl p-2 text-center">
          <p className="text-xs font-medium text-ink-800">{rec.warrantyMonths}m</p>
          <p className="text-[9px] text-ink-400">Warranty</p>
        </div>
        <div className="bg-cream-100 rounded-xl p-2 text-center">
          <p className="text-xs font-medium text-ink-800">{rec.avgLifespanYears}yr</p>
          <p className="text-[9px] text-ink-400">Lifespan</p>
        </div>
        <div className="bg-cream-100 rounded-xl p-2 text-center">
          <p className="text-xs font-medium text-ink-800">{cpdDisplay}</p>
          <p className="text-[9px] text-ink-400">Per day</p>
        </div>
      </div>

      <div className="flex gap-2">
        {rec.whereToCheck.map((url, j) => {
          const label = url.includes("amazon") ? "Amazon" : "Flipkart";
          return (
            <a
              key={j}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs btn-secondary py-2"
            >
              {label} →
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BuyingAssistantClient({ categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [budget, setBudget]   = useState<number>(30000);
  const [category, setCategory] = useState("");
  const [query, setQuery]     = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [result, setResult]   = useState<{
    recommendations: BuyingRecommendation[];
    summary: string;
    disclaimer: string;
    error?: string;
  } | null>(null);

  function handleSearch() {
    if (!category) return;
    if (!budget || budget < 1000) {
      setBudgetError("Please enter a budget of at least ₹1,000");
      return;
    }
    setBudgetError("");
    startTransition(async () => {
      const res = await getBuyingRecommendations({ budget, category, query });
      setResult(res);
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Buying Assistant</h1>
        <p className="text-sm text-ink-400 mt-1">
          Recommendations based on warranty data and expected lifespan
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full">
          <span>ℹ️</span>
          <span>Catalog-based · No real-time prices · Check retailer links for latest pricing</span>
        </div>
      </div>

      {/* Input card */}
      <div className="card p-5 space-y-4">

        {/* Budget */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-2">Your budget</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {BUDGET_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setBudget(p.value); setBudgetError(""); }}
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
            value={budget || ""}
            onChange={(e) => {
              setBudget(parseInt(e.target.value) || 0);
              setBudgetError("");
            }}
            placeholder="Enter exact budget (₹)"
            min={1000}
            className={`w-full px-3.5 py-2.5 bg-cream-100 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 ${
              budgetError ? "border-red-300" : "border-cream-200"
            }`}
          />
          {budgetError && (
            <p className="text-xs text-red-500 mt-1">{budgetError}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{formatCategory(c)}</option>
            ))}
            {["Electronics", "Home Appliance", "Vehicle"].map((c) =>
              !categories.includes(c) ? (
                <option key={c} value={c}>{c}</option>
              ) : null
            )}
          </select>
        </div>

        {/* Specific requirements */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">
            Specific requirements{" "}
            <span className="text-ink-300">(optional)</span>
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. 5-star energy rating, inverter, Samsung"
            className="w-full px-3.5 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={!category || !budget || isPending}
          className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40"
        >
          {isPending ? "Finding best options…" : "Find best options →"}
        </button>
      </div>

      {/* Loading skeleton */}
      {isPending && <Skeleton />}

      {/* Results */}
      {!isPending && result && (
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

              {result.disclaimer && (
                <div className="card p-3 bg-amber-50/50 border-amber-200">
                  <p className="text-xs text-amber-700">⚠️ {result.disclaimer}</p>
                </div>
              )}

              {result.recommendations.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="text-sm font-medium text-ink-700">No matches found</p>
                  <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">
                    Try a broader category like Electronics, Home Appliance, or Vehicle.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <RecCard key={i} rec={rec} rank={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Warranty Sellers — Coming Soon ───────────────────────────────────── */}
      <div className="card p-5 border-dashed border-sand-300 bg-sand-50/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sand-100 flex items-center justify-center flex-shrink-0 text-xl">
            🏪
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-ink-800">Warranty Sellers</p>
              <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-ink-400 leading-relaxed">
              Verified extended warranty providers and AMC plans for your products.
              Compare plans, check coverage, and buy directly from trusted sellers.
            </p>
            <button
              disabled
              className="mt-3 text-xs text-ink-400 border border-ink-200 px-3 py-1.5 rounded-xl opacity-60 cursor-not-allowed"
            >
              Notify me when available
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
