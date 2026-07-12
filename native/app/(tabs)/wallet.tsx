import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, SectionList, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { getStatusConfig, getWarrantyStatus, formatWarrantyCountdown, sortByExpiry } from "../../src/lib/calculations";
import type { Product, WarrantyStatus } from "../../src/lib/types";

const PRODUCT_COLUMNS =
  "id, user_id, name, brand, purchase_date, warranty_months, expiry_date, price, invoice_url, created_at, category, model_number, serial_number, store_name, notes";

// Most-urgent-first: expiring soon needs attention, active is fine, expired is
// informational/at-the-bottom.
const SECTION_ORDER: { status: WarrantyStatus; title: string }[] = [
  { status: "expiring_soon", title: "Expiring Soon" },
  { status: "active", title: "Active" },
  { status: "expired", title: "Expired" },
];

export default function WalletScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("user_id", user.id)
      .order("expiry_date", { ascending: true });

    if (error) setError(error.message);
    else {
      setError("");
      setProducts((data as Product[] | null) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    return SECTION_ORDER.map(({ status, title }) => ({
      title,
      status,
      data: sortByExpiry(products.filter((p) => getWarrantyStatus(p.expiry_date) === status)),
    })).filter((section) => section.data.length > 0);
  }, [products]);

  return (
    <View className="flex-1 bg-cream-100 px-6 pt-12">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-ink-700">Warranty Wallet</Text>
        <Pressable
          onPress={() => router.push("/product/add")}
          accessibilityLabel="Add product"
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-500 active:opacity-80"
        >
          <Ionicons name="add" size={22} color="white" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : products.length === 0 ? (
        <View className="mt-16 items-center gap-3 px-4">
          <Ionicons name="wallet-outline" size={40} color="#9ca3af" />
          <Text className="text-center text-ink-500">
            No products yet.{"\n"}Scan a bill or add one manually to get started.
          </Text>
          <Pressable
            onPress={() => router.push("/product/add")}
            className="mt-2 rounded-2xl bg-brand-500 px-6 py-3 active:opacity-90"
          >
            <Text className="font-semibold text-white">Add a product</Text>
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
          contentContainerStyle={{ paddingBottom: 24 }}
          renderSectionHeader={({ section }) => (
            <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-300">
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
                  <View className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                </View>
                <Text className="text-sm text-ink-500">{item.brand}</Text>
                <Text className={`mt-1 text-xs ${config.text}`}>{formatWarrantyCountdown(item.expiry_date)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
