"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { addProduct } from "@/lib/actions/products";

const WARRANTY_PRESETS = [
  { label: "6 months", value: 6 },
  { label: "1 year", value: 12 },
  { label: "2 years", value: 24 },
  { label: "3 years", value: 36 },
  { label: "5 years", value: 60 },
];

export default function AddProductForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [customWarranty, setCustomWarranty] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10MB."); return; }
      setInvoiceFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"], "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("warranty_months", warrantyMonths.toString());
    if (invoiceFile) data.set("invoice", invoiceFile);

    startTransition(async () => {
      const result = await addProduct(data);
      if (result.success) {
        toast.success("Product added successfully!");
        router.push(`/products/${result.id}`);
      } else {
        toast.error(result.error || "Failed to add product");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="label">Product Name *</label>
        <input id="name" name="name" type="text" required className="input-field" placeholder='e.g. Samsung 55" QLED TV'/>
      </div>

      <div>
        <label htmlFor="brand" className="label">Brand *</label>
        <input id="brand" name="brand" type="text" required className="input-field" placeholder="e.g. Samsung"/>
      </div>

      <div>
        <label htmlFor="purchase_date" className="label">Purchase Date *</label>
        <input
          id="purchase_date" name="purchase_date" type="date" required
          defaultValue={new Date().toISOString().split("T")[0]}
          max={new Date().toISOString().split("T")[0]}
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Warranty Duration *</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {WARRANTY_PRESETS.map((preset) => (
            <button
              key={preset.value} type="button"
              onClick={() => { setWarrantyMonths(preset.value); setCustomWarranty(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                warrantyMonths === preset.value && !customWarranty ? "bg-ink-900 text-cream-50" : "bg-cream-200 text-ink-600 hover:bg-cream-300"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button" onClick={() => setCustomWarranty(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${customWarranty ? "bg-ink-900 text-cream-50" : "bg-cream-200 text-ink-600 hover:bg-cream-300"}`}
          >
            Custom
          </button>
        </div>
        {customWarranty && (
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max="360"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 1)}
              className="input-field w-28" placeholder="12"
            />
            <span className="text-sm text-ink-500">months</span>
          </div>
        )}
        <input type="hidden" name="warranty_months" value={warrantyMonths}/>
      </div>

      <div>
        <label htmlFor="price" className="label">
          Purchase Price <span className="normal-case font-normal text-ink-300 ml-1">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400 font-mono">₹</span>
          <input id="price" name="price" type="number" min="0" step="0.01" className="input-field pl-8" placeholder="0.00"/>
        </div>
      </div>

      <div>
        <label className="label">
          Invoice / Receipt <span className="normal-case font-normal text-ink-300 ml-1">(optional)</span>
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive ? "border-sand-400 bg-sand-100/50" : invoiceFile ? "border-sage-300 bg-sage-100/30" : "border-cream-300 hover:border-sand-300 hover:bg-cream-100/50"
          }`}
        >
          <input {...getInputProps()}/>
          {invoiceFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3 3 7-7" stroke="#4e894e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-ink-700">{invoiceFile.name}</p>
              <p className="text-xs text-ink-400">{(invoiceFile.size / 1024).toFixed(0)} KB</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }} className="text-xs text-blush-500 hover:text-blush-600 mt-1">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 13V7M7 10l3-3 3 3" stroke="#958b7d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="3" y="3" width="14" height="14" rx="3" stroke="#b3ab9e" strokeWidth="1.2"/>
                </svg>
              </div>
              <p className="text-sm text-ink-500">{isDragActive ? "Drop it here" : "Tap to upload or drag & drop"}</p>
              <p className="text-xs text-ink-300">JPG, PNG, PDF · Max 10MB</p>
            </div>
          )}
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full py-3.5 text-base">
        {isPending ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="18 6"/>
            </svg>
            Saving…
          </div>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Save Product
          </>
        )}
      </button>
    </form>
  );
}
