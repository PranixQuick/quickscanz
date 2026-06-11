"use client";

import { useState, useTransition, useCallback } from "react";
import { getBuyingRecommendations, type BuyingRecommendation } from "@/lib/actions/phase3";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const BUDGET_PRESETS = [
  { label: "Under 15K", value: 15000 },
  { label: "15K–30K", value: 30000 },
  { label: "30K–60K", value: 60000 },
  { label: "60K–1L", value: 100000 },
  { label: "1L+",    value: 200000 },
];

const RANK_LABELS = ["🥇 Best pick", "🥈 Runner up", "🥉 Also good", "4th", "5th"];

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
function RecCard({ rec, rank, budget }: { rec: BuyingRecommendation; rank: number; budget: number }) {
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
          {/* Transparent cost/day: clearly labelled as 'if you spend ₹X' */}
          <p className="text-[10px] text-ink-300 leading-tight">if you spend</p>
          <p className="text-[10px] text-ink-400">₹{budget.toLocaleString("en-IN")}</p>
          <p className="text-sm font-medium text-ink-800">{cpdDisplay}/day</p>
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

  // ── Voice search ────────────────────────────────────────────────────────────
  const handleVoiceResult = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const {
    isListening,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceSearch(handleVoiceResult);

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
        <h1 className="font-display text-2xl font-light text-ink-900">Warranty Advisor</h1>
        <p className="text-sm text-ink-400 mt-1">
          Find products with the best warranty &amp; lifespan for your needs
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full">
          <span>ℹ️</span>
          <span>Ranked by warranty &amp; lifespan · No real-time prices · Verify pricing on retailer links</span>
        </div>
      </div>

      {/* Input card */}
      <div className="card p-5 space-y-4">

        {/* Budget — clearly labelled as cost/day calculator, not a price filter */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">
            Your budget
            <span className="ml-1 font-normal text-ink-300">(used to calculate cost per day)</span>
          </label>
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

        {/* Specific requirements — with voice input */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">
            Brand or requirements{" "}
            <span className="text-ink-300">(optional)</span>
          </label>
          <div className="relative">
            <input
              value={isListening ? "🎙 Listening…" : query}
              onChange={(e) => !isListening && setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Samsung, 5-star energy, inverter"
              readOnly={isListening}
              className={`w-full pl-3.5 pr-12 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 transition-colors ${
                isListening ? "border-red-300 bg-red-50/30" : ""
              }`}
            />

            {/* Mic button — only shown if browser supports voice */}
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  isListening
                    ? "bg-red-100 text-red-500 animate-pulse"
                    : "bg-cream-200 text-ink-400 hover:bg-sand-100 hover:text-ink-600"
                }`}
              >
                {isListening ? (
                  // Stop icon
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="2" y="2" width="10" height="10" rx="2"/>
                  </svg>
                ) : (
                  // Mic icon
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Voice error */}
          {voiceError && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <span>⚠️</span> {voiceError}
            </p>
          )}
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

              {/* Prominent disclaimer — moved above cards so users see it before results */}
              <div className="card p-3 bg-amber-50/50 border-amber-200">
                <p className="text-xs text-amber-700">
                  ⚠️ <strong>Prices not available.</strong> Results are ranked by warranty &amp; lifespan only.
                  The cost/day figure shows what you'd pay per day <em>if</em> you spend your stated budget.
                  Always check Amazon or Flipkart for current pricing before buying.
                </p>
              </div>

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
                    <RecCard key={i} rec={rec} rank={i} budget={budget} />
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
