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

export interface ResaleEstimate {
  estimatePct: number;         // % of original price (e.g. 45 = 45%)
  estimatedValueInr: number | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  conditionLabel: string;
}

/**
 * Rule-based resale estimation (no external API needed).
 * Based on category, age, and condition.
 * Indian market norms from OLX/Quikr patterns.
 */
export function estimateResaleValue(params: {
  purchaseDate: string;
  originalPrice: number | null;
  category: string | null;
  conditionRating: number | null; // 1–5
  warrantyStatus: "active" | "expiring_soon" | "expired";
}): ResaleEstimate {
  const { purchaseDate, originalPrice, category, conditionRating, warrantyStatus } = params;
  const ageMonths = Math.floor(
    (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const ageYears = ageMonths / 12;
  const condition = conditionRating || 3;
  const conditionLabel = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][condition];

  // Base depreciation curves by category (Indian market)
  const curves: Record<string, { yearOne: number; perYear: number; floor: number }> = {
    "Smartphone":         { yearOne: 35, perYear: 15, floor: 15 },
    "Laptop":             { yearOne: 30, perYear: 12, floor: 20 },
    "Tablet":             { yearOne: 30, perYear: 12, floor: 15 },
    "Television":         { yearOne: 20, perYear: 8,  floor: 30 },
    "Air Conditioner":    { yearOne: 20, perYear: 8,  floor: 35 },
    "Refrigerator":       { yearOne: 15, perYear: 6,  floor: 35 },
    "Washing Machine":    { yearOne: 20, perYear: 8,  floor: 25 },
    "Kitchen Appliance":  { yearOne: 25, perYear: 10, floor: 20 },
    "Small Appliance":    { yearOne: 30, perYear: 12, floor: 15 },
    "Camera":             { yearOne: 25, perYear: 10, floor: 20 },
    "Audio / Wearable":   { yearOne: 35, perYear: 15, floor: 10 },
    "Computer Peripheral":{ yearOne: 30, perYear: 12, floor: 15 },
    "Wearable":           { yearOne: 35, perYear: 15, floor: 10 },
    "Home Appliance":     { yearOne: 20, perYear: 8,  floor: 30 },
  };

  const cat = category || "Electronics";
  const curve = curves[cat] || { yearOne: 25, perYear: 10, floor: 20 };

  // Calculate base percentage remaining
  let pct: number;
  if (ageYears <= 1) {
    pct = 100 - (curve.yearOne * ageYears);
  } else {
    pct = (100 - curve.yearOne) - (curve.perYear * (ageYears - 1));
  }
  pct = Math.max(pct, curve.floor);

  // Condition adjustment (±10%)
  const conditionAdj = (condition - 3) * 4; // -8 to +8
  pct = Math.min(95, Math.max(curve.floor - 5, pct + conditionAdj));

  // Warranty premium (in-warranty = +5%)
  if (warrantyStatus === "active") pct = Math.min(95, pct + 5);

  const estimatedValueInr = originalPrice ? Math.round((originalPrice * pct) / 100) : null;

  // Confidence level
  const confidence = originalPrice && conditionRating ? "high" : originalPrice ? "medium" : "low";

  const reason = ageYears < 1
    ? `Nearly new (${ageMonths}m old) ${conditionLabel.toLowerCase()} condition`
    : `${ageYears.toFixed(1)} years old, ${conditionLabel.toLowerCase()} condition${warrantyStatus === "active" ? ", in warranty" : ""}`;

  return {
    estimatePct: Math.round(pct),
    estimatedValueInr,
    confidence,
    reason,
    conditionLabel,
  };
}

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
