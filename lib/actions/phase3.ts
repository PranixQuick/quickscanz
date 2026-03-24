"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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
  estimatedPrice: number;
  warrantyMonths: number;
  avgLifespanYears: number;
  costPerDay: number;
  whyRecommended: string;
  whereToCheck: string[];
  confidence: "high" | "medium";
}

/**
 * Rule-based buying recommendations (no external API).
 * Based on catalog data + budget + category.
 */
export async function getBuyingRecommendations(
  input: BuyingInput
): Promise<{ recommendations: BuyingRecommendation[]; summary: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { recommendations: [], summary: "", error: "Not authenticated" };

  // Fetch catalog products in budget range
  const { data: catalog } = await supabase
    .from("product_catalog")
    .select("*")
    .ilike("category", `%${input.category}%`)
    .limit(50);

  if (!catalog || catalog.length === 0) {
    return {
      recommendations: [],
      summary: `No catalog data for ${input.category}. Try a broader category like "Smartphone", "AC", or "Refrigerator".`,
    };
  }

  // Build recommendations from catalog
  const recs: BuyingRecommendation[] = catalog
    .slice(0, 5)
    .map((item: CatalogProduct) => {
      const lifespan = item.avg_lifespan_years || 5;
      const monthlyWarranty = item.standard_warranty_months || 12;
      // Rough price estimate from catalog (no actual prices stored)
      const estimatedPrice = input.budget * 0.85; // assume ~85% of budget
      const costPerDay = estimatedPrice / (lifespan * 365);

      return {
        name: item.name,
        brand: item.brand,
        estimatedPrice,
        warrantyMonths: monthlyWarranty,
        avgLifespanYears: lifespan,
        costPerDay: Math.round(costPerDay * 100) / 100,
        whyRecommended: `${item.brand} ${item.name} — ${monthlyWarranty}m warranty, ~${lifespan}yr lifespan. ${item.features?.slice(0, 2).join(", ") || ""}`,
        whereToCheck: [
          `https://www.amazon.in/s?k=${encodeURIComponent(item.brand + " " + item.name)}`,
          `https://www.flipkart.com/search?q=${encodeURIComponent(item.brand + " " + item.name)}`,
          item.support_url || "",
        ].filter(Boolean),
        confidence: "medium" as const,
      };
    });

  // Save to DB
  await supabase.from("buying_recommendations").insert({
    user_id: user.id,
    budget_inr: input.budget,
    category: input.category,
    query: input.query || null,
    recommendations: recs,
  });

  const summary = `Found ${recs.length} ${input.category} options within your ₹${input.budget.toLocaleString("en-IN")} budget. Best cost/day: ₹${Math.min(...recs.map((r) => r.costPerDay)).toFixed(2)}.`;

  return { recommendations: recs, summary };
}
