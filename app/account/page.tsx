import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import AccountClient from "@/components/AccountClient";
import { getUserSubscription } from "@/lib/actions/subscriptions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account | QuickScanZ" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: productCount },
    { count: smartDeviceCount },
    subscription,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("smart_devices").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    getUserSubscription(),
  ]);

  return (
    <AppLayout>
      <AccountClient
        email={user.email || ""}
        userId={user.id}
        productCount={productCount || 0}
        smartDeviceCount={smartDeviceCount || 0}
        planId={subscription?.plan_id || "free"}
        planName={(subscription as any)?.plan?.name || "Free"}
      />
    </AppLayout>
  );
}
