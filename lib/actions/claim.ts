"use server";

import { createClient } from "@/lib/supabase/server";

export interface ClaimMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaimSession {
  id: string;
  product_id: string;
  issue: string;
  messages: ClaimMessage[];
  status: "open" | "resolved" | "escalated";
  created_at: string;
}

export async function startClaimSession(
  productId: string,
  issue: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("claim_sessions")
    .insert({
      user_id: user.id,
      product_id: productId,
      issue,
      messages: [],
      status: "open",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, sessionId: data.id };
}

export async function getClaimSession(
  sessionId: string
): Promise<ClaimSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("claim_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data as ClaimSession;
}

export async function getProductClaimSessions(
  productId: string
): Promise<ClaimSession[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("claim_sessions")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data as ClaimSession[]) || [];
}

export async function updateClaimSession(
  sessionId: string,
  messages: ClaimMessage[],
  status?: "open" | "resolved" | "escalated"
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("claim_sessions")
    .update({
      messages,
      status: status || "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);
}
