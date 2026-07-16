import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/lib/api";
import { useI18n } from "../src/i18n";

interface Recommendation {
  name: string;
  brand: string;
  price: string;
  warrantyMonths: number;
  avgLifespanYears: number;
  whyRecommended: string;
  pros: string[];
  cons: string[];
  whereToCheck: string[];
}

interface AssistantResponse {
  recommendations: Recommendation[];
  summary: string;
  citations: string[];
}

export default function BuyingAssistantScreen() {
  const { t, fontFamily } = useI18n();
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  async function handleSearch() {
    if (!category.trim()) {
      Alert.alert(t("common.error") || "Error", t("buying.error_category") || "Please enter a product category");
      return;
    }
    const numBudget = Number(budget.replace(/\D/g, ""));
    if (!numBudget || numBudget < 1000) {
      Alert.alert(t("common.error") || "Error", t("buying.error_budget") || "Please enter a budget of at least ₹1,000");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/ai/buying-assistant", {
        method: "POST",
        body: JSON.stringify({
          category: category.trim(),
          budget: numBudget,
          preferences: preferences.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const payload = await res.json();
      if (payload.ok && payload.data) {
        setResult(payload.data);
      } else {
        throw new Error("Invalid response payload");
      }
    } catch (err) {
      Alert.alert(
        t("common.error") || "Error",
        t("buying.error_failed") || "Failed to retrieve grounded recommendations. Please try again later."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-cream-50 px-6 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={{ fontFamily: fontFamily(true) }} className="text-xl font-bold text-ink-900 mb-2">
        {t("explore.buying_assistant")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.buying_assistant_desc")}
      </Text>

      {/* Input Form */}
      <View className="bg-white border border-cream-200 rounded-3xl p-5 mb-6 shadow-sm space-y-4">
        <View>
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase mb-1.5">
            {t("buying.category_label") || "Product Category"}
          </Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder={t("buying.category_placeholder") || "e.g. Smartphone, Washing Machine"}
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3 text-ink-900 text-sm"
          />
        </View>

        <View>
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase mb-1.5">
            {t("buying.budget_label") || "Budget (INR)"}
          </Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            placeholder="e.g. 30000"
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3 text-ink-900 text-sm"
          />
        </View>

        <View>
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase mb-1.5">
            {t("buying.preferences_label") || "Preferences / Needs"}
          </Text>
          <TextInput
            value={preferences}
            onChangeText={setPreferences}
            multiline
            numberOfLines={3}
            placeholder={t("buying.preferences_placeholder") || "e.g. Good camera, battery must last 2 days, clean OS"}
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3 text-ink-900 text-sm min-h-[80px]"
          />
        </View>

        <Pressable
          onPress={handleSearch}
          disabled={loading}
          className="w-full bg-ink-900 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 active:bg-ink-800 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="#fdfcf8" size="small" />
          ) : (
            <>
              <Ionicons name="search" size={16} color="#fdfcf8" />
              <Text style={{ fontFamily: fontFamily(true) }} className="font-semibold text-cream-50 text-sm">
                {t("buying.search_button") || "Find Best Options"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Results */}
      {result && (
        <View className="space-y-6">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-1">
            {t("buying.recommendations_title") || "Grounded Recommendations"}
          </Text>

          {result.recommendations.map((rec, idx) => (
            <View key={idx} className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase">
                      {idx === 0 ? "Best Value" : idx === 1 ? "Runner Up" : "Alternative"}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-ink-900 mt-1">
                    {rec.name}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mt-0.5">
                    {rec.brand}
                  </Text>
                </View>
                <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-emerald-700">
                  {rec.price}
                </Text>
              </View>

              <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 leading-5 mb-4">
                {rec.whyRecommended}
              </Text>

              {/* Pros & Cons */}
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-emerald-700 uppercase mb-1.5">
                    ✅ Pros
                  </Text>
                  {rec.pros.map((pro, i) => (
                    <Text key={i} style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-800 leading-4 mb-1">
                      • {pro}
                    </Text>
                  ))}
                </View>
                <View className="flex-1">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-red-700 uppercase mb-1.5">
                    ❌ Cons
                  </Text>
                  {rec.cons.map((con, i) => (
                    <Text key={i} style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-800 leading-4 mb-1">
                      • {con}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Shop Links */}
              <View className="flex-row gap-3 pt-3 border-t border-cream-100">
                {rec.whereToCheck.map((url, j) => {
                  const isAmazon = url.includes("amazon");
                  return (
                    <Pressable
                      key={j}
                      onPress={() => Linking.openURL(url)}
                      className="flex-1 bg-cream-50 py-2.5 rounded-xl border border-cream-200 items-center justify-center flex-row gap-1 active:bg-cream-100"
                    >
                      <Ionicons name="cart-outline" size={14} color="#1a1612" />
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-900">
                        {isAmazon ? "Buy on Amazon" : "Buy on Flipkart"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Citations and Grounding Info */}
          <View className="bg-cream-100 border border-cream-200 rounded-3xl p-5">
            <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800 mb-2">
              Google Grounded Analysis
            </Text>
            <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-800 leading-5 mb-4">
              {result.summary}
            </Text>
            {result.citations.length > 0 && (
              <View>
                <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase mb-1.5">
                  Sources & Citations
                </Text>
                {result.citations.map((cite, i) => (
                  <Text key={i} style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 mb-1 leading-4">
                    [{i + 1}] {cite}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
