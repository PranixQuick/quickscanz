"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── PRICE HISTORY ────────────────────────────────────────────────────────────

export interface PriceEntry {
  id: string;
  product_id: string;
  source: string;
  price: number;
  currency: string;
  recorded_at: string;
  notes: string | null;
}

export async function getPriceHistory(productId: string): Promise<PriceEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("price_history")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false });

  if (error) { console.error("getPriceHistory:", error); return []; }
  return data || [];
}

export async function addPriceEntry(
  productId: string,
  price: number,
  source: string = "manual",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("price_history").insert({
    product_id: productId,
    user_id: user.id,
    source,
    price,
    currency: "INR",
    notes: notes || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/products/${productId}`);
  return { success: true };
}

// ─── MAINTENANCE SCHEDULES ────────────────────────────────────────────────────

export interface MaintenanceTask {
  id: string;
  product_id: string;
  task_name: string;
  interval_days: number;
  last_done_at: string | null;
  next_due_at: string | null;
  reminder_sent: boolean;
  notes: string | null;
}

export async function getMaintenanceTasks(productId: string): Promise<MaintenanceTask[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .order("next_due_at", { ascending: true });

  if (error) { console.error("getMaintenanceTasks:", error); return []; }
  return data || [];
}

export async function getAllDueMaintenance(): Promise<(MaintenanceTask & {
  product_name: string;
  brand: string;
  days_until_due: number;
})[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.rpc("get_maintenance_due", {
    user_uuid: user.id,
    days_ahead: 30,
  });
  return data || [];
}

export async function addMaintenanceTask(
  productId: string,
  taskName: string,
  intervalDays: number,
  lastDoneAt?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("maintenance_schedules").insert({
    product_id: productId,
    user_id: user.id,
    task_name: taskName,
    interval_days: intervalDays,
    last_done_at: lastDoneAt || null,
    notes: notes || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/products/${productId}`);
  return { success: true };
}

export async function markMaintenanceDone(
  taskId: string,
  productId: string,
  doneAt?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("maintenance_schedules")
    .update({
      last_done_at: doneAt || new Date().toISOString().split("T")[0],
      reminder_sent: false,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/products/${productId}`);
  return { success: true };
}

export async function deleteMaintenanceTask(
  taskId: string,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("maintenance_schedules")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/products/${productId}`);
  return { success: true };
}

// ─── RESALE VALUE ESTIMATION ──────────────────────────────────────────────────


export async function saveResaleEstimate(
  productId: string,
  estimatePct: number,
  conditionRating: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("products")
    .update({
      resale_estimate_pct: estimatePct,
      resale_updated_at: new Date().toISOString(),
      condition_rating: conditionRating,
    })
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/products/${productId}`);
  return { success: true };
}
