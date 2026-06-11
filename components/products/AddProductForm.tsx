"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { addProduct } from "@/lib/actions/products";
import ProductSearchInput from "./ProductSearchInput";
import type { CatalogProduct } from "@/lib/actions/catalog";

const CATEGORIES = [
  { value: "Electronics",    label: "Electronics",    icon: "💻", subs: ["Smartphone","Laptop","Television","Camera","Audio","Wearable","Printer","Networking","Other"] },
  { value: "Home Appliance", label: "Appliance",       icon: "🏠", subs: ["Air Conditioner","Washing Machine","Refrigerator","Microwave","Water Heater","Air Purifier","Kitchen Appliance","Other"] },
  { value: "Vehicle",        label: "Vehicle",         icon: "🚗", subs: ["Car","Motorcycle","Scooter","Other"] },
  { value: "Furniture",      label: "Furniture",       icon: "🪑", subs: ["Sofa","Bed","Wardrobe","Other"] },
  { value: "Other",          label: "Other",           icon: "📦", subs: ["Other"] },
];

const WARRANTY_PRESETS = [
  { label: "6 Mo", value: 6 },
  { label: "1 Yr", value: 12 },
  { label: "2 Yr", value: 24 },
  { label: "3 Yr", value: 36 },
  { label: "5 Yr", value: 60 },
];

interface FormState {
  name: string; brand: string; category: string; subcategory: string;
  model_number: string; serial_number: string; purchase_date: string;
  store_name: string; warranty_months: number; price: string; notes: string;
  catalog_product_id: string | null;
}

const DEFAULT: FormState = {
  name: "", brand: "", category: "", subcategory: "",
  model_number: "", serial_number: "", purchase_date: "",
  store_name: "", warranty_months: 12, price: "", notes: "", catalog_product_id: null,
};

export default function AddProductForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [customWarranty, setCustomWarranty] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const set = (k: keyof FormState, v: string | number | null) =>
    setForm((p) => ({ ...p, [k]: v }));

  function handleCatalogSelect(product: CatalogProduct) {
    setForm((p) => ({
      ...p,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory || "",
      model_number: product.model_number || "",
      warranty_months: product.standard_warranty_months,
      catalog_product_id: product.id,
    }));
  }

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setInvoiceFile(accepted[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [], "application/pdf": [] },
    useFsAccessApi: false,
    maxSize: 10485760, multiple: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.brand || !form.purchase_date) {
      toast.error("Name, brand, and purchase date are required"); return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null) fd.append(k, String(v)); });
    if (invoiceFile) fd.append("invoice", invoiceFile);
    startTransition(async () => {
      const result = await addProduct(fd);
      if (result.success) {
        toast.success("Added to your Warranty Wallet!");
        router.push(result.id ? `/products/${result.id}` : "/products");
      } else {
        toast.error(result.error || "Failed to add product");
      }
    });
  }

  const selectedCat = CATEGORIES.find((c) => c.value === form.category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Search */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Find Product</label>
        <ProductSearchInput onSelect={handleCatalogSelect} onManualEntry={(v) => set("name", v)} />
        <p className="text-[11px] text-ink-300 mt-1.5">Search to auto-fill, or enter manually below</p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Category</label>
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" onClick={() => { set("category", c.value); set("subcategory", c.subs[0]); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center ${form.category === c.value ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600 hover:border-sand-300"}`}>
              <span className="text-lg">{c.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
        {selectedCat && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedCat.subs.map((sub) => (
              <button key={sub} type="button" onClick={() => set("subcategory", sub)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.subcategory === sub ? "bg-sand-400 border-sand-400 text-white" : "bg-cream-100 border-cream-200 text-ink-500 hover:border-sand-300"}`}>
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-cream-200" />

      {/* Core fields */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Product Details</label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Product Name *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Galaxy S24" required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Brand *</label>
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Samsung" required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Model Number</label>
              <input value={form.model_number} onChange={(e) => set("model_number", e.target.value)} placeholder="e.g. SM-S921B"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Serial / IMEI</label>
              <input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="Optional"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Purchase Date *</label>
              <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]} required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Store / Platform</label>
              <input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} placeholder="e.g. Flipkart"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1.5">Price Paid (₹)</label>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 74999" min="0"
              className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
          </div>
        </div>
      </div>

      <div className="h-px bg-cream-200" />

      {/* Warranty */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Warranty Duration</label>
        <div className="flex gap-2 flex-wrap">
          {WARRANTY_PRESETS.map((p) => (
            <button key={p.value} type="button" onClick={() => { set("warranty_months", p.value); setCustomWarranty(false); }}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${form.warranty_months === p.value && !customWarranty ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600 hover:border-sand-300"}`}>
              {p.label}
            </button>
          ))}
          <button type="button" onClick={() => setCustomWarranty(true)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${customWarranty ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600 hover:border-sand-300"}`}>
            Custom
          </button>
        </div>
        {customWarranty && (
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={form.warranty_months} onChange={(e) => set("warranty_months", parseInt(e.target.value) || 12)}
              min="1" max="240" className="w-24 px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            <span className="text-sm text-ink-400">months</span>
          </div>
        )}
        {form.purchase_date && form.warranty_months > 0 && (() => {
          const expiry = new Date(form.purchase_date);
          expiry.setMonth(expiry.getMonth() + Number(form.warranty_months));
          const isExpired = expiry < new Date();
          return (
            <p className={`text-xs mt-2 px-1 ${
              isExpired ? "text-blush-500" : "text-sage-600"
            }`}>
              {isExpired ? "⚠️" : "✓"} Warranty expires{" "}
              {expiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {isExpired ? " (already expired)" : ""}
            </p>
          );
        })()}
      </div>

      <div className="h-px bg-cream-200" />

      {/* Invoice */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Invoice / Receipt</label>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragActive ? "border-sand-400 bg-sand-50" : invoiceFile ? "border-sage-300 bg-sage-50" : "border-cream-300 hover:border-sand-300 hover:bg-cream-100"}`}>
          <input {...getInputProps()} capture="environment" />
          {invoiceFile ? (
            <div className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h8l4 4v8H2V2z" stroke="#7aa67a" strokeWidth="1.2"/><path d="M10 2v4h4" stroke="#7aa67a" strokeWidth="1.2"/></svg>
              <span className="text-sm text-sage-700 font-medium truncate max-w-[200px]">{invoiceFile.name}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }} className="text-xs text-blush-500 hover:text-blush-600 ml-1">Remove</button>
            </div>
          ) : (
            <div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 text-ink-300"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 4v12M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p className="text-sm text-ink-400">{isDragActive ? "Drop it here" : "Upload invoice or receipt"}</p>
              <p className="text-xs text-ink-300 mt-1">JPG, PNG, PDF · Max 10MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-ink-500 mb-1.5">Notes (optional)</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes about this product..."
          rows={2} className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 resize-none" />
      </div>

      <button type="submit" disabled={isPending || !form.name || !form.brand || !form.purchase_date}
        className="w-full btn-primary py-3.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Saving...
          </span>
        ) : "Add to Warranty Wallet"}
      </button>
    </form>
  );
}
