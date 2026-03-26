"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ServiceCentre {
  id: string;
  brand: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string | null;
  timings: string | null;
}

interface ServiceCentreLocatorProps {
  brand: string;
}

// Brand normalization map — maps product brand values to DB brand values
// This fixes cases like "I phone" → "Apple", "whirlpool" → "Whirlpool", etc.
const BRAND_NORMALIZE: Record<string, string> = {
  "i phone": "Apple",
  "iphone": "Apple",
  "apple": "Apple",
  "samsung": "Samsung",
  "lg": "LG",
  "dell": "Dell",
  "hp": "HP",
  "hewlett-packard": "HP",
  "lenovo": "Lenovo",
  "sony": "Sony",
  "whirlpool": "Whirlpool",
  "voltas": "Voltas",
  "daikin": "Daikin",
  "panasonic": "Panasonic",
  "bosch": "Bosch",
  "haier": "Haier",
  "oneplus": "OnePlus",
  "one plus": "OnePlus",
  "realme": "Realme",
  "xiaomi": "Xiaomi",
  "mi": "Xiaomi",
  "oppo": "Oppo",
  "vivo": "Vivo",
};

function normalizeBrand(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return BRAND_NORMALIZE[lower] || raw.trim();
}

export default function ServiceCentreLocator({ brand }: ServiceCentreLocatorProps) {
  const normalizedBrand = normalizeBrand(brand);
  const [centres, setCentres] = useState<ServiceCentre[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [city, setCity] = useState("");

  async function handleSearch() {
    if (!normalizedBrand) return;
    setLoading(true);
    setSearched(true);
    const supabase = createClient();

    // Try exact brand match first
    let query = supabase
      .from("service_centres")
      .select("*")
      .eq("brand", normalizedBrand)
      .eq("is_active", true)
      .order("city");

    if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);

    const { data } = await query.limit(10);

    // If no exact match, try ilike (partial brand match)
    if (!data || data.length === 0) {
      const { data: fallback } = await supabase
        .from("service_centres")
        .select("*")
        .ilike("brand", `%${normalizedBrand.split(" ")[0]}%`)
        .eq("is_active", true)
        .order("city")
        .limit(10);
      setCentres((fallback as ServiceCentre[]) || []);
    } else {
      setCentres((data as ServiceCentre[]) || []);
    }

    setLoading(false);
  }

  if (!brand) {
    return (
      <div className="text-center py-6 text-sm text-ink-300">
        Add a product to find nearby service centres
      </div>
    );
  }

  const displayBrand = normalizedBrand !== brand.trim() ? `${normalizedBrand} (normalized from "${brand.trim()}")` : normalizedBrand;

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-400">
        Searching for: <span className="font-medium text-ink-700">{normalizedBrand}</span>
        {normalizedBrand !== brand.trim() && (
          <span className="text-ink-300 ml-1">(auto-corrected)</span>
        )}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filter by city (e.g. Hyderabad)"
          className="flex-1 px-3 py-2 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          {loading ? (
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9 9l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
          Find
        </button>
      </div>

      {searched && centres.length === 0 && !loading && (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-ink-400">
            No service centres found for {normalizedBrand}{city ? ` in ${city}` : ""}.
          </p>
          <p className="text-xs text-ink-300">
            Try without a city filter, or search directly on the brand website.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(normalizedBrand + " authorized service centre " + (city || "near me"))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sand-500 hover:text-sand-400 inline-block"
            >
              Search on Google →
            </a>
            <a
              href={`https://www.justdial.com/search?q=${encodeURIComponent(normalizedBrand + " service centre")}&city=${encodeURIComponent(city || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sand-500 hover:text-sand-400 inline-block"
            >
              Search on JustDial →
            </a>
          </div>
        </div>
      )}

      {centres.length > 0 && (
        <ul className="space-y-2">
          {centres.map((sc) => (
            <li key={sc.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900">{sc.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{sc.address}</p>
                  {sc.timings && <p className="text-[11px] text-ink-300 mt-1">{sc.timings}</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {sc.phone && (
                    <a
                      href={`tel:${sc.phone}`}
                      className="flex items-center gap-1 text-[11px] text-sage-600 hover:text-sage-500 bg-sage-50 px-2 py-1 rounded-lg"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 2C1.5 1.7 1.7 1.5 2 1.5h1.5c.2 0 .4.1.5.3l.7 1.5c.1.2 0 .5-.2.6l-.8.5c.4.9 1.1 1.6 2 2l.5-.8c.1-.2.4-.3.6-.2L8.2 6c.2.1.3.3.3.5V8c0 .3-.2.5-.5.5-3.6 0-6.5-2.9-6.5-6.5z" fill="currentColor"/>
                      </svg>
                      Call
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sc.name + " " + sc.address)}`}
                    className="flex items-center gap-1 text-[11px] text-sand-600 hover:text-sand-500 bg-sand-50 px-2 py-1 rounded-lg"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1a3 3 0 0 1 3 3c0 2-3 5-3 5S2 6 2 4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1"/>
                      <circle cx="5" cy="4" r="1" fill="currentColor"/>
                    </svg>
                    Map
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
