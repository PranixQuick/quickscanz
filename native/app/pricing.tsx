import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { API_BASE_URL } from "../src/lib/api";
import type { SubscriptionPlan, UserSubscription } from "../src/lib/types";
import { useI18n } from "../src/i18n";

/**
 * Mirrors app/pricing/page.tsx + components/subscription/PricingClient.tsx
 * (web): same `subscription_plans` / `user_subscriptions` tables, same plan
 * ids (free / pro_monthly / pro_yearly). `subscription_plans` has no RLS
 * enabled in the bootstrap migration (public read by design); `user_
 * subscriptions` is locked to a SELECT-only "own row" policy as of
 * supabase/migrations/20260704_lockdown_user_subscriptions_rls.sql, so this
 * screen only ever reads — it never attempts to write a subscription row
 * itself (that would be rejected by RLS from an authenticated client key
 * anyway; only the service role can write it).
 *
 * KNOWN FOLLOW-UP: real in-app purchase is NOT implemented here. Razorpay
 * checkout (lib/actions/subscriptions.ts's `createRazorpayRedirectUrl`) is a
 * Next.js server action that (a) needs the cookie-authenticated web session
 * to run and (b) returns a `https://api.razorpay.com/v1/checkout/embedded`
 * URL meant to be opened full-page in that same browser context. Rather than
 * re-implement Razorpay order creation + signature verification natively (a
 * real, separate effort — likely `react-native-razorpay` plus a Bearer-auth
 * variant of the order/verify routes), M3 opens the existing web `/pricing`
 * page in an in-app browser instead. This means the user checks out through
 * the web flow in that browser's own session (NOT the native app's Supabase
 * session — they may need to sign in there separately), and the upgrade
 * becomes visible here once `user_subscriptions` is updated server-side and
 * this screen is refocused/refreshed. True native checkout is a follow-up
 * milestone.
 */

export default function PricingScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: planRows }, subRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("price_inr"),
      user
        ? supabase
            .from("user_subscriptions")
            .select("*, plan:subscription_plans(*)")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setPlans((planRows as SubscriptionPlan[] | null) ?? []);
    setCurrentSub(((subRes as { data: UserSubscription | null } | null)?.data as UserSubscription | null) ?? null);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const currentPlanId = currentSub?.plan_id ?? "free";

  async function openWebCheckout() {
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(`${API_BASE_URL}/pricing`);
    } finally {
      setOpening(false);
      load(); // refresh in case the subscription changed while the browser was open
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-cream-100"
      contentContainerStyle={{ padding: 24, paddingTop: 16, paddingBottom: 48 }}
    >
      <Text className="text-2xl font-bold text-ink-700">{t("pricing.title") || "Upgrade Your Plan"}</Text>
      <Text className="mt-1 text-sm text-ink-500">{t("pricing.subtitle") || "One app for every product you own. Never lose a warranty again."}</Text>

      <View className="mt-6 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.price_inr === 0;
          return (
            <View
              key={plan.id}
              className={`rounded-2xl border p-5 ${isFree ? "border-cream-300 bg-white" : "border-brand-500 bg-white"}`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-semibold text-ink-700">{plan.name}</Text>
                    {isCurrent && (
                      <View className="rounded-full bg-green-100 px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-green-700">{t("pricing.current") || "Current"}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-0.5 text-xs text-ink-300">{plan.description}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xl font-light text-ink-700">₹{plan.price_inr.toLocaleString("en-IN")}</Text>
                  {!isFree && (
                    <Text className="text-[10px] text-ink-300">
                      {plan.interval === "yearly" ? (t("pricing.per_year") || "per year +GST") : (t("pricing.per_month") || "per month +GST")}
                    </Text>
                  )}
                </View>
              </View>

              <View className="mt-3 gap-1.5">
                {(plan.features || []).map((f) => (
                  <Text key={f} className="text-xs text-ink-500">
                    • {f}
                  </Text>
                ))}
              </View>

              {isCurrent ? (
                <View className="mt-4 items-center rounded-xl bg-cream-200 py-2.5">
                  <Text className="text-sm text-ink-500">{t("pricing.current_plan") || "Your current plan"}</Text>
                </View>
              ) : isFree ? (
                <View className="mt-4 items-center py-2.5">
                  <Text className="text-xs text-ink-300">{t("pricing.free_forever") || "Free forever · No credit card needed"}</Text>
                </View>
              ) : (
                <Pressable
                  onPress={openWebCheckout}
                  disabled={opening}
                  className="mt-4 items-center rounded-xl bg-brand-500 py-3 active:opacity-90 disabled:opacity-50"
                >
                  {opening ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">{t("pricing.upgrade_btn", { name: plan.name }) || `Upgrade to ${plan.name} →`}</Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View className="mt-6 rounded-xl bg-cream-200 p-3">
        <Text className="text-[11px] leading-relaxed text-ink-500">
          {t("pricing.checkout_note") || "Upgrades open secure web checkout (Razorpay) in your browser. Complete checkout there and return once done."}
        </Text>
      </View>

      <Text className="mt-6 text-center text-xs text-ink-300">
        {t("pricing.payments_secure") || "Payments processed securely via Razorpay · Cancel anytime · 18% GST applicable"}
      </Text>
    </ScrollView>
  );
}
