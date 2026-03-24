import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import ProductCompareClient from "@/components/phase3/ProductCompareClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Products | QuickScanZ",
};

export default async function ComparePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: products } = await supabase
    .from("product_lifecycle")
    .select("id, name, brand, category, purchase_date, price, warranty_months, avg_lifespan_years, cost_per_day, days_owned, warranty_status")
    .eq("user_id", user.id)
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  return (
    <AppLayout>
      <ProductCompareClient products={(products as any[]) || []} />
    </AppLayout>
  );
}
