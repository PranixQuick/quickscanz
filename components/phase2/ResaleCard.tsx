"use client";

import { useState, useTransition } from "react";
import { estimateResaleValue } from "@/lib/calculations";
import { saveResaleEstimate } from "@/lib/actions/phase2";
import { formatCurrency, getWarrantyStatus } from "@/lib/utils";
import type { Product } from "@/lib/types";
import toast from "react-hot-toast";

interface Props {
  product: Product;
}

const CONDITION_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const CONDITION_COLORS = ["", "text-blush-500", "text-amber-500", "text-amber-400", "text-sage-500", "text-sage-600"];

export default function ResaleCard({ product }: Props) {
  const [isPending, startTransition] = useTransition();
  const [condition, setCondition] = useState<number>((product as any).condition_rating || 3);
  const [saved, setSaved] = useState(false);

  const warrantyStatus = getWarrantyStatus(product.expiry_date);

  const estimate = estimateResaleValue({
    purchaseDate: product.purchase_date,
    originalPrice: product.price,
    category: (product as any).category || null,
    conditionRating: condition,
    warrantyStatus,
  });

  function handleSave() {
    startTransition(async () => {
      const r = await saveResaleEstimate(product.id, estimate.estimatePct, condition);
      if (r.success) { toast.success("Resale estimate saved"); setSaved(true); }
      else toast.error(r.error || "Failed to save");
    });
  }

  const confidenceColor = estimate.confidence === "high"
    ? "text-sage-600" : estimate.confidence === "medium"
    ? "text-amber-600" : "text-ink-400";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Resale Value</p>
        <span className={`text-[10px] font-medium ${confidenceColor}`}>
          {estimate.confidence} confidence
        </span>
      </div>

      {/* Estimate display */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-cream-100 rounded-xl">
        <div>
          <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Estimated value</p>
          <p className="text-xl font-display font-light text-ink-900">
            {estimate.estimatedValueInr
              ? formatCurrency(estimate.estimatedValueInr)
              : `~${estimate.estimatePct}%`}
          </p>
          {product.price && (
            <p className="text-[10px] text-ink-400">
              of ₹{product.price.toLocaleString("en-IN")} purchase price
            </p>
          )}
        </div>

        {/* Depreciation circle */}
        <div className="flex-shrink-0 ml-auto">
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 48 48" className="w-14 h-14 -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e8dfd0" strokeWidth="4" />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke={estimate.estimatePct > 60 ? "#7aa67a" : estimate.estimatePct > 40 ? "#d97706" : "#d95f54"}
                strokeWidth="4"
                strokeDasharray={`${(estimate.estimatePct / 100) * 125.6} 125.6`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-ink-800">{estimate.estimatePct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Condition selector */}
      <div className="mb-4">
        <p className="text-xs text-ink-500 mb-2">
          Condition: <span className={`font-medium ${CONDITION_COLORS[condition]}`}>{CONDITION_LABELS[condition]}</span>
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => { setCondition(n); setSaved(false); }}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${
                condition === n
                  ? "bg-ink-900 text-cream-100"
                  : "bg-cream-100 text-ink-400 hover:bg-cream-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-ink-300">Poor</span>
          <span className="text-[9px] text-ink-300">Excellent</span>
        </div>
      </div>

      {/* Reason */}
      <p className="text-xs text-ink-400 mb-3 leading-relaxed">{estimate.reason}</p>

      {/* Save button */}
      {!saved ? (
        <button onClick={handleSave} disabled={isPending}
          className="w-full btn-secondary py-2 text-xs disabled:opacity-40">
          {isPending ? "Saving…" : "Save estimate"}
        </button>
      ) : (
        <p className="text-center text-xs text-sage-600">✓ Estimate saved</p>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-ink-300 mt-2 text-center">
        Estimates based on Indian market norms (OLX / Quikr patterns). Actual value varies.
      </p>
    </div>
  );
}
