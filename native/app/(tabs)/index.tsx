import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function HomeScreen() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      if (!user) {
        setLoading(false);
        return;
      }
      const { count: total, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!mounted) return;
      if (error) setError(error.message);
      else setCount(total ?? 0);
      setLoading(false);
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, [user]);

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
          <Text className="mt-2 text-4xl font-bold text-brand-600">{count}</Text>
        )}
      </View>

      <Text className="text-xs text-ink-300">
        M2 will replace this placeholder with the full Warranty Wallet dashboard (active,
        expiring soon, expired) — same logic as the web dashboard.
      </Text>
    </View>
  );
}
