"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateExpiryDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const DEMO_PRODUCTS = [
  {
    name: "Samsung Galaxy S23",
    brand: "Samsung",
    purchase_date: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    warranty_months: 12,
    price: 74999,
  },
  {
    name: "Dell Inspiron 15 Laptop",
    brand: "Dell",
    purchase_date: new Date(Date.now() - 14 * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    warranty_months: 24,
    price: 62000,
  },
  {
    name: "Voltas 1.5 Ton Split AC",
    brand: "Voltas",
    purchase_date: new Date(Date.now() - 28 * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    warranty_months: 30,
    price: 38500,
  },
];

export async function seedDemoProducts(): Promise<{ seeded: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { seeded: false };

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) return { seeded: false };

  const rows = DEMO_PRODUCTS.map((p) => ({
    user_id: user.id,
    name: p.name,
    brand: p.brand,
    purchase_date: p.purchase_date,
    warranty_months: p.warranty_months,
    expiry_date: calculateExpiryDate(p.purchase_date, p.warranty_months),
    price: p.price,
    invoice_url: null,
    is_demo: true,
  }));

  await supabase.from("products").insert(rows);
  revalidatePath("/dashboard");
  return { seeded: true };
}
