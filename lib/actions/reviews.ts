"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProductReview {
  product_name: string;
  brand: string;
  summary: string;
  pros: string[];
  cons: string[];
  common_issues: string[];
  avg_rating: number | null;
  review_count: number | null;
  sentiment: "positive" | "mixed" | "negative";
  sources: string[];
  generated_at: string;
  from_cache: boolean;
}

export async function getProductReviews(
  brand: string,
  productName: string
): Promise<ProductReview | null> {
  const supabase = await createClient();

  // 1. Check cache first
  const { data: cached } = await supabase
    .rpc("get_stale_reviews", { p_brand: brand, p_name: productName });

  if (cached) {
    return {
      product_name: cached.product_name,
      brand: cached.brand,
      summary: cached.summary,
      pros: cached.pros || [],
      cons: cached.cons || [],
      common_issues: cached.common_issues || [],
      avg_rating: cached.avg_rating,
      review_count: cached.review_count,
      sentiment: cached.sentiment,
      sources: cached.sources || [],
      generated_at: cached.generated_at,
      from_cache: true,
    };
  }

  // 2. Generate fresh via Claude API
  try {
    const prompt = `You are a product research assistant. Analyze the ${brand} ${productName} based on your training knowledge about this product, including user reviews, common complaints, and ownership experiences.

Respond ONLY with a valid JSON object (no markdown, no backticks) matching this exact schema:
{
  "summary": "2-3 sentence balanced summary of owner experience",
  "pros": ["array of 3-5 genuine positives from real users"],
  "cons": ["array of 3-4 genuine negatives or concerns from real users"],
  "common_issues": ["array of 2-4 most reported problems after 6-12 months"],
  "avg_rating": 4.2,
  "review_count": 1200,
  "sentiment": "positive|mixed|negative",
  "sources": ["Amazon India", "Flipkart", "GSMArena", "91mobiles"]
}

Use realistic Indian market data. avg_rating should be 1.0-5.0. review_count is approximate. sentiment must be one of the three values. If you don't have specific data, make reasonable estimates based on the brand's reputation for this product category.`;

    // Use server-side AI proxy — ANTHROPIC_API_KEY must stay server-only
    // reviews.ts is a "use server" action so it can use process.env directly
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      console.error("[product-reviews] ANTHROPIC_API_KEY not set");
      return null;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[product-reviews] Anthropic error:", response.status, errText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON — strip any accidental markdown
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // 3. Cache in Supabase
    await supabase.from("product_reviews").upsert({
      product_name: productName,
      brand,
      summary: parsed.summary,
      pros: parsed.pros,
      cons: parsed.cons,
      common_issues: parsed.common_issues,
      avg_rating: parsed.avg_rating,
      review_count: parsed.review_count,
      sentiment: parsed.sentiment,
      sources: parsed.sources,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    }, { onConflict: "cache_key" });

    return {
      product_name: productName,
      brand,
      summary: parsed.summary,
      pros: parsed.pros || [],
      cons: parsed.cons || [],
      common_issues: parsed.common_issues || [],
      avg_rating: parsed.avg_rating,
      review_count: parsed.review_count,
      sentiment: parsed.sentiment,
      sources: parsed.sources || [],
      generated_at: new Date().toISOString(),
      from_cache: false,
    };
  } catch (err) {
    console.error("[product-reviews] Error:", err);
    return null;
  }
}
