"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string | null;
  model_number: string | null;
  standard_warranty_months: number;
  support_phone: string | null;
  support_url: string | null;
}

interface ProductSearchInputProps {
  onSelect: (product: CatalogProduct) => void;
  onManualEntry: (value: string) => void;
  placeholder?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "💻",
  "Home Appliance": "🏠",
  Vehicle: "🚗",
};

export default function ProductSearchInput({
  onSelect,
  onManualEntry,
  placeholder = "Search product (e.g. Samsung Galaxy, Voltas AC...)",
}: ProductSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) return;
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("search_product_catalog", {
        search_term: query.trim(),
        result_limit: 8,
      });
      const items = (data as CatalogProduct[]) || [];
      setResults(items);
      setOpen(items.length > 0);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(product: CatalogProduct) {
    setSelected(product);
    setQuery(`${product.brand} ${product.name}`);
    setOpen(false);
    onSelect(product);
  }

  function handleChange(v: string) {
    setQuery(v);
    setSelected(null);
    onManualEntry(v);
  }

  function handleClear() {
    setQuery(""); setSelected(null); setResults([]); setOpen(false); onManualEntry("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg className="animate-spin w-4 h-4 text-ink-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#c9bfb3" strokeWidth="1.4"/>
              <path d="M11 11l3 3" stroke="#c9bfb3" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-3 bg-cream-100 border border-cream-200 rounded-xl text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-sand-300 focus:border-sand-300 transition-all"
        />
        {(query || selected) && (
          <button type="button" onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cream-200 flex items-center justify-center hover:bg-cream-300 transition-colors">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="#6b5d52" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {selected && (
        <div className="mt-2 px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl flex items-center gap-2">
          <span className="text-base">{CATEGORY_ICONS[selected.category] || "📦"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sage-700 truncate">{selected.brand} {selected.name}</p>
            <p className="text-[11px] text-sage-500">{selected.category} · {selected.standard_warranty_months}mo warranty</p>
          </div>
          <span className="text-[10px] bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full font-medium">Auto-filled</span>
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-cream-200 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-cream-100">
            <p className="text-[10px] text-ink-300 uppercase tracking-wider font-medium">Products found</p>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 transition-colors text-left">
                  <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[p.category] || "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{p.brand} {p.name}</p>
                    <p className="text-[11px] text-ink-400">
                      {p.subcategory || p.category}
                      {p.model_number && ` · ${p.model_number}`}
                      {" · "}<span className="text-sand-500">{p.standard_warranty_months}mo warranty</span>
                    </p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-ink-200">
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 border-t border-cream-100">
            <button type="button" onClick={() => { setOpen(false); onManualEntry(query); }}
              className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">
              Not in list? Continue with &ldquo;{query}&rdquo; →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
