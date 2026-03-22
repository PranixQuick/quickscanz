"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SmartDevice {
  id: string;
  user_id: string;
  product_id: string | null;
  device_name: string;
  brand: string;
  category: string;
  model_number: string | null;
  device_type: string;
  has_wifi: boolean;
  has_app: boolean;
  app_name: string | null;
  app_store_url: string | null;
  purchase_date: string | null;
  last_service_date: string | null;
  next_service_due: string | null;
  service_interval_months: number;
  energy_rating: string | null;
  daily_usage_hours: number | null;
  monthly_units_kwh: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export async function getSmartDevices(): Promise<SmartDevice[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("smart_devices")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (data as SmartDevice[]) || [];
}

export async function addSmartDevice(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const device_name = formData.get("device_name") as string;
  const brand = formData.get("brand") as string;
  const device_type = formData.get("device_type") as string;
  const model_number = formData.get("model_number") as string;
  const purchase_date = formData.get("purchase_date") as string;
  const service_interval = parseInt(formData.get("service_interval_months") as string) || 12;
  const daily_usage = parseFloat(formData.get("daily_usage_hours") as string) || null;
  const energy_rating = formData.get("energy_rating") as string;
  const has_wifi = formData.get("has_wifi") === "true";
  const has_app = formData.get("has_app") === "true";
  const app_name = formData.get("app_name") as string;
  const notes = formData.get("notes") as string;

  // Calculate next service due
  let next_service_due = null;
  if (purchase_date) {
    const d = new Date(purchase_date);
    d.setMonth(d.getMonth() + service_interval);
    next_service_due = d.toISOString().split("T")[0];
  }

  const { data, error } = await supabase
    .from("smart_devices")
    .insert({
      user_id: user.id,
      device_name,
      brand,
      category: "Smart Device",
      device_type,
      model_number: model_number || null,
      purchase_date: purchase_date || null,
      service_interval_months: service_interval,
      next_service_due,
      daily_usage_hours: daily_usage,
      energy_rating: energy_rating || null,
      has_wifi,
      has_app,
      app_name: app_name || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/smart-devices");
  revalidatePath("/dashboard");
  return { success: true, id: data.id };
}

export async function deleteSmartDevice(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("smart_devices")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/smart-devices");
  return { success: true };
}

export async function logDeviceService(
  deviceId: string,
  serviceType: string,
  notes?: string,
  cost?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("device_service_logs")
    .insert({
      device_id: deviceId,
      user_id: user.id,
      service_type: serviceType,
      notes,
      cost,
      serviced_at: new Date().toISOString().split("T")[0],
    });

  if (error) return { success: false, error: error.message };

  // Update last service date + next due
  const device = await supabase
    .from("smart_devices")
    .select("service_interval_months")
    .eq("id", deviceId)
    .single();

  if (device.data) {
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + device.data.service_interval_months);
    await supabase
      .from("smart_devices")
      .update({
        last_service_date: new Date().toISOString().split("T")[0],
        next_service_due: nextDue.toISOString().split("T")[0],
      })
      .eq("id", deviceId);
  }

  revalidatePath("/smart-devices");
  return { success: true };
}
