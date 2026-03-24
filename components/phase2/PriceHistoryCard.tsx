"use client";

import { useState, useTransition } from "react";
import { addPriceEntry, type PriceEntry } from "@/lib/actions/phase2";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  productId: string;
  originalPrice: number | null;
  entries: PriceEntry[];
}

export default function PriceHistoryCard({ productId, originalPrice, entries }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newNotes, setNewNotes] = useState("");

  function handleAdd() {
    const price = parseFloat(newPrice);
    if (!price || price <= 0) return;

    startTransition(async () => {
      const result = await addPriceEntry(productId, price, "manual", newNotes || undefined);
      if (result.success) {
        toast.success("Price entry added");
        setNewPrice("");
        setNewNotes("");
        setShowAdd(false);
      } else {
        toast.error(result.error || "Failed to add");
      }
    });
  }

  const latest = entries[0];
  const priceDelta = latest && originalPrice
    ? ((latest.price - originalPrice) / originalPrice) * 100
    : null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Price History</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-[11px] text-sand-500 hover:text-sand-400 transition-colors"
        >
          + Add entry
        </button>
      </div>

      {/* Current vs original */}
      {originalPrice && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-cream-100 rounded-xl">
          <div>
            <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Purchase price</p>
            <p className="text-sm font-medium text-ink-800">{formatCurrency(originalPrice)}</p>
          </div>
          {latest && (
            <>
              <div className="h-8 w-px bg-cream-200" />
              <div>
                <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Latest recorded</p>
                <p className="text-sm font-medium text-ink-800">{formatCurrency(latest.price)}</p>
              </div>
              {priceDelta !== null && (
                <>
                  <div className="h-8 w-px bg-cream-200" />
                  <div>
                    <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">Change</p>
                    <p className={`text-sm font-medium ${priceDelta < 0 ? "text-sage-600" : "text-blush-500"}`}>
                      {priceDelta > 0 ? "+" : ""}{priceDelta.toFixed(1)}%
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-cream-100 rounded-xl space-y-2">
          <p className="text-xs font-medium text-ink-600 mb-2">Add price entry</p>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="Current market price (₹)"
            className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Source (e.g. Amazon, Flipkart)"
            className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 btn-secondary py-2 text-xs">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!newPrice || isPending}
              className="flex-1 btn-primary py-2 text-xs disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* History list */}
      {entries.length === 0 ? (
        <p className="text-xs text-ink-300 text-center py-3">
          No price entries yet. Add current market prices to track depreciation.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-cream-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink-800">{formatCurrency(e.price)}</p>
                <p className="text-[10px] text-ink-400">
                  {e.notes ? `${e.notes} · ` : ""}
                  {new Date(e.recorded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className="text-[10px] bg-cream-100 text-ink-400 px-2 py-0.5 rounded-full capitalize">{e.source}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
