import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { API_BASE_URL } from "../src/lib/api";
import type { SubscriptionPlan, UserSubscription } from "../src/lib/types";
import { useI18n } from "../src/i18n";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48; // Centered visual width with space for snapping cues

const CURRENCIES = {
  inr: { symbol: "₹", locale: "en-IN", rates: { free: 0, pro: 149, yearly: 999 }, name: "INR (₹)" },
  usd: { symbol: "$", locale: "en-US", rates: { free: 0, pro: 1.99, yearly: 11.99 }, name: "USD ($)" },
  eur: { symbol: "€", locale: "de-DE", rates: { free: 0, pro: 1.89, yearly: 10.99 }, name: "EUR (€)" },
};

export default function PricingScreen() {
  const { user } = useAuth();
  const { t, fontFamily } = useI18n();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<keyof typeof CURRENCIES>("inr");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

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
  const currInfo = CURRENCIES[selectedCurrency];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (CARD_WIDTH + 12));
    if (index >= 0 && index < plans.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  async function handleSelectTier(plan: SubscriptionPlan) {
    console.log("[PricingScreen] handleSelectTier called! Plan ID:", plan.id, "currentPlanId:", currentPlanId);
    if (plan.id === currentPlanId) return;
    if (plan.price_inr === 0) return;

    // Trigger high-fidelity white flash overlay transition
    setShowFlash(true);
    setTimeout(() => {
      setShowFlash(false);
      console.log("[PricingScreen] calling openWebCheckout...");
      openWebCheckout(plan);
    }, 150);
  }

  async function openWebCheckout(plan: SubscriptionPlan) {
    setOpening(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        console.error("[PricingScreen] No Supabase access token found");
        return;
      }
      const checkoutUrl = `${API_BASE_URL}/api/payment/checkout-redirect?plan_id=${plan.id}&token=${accessToken}`;
      console.log("[PricingScreen] openWebCheckout start! URL:", checkoutUrl);
      const res = await WebBrowser.openBrowserAsync(checkoutUrl);
      console.log("[PricingScreen] WebBrowser.openBrowserAsync finished, result:", res);
    } catch (err) {
      console.error("[PricingScreen] WebBrowser.openBrowserAsync error:", err);
    } finally {
      setOpening(false);
      console.log("[PricingScreen] openWebCheckout finally block");
      load();
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
    <View className="flex-1 bg-cream-50">
      {showFlash && (
        <View className="absolute inset-0 bg-white opacity-85 z-50 pointer-events-none" />
      )}
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}
      >
        <View className="px-6">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-2xl font-bold text-ink-900">
            {t("pricing.title") || "Upgrade Your Plan"}
          </Text>
          <Text style={{ fontFamily: fontFamily(false) }} className="mt-2 text-xs text-ink-400 leading-5">
            {t("pricing.subtitle") || "One app for every product you own. Never lose a warranty again."}
          </Text>

          {/* Currency Switcher */}
          <View className="flex-row bg-cream-100 border border-cream-200 p-1 rounded-2xl mt-4 self-start">
            {(Object.keys(CURRENCIES) as Array<keyof typeof CURRENCIES>).map((currKey) => {
              const isSelected = currKey === selectedCurrency;
              return (
                <Pressable
                  key={currKey}
                  onPress={() => setSelectedCurrency(currKey)}
                  className={`px-4 py-2 rounded-xl ${isSelected ? "bg-ink-900 shadow-sm" : ""}`}
                >
                  <Text
                    style={{ fontFamily: fontFamily(isSelected) }}
                    className={`text-xs font-semibold ${isSelected ? "text-cream-50 font-bold" : "text-ink-500"}`}
                  >
                    {CURRENCIES[currKey].name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Horizontal Stack Slider */}
        <ScrollView
          horizontal
          pagingEnabled={false}
          snapToInterval={CARD_WIDTH + 12}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingVertical: 16 }}
          className="mt-6"
        >
          {plans.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId;
            const isFree = plan.price_inr === 0;
            const isActive = index === activeIndex;

            return (
              <View
                key={plan.id}
                style={{
                  width: CARD_WIDTH,
                  transform: [{ scale: isActive ? 1.02 : 0.96 }],
                }}
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
                      {currInfo.symbol}
                      {currInfo.rates[plan.id as keyof typeof currInfo.rates] !== undefined
                        ? currInfo.rates[plan.id as keyof typeof currInfo.rates].toLocaleString(currInfo.locale)
                        : plan.price_inr.toLocaleString("en-IN")}
                    </Text>
                    {!isFree && (
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 mt-0.5">
                        {plan.interval === "yearly" 
                          ? (t("pricing.per_year") || "per year +taxes") 
                          : (t("pricing.per_month") || "per month +taxes")}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="border-t border-cream-100 my-4" />

                <View className="gap-2.5 mb-2 flex-1">
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
                    onPress={() => handleSelectTier(plan)}
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
        </ScrollView>

        {/* Dynamic Horizontal Indicators */}
        <View className="flex-row justify-center items-center gap-1.5 mt-2 mb-4">
          {plans.map((_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === index ? "w-4 bg-ink-900" : "w-1.5 bg-cream-300"
              }`}
            />
          ))}
        </View>

        <View className="px-6">
          <View className="mt-4 rounded-2xl bg-cream-100 border border-cream-200 p-4">
            <Text style={{ fontFamily: fontFamily(false) }} className="text-[11px] leading-relaxed text-ink-500">
              ℹ {t("pricing.checkout_note") || `Upgrades open secure web checkout (${selectedCurrency === "inr" ? "Razorpay" : "Stripe"}) in your browser. Complete checkout there and return once done.`}
            </Text>
          </View>

          <Text style={{ fontFamily: fontFamily(false) }} className="mt-6 text-center text-[10px] text-ink-400 leading-4">
            🔒 {t("pricing.payments_secure") || `Payments processed securely via ${selectedCurrency === "inr" ? "Razorpay" : "Stripe"} · Cancel anytime`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
