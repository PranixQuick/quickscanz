import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { getStatusConfig, getWarrantyStatus, formatWarrantyCountdown } from "../../src/lib/calculations";
import type { Product } from "../../src/lib/types";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View className="border-b border-cream-200 py-3">
      <Text className="text-xs text-ink-300">{label}</Text>
      <Text className="mt-0.5 text-base text-ink-700">{String(value)}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error) setError(error.message);
    else {
      setError("");
      setProduct(data as Product);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100 px-8">
        <Text className="text-center text-ink-500">{error || "Product not found."}</Text>
      </View>
    );
  }

  const status = getWarrantyStatus(product.expiry_date);
  const config = getStatusConfig(status);

  return (
    <ScrollView className="flex-1 bg-cream-100" contentContainerStyle={{ padding: 24, paddingTop: 56 }}>
      <Stack.Screen options={{ title: product.name, headerShown: true }} />
      <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center">
        <Text className="text-brand-600">← Back</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-ink-700">{product.name}</Text>
      <Text className="text-base text-ink-500">{product.brand}</Text>

      <View
        className={`mt-4 flex-row items-center gap-2 self-start rounded-full border px-3 py-1.5 ${config.bg} ${config.border}`}
      >
        <View className={`h-2 w-2 rounded-full ${config.dot}`} />
        <Text className={`text-sm font-medium ${config.text}`}>{config.label}</Text>
      </View>
      <Text className="mt-2 text-sm text-ink-500">{formatWarrantyCountdown(product.expiry_date)}</Text>

      <View className="mt-6 rounded-2xl border border-cream-300 bg-white px-4">
        <Row label="Purchase date" value={product.purchase_date} />
        <Row label="Warranty" value={`${product.warranty_months} months`} />
        <Row label="Expires" value={product.expiry_date} />
        <Row label="Price" value={product.price != null ? `₹${product.price}` : null} />
        <Row label="Category" value={product.category} />
        <Row label="Model number" value={product.model_number} />
        <Row label="Serial number" value={product.serial_number} />
        <Row label="Store" value={product.store_name} />
        <Row label="Notes" value={product.notes} />
      </View>
    </ScrollView>
  );
}
