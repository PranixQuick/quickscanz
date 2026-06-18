"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { addProduct } from "@/lib/actions/products";
import ProductSearchInput from "./ProductSearchInput";
import { useT } from "@/lib/i18n/provider";
import type { CatalogProduct } from "@/lib/actions/catalog";

// ---------- Bill OCR Modal ----------
function ScanBillModal({ onResult, onClose, t }: {
  t: any;
  onResult: (fields: Partial<FormState>) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function processFile(file: File) {
    setStage("scanning");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/ocr", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const fields: Partial<FormState> = {};
      if (json.brand)         fields.brand         = json.brand;
      if (json.product_name)  fields.name          = json.product_name;
      if (json.model_number)  fields.model_number  = json.model_number;
      if (json.serial_number) fields.serial_number = json.serial_number;
      if (json.store_name)    fields.store_name    = json.store_name;
      if (json.price)         fields.price         = String(json.price);
      if (json.purchase_date) fields.purchase_date = json.purchase_date;
      setStage("done");
      setTimeout(() => { onResult(fields); onClose(); }, 800);
    } catch (e: any) {
      setErrMsg(t("product.ocr_error"));
      setStage("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/90 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-cream-300 mx-auto" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-900">📸 {t("product.scan_bill_title")}</p>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {stage === "idle" && (
          <>
            <p className="text-xs text-ink-400 leading-relaxed">
              {t("product.scan_bill_desc")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Camera capture */}
              <button
                onClick={() => fileRef.current && (fileRef.current.accept = "image/*", fileRef.current.capture = "environment", fileRef.current.click())}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-ink-900 text-cream-100 active:bg-ink-700 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="text-xs font-medium">{t("product.take_photo")}</span>
              </button>
              {/* Gallery / file pick */}
              <button
                onClick={() => fileRef.current && (fileRef.current.accept = "image/*,application/pdf", fileRef.current.removeAttribute("capture"), fileRef.current.click())}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-cream-100 text-ink-700 border border-cream-200 active:bg-cream-200 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-xs font-medium">{t("product.choose_file")}</span>
              </button>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
          </>
        )}

        {stage === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-full border-4 border-cream-200 border-t-sand-500 animate-spin" />
            <p className="text-sm text-ink-500">{t("product.reading_bill")}</p>
            <p className="text-xs text-ink-300">{t("product.extracting_details")}</p>
          </div>
        )}

        {stage === "done" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#7aa67a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-sm font-medium text-ink-800">{t("product.details_extracted")}</p>
            <p className="text-xs text-ink-400">{t("product.form_autofilled")}</p>
          </div>
        )}

        {stage === "error" && (
          <div className="space-y-3">
            <p className="text-xs text-blush-600 bg-blush-50 rounded-xl p-3 text-center">{errMsg}</p>
            <button onClick={() => setStage("idle")} className="w-full py-2.5 text-sm btn-primary">{t("common.retry")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Barcode Scanner Modal ----------
function BarcodeScannerModal({ onResult, onClose, t }: { onResult: (code: string) => void; onClose: () => void; t: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState("");

  const startScan = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Use native BarcodeDetector if available, else show fallback message
      if (!('BarcodeDetector' in window)) {
        setError(t("product.barcode_unsupported"));
        return;
      }
      // @ts-ignore — BarcodeDetector is not yet in TS lib
      const detector = new BarcodeDetector({ formats: ['qr_code','ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','data_matrix'] });
      const scan = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            stopScan();
            onResult(code);
          } else {
            rafRef.current = requestAnimationFrame(scan);
          }
        } catch { rafRef.current = requestAnimationFrame(scan); }
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (e: any) {
      setError(t("product.camera_denied"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResult]);

  const stopScan = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Start on mount
  useCallback(() => { startScan(); return () => stopScan(); }, [startScan, stopScan]);

  // useEffect equivalent via ref trick — safe for SSR
  const hasStarted = useRef(false);
  if (typeof window !== 'undefined' && !hasStarted.current) {
    hasStarted.current = true;
    setTimeout(() => startScan(), 100);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-medium text-ink-900">📷 {t("product.scan_barcode_title")}</p>
            <button onClick={() => { stopScan(); onClose(); }} className="text-ink-300 hover:text-ink-600 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          {error ? (
            <div className="px-4 pb-4">
              <p className="text-xs text-blush-500 bg-blush-50 rounded-xl p-3">{error}</p>
            </div>
          ) : (
            <div className="relative bg-ink-900 aspect-square">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              {/* Scanning frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  {['tl','tr','bl','br'].map((c) => (
                    <div key={c} className={`absolute w-8 h-8 border-cream-100 ${
                      c==='tl'?'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg':
                      c==='tr'?'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg':
                      c==='bl'?'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg':
                      'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg'
                    }`} />
                  ))}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-sand-400/60 animate-pulse" />
                </div>
              </div>
            </div>
          )}
          <p className="text-[11px] text-ink-300 text-center px-4 py-3">{t("product.scan_barcode_hint")}</p>
        </div>
      </div>
    </div>
  );
}

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
  store_name: string; warranty_{t("product.months")}: number; price: string; notes: string;
  catalog_product_id: string | null;
}

const DEFAULT: FormState = {
  name: "", brand: "", category: "", subcategory: "",
  model_number: "", serial_number: "", purchase_date: "",
  store_name: "", warranty_{t("product.months")}: 12, price: "", notes: "", catalog_product_id: null,
};

export default function AddProductForm() {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [customWarranty, set{t("product.warranty_preset_custom")}Warranty] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showBillScan, setShowBillScan] = useState(false);

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
      warranty_{t("product.months")}: product.standard_warranty_{t("product.months")},
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
      toast.error(t("product.fields_required_toast")); return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null) fd.append(k, String(v)); });
    if (invoiceFile) fd.append("invoice", invoiceFile);
    startTransition(async () => {
      const result = await addProduct(fd);
      if (result.success) {
        toast.success(t("product.added_success_toast"));
        router.push(result.id ? `/products/${result.id}` : "/products");
      } else {
        toast.error(result.error || t("product.add_failed_toast"));
      }
    });
  }

  const selectedCat = CATEGORIES.find((c) => c.value === form.category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ★ SCAN FIRST — Big scan CTA opens Bill OCR, not barcode */}
      <div
        onClick={() => setShowBillScan(true)}
        className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50/50 cursor-pointer active:bg-sand-100 hover:border-sand-400 transition-all"
      >
        <div className="w-16 h-16 rounded-2xl bg-ink-900 flex items-center justify-center shadow-md">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fdfcf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
            <line x1="7" y1="12" x2="7" y2="12.01"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="12" x2="17" y2="12.01"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-ink-900 text-base">📸 {t("product.scan_cta_title")}</p>
          <p className="text-xs text-ink-400 mt-0.5">{t("product.scan_cta_desc")}</p>
        </div>
      </div>

      {/* Divider with manual fallback label */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-cream-200" />
        <span className="text-xs text-ink-300 font-medium">{t("product.fill_manually")} ↓</span>
        <div className="flex-1 h-px bg-cream-200" />
      </div>

      {/* Search */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{t("product.find_product")}</label>
        <ProductSearchInput onSelect={handleCatalogSelect} onManualEntry={(v) => set("name", v)} />
        <p className="text-[11px] text-ink-300 mt-1.5">{t("product.find_product_hint")}</p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{t("product.category")}</label>
        {(() => {
          const catLabels: Record<string, string> = {
            "Electronics": t("category.electronics"),
            "Home Appliance": t("category.appliance"),
            "Vehicle": t("category.vehicle"),
            "Furniture": t("category.furniture"),
            "Other": t("category.other")
          };
          return (
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => { set("category", c.value); set("subcategory", c.subs[0]); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center ${form.category === c.value ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600 hover:border-sand-300"}`}>
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-[10px] font-medium leading-tight">{catLabels[c.value] || c.label}</span>
                </button>
              ))}
            </div>
          );
        })()}
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
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("product.details_header")}</label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">{t("product.name_label")} *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Galaxy S24" required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">{t("product.brand_label")} *</label>
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Samsung" required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">{t("product.model_label")}</label>
              <input value={form.model_number} onChange={(e) => set("model_number", e.target.value)} placeholder="e.g. SM-S921B"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">{t("product.serial_imei")}</label>
              <div className="relative">
                <input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder={t("product.serial_placeholder") + " 📷"}
                  className="w-full px-3 py-2.5 pr-10 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
                <button type="button" onClick={() => setShowScanner(true)}
                  aria-label={t("product.scan_barcode_aria")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-cream-200 hover:bg-sand-100 text-ink-400 hover:text-ink-700 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <line x1="7" y1="12" x2="7" y2="12.01"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="12" x2="17" y2="12.01"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">{t("product.purchase_date_label")} *</label>
              {/* Friendly date presets — Ramu Uncle doesn't remember exact dates */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {([
                  { label: t("product.date_preset_this_week"), days: 3 },
                  { label: t("product.date_preset_last_month"), days: 30 },
                  { label: t("product.date_preset_diwali"), days: 210 },
                  { label: t("product.date_preset_year_1"), days: 365 },
                  { label: t("product.date_preset_year_2"), days: 730 },
                ] as { label: string; days: number }[]).map(({ label, days }) => {
                  const d = new Date();
                  d.setDate(d.getDate() - days);
                  const val = d.toISOString().split("T")[0];
                  return (
                    <button key={label} type="button"
                      onClick={() => set("purchase_date", val)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-all ${
                        form.purchase_date === val
                          ? "bg-ink-900 border-ink-900 text-cream-50"
                          : "bg-cream-100 border-cream-200 text-ink-500 hover:border-sand-300"
                      }`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]} required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">{t("product.store_label")}</label>
              <input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} placeholder="e.g. Flipkart"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1.5">{t("product.price_paid_label")} (₹)</label>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 74999" min="0"
              className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
          </div>
        </div>
      </div>

      <div className="h-px bg-cream-200" />

      {/* Warranty */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("product.warranty_duration")}</label>
        {(() => {
          const presetLabels: Record<number, string> = {
            6: t("product.warranty_preset_6mo"),
            12: t("product.warranty_preset_1yr"),
            24: t("product.warranty_preset_2yr"),
            36: t("product.warranty_preset_3yr"),
            60: t("product.warranty_preset_5yr")
          };
          return (
            <div className="flex gap-2 flex-wrap">
              {WARRANTY_PRESETS.map((p) => (
                <button key={p.value} type="button" onClick={() => { set("warranty_{t("product.months")}", p.value); set{t("product.warranty_preset_custom")}Warranty(false); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${form.warranty_{t("product.months")} === p.value && !customWarranty ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600 hover:border-sand-300"}`}>
                  {presetLabels[p.value] || p.label}
                </button>
              ))}
            </div>
          );
        })()}
          <button type="button" onClick={() => set{t("product.warranty_preset_custom")}Warranty(true)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${customWarranty ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600 hover:border-sand-300"}`}>
            {t("product.warranty_preset_custom")}
          </button>
        </div>
        {customWarranty && (
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={form.warranty_{t("product.months")}} onChange={(e) => set("warranty_{t("product.months")}", parseInt(e.target.value) || 12)}
              min="1" max="240" className="w-24 px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            <span className="text-sm text-ink-400">{t("product.months")}</span>
          </div>
        )}
        {form.purchase_date && form.warranty_{t("product.months")} > 0 && (() => {
          const expiry = new Date(form.purchase_date);
          expiry.setMonth(expiry.getMonth() + Number(form.warranty_{t("product.months")}));
          const isExpired = expiry < new Date();
          return (
            <p className={`text-xs mt-2 px-1 ${
              isExpired ? "text-blush-500" : "text-sage-600"
            }`}>
              {isExpired ? "⚠️" : "✓"} {t("product.warranty_expires_on")}{" "}
              {expiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {isExpired ? " (" + t("product.warranty_already_expired") + ")" : ""}
            </p>
          );
        })()}
      </div>

      <div className="h-px bg-cream-200" />

      {/* Invoice */}
      <div>
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("product.invoice_receipt_header")}</label>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragActive ? "border-sand-400 bg-sand-50" : invoiceFile ? "border-sage-300 bg-sage-50" : "border-cream-300 hover:border-sand-300 hover:bg-cream-100"}`}>
          <input {...getInputProps()} capture="environment" />
          {invoiceFile ? (
            <div className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h8l4 4v8H2V2z" stroke="#7aa67a" strokeWidth="1.2"/><path d="M10 2v4h4" stroke="#7aa67a" strokeWidth="1.2"/></svg>
              <span className="text-sm text-sage-700 font-medium truncate max-w-[200px]">{invoiceFile.name}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }} className="text-xs text-blush-500 hover:text-blush-600 ml-1">{t("common.remove")}</button>
            </div>
          ) : (
            <div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 text-ink-300"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 4v12M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p className="text-sm text-ink-400">{isDragActive ? "{t("product.invoice_drop_cta")}" : "{t("product.invoice_upload_cta")}"}</p>
              <p className="text-xs text-ink-300 mt-1">{t("product.invoice_upload_specs")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-ink-500 mb-1.5">{t("product.notes_label")}</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("product.notes_placeholder")}
          rows={2} className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 resize-none" />
      </div>

      <button type="submit" disabled={isPending || !form.name || !form.brand || !form.purchase_date}
        className="w-full btn-primary py-3.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {t("product.saving")}
          </span>
        ) : t("product.add_submit_btn")}
      </button>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          t={t}
          onResult={(code) => {
            set("serial_number", code);
            setShowScanner(false);
            toast.success(t("product.scanned_toast") + ": " + code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Bill OCR Modal */}
      {showBillScan && (
        <ScanBillModal
          t={t}
          onResult={(fields) => {
            setForm((prev) => ({ ...prev, ...fields }));
            const filled = Object.keys(fields).length;
            toast.success(filled > 2
              ? "✨ " + t("product.ocr_autofill_toast").replace("{count}", String(filled))
              : t("product.ocr_scanned_toast")
            );
          }}
          onClose={() => setShowBillScan(false)}
        />
      )}
    </form>
  );
}
