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
import toast from "react-hot-toast";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.success) {
        toast.success("Product removed");
        router.push("/products");
      } else {
        toast.error(result.error || "Failed to remove");
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Products
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0 pr-3">
            <h1 className="font-display text-2xl font-light text-ink-900 leading-tight">{product.name}</h1>
            <p className="text-sm text-ink-400 mt-1">{product.brand}</p>
          </div>
          <StatusBadge expiryDate={product.expiry_date} />
        </div>
        <div className="flex justify-center py-2">
          <CountdownRing
            expiryDate={product.expiry_date}
            warrantyMonths={product.warranty_months}
            purchaseDate={product.purchase_date}
          />
        </div>
      </div>

      <GetHelpModal product={product} />

      <div className="card p-5">
        <h2 className="font-display text-base font-light text-ink-700 mb-4">Product Details</h2>
        <div className="space-y-0">
          {[
            { label: "Brand", value: product.brand },
            { label: "Purchased", value: formatDate(product.purchase_date) },
            { label: "Warranty", value: `${product.warranty_months} months` },
            { label: "Expires", value: formatDate(product.expiry_date) },
            ...(product.price ? [{ label: "Paid", value: formatCurrency(product.price) }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-cream-100 last:border-0">
              <span className="text-xs text-ink-400">{label}</span>
              <span className="text-sm font-medium text-ink-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <ProductIntelligenceCard name={product.name} brand={product.brand} />

      <div className="card p-5">
        <h2 className="font-display text-base font-light text-ink-700 mb-4">Invoice / Receipt</h2>
        {product.invoice_url ? (
          <div className="space-y-3">
            {/\.(jpg|jpeg|png|webp)/i.test(product.invoice_url) ? (
              <button onClick={() => setInvoiceOpen(true)} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-cream-100 group">
                <Image src={product.invoice_url} alt="Invoice" fill className="object-contain"/>
                <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-ink-900/70 text-cream-50 text-xs px-3 py-1.5 rounded-full">Tap to expand</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-cream-100 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="2" width="12" height="14" rx="2" stroke="#958b7d" strokeWidth="1.3"/>
                    <path d="M6 6h6M6 9h6M6 12h3" stroke="#b3ab9e" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-700">Invoice PDF</p>
                  <p className="text-xs text-ink-400">Tap to open</p>
                </div>
              </div>
            )}
            <a href={product.invoice_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full text-sm justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 9V3M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              View Full Invoice
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="2" width="12" height="16" rx="2.5" stroke="#c9bfb3" strokeWidth="1.3" strokeDasharray="3 2"/>
              </svg>
            </div>
            <p className="text-sm text-ink-400">No invoice uploaded</p>
            <p className="text-xs text-ink-300 mt-1">Your invoice is your proof of purchase — always upload it.</p>
          </div>
        )}
      </div>

      <div className="pt-2 pb-6">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 text-sm text-ink-300 hover:text-blush-500 transition-colors">
            Remove this product
          </button>
        ) : (
          <div className="card border-blush-200 bg-blush-50/40 p-5 space-y-4">
            <p className="text-sm text-ink-700 text-center">Remove <strong>{product.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1" disabled={isPending}>Cancel</button>
              <button onClick={handleDelete} disabled={isPending} className="flex-1 py-2.5 px-4 bg-blush-500 text-white text-sm font-medium rounded-xl hover:bg-blush-600 transition-colors disabled:opacity-50">
                {isPending ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        )}
      </div>

      {invoiceOpen && product.invoice_url && (
        <div className="fixed inset-0 z-50 bg-ink-900/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInvoiceOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setInvoiceOpen(false)} className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-cream-200 hover:text-white">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <Image src={product.invoice_url} alt="Invoice" width={600} height={800} className="w-full rounded-2xl"/>
          </div>
        </div>
      )}
    </div>
  );
}
