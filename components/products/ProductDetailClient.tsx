"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { deleteProduct } from "@/lib/actions/products";
import { formatDate, formatCurrency, getWarrantyStatus } from "@/lib/utils";
import type { Product } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import CountdownRing from "@/components/ui/CountdownRing";
import GetHelpModal from "@/components/products/GetHelpModal";
import ProductIntelligenceCard from "@/components/products/ProductIntelligenceCard";
import ServiceCentreLocator from "@/components/products/ServiceCentreLocator";
import ClaimAssistant from "@/components/ai/ClaimAssistant";
import toast from "react-hot-toast";

interface Props { product: Product; }
type Tab = "overview" | "centres" | "claim" | "manual";

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [claimSessionId] = useState(`claim_${product.id}_${Date.now()}`);

  const status = getWarrantyStatus(product.expiry_date);
  const isImage = product.invoice_url?.match(/\.(jpg|jpeg|png|webp)$/i);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.success) {
        toast.success("Product removed");
        router.push("/products");
      } else {
        toast.error(result.error || "Failed to delete");
      }
    });
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "📋" },
    { key: "centres",  label: "Service",  icon: "📍" },
    { key: "claim",    label: "Claim AI", icon: "🤖" },
    { key: "manual",   label: "Manual",   icon: "📖" },
  ];

  return (
    <div className="space-y-5 animate-fade-up pb-4">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to products
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <CountdownRing expiryDate={product.expiry_date} warrantyMonths={product.warranty_months} purchaseDate={product.purchase_date} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="font-display text-xl font-light text-ink-900">{product.name}</h1>
                <p className="text-sm text-ink-500 mt-0.5">
                  {product.brand}
                  {(product as any).model_number ? ` · ${(product as any).model_number}` : ""}
                  {(product as any).category ? ` · ${(product as any).category}` : ""}
                </p>
              </div>
              {product.is_demo && (
                <span className="text-[10px] font-medium text-ink-300 bg-cream-200 px-2 py-1 rounded-full">Sample</span>
              )}
            </div>
            <div className="mt-2"><StatusBadge expiryDate={product.expiry_date} /></div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-4 pt-4 border-t border-cream-200 grid grid-cols-2 gap-3">
          <div className="bg-cream-100 rounded-xl p-3">
            <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Purchased</p>
            <p className="text-sm font-medium text-ink-800">{formatDate(product.purchase_date)}</p>
          </div>
          <div className="bg-cream-100 rounded-xl p-3">
            <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Warranty Expires</p>
            <p className={`text-sm font-medium ${status === "expired" ? "text-blush-500" : status === "expiring_soon" ? "text-amber-600" : "text-sage-600"}`}>
              {formatDate(product.expiry_date)}
            </p>
          </div>
          {product.price && (
            <div className="bg-cream-100 rounded-xl p-3">
              <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Price Paid</p>
              <p className="text-sm font-medium text-ink-800">{formatCurrency(product.price)}</p>
            </div>
          )}
          {(product as any).store_name && (
            <div className="bg-cream-100 rounded-xl p-3">
              <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Bought From</p>
              <p className="text-sm font-medium text-ink-800 truncate">{(product as any).store_name}</p>
            </div>
          )}
          {(product as any).serial_number && (
            <div className="bg-cream-100 rounded-xl p-3 col-span-2">
              <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Serial / IMEI</p>
              <p className="text-sm font-medium text-ink-800 font-mono">{(product as any).serial_number}</p>
            </div>
          )}
          {(product as any).notes && (
            <div className="bg-cream-100 rounded-xl p-3 col-span-2">
              <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Notes</p>
              <p className="text-sm text-ink-600 leading-relaxed">{(product as any).notes}</p>
            </div>
          )}
        </div>

        {/* Get Help */}
        <div className="mt-4">
          <GetHelpModal product={product} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-100 p-1 rounded-2xl">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-medium transition-all ${
              tab === t.key ? "bg-white text-ink-900 shadow-sm" : "text-ink-400 hover:text-ink-600"
            }`}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <ProductIntelligenceCard name={product.name} brand={product.brand} />
          {product.invoice_url && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Invoice</p>
              <button onClick={() => setInvoiceOpen(true)} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-cream-100 group">
                {isImage ? (
                  <Image src={product.invoice_url} alt="Invoice" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 4h14l6 6v18H6V4z" stroke="#c9bfb3" strokeWidth="1.5"/><path d="M20 4v6h6" stroke="#c9bfb3" strokeWidth="1.5"/><path d="M11 16h10M11 20h7" stroke="#c9bfb3" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <p className="text-xs text-ink-400">Tap to view PDF invoice</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/10 transition-colors" />
              </button>
              <a href={product.invoice_url} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-sand-500 hover:text-sand-400 mt-2">Open in new tab →</a>
            </div>
          )}
          <div className="pt-2">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 text-sm text-ink-300 hover:text-blush-500 transition-colors">Remove product</button>
            ) : (
              <div className="card p-4 border-blush-200 bg-blush-50/30">
                <p className="text-sm text-ink-700 font-medium mb-1">Remove this product?</p>
                <p className="text-xs text-ink-400 mb-3">This will permanently delete the product and any uploaded invoice.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 py-2.5 text-sm" disabled={isPending}>Cancel</button>
                  <button onClick={handleDelete} disabled={isPending} className="flex-1 py-2.5 px-4 bg-blush-500 text-white text-sm font-medium rounded-xl hover:bg-blush-600 transition-colors disabled:opacity-50">
                    {isPending ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Service Centres */}
      {tab === "centres" && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Authorized Service Centres — {product.brand}</p>
          <ServiceCentreLocator brand={product.brand} />
        </div>
      )}

      {/* Tab: AI Claim */}
      {tab === "claim" && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-sm font-medium text-ink-900">AI Claim Assistant</p>
              <p className="text-xs text-ink-400">Powered by Claude · Guides you through warranty claims</p>
            </div>
          </div>
          <ClaimAssistant product={product} sessionId={claimSessionId} initialMessages={[]} />
        </div>
      )}

      {/* Tab: Manual */}
      {tab === "manual" && (
        <div className="card p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 4h11l5 5v15H6V4z" stroke="#c9bfb3" strokeWidth="1.5"/><path d="M17 4v5h5" stroke="#c9bfb3" strokeWidth="1.5"/><path d="M10 13h8M10 17h6M10 21h4" stroke="#c9bfb3" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-800">User Manual</p>
            <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">Search ManualsLib — the world&apos;s largest free manual database — for your {product.brand} {product.name}.</p>
          </div>
          <a href={`https://www.manualslib.com/search/?q=${encodeURIComponent(product.brand + " " + product.name)}`} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 9.5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Find Manual on ManualsLib
          </a>
          <p className="text-xs text-ink-300">Opens in a new tab · Free resource</p>
        </div>
      )}

      {/* Invoice modal */}
      {invoiceOpen && product.invoice_url && (
        <div className="fixed inset-0 z-50 bg-ink-900/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInvoiceOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setInvoiceOpen(false)} className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-cream-200 hover:text-white">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {isImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image src={product.invoice_url} alt="Invoice" fill className="object-contain bg-white" />
              </div>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-sm text-ink-600 mb-4">PDF Invoice</p>
                <a href={product.invoice_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-6 py-2.5">Open PDF →</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
