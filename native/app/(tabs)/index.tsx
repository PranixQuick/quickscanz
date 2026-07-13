import { useCallback, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import {
  countByStatus,
  getStatusConfig,
  getWarrantyStatus,
  formatWarrantyCountdown,
  type StatusCounts,
} from "../../src/lib/calculations";
import { useI18n, LOCALES, LOCALE_LABELS } from "../../src/i18n";
import type { Product } from "../../src/lib/types";

const EMPTY_COUNTS: StatusCounts = { active: 0, expiring_soon: 0, expired: 0, total: 0 };
const PRODUCT_COLUMNS =
  "id, user_id, name, brand, purchase_date, warranty_months, expiry_date, price, invoice_url, created_at, category, model_number, serial_number, store_name, notes";

function AppLogo() {
  return (
    <View className="w-8 h-8 rounded-xl bg-ink-900 justify-center items-center">
      <View className="w-4.5 h-4.5 flex-wrap flex-row gap-[3px] justify-center items-center">
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50" />
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50 opacity-60" />
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50 opacity-60" />
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50 opacity-25" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("user_id", user.id)
        .order("expiry_date", { ascending: true });

      if (error) {
        setError(error.message);
        return;
      }

      const list = (data as Product[] | null) ?? [];
      setProducts(list);
      setCounts(countByStatus(list));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const statsItems = useMemo(
    () => [
      {
        label: t("dashboard.stats_total"),
        value: counts.total,
        sublabel: t("dashboard.stats_sub_products") || "products",
        color: "text-ink-900",
        icon: (
          <View className="w-3.5 h-3.5 flex-wrap flex-row gap-[2px] justify-center items-center">
            <View className="w-1.2 h-1.2 rounded-[1px] bg-ink-500" />
            <View className="w-1.2 h-1.2 rounded-[1px] bg-ink-500 opacity-50" />
            <View className="w-1.2 h-1.2 rounded-[1px] bg-ink-500 opacity-50" />
            <View className="w-1.2 h-1.2 rounded-[1px] bg-ink-500 opacity-25" />
          </View>
        ),
      },
      {
        label: t("dashboard.stats_active"),
        value: counts.active,
        sublabel: t("dashboard.stats_sub_warranties") || "active",
        color: "text-sage-500",
        icon: <Ionicons name="checkmark-circle-outline" size={14} color="#4e894e" />,
      },
      {
        label: t("dashboard.stats_expiring"),
        value: counts.expiring_soon,
        sublabel: t("dashboard.stats_sub_within_30d") || "within 30d",
        color: counts.expiring_soon > 0 ? "text-amber-600" : "text-ink-400",
        icon: <Ionicons name="time-outline" size={14} color="#d97706" />,
      },
    ],
    [counts, t]
  );

  const greetingSubText = useMemo(() => {
    const trackedText = `${counts.total} ${t("dashboard.products_tracked")}`;
    const statusText =
      counts.expiring_soon > 0
        ? ` · ${counts.expiring_soon} ${t("dashboard.expiring_soon")}`
        : ` · ${t("dashboard.all_looking_good")}`;
    return `${trackedText}${statusText}`;
  }, [counts, t]);

  const userName = user?.email?.split("@")[0] || user?.phone || "Guest";
  const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <View className="flex-1 bg-cream-50 pt-12">
      {/* Premium Header Branding */}
      <View className="flex-row items-center justify-between px-6 pb-4 border-b border-cream-200 bg-cream-50">
        <View className="flex-row items-center gap-2">
          <AppLogo />
          <Text className="text-lg font-bold text-ink-900 tracking-tight">QuickScanZ</Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-cream-200">
          <Ionicons name="person-outline" size={16} color="#1a1612" />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {/* Multilingual Selector Bar */}
        <View className="mb-6">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-2">
            Select Language / भाषा चुनिए
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {LOCALES.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLocale(l)}
                className={`rounded-full px-4 py-2 border ${
                  locale === l ? "bg-ink-900 border-ink-900" : "bg-white border-cream-200"
                }`}
              >
                <Text className={`text-xs ${locale === l ? "text-cream-50 font-semibold" : "text-ink-700"}`}>
                  {LOCALE_LABELS[l]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Hello Greeting */}
        <View className="mb-6">
          <Text className="text-2xl font-light text-ink-900">
            {t("dashboard.hello")}, <Text className="font-semibold">{capitalizedUserName}</Text> 👋
          </Text>
          <Text className="text-xs text-ink-400 mt-1 leading-5">{greetingSubText}</Text>
        </View>

        {/* 3-Column Stats Grid (Web Mirror) */}
        <View className="flex-row gap-3 mb-6">
          {statsItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push("/(tabs)/wallet")}
              className="flex-1 bg-white border border-cream-200 rounded-2xl p-4 active:opacity-90 shadow-sm"
            >
              <View className="flex-row items-center gap-1.5 mb-2">
                {item.icon}
                <Text className="text-[9px] font-semibold text-ink-400 uppercase tracking-wider" numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Text className={`text-3xl font-light ${item.color} leading-none mb-1`}>{item.value}</Text>
              <Text className="text-[9px] text-ink-300 leading-tight" numberOfLines={1}>
                {item.sublabel}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* AI Claim Assistant / Aaria Card (Premium dark gradient matching web) */}
        <Pressable
          onPress={() => router.push("/(tabs)/claims")}
          className="rounded-2xl bg-ink-900 border border-ink-800 p-5 active:opacity-90 shadow-sm mb-6"
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Ionicons name="mic-outline" size={20} color="#f5ede0" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-cream-50">{t("dashboard.claim_cta_title")}</Text>
              <Text className="mt-1 text-[11px] text-cream-400 leading-4">{t("dashboard.claim_cta_sub")}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#ede0cc" />
          </View>
        </Pressable>

        {/* Recent Products list (or Empty state) */}
        {loading ? (
          <ActivityIndicator className="my-10" />
        ) : error ? (
          <Text className="text-sm text-red-600 my-4">{error}</Text>
        ) : products.length === 0 ? (
          <View className="rounded-3xl border border-cream-200 bg-white/60 p-8 items-center gap-4 mt-2">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-cream-100">
              <Ionicons name="wallet-outline" size={24} color="#786e62" />
            </View>
            <Text className="text-sm font-semibold text-ink-900 text-center">
              {t("dashboard.wallet_empty_title")}
            </Text>
            <Text className="text-xs text-ink-400 text-center leading-5 px-4">
              {t("dashboard.wallet_empty_desc")}
            </Text>
            <Pressable
              onPress={() => router.push("/product/add")}
              className="bg-ink-900 rounded-xl px-6 py-3 active:bg-ink-800"
            >
              <Text className="text-xs font-semibold text-cream-50">{t("dashboard.add_first_product")}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
                {t("dashboard.products_heading")}
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/wallet")}>
                <Text className="text-xs text-sand-500 font-medium">{t("common.view_all")} →</Text>
              </Pressable>
            </View>
            <View className="gap-3">
              {products.slice(0, 4).map((item) => {
                const config = getStatusConfig(getWarrantyStatus(item.expiry_date));
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/product/${item.id}`)}
                    className={`rounded-2xl border bg-white p-4 active:opacity-80 ${config.border}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 pr-2 font-semibold text-ink-700" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View className={`h-2 w-2 rounded-full ${config.dot}`} />
                    </View>
                    <Text className="text-xs text-ink-400 mt-0.5">{item.brand}</Text>
                    <Text className={`mt-2 text-[10px] font-medium ${config.text}`}>
                      {formatWarrantyCountdown(item.expiry_date)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
