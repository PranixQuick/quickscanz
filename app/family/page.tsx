import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import FamilyVaultClient from "@/components/family/FamilyVaultClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Family Vault | QuickScanZ",
  description: "Share warranty tracking with your family.",
};

export default async function FamilyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppLayout>
      <FamilyVaultClient />
    </AppLayout>
  );
}
