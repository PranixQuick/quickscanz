"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ServiceProvider {
  id: string;
  name: string;
  provider_type: "platform" | "local" | "authorized";
  categories: string[];
  booking_url: string | null;
  phone: string | null;
  avg_rating: number | null;
  priority: number;
}

interface HomeServiceFinderProps {
  category?: string;
  productName?: string;
  brand?: string;
}

const TYPE_STYLES = {
  authorized: { bg: "bg-sage-50", border: "border-sage-200", badge: "bg-sage-100 text-sage-700", label: "Authorized" },
  platform:   { bg: "bg-cream-50", border: "border-cream-200", badge: "bg-sand-100 text-sand-700", label: "Platform" },
  local:      { bg: "bg-cream-50", border: "border-cream-200", badge: "bg-cream-200 text-ink-500", label: "Local" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} width="9" height="9" viewBox="0 0 9 9" fill={s <= Math.round(rating) ? "#d4b08c" : "#e8e0d8"}>
          <path d="M4.5 1l.9 2h2l-1.6 1.2.6 2L4.5 5 3 6.2l.6-2L2 3h2z"/>
        </svg>
      ))}
      <span className="text-[11px] text-ink-400 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function HomeServiceFinder({ category, productName, brand }: HomeServiceFinderProps) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [filterCity, setFilterCity] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("get_service_providers", {
        p_category: category || null,
        p_city: filterCity || null,
      });
      setProviders((data as ServiceProvider[]) || []);
      setLoading(false);
    }
    load();
  }, [category, filterCity]);

  const authorized = providers.filter((p) => p.provider_type === "authorized");
  const platforms  = providers.filter((p) => p.provider_type === "platform");

  return (
    <div className="space-y-4">
      {/* City filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filter by city (e.g. Hyderabad)"
          className="flex-1 px-3 py-2 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          onKeyDown={(e) => e.key === "Enter" && setFilterCity(city)}
        />
        <button
          onClick={() => setFilterCity(city)}
          className="btn-primary text-xs px-4 py-2"
        >
          Search
        </button>
        {filterCity && (
          <button onClick={() => { setCity(""); setFilterCity(""); }} className="text-xs text-ink-400 hover:text-ink-600 px-2">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-20 bg-cream-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-ink-400">No service providers found{filterCity ? ` in ${filterCity}` : ""}.</p>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent((brand || "") + " " + (productName || "") + " repair service " + (filterCity || "near me"))}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-sand-500 mt-2 inline-block"
          >
            Search Google →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Authorized first */}
          {authorized.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>✓</span> Authorized Service
              </p>
              <div className="space-y-2">
                {authorized.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            </div>
          )}

          {/* Platforms */}
          {platforms.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-2">
                On-Demand Platforms
              </p>
              <div className="space-y-2">
                {platforms.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            </div>
          )}

          {/* Cart2Save note */}
          <div className="p-3 bg-cream-100 rounded-xl border border-cream-200">
            <p className="text-xs font-medium text-ink-700 mb-0.5">💡 Local technicians via Cart2Save</p>
            <p className="text-[11px] text-ink-400 leading-relaxed">
              Cart2Save Home Service connects you with verified local technicians in your city. Coming soon — integration in progress.
            </p>
            <a
              href="https://www.google.com/search?q=cart2save+home+service+technician"
              rel="noopener noreferrer"
              className="text-[11px] text-sand-500 mt-1 inline-block"
            >
              Learn more →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider }: { provider: ServiceProvider }) {
  const style = TYPE_STYLES[provider.provider_type] || TYPE_STYLES.platform;
  return (
    <div className={`rounded-2xl p-4 border ${style.bg} ${style.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-ink-900">{provider.name}</p>
            <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${style.badge}`}>
              {style.label}
            </span>
          </div>
          {provider.avg_rating && <StarRating rating={provider.avg_rating} />}
          <div className="flex flex-wrap gap-1 mt-2">
            {provider.categories.slice(0, 4).map((c) => (
              <span key={c} className="text-[10px] bg-white/70 text-ink-500 px-1.5 py-0.5 rounded-md border border-cream-200">
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {provider.booking_url && (
            <a
              href={provider.booking_url}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-sand-600 bg-sand-50 hover:bg-sand-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            >
              Book
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M2 7L7 2M7 2H4M7 2v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            </a>
          )}
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="flex items-center gap-1 text-[11px] text-sage-600 bg-sage-50 hover:bg-sage-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 2C1.5 1.7 1.7 1.5 2 1.5h1.5c.2 0 .4.1.5.3l.7 1.5c.1.2 0 .5-.2.6l-.8.5c.4.9 1.1 1.6 2 2l.5-.8c.1-.2.4-.3.6-.2L8.2 6c.2.1.3.3.3.5V8c0 .3-.2.5-.5.5-3.6 0-6.5-2.9-6.5-6.5z" fill="currentColor"/>
              </svg>
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
