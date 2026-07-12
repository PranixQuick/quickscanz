import { useCallback, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { countByStatus, type StatusCounts } from "../../src/lib/calculations";

const EMPTY_COUNTS: StatusCounts = { active: 0, expiring_soon: 0, expired: 0, total: 0 };

export default function HomeScreen() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("products").select("expiry_date").eq("user_id", user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setError("");
    setCounts(countByStatus((data as { expiry_date: string }[] | null) ?? []));
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cards = useMemo(
    () => [
      { label: "Active", value: counts.active, color: "text-green-600" },
      { label: "Expiring Soon", value: counts.expiring_soon, color: "text-amber-600" },
      { label: "Expired", value: counts.expired, color: "text-red-600" },
    ],
    [counts]
  );

  return (
    <View className="flex-1 gap-6 bg-cream-100 px-6 py-12">
      <View>
        <Text className="text-sm text-ink-500">Welcome back</Text>
        <Text className="text-2xl font-bold text-ink-700">{user?.email ?? "Guest"}</Text>
      </View>

      <View className="rounded-2xl border border-cream-300 bg-white p-6">
        <Text className="text-sm text-ink-500">Products tracked</Text>
        {loading ? (
          <ActivityIndicator className="mt-2" />
        ) : error ? (
          <Text className="mt-2 text-sm text-red-600">{error}</Text>
        ) : (
          <Text className="mt-2 text-4xl font-bold text-brand-600">{counts.total}</Text>
        )}
      </View>

      {!loading && !error && (
        <View className="flex-row gap-3">
          {cards.map((c) => (
            <View key={c.label} className="flex-1 rounded-2xl border border-cream-300 bg-white p-4">
              <Text className={`text-2xl font-bold ${c.color}`}>{c.value}</Text>
              <Text className="mt-1 text-xs text-ink-500">{c.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
