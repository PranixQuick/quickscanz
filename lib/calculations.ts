// lib/calculations.ts
// Pure synchronous utility functions — NO "use server" directive.
// These are plain TypeScript calculations, NOT server actions.
// Kept separate so they can be imported freely in both client and server components.

import type { ComparisonItem } from "@/lib/types";

// ─── RESALE VALUE ESTIMATION ──────────────────────────────────────────────────

export interface ResaleEstimate {
  estimatePct: number;
  estimatedValueInr: number | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  conditionLabel: string;
}

/**
 * Rule-based resale estimation (no external API needed).
 * Based on category, age, and condition.
 * Indian market norms from OLX/Quikr patterns.
 */
export function estimateResaleValue(params: {
  purchaseDate: string;
  originalPrice: number | null;
  category: string | null;
  conditionRating: number | null;
  warrantyStatus: "active" | "expiring_soon" | "expired";
}): ResaleEstimate {
  const { purchaseDate, originalPrice, category, conditionRating, warrantyStatus } = params;
  const ageMonths = Math.floor(
    (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const ageYears = ageMonths / 12;
  const condition = conditionRating || 3;
  const conditionLabel = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][condition];

  const curves: Record<string, { yearOne: number; perYear: number; floor: number }> = {
    "Smartphone":          { yearOne: 35, perYear: 15, floor: 15 },
    "Laptop":              { yearOne: 30, perYear: 12, floor: 20 },
    "Tablet":              { yearOne: 30, perYear: 12, floor: 15 },
    "Television":          { yearOne: 20, perYear: 8,  floor: 30 },
    "Air Conditioner":     { yearOne: 20, perYear: 8,  floor: 35 },
    "Refrigerator":        { yearOne: 15, perYear: 6,  floor: 35 },
    "Washing Machine":     { yearOne: 20, perYear: 8,  floor: 25 },
    "Kitchen Appliance":   { yearOne: 25, perYear: 10, floor: 20 },
    "Small Appliance":     { yearOne: 30, perYear: 12, floor: 15 },
    "Camera":              { yearOne: 25, perYear: 10, floor: 20 },
    "Audio / Wearable":    { yearOne: 35, perYear: 15, floor: 10 },
    "Computer Peripheral": { yearOne: 30, perYear: 12, floor: 15 },
    "Wearable":            { yearOne: 35, perYear: 15, floor: 10 },
    "Home Appliance":      { yearOne: 20, perYear: 8,  floor: 30 },
  };

  const cat = category || "Electronics";
  const curve = curves[cat] || { yearOne: 25, perYear: 10, floor: 20 };

  let pct: number;
  if (ageYears <= 1) {
    pct = 100 - (curve.yearOne * ageYears);
  } else {
    pct = (100 - curve.yearOne) - (curve.perYear * (ageYears - 1));
  }
  pct = Math.max(pct, curve.floor);

  const conditionAdj = (condition - 3) * 4;
  pct = Math.min(95, Math.max(curve.floor - 5, pct + conditionAdj));

  if (warrantyStatus === "active") pct = Math.min(95, pct + 5);

  const estimatedValueInr = originalPrice ? Math.round((originalPrice * pct) / 100) : null;
  const confidence = originalPrice && conditionRating ? "high" : originalPrice ? "medium" : "low";
  const reason = ageYears < 1
    ? `Nearly new (${ageMonths}m old) ${conditionLabel.toLowerCase()} condition`
    : `${ageYears.toFixed(1)} years old, ${conditionLabel.toLowerCase()} condition${warrantyStatus === "active" ? ", in warranty" : ""}`;

  return { estimatePct: Math.round(pct), estimatedValueInr, confidence, reason, conditionLabel };
}

// ─── PRODUCT COMPARISON ───────────────────────────────────────────────────────

export interface ComparisonResult {
  items: ComparisonItem[];
  winner: {
    bestValue: string | null;
    longestWarranty: string | null;
    bestLifespan: string | null;
    mostExpensive: string | null;
  };
  insights: string[];
}

export function compareProducts(items: ComparisonItem[]): ComparisonResult {
  if (items.length < 2) {
    return {
      items,
      winner: { bestValue: null, longestWarranty: null, bestLifespan: null, mostExpensive: null },
      insights: [],
    };
  }

  const withCost = items.filter((i) => i.cost_per_day !== null && i.cost_per_day > 0);
  const bestValue = withCost.length > 0
    ? withCost.reduce((a, b) => (a.cost_per_day! < b.cost_per_day! ? a : b)).id
    : null;

  const longestWarranty = items.reduce((a, b) =>
    a.warranty_months > b.warranty_months ? a : b
  ).id;

  const withLifespan = items.filter((i) => i.avg_lifespan_years !== null);
  const bestLifespan = withLifespan.length > 0
    ? withLifespan.reduce((a, b) =>
        ((a.avg_lifespan_years || 0) > (b.avg_lifespan_years || 0) ? a : b)
      ).id
    : null;

  const withPrice = items.filter((i) => i.price !== null);
  const mostExpensive = withPrice.length > 0
    ? withPrice.reduce((a, b) => ((a.price || 0) > (b.price || 0) ? a : b)).id
    : null;

  const insights: string[] = [];

  if (bestValue) {
    const b = items.find((i) => i.id === bestValue)!;
    insights.push(`💰 ${b.brand} ${b.name} has the best value at ₹${b.cost_per_day?.toFixed(2)}/day`);
  }
  if (longestWarranty) {
    const b = items.find((i) => i.id === longestWarranty)!;
    insights.push(`🛡️ ${b.brand} ${b.name} has the longest warranty (${b.warranty_months} months)`);
  }
  if (bestLifespan) {
    const b = items.find((i) => i.id === bestLifespan)!;
    insights.push(`⏳ ${b.brand} ${b.name} has the longest expected lifespan (~${b.avg_lifespan_years} years)`);
  }

  const expired = items.filter((i) => i.warranty_status === "expired");
  if (expired.length > 0) {
    insights.push(
      `⚠️ ${expired.map((i) => i.name).join(", ")} — warranty expired, consider replacement`
    );
  }

  return { items, winner: { bestValue, longestWarranty, bestLifespan, mostExpensive }, insights };
}
