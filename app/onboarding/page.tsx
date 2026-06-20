import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import OnboardingClient from "./OnboardingClient";

export const metadata = { title: "Onboarding | QuickScanZ" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pre-fill display name from Google identity if available
  const googleName = (user.user_metadata?.full_name || user.user_metadata?.name || "") as string;
  const email = (user.email || "") as string;
  const phone = (user.phone || "") as string;
  const preferredLocale = await getLocale();

  return (
    <OnboardingClient
      userId={user.id}
      initialName={googleName}
      email={email}
      phone={phone}
      preferredLocale={preferredLocale}
    />
  );
}
