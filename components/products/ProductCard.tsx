"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { getWarrantyStatus, getStatusConfig, formatDate, formatWarrantyCountdown, formatCurrency } from "@/lib/utils";
import { getProductIntelligence } from "@/lib/intelligence";
import type { Product } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";

interface ProductCardProps {
  product: Product;
}

// VIRAL: WhatsApp deeplink share — India's primary distribution channel.
// Sends a pre-written message with product name, warranty expiry, and app URL.
function whatsappShare(product: Product, e: React.MouseEvent, t: any) {
  e.preventDefault();
  e.stopPropagation();
  const expiry = product.expiry_date
    ? new Date(product.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "unknown";
  const text = encodeURIComponent(
    t("product.whatsapp_share_message").replace("{name}", product.name).replace("{brand}", product.brand).replace("{expiry}", expiry)
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

export default function ProductCard({ product }: ProductCardProps) {
  const t = useT();
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
                <span>{t("product.expires_on")} {formatDate(product.expiry_date)}</span>
              </div>
              <span className={`font-medium text-[11px] ${config.color}`}>{countdown}</span>
            </div>
            {product.price && (
              <p className="text-[11px] text-ink-300 mt-1.5">{t("product.purchased_at_val")} {formatCurrency(product.price)}</p>
            )}
            {product.price && product.resale_estimate_pct != null && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] bg-sage-50 border border-sage-200 text-sage-700 px-2 py-0.5 rounded-full">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
                <span>
                  {t("product.est_value")} ~{formatCurrency(Math.round(product.price * product.resale_estimate_pct / 100))}
                  {" "}({product.resale_estimate_pct}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {/* WhatsApp share — viral family loop */}
            {!product.is_demo && (
              <button
                onClick={(e) => whatsappShare(product, e, t)}
                aria-label={t("product.share_whatsapp_aria")}
                className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            )}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-300 group-hover:text-ink-500 group-hover:translate-x-0.5 transition-all">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
