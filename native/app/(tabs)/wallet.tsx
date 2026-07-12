import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  expiry_date: string;
};

export default function WalletScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("products")
      .select("id, name, brand, expiry_date")
      .eq("user_id", user.id)
      .order("expiry_date", { ascending: true })
      .limit(50);

    setProducts((data as ProductRow[] | null) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View className="flex-1 bg-cream-100 px-6 pt-12">
      <Text className="mb-4 text-2xl font-bold text-ink-700">Warranty Wallet</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={products}
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
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <Text className="text-ink-500">No products yet. Scan a bill to add one.</Text>
          }
          renderItem={({ item }) => (
            <View className="rounded-2xl border border-cream-300 bg-white p-4">
              <Text className="font-semibold text-ink-700">{item.name}</Text>
              <Text className="text-sm text-ink-500">{item.brand}</Text>
              <Text className="mt-1 text-xs text-ink-300">Warranty until {item.expiry_date}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
