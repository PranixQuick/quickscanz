"use client";

import { useState, useTransition } from "react";
import { updateProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/types";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditProductModal({ product, onClose, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: product.name,
    brand: product.brand,
    purchase_date: product.purchase_date,
    warranty_months: String(product.warranty_months),
    price: product.price ? String(product.price) : "",
    model_number: (product as any).model_number || "",
    serial_number: (product as any).serial_number || "",
    store_name: (product as any).store_name || "",
    notes: (product as any).notes || "",
  });

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProduct(product.id, {
        name: form.name,
        brand: form.brand,
        purchase_date: form.purchase_date,
        warranty_months: parseInt(form.warranty_months),
        price: form.price ? parseFloat(form.price) : null,
        model_number: form.model_number || undefined,
        serial_number: form.serial_number || undefined,
        store_name: form.store_name || undefined,
        notes: form.notes || undefined,
      });

      if (result.success) {
        toast.success("Product updated");
        onUpdated();
        onClose();
      } else {
        toast.error(result.error || "Failed to update");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="w-full max-w-lg bg-cream-50 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 sticky top-0 bg-cream-50 z-10">
          <p className="text-sm font-medium text-ink-900">Edit Product</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center hover:bg-cream-200 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 10" stroke="#786e62" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-ink-500 mb-1.5">Product Name *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Brand *</label>
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Price (Rs)</label>
              <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)}
                placeholder="0" min="0"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Purchase Date *</label>
              <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]} required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Warranty (months) *</label>
              <select value={form.warranty_months} onChange={(e) => set("warranty_months", e.target.value)} required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300">
                {[1,3,6,12,18,24,36,48,60].map(m => (
                  <option key={m} value={m}>{m} month{m !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Model Number</label>
              <input value={form.model_number} onChange={(e) => set("model_number", e.target.value)}
                placeholder="e.g. SM-G991B"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Serial / IMEI</label>
              <input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)}
                placeholder="Serial number"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-ink-500 mb-1.5">Store / Retailer</label>
              <input value={form.store_name} onChange={(e) => set("store_name", e.target.value)}
                placeholder="e.g. Croma, Flipkart"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-ink-500 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                rows={2} placeholder="Any additional notes…"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 resize-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary py-3 text-sm disabled:opacity-40">
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
