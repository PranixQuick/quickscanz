"use server";
// Server action: mark a user's onboarding as complete so OnboardingFlow is never shown again.
// Writes onboarded_at timestamp to the profiles table.
// If the profiles table does not yet have an onboarded_at column, run:
//   alter table profiles add column if not exists onboarded_at timestamptz;

import { createClient } from "@/lib/supabase/server";

export async function markOnboardingComplete(userId?: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .upsert({ id: user.id, onboarded_at: new Date().toISOString() }, { onConflict: "id" });
}

export async function completeOnboarding(params: {
  userId?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  preferredLocale: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      display_name: params.displayName || null,
      email: params.email || null,
      phone: params.phone || null,
      preferred_locale: params.preferredLocale,
      onboarded_at: new Date().toISOString()
    }, { onConflict: "id" });

  if (error) {
    console.error("Failed to complete onboarding:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
