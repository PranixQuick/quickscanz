import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import AccountClient from "@/components/AccountClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account | QuickScanZ",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: productCount },
    { count: smartCount },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_demo", false),
    supabase
      .from("smart_devices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  return (
    <AppLayout>
      <AccountClient
        email={user.email || ""}
        userId={user.id}
        productCount={productCount || 0}
        smartDeviceCount={smartCount || 0}
      />
    </AppLayout>
  );
}
