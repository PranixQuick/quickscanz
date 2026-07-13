// Ported from the web app's warranty-status logic (lib/utils.ts:
// getWarrantyStatus/getDaysRemaining/getStatusConfig/formatWarrantyCountdown,
// plus calculateExpiryDate from lib/calculations.ts / lib/utils.ts).
// Pure functions — no Expo/React Native APIs — so they're trivially reusable
// across the wallet list, home stats card, and product detail screen, and
// easy to unit test.
//
// NOTE: no date-fns dependency here (not in native/package.json); date math
// is done with plain Date arithmetic instead. formatWarrantyCountdown's
// year/month breakdown uses a 30-day-month approximation rather than
// date-fns' calendar-aware differenceInMonths, so long countdowns may be off
// by a day or two versus the web app — acceptable for display purposes.

import type { WarrantyStatus, Product } from "./types";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseExpiry(expiryDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return startOfLocalDay(new Date(expiryDate));
}

function diffCalendarDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()) / MS_PER_DAY);
}

/** purchaseDate ("yyyy-mm-dd" or any Date-parseable string) + warrantyMonths -> "yyyy-mm-dd". */
export function calculateExpiryDate(purchaseDate: string, warrantyMonths: number): string {
  const date = new Date(purchaseDate);
  date.setMonth(date.getMonth() + warrantyMonths);
  return date.toISOString().split("T")[0];
}

export function getDaysRemaining(expiryDate: string): number {
  return diffCalendarDays(parseExpiry(expiryDate), startOfLocalDay(new Date()));
}

/**
 * Status is derived from the SAME day count as getDaysRemaining, so a badge
 * and its countdown text can never disagree (mirrors the web app's fix for
 * UTC-vs-local rounding).
 */
export function getWarrantyStatus(expiryDate: string): WarrantyStatus {
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "active";
}

/**
 * Tailwind/NativeWind class tokens for a status badge/dot. Uses the default
 * Tailwind palette (green/amber/red) rather than the web app's custom
 * sage/amber/blush tokens, since those custom colors aren't defined in
 * native/tailwind.config.js.
 */
export function getStatusConfig(status: WarrantyStatus) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        text: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        dot: "bg-green-500",
      };
    case "expiring_soon":
      return {
        label: "Expiring Soon",
        text: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        dot: "bg-amber-500",
      };
    case "expired":
      return {
        label: "Expired",
        text: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        dot: "bg-red-500",
      };
  }
}

export function formatWarrantyCountdown(expiryDate: string, t?: (key: string, params?: Record<string, string | number>) => string): string {
  const days = getDaysRemaining(expiryDate);
  const trans = t || ((k: string, p?: any) => {
    if (k === "product.countdown_expired") return `Expired ${p?.days} days ago`;
    if (k === "product.countdown_expires_today") return "Expires today";
    if (k === "product.countdown_day_remaining") return "1 day remaining";
    if (k === "product.countdown_days_remaining") return `${p?.days} days remaining`;
    if (k === "product.countdown_years_months_remaining") return `${p?.years}y ${p?.months}m remaining`;
    if (k === "product.countdown_years_remaining") return `${p?.years} years remaining`;
    if (k === "product.countdown_months_remaining") return `${p?.months} months remaining`;
    return k;
  });

  if (days < 0) {
    return trans("product.countdown_expired", { days: Math.abs(days) });
  }
  if (days === 0) return trans("product.countdown_expires_today");
  if (days === 1) return trans("product.countdown_day_remaining");
  if (days < 30) return trans("product.countdown_days_remaining", { days });

  const totalMonths = Math.floor(days / 30);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) {
    return trans("product.countdown_years_months_remaining", { years, months });
  }
  if (years > 0) {
    return trans("product.countdown_years_remaining", { years });
  }
  return trans("product.countdown_months_remaining", { months });
}

/** Ascending by days-remaining (most urgent first) — stable, non-mutating. */
export function sortByExpiry<T extends Pick<Product, "expiry_date">>(products: T[]): T[] {
  return [...products].sort((a, b) => getDaysRemaining(a.expiry_date) - getDaysRemaining(b.expiry_date));
}

export interface StatusCounts {
  active: number;
  expiring_soon: number;
  expired: number;
  total: number;
}

export function countByStatus<T extends Pick<Product, "expiry_date">>(products: T[]): StatusCounts {
  const counts: StatusCounts = { active: 0, expiring_soon: 0, expired: 0, total: 0 };
  for (const p of products) {
    counts[getWarrantyStatus(p.expiry_date)] += 1;
    counts.total += 1;
  }
  return counts;
}

export interface ResaleEstimate {
  estimatePct: number;
  estimatedValueInr: number | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  conditionLabel: string;
}

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

