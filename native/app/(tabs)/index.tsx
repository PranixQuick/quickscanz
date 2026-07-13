import { useCallback, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { countByStatus, type StatusCounts } from "../../src/lib/calculations";
import { useI18n, useT, LOCALES, LOCALE_LABELS } from "../../src/i18n";

const EMPTY_COUNTS: StatusCounts = { active: 0, expiring_soon: 0, expired: 0, total: 0 };

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [counts, setCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("expiry_date").eq("user_id", user.id);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setError("");
      setCounts(countByStatus((data as { expiry_date: string }[] | null) ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product statistics.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cards = useMemo(
    () => [
      { label: t("status.active"), value: counts.active, color: "text-green-600" },
      { label: t("status.expiring_soon"), value: counts.expiring_soon, color: "text-amber-600" },
      { label: t("status.expired"), value: counts.expired, color: "text-red-600" },
    ],
    [counts, t]
  );

  return (
    <ScrollView className="flex-1 bg-cream-100 px-6 pt-12">
      {/* Multilingual Selector Bar */}
      <View className="mb-4">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-1.5">
          Select Language / भाषा चुनिए
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {LOCALES.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLocale(l)}
              className={`rounded-full px-4 py-2 border ${
                locale === l ? "bg-brand-500 border-brand-500" : "bg-white border-cream-300"
              }`}
            >
              <Text className={`text-xs ${locale === l ? "text-white font-semibold" : "text-ink-700"}`}>
                {LOCALE_LABELS[l]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Welcome Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-ink-700">
          {t("dashboard.hello")}, {user?.email?.split("@")[0] ?? "Guest"} 👋
        </Text>
        <Text className="text-xs text-ink-400 mt-1">
          {counts.total} {t("dashboard.products_tracked")}
        </Text>
      </View>

      {/* Products Tracked Card */}
      <View className="rounded-2xl border border-cream-300 bg-white p-6 mb-4">
        <Text className="text-sm text-ink-500 font-medium">
          {t("dashboard.products_heading")}
        </Text>
        {loading ? (
          <ActivityIndicator className="mt-2 align-self-start" />
        ) : error ? (
          <Text className="mt-2 text-sm text-red-600">{error}</Text>
        ) : (
          <Text className="mt-2 text-4xl font-bold text-brand-600">{counts.total}</Text>
        )}
      </View>

      {/* Status Stats Grid */}
      {!loading && !error && (
        <View className="flex-row gap-3 mb-6">
          {cards.map((c) => (
            <View key={c.label} className="flex-1 rounded-2xl border border-cream-300 bg-white p-4">
              <Text className={`text-2xl font-bold ${c.color}`}>{c.value}</Text>
              <Text className="mt-1 text-[11px] text-ink-500" numberOfLines={1}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Live Aaria Voice Assistant / Claim AI Banner Card */}
      <Pressable
        onPress={() => router.push("/(tabs)/claims")}
        className="rounded-2xl bg-gradient-to-r from-emerald-950 to-emerald-900 border border-emerald-800 p-5 active:opacity-90 shadow-sm mb-12"
      >
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Text className="text-2xl">🎙️</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white">
              {t("dashboard.claim_cta_title")}
            </Text>
            <Text className="mt-1 text-xs text-cream-400 leading-4">
              {t("dashboard.claim_cta_sub")}
            </Text>
          </View>
        </View>
      </Pressable>
    </ScrollView>
  );
}
