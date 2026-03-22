import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import SmartDevicesClient from "@/components/smart/SmartDevicesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Devices | QuickScanZ",
  description: "Track your smart home and IoT devices, service schedules, and usage.",
};

export default async function SmartDevicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppLayout>
      <SmartDevicesClient />
    </AppLayout>
  );
}
