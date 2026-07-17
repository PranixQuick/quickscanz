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
  const [step, setStep] = useState(1); // 1: Category, 2: Budget, 3: Preferences/Search, 4: Results
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  const categories = ["Smartphone", "Laptop", "Washing Machine", "Air Conditioner", "Television"];

  async function handleSearch() {
    const numBudget = Number(budget.replace(/\D/g, ""));
    if (!category.trim()) {
      Alert.alert(t("common.error") || "Error", t("buying.error_category") || "Please select a category");
      return;
    }
    if (!numBudget || numBudget < 1000) {
      Alert.alert(t("common.error") || "Error", t("buying.error_budget") || "Please enter a budget of at least ₹1,000");
      return;
    }

    setLoading(true);
    setStep(4);
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
      setStep(3);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setCategory("");
    setBudget("");
    setPreferences("");
    setResult(null);
    setStep(1);
  }

  return (
    <ScrollView className="flex-1 bg-cream-50 px-6 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={{ fontFamily: fontFamily(true) }} className="text-xl font-bold text-ink-900 mb-2">
        {t("explore.buying_assistant")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.buying_assistant_desc")}
      </Text>

      {/* Chat Conversation History */}
      <View className="space-y-4 mb-6">
        {/* Step 1: Assistant introduction */}
        <View className="flex-row items-start gap-2.5 max-w-[85%]">
          <View className="h-7 w-7 rounded-full bg-ink-900 items-center justify-center">
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fdfcf8" />
          </View>
          <View className="bg-white border border-cream-200 rounded-3xl rounded-tl-none p-3.5 shadow-sm">
            <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-800 leading-5">
              👋 Hi! I'm your AI Buying Assistant. Let's find your next purchase. What category are you looking for?
            </Text>
          </View>
        </View>

        {/* User Category Response */}
        {step > 1 && (
          <View className="flex-row justify-end">
            <View className="bg-ink-900 rounded-3xl rounded-tr-none px-4 py-3 max-w-[80%]">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-xs text-cream-50 font-bold">
                {category}
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Assistant budget prompt */}
        {step >= 2 && (
          <View className="flex-row items-start gap-2.5 max-w-[85%] mt-3">
            <View className="h-7 w-7 rounded-full bg-ink-900 items-center justify-center">
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fdfcf8" />
            </View>
            <View className="bg-white border border-cream-200 rounded-3xl rounded-tl-none p-3.5 shadow-sm">
              <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-800 leading-5">
                Got it, {category}! What is your budget limit in INR (₹)?
              </Text>
            </View>
          </View>
        )}

        {/* User Budget Response */}
        {step > 2 && (
          <View className="flex-row justify-end">
            <View className="bg-ink-900 rounded-3xl rounded-tr-none px-4 py-3 max-w-[80%]">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-xs text-cream-50 font-bold">
                ₹{Number(budget).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Assistant preferences prompt */}
        {step >= 3 && (
          <View className="flex-row items-start gap-2.5 max-w-[85%] mt-3">
            <View className="h-7 w-7 rounded-full bg-ink-900 items-center justify-center">
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fdfcf8" />
            </View>
            <View className="bg-white border border-cream-200 rounded-3xl rounded-tl-none p-3.5 shadow-sm">
              <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-800 leading-5">
                Excellent. Any specific preferences? (e.g., brand, features, warranty specs)
              </Text>
            </View>
          </View>
        )}

        {/* User Preferences Response */}
        {step > 3 && preferences.trim().length > 0 && (
          <View className="flex-row justify-end">
            <View className="bg-ink-900 rounded-3xl rounded-tr-none px-4 py-3 max-w-[80%]">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-xs text-cream-50 font-bold">
                {preferences}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Active Form Inputs */}
      {step === 1 && (
        <View className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm space-y-4">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">
            {t("buying.category_label") || "Product Category"}
          </Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder={t("buying.category_placeholder") || "e.g. Smartphone, Laptop"}
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3.5 text-ink-900 text-sm"
          />

          {/* Quick Mapped Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2.5 pt-1">
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  category === cat ? "bg-ink-900 border-ink-900" : "bg-white border-cream-200"
                }`}
              >
                <Text
                  style={{ fontFamily: fontFamily(true) }}
                  className={`text-[10px] font-bold ${category === cat ? "text-cream-50" : "text-ink-500"}`}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={() => category.trim() && setStep(2)}
            className="w-full bg-ink-900 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 active:bg-ink-800 disabled:opacity-50 mt-2"
            disabled={!category.trim()}
          >
            <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-cream-50 text-xs uppercase tracking-wider">
              {t("common.next") || "Next Step"}
            </Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm space-y-4">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">
            {t("buying.budget_label") || "Budget (INR)"}
          </Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            placeholder="e.g. 30000"
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3.5 text-ink-900 text-sm"
          />
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={() => setStep(1)}
              className="flex-1 border border-cream-200 py-3.5 rounded-2xl items-center justify-center"
            >
              <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-ink-500 text-xs">
                {t("common.back") || "Back"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => budget.trim() && setStep(3)}
              className="flex-1 bg-ink-900 py-3.5 rounded-2xl items-center justify-center active:bg-ink-800 disabled:opacity-50"
              disabled={!budget.trim()}
            >
              <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-cream-50 text-xs uppercase tracking-wider">
                {t("common.next") || "Next Step"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 3 && (
        <View className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm space-y-4">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">
            {t("buying.preferences_label") || "Preferences / Needs"}
          </Text>
          <TextInput
            value={preferences}
            onChangeText={setPreferences}
            multiline
            numberOfLines={3}
            placeholder={t("buying.preferences_placeholder") || "e.g. Good camera, energy efficient"}
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3.5 text-ink-900 text-sm min-h-[80px]"
          />
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={() => setStep(2)}
              className="flex-1 border border-cream-200 py-3.5 rounded-2xl items-center justify-center"
            >
              <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-ink-500 text-xs">
                {t("common.back") || "Back"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSearch}
              className="flex-1 bg-ink-900 py-3.5 rounded-2xl items-center justify-center active:bg-ink-800"
            >
              <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-cream-50 text-xs uppercase tracking-wider">
                {t("buying.search_button") || "Find Options"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Loading State */}
      {step === 4 && loading && (
        <View className="bg-white border border-cream-200 rounded-3xl p-8 items-center justify-center shadow-sm">
          <ActivityIndicator color="#1a1612" size="large" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-700 mt-4 tracking-wider uppercase">
            Consulting Grounded Search...
          </Text>
        </View>
      )}

      {/* Results */}
      {step === 4 && !loading && result && (
        <View className="space-y-6">
          <View className="flex-row justify-between items-center px-1">
            <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase tracking-wide">
              {t("buying.recommendations_title") || "Grounded Recommendations"}
            </Text>
            <Pressable onPress={resetChat} className="bg-cream-100 border border-cream-200 px-3 py-1 rounded-full active:opacity-90">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-[9px] font-bold text-ink-700 uppercase">
                Reset Chat
              </Text>
            </Pressable>
          </View>

          {result.recommendations.map((rec, idx) => (
            <View key={idx} className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <View className="flex-row">
                    <Text className="text-[9px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase">
                      {idx === 0 ? "Best Value" : idx === 1 ? "Runner Up" : "Alternative"}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-ink-900 mt-1.5">
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

              <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-500 leading-5 mb-4">
                {rec.whyRecommended}
              </Text>

              {/* Pros & Cons */}
              <View className="flex-row gap-4 mb-4 pt-3 border-t border-cream-100">
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

