import { addMonths, differenceInDays, isPast, isWithinInterval, addDays } from "date-fns";
import type { WarrantyStatus } from "./types";

export function calculateExpiryDate(purchaseDate: string, warrantyMonths: number): string {
  const date = new Date(purchaseDate);
  return addMonths(date, warrantyMonths).toISOString().split("T")[0];
}

export function getWarrantyStatus(expiryDate: string): WarrantyStatus {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  if (isPast(expiry)) return "expired";
  if (isWithinInterval(expiry, { start: now, end: thirtyDaysFromNow })) return "expiring_soon";
  return "active";
}

export function getDaysRemaining(expiryDate: string): number {
  return differenceInDays(new Date(expiryDate), new Date());
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
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day remaining";
  if (days < 30) return `${days} days remaining`;
  const months = Math.floor(days / 30);
  const remaining = days % 30;
  if (remaining === 0) return `${months} month${months > 1 ? "s" : ""} remaining`;
  return `${months}m ${remaining}d remaining`;
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
