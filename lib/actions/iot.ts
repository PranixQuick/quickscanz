"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────
export interface TelemetryReading {
  id: string;
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  power_watts: number | null;
  energy_kwh: number | null;
  voltage: number | null;
  is_on: boolean;
  signal_strength: number | null;
  source: string;
  raw_payload: Record<string, unknown>;
  recorded_at: string;
}

export interface EnergyDaily {
  id: string;
  device_id: string;
  date: string;
  kwh_used: number;
  hours_on: number;
  cost_inr: number | null;
  peak_watts: number | null;
  avg_watts: number | null;
  readings: number;
}

export interface EnergySummary {
  device_id: string;
  device_name: string;
  device_type: string;
  total_kwh: number;
  total_cost_inr: number;
  avg_daily_kwh: number;
  days_tracked: number;
}

export interface VoiceIntegration {
  id: string;
  platform: "alexa" | "google_home" | "siri" | "cortana";
  device_id: string | null;
  skill_name: string | null;
  linked_at: string;
  is_active: boolean;
}

export interface MatterDevice {
  id: string;
  smart_device_id: string | null;
  matter_id: string | null;
  protocol: string;
  ip_address: string | null;
  is_paired: boolean;
  last_seen: string | null;
  firmware_version: string | null;
}

// ─── Telemetry ───────────────────────────────────────────────

export async function simulateTelemetry(
  deviceId: string,
  deviceType: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase.rpc("simulate_device_telemetry", {
    p_device_id: deviceId,
    p_user_id: user.id,
    p_device_type: deviceType,
  });

  if (error) return { success: false, error: error.message };

  // Roll up to daily energy
  await supabase.rpc("rollup_daily_energy", {
    p_device_id: deviceId,
    p_user_id: user.id,
  });

  revalidatePath("/energy");
  revalidatePath("/smart-devices");
  return { success: true, id: data as string };
}

export async function logManualReading(
  deviceId: string,
  watts: number,
  isOn: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const kwh = watts / 1000 / 6; // 10-min interval

  const { error } = await supabase.from("device_telemetry").insert({
    device_id: deviceId,
    user_id: user.id,
    power_watts: watts,
    energy_kwh: kwh,
    is_on: isOn,
    source: "manual",
    voltage: 230,
  });

  if (error) return { success: false, error: error.message };

  await supabase.rpc("rollup_daily_energy", {
    p_device_id: deviceId,
    p_user_id: user.id,
  });

  revalidatePath("/energy");
  return { success: true };
}

export async function getLatestTelemetry(deviceId: string): Promise<TelemetryReading | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("device_telemetry")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();
  return data as TelemetryReading | null;
}

export async function getTelemetryHistory(
  deviceId: string,
  hours: number = 24
): Promise<TelemetryReading[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("device_telemetry")
    .select("*")
    .eq("device_id", deviceId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });
  return (data as TelemetryReading[]) || [];
}

// ─── Energy ──────────────────────────────────────────────────

export async function getEnergySummary(days: number = 7): Promise<EnergySummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.rpc("get_energy_summary", {
    p_user_id: user.id,
    p_days: days,
  });
  return (data as EnergySummary[]) || [];
}

export async function getDeviceEnergyHistory(
  deviceId: string,
  days: number = 30
): Promise<EnergyDaily[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString().split("T")[0];
  const { data } = await supabase
    .from("energy_daily")
    .select("*")
    .eq("device_id", deviceId)
    .gte("date", since)
    .order("date", { ascending: true });
  return (data as EnergyDaily[]) || [];
}

// ─── Voice Integrations ───────────────────────────────────────

export async function getVoiceIntegrations(): Promise<VoiceIntegration[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("voice_integrations")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);
  return (data as VoiceIntegration[]) || [];
}

export async function addVoiceIntegration(
  platform: string,
  deviceId: string | null,
  skillName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("voice_integrations").insert({
    user_id: user.id,
    platform,
    device_id: deviceId || null,
    skill_name: skillName,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/smart-devices");
  return { success: true };
}

// ─── Matter/Thread Devices ────────────────────────────────────

export async function getMatterDevices(): Promise<MatterDevice[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("matter_devices")
    .select("*")
    .eq("user_id", user.id);
  return (data as MatterDevice[]) || [];
}

export async function addMatterDevice(
  smartDeviceId: string,
  protocol: string,
  pairingCode?: string,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("matter_devices").insert({
    user_id: user.id,
    smart_device_id: smartDeviceId,
    protocol,
    pairing_code: pairingCode || null,
    ip_address: ipAddress || null,
    is_paired: false,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/smart-devices");
  return { success: true };
}
