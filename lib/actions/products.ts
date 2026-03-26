"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateExpiryDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { Product } from "@/lib/types";

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) { console.error("Error fetching products:", error); return []; }
  return data || [];
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function addProduct(
  formData: FormData
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };
  // Subscription limit enforcement (server-side, cannot be bypassed)
  const [{ data: activeSub }, { count: realCount }] = await Promise.all([
    supabase
      .from("user_subscriptions")
      .select("plan_id, plan:subscription_plans(product_limit)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_demo", false),
  ]);
  const limit: number = (activeSub as any)?.plan?.product_limit ?? 5;
  if ((realCount ?? 0) >= limit) {
    return {
      success: false,
      error: `Free plan limit reached (${limit} products). Upgrade to Pro for unlimited tracking.`,
    };
  }

  // FIX: trim() all string inputs to prevent trailing/leading spaces in DB
  const name = (formData.get("name") as string)?.trim();
  const brand = (formData.get("brand") as string)?.trim();
  const purchase_date = formData.get("purchase_date") as string;
  const warranty_months = parseInt(formData.get("warranty_months") as string);
  const price = formData.get("price") as string;
  const category = (formData.get("category") as string)?.trim();
  const subcategory = (formData.get("subcategory") as string)?.trim();
  const model_number = (formData.get("model_number") as string)?.trim();
  const serial_number = (formData.get("serial_number") as string)?.trim();
  const store_name = (formData.get("store_name") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim();
  const catalog_product_id = formData.get("catalog_product_id") as string;
  const invoiceFile = formData.get("invoice") as File | null;

  if (!name || !brand || !purchase_date) {
    return { success: false, error: "Required fields missing" };
  }

  const expiry_date = calculateExpiryDate(purchase_date, warranty_months);
  let invoice_url: string | null = null;

  if (invoiceFile && invoiceFile.size > 0) {
    const fileExt = invoiceFile.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, invoiceFile, { upsert: false });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from("invoices").getPublicUrl(fileName);
      invoice_url = publicUrl;
    }
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id, name, brand, purchase_date,
    warranty_months, expiry_date,
    price: price ? parseFloat(price) : null,
    invoice_url, is_demo: false,
  };

  if (category) insertData.category = category;
  if (subcategory) insertData.subcategory = subcategory;
  if (model_number) insertData.model_number = model_number;
  if (serial_number) insertData.serial_number = serial_number;
  if (store_name) insertData.store_name = store_name;
  if (notes) insertData.notes = notes;
  if (catalog_product_id) insertData.catalog_product_id = catalog_product_id;

  const { data, error } = await supabase
    .from("products")
    .insert(insertData)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/products");
  return { success: true, id: data.id };
}

export async function updateProduct(
  id: string,
  updates: Partial<{
    name: string;
    brand: string;
    purchase_date: string;
    warranty_months: number;
    price: number | null;
    category: string;
    subcategory: string;
    model_number: string;
    serial_number: string;
    store_name: string;
    notes: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // FIX: trim string fields on update as well
  const trimmed: typeof updates = { ...updates };
  if (trimmed.name) trimmed.name = trimmed.name.trim();
  if (trimmed.brand) trimmed.brand = trimmed.brand.trim();
  if (trimmed.category) trimmed.category = trimmed.category.trim();
  if (trimmed.subcategory) trimmed.subcategory = trimmed.subcategory.trim();
  if (trimmed.model_number) trimmed.model_number = trimmed.model_number.trim();
  if (trimmed.serial_number) trimmed.serial_number = trimmed.serial_number.trim();
  if (trimmed.store_name) trimmed.store_name = trimmed.store_name.trim();
  if (trimmed.notes) trimmed.notes = trimmed.notes.trim();

  const updateData: Record<string, unknown> = { ...trimmed };
  if (trimmed.purchase_date || trimmed.warranty_months) {
    const existing = await getProduct(id);
    if (existing) {
      const pd = trimmed.purchase_date || existing.purchase_date;
      const wm = trimmed.warranty_months || existing.warranty_months;
      updateData.expiry_date = calculateExpiryDate(pd, wm);
    }
  }

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: true };
}

export async function deleteProduct(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const product = await getProduct(id);
  if (product?.invoice_url) {
    const path = product.invoice_url.split("/invoices/")[1];
    if (path) await supabase.storage.from("invoices").remove([path]);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/products");
  return { success: true };
}
