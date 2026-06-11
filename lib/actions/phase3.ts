"use server";

import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/lib/types";

// ─── PRODUCT COMPARISON ───────────────────────────────────────────────────────

export interface ComparisonItem {
  id: string;
  name: string;
  brand: string;
  category: string | null;
  purchase_date: string;
  price: number | null;
  warranty_months: number;
  avg_lifespan_years: number | null;
  cost_per_day: number | null;
  days_owned: number;
  warranty_status: string;
}

export async function getUserProductsForComparison(): Promise<ComparisonItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("product_lifecycle")
    .select("id, name, brand, category, purchase_date, price, warranty_months, avg_lifespan_years, cost_per_day, days_owned, warranty_status")
    .eq("user_id", user.id)
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  return (data || []) as ComparisonItem[];
}

// ─── BUYING ASSISTANT ─────────────────────────────────────────────────────────

export interface BuyingInput {
  budget: number;
  category: string;
  query?: string;
}

export interface BuyingRecommendation {
  name: string;
  brand: string;
  // FIX: Renamed from estimatedPrice to make clear this is NOT a real market price.
  // The catalog has no price field — we cannot tell the user a product costs X.
  budgetContext: string;          // e.g. "Within your ₹30,000 budget"
  warrantyMonths: number;
  avgLifespanYears: number;
  costPerDayAtBudget: number;    // cost/day if user pays full budget
  whyRecommended: string;
  whereToCheck: string[];
  confidence: "catalog-based";   // Always catalog-based — no real prices
}

/**
 * Rule-based buying recommendations.
 * NOTE: Catalog has NO price data. We cannot filter by budget or show real prices.
 * What we CAN do: show products in the requested category ordered by lifespan/warranty,
 * and show what the cost/day WOULD BE at the user's stated budget.
 * This is honest and useful without fabricating prices.
 */
export async function getBuyingRecommendations(
  input: BuyingInput
): Promise<{ recommendations: BuyingRecommendation[]; summary: string; disclaimer: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { recommendations: [], summary: "", disclaimer: "", error: "Not authenticated" };

  // Build query — apply optional brand/feature filter from user's query string
  let dbQuery = supabase
    .from("product_catalog")
    .select("*")
    .ilike("category", `%${input.category}%`)
    .eq("is_active", true);

  // If user typed a specific brand or keyword, filter by brand name first
  const trimmedQ = (input.query || "").trim();
  if (trimmedQ.length >= 2) {
    dbQuery = dbQuery.or(
      `brand.ilike.%${trimmedQ}%,name.ilike.%${trimmedQ}%`
    );
  }

  const { data: catalog } = await dbQuery
    .order("avg_lifespan_years", { ascending: false, nullsFirst: false })
    .limit(5);

  if (!catalog || catalog.length === 0) {
    return {
      recommendations: [],
      summary: `No catalog data found for "${input.category}".`,
      disclaimer: "",
    };
  }

  const recs: BuyingRecommendation[] = catalog.map((item: CatalogProduct) => {
    const lifespan = Number(item.avg_lifespan_years) || 5;
    const warranty = item.standard_warranty_months || 12;
    // Cost/day if user spends their full budget on this type of product
    const costPerDayAtBudget = Math.round((input.budget / (lifespan * 365)) * 100) / 100;

    return {
      name: item.name,
      brand: item.brand,
      budgetContext: `Budget: ₹${input.budget.toLocaleString("en-IN")}`,
      warrantyMonths: warranty,
      avgLifespanYears: lifespan,
      costPerDayAtBudget,
      whyRecommended: [
        `${warranty}m warranty`,
        lifespan ? `~${lifespan}yr expected lifespan` : null,
        item.features?.slice(0, 2).join(", ") || null,
      ].filter(Boolean).join(" · "),
      whereToCheck: [
        `https://www.amazon.in/s?k=${encodeURIComponent(item.brand + " " + item.name)}`,
        `https://www.flipkart.com/search?q=${encodeURIComponent(item.brand + " " + item.name)}`,
      ].filter(Boolean),
      confidence: "catalog-based",
    };
  });

  await supabase.from("buying_recommendations").insert({
    user_id: user.id,
    budget_inr: input.budget,
    category: input.category,
    query: input.query || null,
    recommendations: recs,
  });

  const best = recs[0];
  const summary = `Found ${recs.length} ${input.category} options. At your ₹${input.budget.toLocaleString("en-IN")} budget, best option by lifespan: ${best.brand} ${best.name} (${best.avgLifespanYears}yr, ₹${best.costPerDayAtBudget}/day).`;
  const disclaimer = "Prices not available — catalog shows warranty and lifespan data only. Check Amazon or Flipkart links for current pricing.";

  return { recommendations: recs, summary, disclaimer };
}
