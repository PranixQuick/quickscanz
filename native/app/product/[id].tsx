import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { getStatusConfig, getWarrantyStatus, formatWarrantyCountdown } from "../../src/lib/calculations";
import type { Product } from "../../src/lib/types";
import { getLocale, type Locale } from "../../src/lib/locale";
import { useAariaSpeech } from "../../src/features/aaria/useAariaSpeech";
import { useI18n } from "../../src/i18n";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View className="border-b border-cream-200 py-3">
      <Text className="text-xs text-ink-300">{label}</Text>
      <Text className="mt-0.5 text-base text-ink-700">{String(value)}</Text>
    </View>
  );
}

function statusPhrase(status: ReturnType<typeof getWarrantyStatus>): string {
  if (status === "expired") return "has expired";
  if (status === "expiring_soon") return "is expiring soon";
  return "is active";
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locale, setLocaleState] = useState<Locale>("en");
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const aaria = useAariaSpeech(locale);

  useEffect(() => {
    getLocale().then(setLocaleState);
  }, []);

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
  const statusLabel =
    status === "active"
      ? t("dashboard.stats_active")
      : status === "expiring_soon"
      ? t("dashboard.stats_expiring")
      : t("dashboard.stats_expired");
  // Same phrasing app/api/aaria-query/route.ts builds server-side for
  // `get_warranty_status` — kept in sync so the spoken answer sounds the
  // same whether it came from the web's closed-loop flow or here.
  const spokenSummary = `Your ${product.brand} ${product.name} warranty ${statusPhrase(status)}. ${formatWarrantyCountdown(
    product.expiry_date,
    t
  )}.`;

  async function handleReadAloud() {
    await aaria.speak(spokenSummary);
  }

  async function handleAsk() {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setAnswer(null);
    const said = await aaria.ask(q, (understood) => {
      // This screen is already scoped to one product, so any
      // warranty-status-shaped question resolves against it directly
      // instead of doing the server-side product-search round trip
      // app/api/aaria-query/route.ts does for ambiguous multi-product asks.
      if (understood.intent === "get_warranty_status") return spokenSummary;
      return `I understood this as "${understood.intent.replace(/_/g, " ")}", but I can only answer warranty-status questions here for now. Try "is my warranty still active?"`;
    });
    setAnswer(said);
  }

  return (
    <ScrollView className="flex-1 bg-cream-100" contentContainerStyle={{ padding: 24, paddingTop: 16 }}>
      <Stack.Screen options={{ title: product.name }} />

      <Text className="text-2xl font-bold text-ink-700">{product.name}</Text>
      <Text className="text-base text-ink-500">{product.brand}</Text>

      <View
        className={`mt-4 flex-row items-center gap-2 self-start rounded-full border px-3 py-1.5 ${config.bg} ${config.border}`}
      >
        <View className={`h-2 w-2 rounded-full ${config.dot}`} />
        <Text className={`text-sm font-medium ${config.text}`}>{statusLabel}</Text>
      </View>
      <Text className="mt-2 text-sm text-ink-500">{formatWarrantyCountdown(product.expiry_date, t)}</Text>

      {/* Aaria voice actions (M3) — language follows the Account screen's
          "Voice assistant language" picker (native/src/lib/locale.ts). */}
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={handleReadAloud}
          disabled={aaria.speaking}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-brand-500 bg-white py-3 active:opacity-80 disabled:opacity-50"
        >
          {aaria.speaking ? <ActivityIndicator size="small" /> : <Text>🔊</Text>}
          <Text className="text-sm font-medium text-brand-600">{t("product.read_aloud") || "Read aloud"}</Text>
        </Pressable>
        <Pressable
          onPress={() => setAsking((v) => !v)}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-cream-300 bg-white py-3 active:opacity-80"
        >
          <Text>🎙️</Text>
          <Text className="text-sm font-medium text-ink-700">{t("product.ask_aaria") || "Ask Aaria"}</Text>
        </Pressable>
      </View>

      {asking && (
        <View className="mt-3 gap-2 rounded-2xl border border-cream-300 bg-white p-3">
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={t("product.ask_placeholder") || "e.g. Is my warranty still active?"}
            placeholderTextColor="#9ca3af"
            className="rounded-xl border border-cream-200 px-3 py-2 text-ink-700"
          />
          <Pressable
            onPress={handleAsk}
            disabled={!question.trim() || aaria.speaking}
            className="items-center rounded-xl bg-ink-700 py-2.5 active:opacity-90 disabled:opacity-40"
          >
            <Text className="font-semibold text-white">{aaria.speaking ? (t("product.asking") || "Asking…") : (t("product.ask_btn") || "Ask")}</Text>
          </Pressable>
        </View>
      )}

      {(answer || aaria.error) && (
        <View className="mt-3 rounded-2xl bg-cream-200 p-3">
          <Text className="text-sm text-ink-700">{aaria.error ? `Aaria error: ${aaria.error}` : answer}</Text>
        </View>
      )}

      <View className="mt-6 rounded-2xl border border-cream-300 bg-white px-4">
        <Row label={t("product.purchase_date") || "Purchase date"} value={product.purchase_date} />
        <Row label={t("product.warranty") || "Warranty"} value={`${product.warranty_months} ${t("product.months") || "months"}`} />
        <Row label={t("product.expires") || "Expires"} value={product.expiry_date} />
        <Row label={t("product.price") || "Price"} value={product.price != null ? `₹${product.price}` : null} />
        <Row label={t("product.category") || "Category"} value={product.category} />
        <Row label={t("product.model_number") || "Model number"} value={product.model_number} />
        <Row label={t("product.serial_number") || "Serial number"} value={product.serial_number} />
        <Row label={t("product.store") || "Store"} value={product.store_name} />
        <Row label={t("product.notes") || "Notes"} value={product.notes} />
      </View>
    </ScrollView>
  );
}
