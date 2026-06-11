"use client";
import Link from "next/link";
import { getWarrantyStatus, getStatusConfig, formatDate, formatWarrantyCountdown, formatCurrency } from "@/lib/utils";
import { getProductIntelligence } from "@/lib/intelligence";
import type { Product } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";

interface ProductCardProps {
  product: Product;
}

// VIRAL: WhatsApp deeplink share — India's primary distribution channel.
// Sends a pre-written message with product name, warranty expiry, and app URL.
function whatsappShare(product: Product, e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  const expiry = product.expiry_date
    ? new Date(product.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "unknown";
  const text = encodeURIComponent(
    `Hey! I just logged our *${product.name}* (${product.brand}) warranty on QuickScanZ — it expires on ${expiry}. You can track it here: https://quickscanz.app`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

export default function ProductCard({ product }: ProductCardProps) {
  const config = getStatusConfig(getWarrantyStatus(product.expiry_date));
  const countdown = formatWarrantyCountdown(product.expiry_date);
  const intel = getProductIntelligence(product.name, product.brand);

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="card card-hover p-5 cursor-pointer relative overflow-hidden">
        {product.is_demo && (
          <span className="absolute top-3 right-3 text-[9px] font-medium text-ink-300 bg-cream-200 px-1.5 py-0.5 rounded-full tracking-wide uppercase">
            Sample
          </span>
        )}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-cream-200 transition-colors">
            {intel.categoryIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 pr-10">
                <h3 className="font-medium text-sm text-ink-900 truncate leading-snug">{product.name}</h3>
                <p className="text-xs text-ink-400 mt-0.5">{product.brand} · {intel.category}</p>
              </div>
            </div>
            <StatusBadge expiryDate={product.expiry_date} size="sm" />
            <div className="h-px bg-cream-200 my-3" />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-ink-400">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <rect x="1" y="1.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1"/>
                  <path d="M3.5 1v1.5M7.5 1v1.5M1 4.5h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span>Expires {formatDate(product.expiry_date)}</span>
              </div>
              <span className={`font-medium text-[11px] ${config.color}`}>{countdown}</span>
            </div>
            {product.price && (
              <p className="text-[11px] text-ink-300 mt-1.5">Purchased at {formatCurrency(product.price)}</p>
            )}
            {product.price && product.resale_estimate_pct != null && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] bg-sage-50 border border-sage-200 text-sage-700 px-2 py-0.5 rounded-full">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
                <span>
                  Est. value ~{formatCurrency(Math.round(product.price * product.resale_estimate_pct / 100))}
                  {" "}({product.resale_estimate_pct}%)
                </span>
              </div>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-300 group-hover:text-ink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}
