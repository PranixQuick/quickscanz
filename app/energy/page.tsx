import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import EnergyDashboardClient from "@/components/iot/EnergyDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Energy Monitor | QuickScanZ",
  description: "Track power usage, electricity cost, and efficiency of your smart devices.",
};

export default async function EnergyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppLayout>
      <EnergyDashboardClient />
    </AppLayout>
  );
}
