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

export function formatWarrantyCountdown(expiryDate: string): string {
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day remaining";
  if (days < 30) return `${days} days remaining`;

  const totalMonths = Math.floor(days / 30);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (parts.length === 0) return `${days} days remaining`;
  return `${parts.join(" ")} remaining`;
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
