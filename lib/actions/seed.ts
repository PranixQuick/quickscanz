"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateExpiryDate } from "@/lib/utils";

const DEMO_PRODUCTS = [
  {
    name: "Samsung Galaxy S23",
    brand: "Samsung",
    category: "Electronics",
    subcategory: "Smartphone",
    purchase_date: "2025-07-25",
    warranty_months: 12,
    price: 74999,
    notes: "Demo product — your real products will appear here.",
  },
  {
    name: "Voltas 1.5 Ton Split AC",
    brand: "Voltas",
    category: "Home Appliance",
    subcategory: "Air Conditioner",
    purchase_date: "2023-12-03",
    warranty_months: 30,
    price: 38500,
  },
  {
    name: "Dell Inspiron 15 Laptop",
    brand: "Dell",
    category: "Electronics",
    subcategory: "Laptop",
    purchase_date: "2025-01-26",
    warranty_months: 24,
    price: 62000,
  },
];

export async function seedDemoProducts(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

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
    notes: (p as any).notes || null,
  }));

  // FIX: Use atomic DB-level RPC instead of read-count-then-insert.
  // seed_demo_products_if_empty() uses SELECT ... FOR UPDATE inside a transaction
  // so two simultaneous requests cannot both pass the count=0 check.
  // This eliminates the race condition that caused test1 to get 6 demo products.
  await supabase.rpc("seed_demo_products_if_empty", {
    p_user_id: user.id,
    p_products: inserts,
  });
}
