"use server";
// Server action: mark a user's onboarding as complete so OnboardingFlow is never shown again.
// Writes onboarded_at timestamp to the profiles table.
// If the profiles table does not yet have an onboarded_at column, run:
--   alter table profiles add column if not exists onboarded_at timestamptz;

import { createClient } from "@/lib/supabase/server";

export async function markOnboardingComplete(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .upsert({ id: userId, onboarded_at: new Date().toISOString() }, { onConflict: "id" });
}
