import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import IoTHubClient from "@/components/iot/IoTHubClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IoT Hub | QuickScanZ",
  description: "Connect Alexa, Google Home, Matter and smart home protocols.",
};

export default async function IoTHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppLayout>
      <IoTHubClient />
    </AppLayout>
  );
}
