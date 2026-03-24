import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import BuyingAssistantClient from "@/components/phase3/BuyingAssistantClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buying Assistant | QuickScanZ",
};

export default async function BuyingAssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("product_catalog")
    .select("category")
    .order("category");

  const uniqueCategories = [...new Set((categories || []).map((c: any) => c.category))];

  return (
    <AppLayout>
      <BuyingAssistantClient categories={uniqueCategories} />
    </AppLayout>
  );
}
