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
  const { t, fontFamily } = useI18n();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR">("INR");

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

  async function openWebCheckout(planId: string) {
    setOpening(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const checkoutUrl = `${API_BASE_URL}/api/payment/checkout-redirect?token=${encodeURIComponent(token)}&plan_id=${planId}&currency=${currency}`;
        await WebBrowser.openBrowserAsync(checkoutUrl);
      } else {
        await WebBrowser.openBrowserAsync(`${API_BASE_URL}/pricing?currency=${currency}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOpening(false);
      load(); // refresh in case the subscription changed while the browser was open
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#1a1612" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-cream-50"
      contentContainerStyle={{ padding: 24, paddingTop: 16, paddingBottom: 48 }}
    >
      <Text style={{ fontFamily: fontFamily(true) }} className="text-2xl font-bold text-ink-900">
        {t("pricing.title") || "Upgrade Your Plan"}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="mt-2 text-xs text-ink-400 leading-5">
        {t("pricing.subtitle") || "One app for every product you own. Never lose a warranty again."}
      </Text>

      {/* Currency Switcher */}
      <View className="mt-6 flex-row bg-cream-100 p-1 rounded-2xl border border-cream-200">
        {(["INR", "USD", "EUR"] as const).map((curr) => (
          <Pressable
            key={curr}
            onPress={() => setCurrency(curr)}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              currency === curr ? "bg-white shadow-sm border border-cream-200" : ""
            }`}
          >
            <Text
              style={{ fontFamily: fontFamily(currency === curr) }}
              className={`text-xs font-semibold ${
                currency === curr ? "text-brand-500 font-bold" : "text-ink-500"
              }`}
            >
              {curr === "INR" ? "INR (₹)" : curr === "USD" ? "USD ($)" : "EUR (€)"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-8 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.price_inr === 0;
          return (
            <View
              key={plan.id}
              className={`rounded-3xl border p-6 bg-white shadow-sm ${
                isCurrent 
                  ? "border-emerald-500 border-2" 
                  : isFree 
                    ? "border-cream-200" 
                    : "border-ink-900 border-2"
              }`}
            >
              {isCurrent && (
                <View className="absolute -top-3 right-6 bg-emerald-500 rounded-full px-3 py-0.5">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[9px] font-bold text-white uppercase tracking-wider">
                    {t("pricing.current") || "Active Plan"}
                  </Text>
                </View>
              )}
              
              {!isFree && !isCurrent && (
                <View className="absolute -top-3 right-6 bg-ink-900 rounded-full px-3 py-0.5">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[9px] font-bold text-cream-50 uppercase tracking-wider">
                    ★ Premium
                  </Text>
                </View>
              )}

              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 pr-2">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-lg font-bold text-ink-900">
                    {plan.name}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(false) }} className="mt-1 text-xs text-ink-400 leading-4">
                    {plan.description}
                  </Text>
                </View>
                <View className="items-end">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-2xl font-bold text-ink-900">
                    {plan.price_inr === 0 
                      ? (currency === "INR" ? "₹0" : currency === "USD" ? "$0" : "€0")
                      : (currency === "INR" 
                        ? `₹${plan.price_inr.toLocaleString("en-IN")}` 
                        : currency === "USD"
                          ? `$${plan.interval === "yearly" ? "11.99" : "1.99"}`
                          : `€${plan.interval === "yearly" ? "10.99" : "1.89"}`
                      )}
                  </Text>
                  {!isFree && (
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 mt-0.5">
                      {plan.interval === "yearly" 
                        ? (t("pricing.per_year") || "per year +GST") 
                        : (t("pricing.per_month") || "per month +GST")}
                    </Text>
                  )}
                </View>
              </View>

              <View className="border-t border-cream-100 my-4" />

              <View className="gap-2.5 mb-2">
                {(plan.features || []).map((f) => (
                  <View key={f} className="flex-row items-center gap-2">
                    <Text className="text-[10px] text-brand-600">✦</Text>
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-600">
                      {f}
                    </Text>
                  </View>
                ))}
              </View>

              {isCurrent ? (
                <View className="mt-6 items-center rounded-2xl bg-emerald-50 border border-emerald-100 py-3.5">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {t("pricing.current_plan") || "Your Current Active Plan"}
                  </Text>
                </View>
              ) : isFree ? (
                <View className="mt-6 items-center rounded-2xl bg-cream-50 py-3.5">
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 font-medium">
                    {t("pricing.free_forever") || "Free forever · No credit card needed"}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => openWebCheckout(plan.id)}
                  disabled={opening}
                  className="mt-6 items-center rounded-2xl bg-ink-900 py-4 active:scale-[0.98] active:opacity-95 disabled:opacity-50 shadow-sm"
                >
                  {opening ? (
                    <ActivityIndicator color="#fdfcf8" />
                  ) : (
                    <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-cream-50 text-sm">
                      {t("pricing.upgrade_btn", { name: plan.name }) || `Upgrade to ${plan.name} →`}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View className="mt-8 rounded-2xl bg-cream-100 border border-cream-200 p-4">
        <Text style={{ fontFamily: fontFamily(false) }} className="text-[11px] leading-relaxed text-ink-500">
          ℹ {t("pricing.checkout_note") || "Upgrades open secure web checkout (Razorpay) in your browser. Complete checkout there and return once done."}
        </Text>
      </View>

      <Text style={{ fontFamily: fontFamily(false) }} className="mt-6 text-center text-[10px] text-ink-400 leading-4">
        🔒 {t("pricing.payments_secure") || "Payments processed securely via Razorpay · Cancel anytime · 18% GST applicable"}
      </Text>
    </ScrollView>
  );
}

