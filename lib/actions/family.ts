"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  // Resolved from profiles join — may be null if profile not yet created
  display_name: string | null;
  email: string | null;
}

export async function createFamilyGroup(name: string): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("family_groups")
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Auto-add owner as member
  await supabase.from("family_members").insert({
    group_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/family");
  return { success: true, group: data as FamilyGroup };
}

export async function getMyFamilyGroup(): Promise<FamilyGroup | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("family_groups")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  return data as FamilyGroup | null;
}

export async function joinFamilyGroup(inviteCode: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: group, error: groupError } = await supabase
    .from("family_groups")
    .select("id")
    .eq("invite_code", inviteCode.trim())
    .single();

  if (groupError || !group) return { success: false, error: "Invalid invite code" };

  const { error } = await supabase
    .from("family_members")
    .insert({ group_id: group.id, user_id: user.id, role: "member" });

  if (error) {
    if (error.code === "23505") return { success: false, error: "Already a member" };
    return { success: false, error: error.message };
  }

  revalidatePath("/family");
  return { success: true };
}

export async function getFamilyMembers(groupId: string): Promise<FamilyMember[]> {
  const supabase = await createClient();

  // Use SECURITY DEFINER RPC that safely joins auth.users for real emails.
  // The function enforces that the caller is a member of the group.
  const { data, error } = await supabase
    .rpc("get_family_members_with_email", { p_group_id: groupId });

  if (error || !data) return [];

  return data as FamilyMember[];
}

export async function leaveFamilyGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/family");
  return { success: true };
}
