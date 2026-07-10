import { addMonths, differenceInCalendarDays, differenceInMonths } from "date-fns";
import type { WarrantyStatus } from "./types";

export function calculateExpiryDate(purchaseDate: string, warrantyMonths: number): string {
  const date = new Date(purchaseDate);
  return addMonths(date, warrantyMonths).toISOString().split("T")[0];
}

// Parse a stored "yyyy-mm-dd" expiry as a LOCAL calendar date (not UTC midnight)
// so day math lines up with the user's timezone (IST etc.).
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseExpiry(expiryDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return startOfLocalDay(new Date(expiryDate));
}

export function getDaysRemaining(expiryDate: string): number {
  return differenceInCalendarDays(parseExpiry(expiryDate), startOfLocalDay(new Date()));
}

// Status is derived from the SAME day count as the countdown, so the two can
// never disagree — previously a product could show an "Expired" badge and
// "Expires today" text at once due to UTC-vs-local rounding.
export function getWarrantyStatus(expiryDate: string): WarrantyStatus {
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "active";
}

export function getStatusConfig(status: WarrantyStatus) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        color: "text-sage-500",
        bg: "bg-sage-100",
        border: "border-sage-200",
        dot: "bg-sage-400",
      };
    case "expiring_soon":
      return {
        label: "Expiring Soon",
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        dot: "bg-amber-400",
      };
    case "expired":
      return {
        label: "Expired",
        color: "text-blush-500",
        bg: "bg-blush-100",
        border: "border-blush-200",
        dot: "bg-blush-400",
      };
  }
}

export function formatWarrantyCountdown(expiryDate: string): string {
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day remaining";
  if (days < 30) return `${days} days remaining`;

  // 30+ days: express in real calendar years/months, not 30-day "months".
  // (Previously a 2-year warranty read "24m 10d remaining".)
  const totalMonths = differenceInMonths(parseExpiry(expiryDate), startOfLocalDay(new Date()));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (parts.length === 0) return `${days} days remaining`;
  return `${parts.join(" ")} remaining`;
}

export function formatCurrency(amount: number | null): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
