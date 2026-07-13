import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, SectionList, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { getStatusConfig, getWarrantyStatus, formatWarrantyCountdown, sortByExpiry } from "../../src/lib/calculations";
import { useI18n } from "../../src/i18n";
import type { Product, WarrantyStatus } from "../../src/lib/types";

const PRODUCT_COLUMNS =
  "id, user_id, name, brand, purchase_date, warranty_months, expiry_date, price, invoice_url, created_at, category, model_number, serial_number, store_name, notes";

const SECTION_ORDER: { status: WarrantyStatus; key: string; defaultTitle: string }[] = [
  { status: "expiring_soon", key: "dashboard.stats_expiring", defaultTitle: "Expiring Soon" },
  { status: "active", key: "dashboard.stats_active", defaultTitle: "Active" },
  { status: "expired", key: "product.status_expired", defaultTitle: "Expired" },
];

export default function WalletScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("user_id", user.id)
        .order("expiry_date", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setError("");
        setProducts((data as Product[] | null) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products list.");
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

  const sections = useMemo(() => {
    return SECTION_ORDER.map(({ status, key, defaultTitle }) => {
      const translatedTitle = t(key);
      const title = translatedTitle === key ? defaultTitle : translatedTitle;
      return {
        title,
        status,
        data: sortByExpiry(products.filter((p) => getWarrantyStatus(p.expiry_date) === status)),
      };
    }).filter((section) => section.data.length > 0);
  }, [products, t]);

  const walletTitle = useMemo(() => {
    const val = t("nav.wallet");
    return val === "nav.wallet" ? "Warranty Wallet" : val;
  }, [t]);

  const emptyTitle = useMemo(() => {
    const val = t("dashboard.wallet_empty_title");
    return val === "dashboard.wallet_empty_title" ? "Your warranty wallet is empty" : val;
  }, [t]);

  const emptyDesc = useMemo(() => {
    const val = t("dashboard.wallet_empty_desc");
    return val === "dashboard.wallet_empty_desc"
      ? "Add a product to track its warranty and store the invoice."
      : val;
  }, [t]);

  const addButtonText = useMemo(() => {
    const val = t("dashboard.add_first_product");
    return val === "dashboard.add_first_product" ? "Add a product" : val;
  }, [t]);

  return (
    <View className="flex-1 bg-cream-50 px-6 pt-16">
      {/* Header section */}
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-ink-900 tracking-tight">{walletTitle}</Text>
        <Pressable
          onPress={() => router.push("/product/add")}
          accessibilityLabel="Add product"
          className="h-10 w-10 items-center justify-center rounded-full bg-ink-900 active:bg-ink-800"
        >
          <Ionicons name="add" size={22} color="#fdfcf8" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator className="my-10" />
      ) : error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : products.length === 0 ? (
        <View className="rounded-3xl border border-cream-200 bg-white/60 p-8 items-center gap-4 mt-10">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-cream-100">
            <Ionicons name="wallet-outline" size={24} color="#786e62" />
          </View>
          <Text className="text-sm font-semibold text-ink-900 text-center">
            {emptyTitle}
          </Text>
          <Text className="text-xs text-ink-400 text-center leading-5 px-4">
            {emptyDesc}
          </Text>
          <Pressable
            onPress={() => router.push("/product/add")}
            className="bg-ink-900 rounded-xl px-6 py-3 active:bg-ink-800"
          >
            <Text className="text-xs font-semibold text-cream-50">{addButtonText}</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderSectionHeader={({ section }) => (
            <Text className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wide text-ink-300">
              {section.title} ({section.data.length})
            </Text>
          )}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const config = getStatusConfig(getWarrantyStatus(item.expiry_date));
            return (
              <Pressable
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
                  {formatWarrantyCountdown(item.expiry_date, t)}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
