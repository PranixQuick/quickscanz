"use server";

import { createClient } from "@/lib/supabase/server";

export interface CatalogProduct {
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

export async function searchCatalog(query: string): Promise<CatalogProduct[]> {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_product_catalog", {
    search_term: query.trim(),
    result_limit: 8,
  });
  if (error) return [];
  return (data as CatalogProduct[]) || [];
}

export async function getServiceCentres(brand: string, city?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("service_centres")
    .select("*")
    .eq("brand", brand)
    .eq("is_active", true)
    .order("city");
  if (city) query = query.ilike("city", `%${city}%`);
  const { data } = await query.limit(10);
  return data || [];
}

export async function checkRecallAlerts(brand: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recall_alerts")
    .select("*")
    .eq("brand", brand)
    .eq("is_active", true)
    .limit(5);
  return data || [];
}
