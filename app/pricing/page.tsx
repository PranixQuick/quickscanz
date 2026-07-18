import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import PricingClient from "@/components/subscription/PricingClient";
import { getSubscriptionPlans, getUserSubscription } from "@/lib/actions/subscriptions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade | QuickScanZ",
  description: "Choose a plan to unlock unlimited product tracking.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: { embed?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [plans, currentSub] = await Promise.all([
    getSubscriptionPlans(),
    getUserSubscription(),
  ]);

  const embed = searchParams?.embed === "true";

  return (
    <AppLayout embed={embed}>
      <PricingClient
        plans={plans}
        currentPlanId={currentSub?.plan_id || "free"}
        userEmail={user.email || ""}
      />
    </AppLayout>
  );
}
