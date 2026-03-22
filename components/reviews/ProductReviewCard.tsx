"use client";

import { useState, useEffect } from "react";
import { getProductReviews } from "@/lib/actions/reviews";
import type { ProductReview } from "@/lib/actions/reviews";

interface Props {
  brand: string;
  productName: string;
}

const STARS = [1, 2, 3, 4, 5];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {STARS.map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1l1.4 2.8L10.5 4.3l-2.25 2.2.53 3.1L6 8.1 3.22 9.6l.53-3.1L1.5 4.3l3.1-.5z"
            fill={s <= Math.round(rating) ? "#d97706" : "#e8dfd0"}
          />
        </svg>
      ))}
      <span className="text-[11px] font-medium text-amber-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const styles: Record<string, string> = {
    positive: "bg-sage-100 text-sage-700 border-sage-200",
    mixed:    "bg-amber-50 text-amber-700 border-amber-200",
    negative: "bg-blush-50 text-blush-600 border-blush-200",
  };
  const icons: Record<string, string> = { positive: "😊", mixed: "😐", negative: "😟" };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${styles[sentiment] || styles.mixed}`}>
      {icons[sentiment]} {sentiment}
    </span>
  );
}

export default function ProductReviewCard({ brand, productName }: Props) {
  const [review, setReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const data = await getProductReviews(brand, productName);
      setReview(data);
      if (!data) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  // Auto-load when component mounts
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-cream-200 rounded-full" />
          <div className="h-3 w-32 bg-cream-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-cream-200 rounded w-full" />
          <div className="h-2.5 bg-cream-200 rounded w-4/5" />
          <div className="h-2.5 bg-cream-200 rounded w-3/4" />
        </div>
        <p className="text-[10px] text-ink-300 mt-3">Analysing owner reviews with AI...</p>
      </div>
    );
  }

  if (error || !review) return null;

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">⭐</span>
            <p className="text-xs font-semibold text-ink-600 uppercase tracking-wider">What owners say</p>
            {review.from_cache && (
              <span className="text-[9px] text-ink-300 bg-cream-100 px-1.5 py-0.5 rounded-full">cached</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {review.avg_rating && <StarRating rating={review.avg_rating} />}
            {review.review_count && (
              <span className="text-[10px] text-ink-400">{review.review_count.toLocaleString()} reviews</span>
            )}
            <SentimentBadge sentiment={review.sentiment} />
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="text-ink-300 hover:text-ink-500 transition-colors flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Summary */}
      <p className="text-xs text-ink-600 leading-relaxed">{review.summary}</p>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-3 pt-1">
          {/* Pros */}
          {review.pros.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1.5">What people love</p>
              <div className="space-y-1">
                {review.pros.map((pro, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sage-500 text-xs flex-shrink-0 mt-0.5">✓</span>
                    <p className="text-xs text-ink-600">{pro}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cons */}
          {review.cons.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">Common complaints</p>
              <div className="space-y-1">
                {review.cons.map((con, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 text-xs flex-shrink-0 mt-0.5">–</span>
                    <p className="text-xs text-ink-600">{con}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common issues */}
          {review.common_issues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Watch out for</p>
              <div className="space-y-1">
                {review.common_issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 text-xs flex-shrink-0 mt-0.5">⚠</span>
                    <p className="text-xs text-amber-700">{issue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {review.sources.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[10px] text-ink-300">Sources:</p>
              {review.sources.map((s, i) => (
                <span key={i} className="text-[10px] bg-cream-100 text-ink-400 px-1.5 py-0.5 rounded">{s}</span>
              ))}
              <span className="text-[10px] text-ink-300 ml-auto">AI-generated · not real-time</span>
            </div>
          )}
        </div>
      )}

      {!expanded && (
        <button onClick={() => setExpanded(true)}
          className="text-xs text-sand-500 hover:text-sand-400 transition-colors">
          See pros, cons & issues →
        </button>
      )}
    </div>
  );
}
