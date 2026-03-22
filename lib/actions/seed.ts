"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateExpiryDate } from "@/lib/utils";

const DEMO_PRODUCTS = [
  {
    name: "Galaxy S23",
    brand: "Samsung",
    category: "Electronics",
    subcategory: "Smartphone",
    purchase_date: "2023-06-15",
    warranty_months: 12,
    price: 74999,
    notes: "Demo product — your real products will appear here.",
  },
  {
    name: "1.5T Inverter AC",
    brand: "Voltas",
    category: "Home Appliance",
    subcategory: "Air Conditioner",
    purchase_date: "2023-04-01",
    warranty_months: 12,
    price: 38000,
  },
  {
    name: "55\" OLED TV",
    brand: "LG",
    category: "Electronics",
    subcategory: "Television",
    purchase_date: "2022-11-10",
    warranty_months: 12,
    price: 99000,
  },
];

export async function seedDemoProducts(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count || 0) > 0) return;

  const inserts = DEMO_PRODUCTS.map((p) => ({
    user_id: user.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    purchase_date: p.purchase_date,
    warranty_months: p.warranty_months,
    expiry_date: calculateExpiryDate(p.purchase_date, p.warranty_months),
    price: p.price,
    is_demo: true,
    notes: p.notes || null,
  }));

  await supabase.from("products").insert(inserts);
}
