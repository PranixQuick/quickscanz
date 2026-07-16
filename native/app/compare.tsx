import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";
import { estimateResaleValue } from "../src/lib/calculations";

interface ComparisonItem {
  id: string;
  name: string;
  brand: string;
  category: string | null;
  purchase_date: string;
  price: number | null;
  warranty_months: number;
  avg_lifespan_years: number | null;
  cost_per_day: number | null;
  days_owned: number;
  warranty_status: "active" | "expiring_soon" | "expired";
}

export default function CompareScreen() {
  const { user } = useAuth();
  const { t, fontFamily } = useI18n();
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("product_lifecycle")
          .select("id, name, brand, category, purchase_date, price, warranty_months, avg_lifespan_years, cost_per_day, days_owned, warranty_status")
          .eq("user_id", user.id)
          .eq("is_demo", false);
        if (!error && data) {
          setItems(data as ComparisonItem[]);
          // Pre-select first two if available
          if (data.length >= 2) {
            setSelectedIds([data[0].id, data[1].id]);
          } else if (data.length === 1) {
            setSelectedIds([data[0].id]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        Alert.alert(t("compare.limit_reached") || "Comparison Limit", t("compare.limit_desc") || "You can compare up to 3 products at a time.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedIds.includes(i.id));
  }, [items, selectedIds]);

  const comparison = useMemo(() => {
    if (selectedItems.length < 2) return null;
    const withCost = selectedItems.filter((i) => i.cost_per_day !== null && i.cost_per_day > 0);
    const bestValue = withCost.length > 0
      ? withCost.reduce((a, b) => (a.cost_per_day! < b.cost_per_day! ? a : b)).id
      : null;

    const longestWarranty = selectedItems.reduce((a, b) =>
      a.warranty_months > b.warranty_months ? a : b
    ).id;

    const withLifespan = selectedItems.filter((i) => i.avg_lifespan_years !== null);
    const bestLifespan = withLifespan.length > 0
      ? withLifespan.reduce((a, b) =>
          ((a.avg_lifespan_years || 0) > (b.avg_lifespan_years || 0) ? a : b)
        ).id
      : null;

    const insights: string[] = [];
    if (bestValue) {
      const b = selectedItems.find((i) => i.id === bestValue)!;
      insights.push(`💰 ${b.brand} ${b.name} has the best value at ₹${b.cost_per_day?.toFixed(2)}/day`);
    }
    if (longestWarranty) {
      const b = selectedItems.find((i) => i.id === longestWarranty)!;
      insights.push(`🛡️ ${b.brand} ${b.name} has the longest warranty (${b.warranty_months} months)`);
    }
    if (bestLifespan) {
      const b = selectedItems.find((i) => i.id === bestLifespan)!;
      insights.push(`⏳ ${b.brand} ${b.name} has the longest expected lifespan (~${b.avg_lifespan_years} years)`);
    }

    return { bestValue, longestWarranty, bestLifespan, insights };
  }, [selectedItems]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#1a1612" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream-50 px-6 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={{ fontFamily: fontFamily(true) }} className="text-xl font-bold text-ink-900 mb-2">
        {t("explore.compare")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.compare_desc")}
      </Text>

      {/* Product selection list */}
      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
        {t("compare.select_label") || "Select products to compare (2 or 3)"}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 mb-6">
        {items.map((i) => {
          const isSelected = selectedIds.includes(i.id);
          return (
            <Pressable
              key={i.id}
              onPress={() => toggleSelect(i.id)}
              className={`px-4 py-3 rounded-2xl border ${
                isSelected ? "bg-ink-900 border-ink-900" : "bg-white border-cream-200"
              }`}
            >
              <Text
                style={{ fontFamily: fontFamily(true) }}
                className={`text-xs font-bold ${isSelected ? "text-cream-50" : "text-ink-900"}`}
              >
                {i.name}
              </Text>
              <Text
                style={{ fontFamily: fontFamily(false) }}
                className={`text-[10px] mt-0.5 ${isSelected ? "text-cream-200" : "text-ink-400"}`}
              >
                {i.brand}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedItems.length < 2 ? (
        <View className="bg-white border border-cream-200 rounded-3xl p-8 items-center justify-center">
          <Ionicons name="git-compare-outline" size={32} color="#9ca3af" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800 mt-3 text-center">
            {t("compare.select_more") || "Select at least 2 products to display side-by-side comparison"}
          </Text>
        </View>
      ) : (
        <View>
          {/* Comparison Cards Grid */}
          <View className="flex-row gap-4 mb-6">
            {selectedItems.map((item) => {
              const resale = estimateResaleValue({
                purchaseDate: item.purchase_date,
                originalPrice: item.price,
                category: item.category,
                conditionRating: 4, // Default Good/Very Good
                warrantyStatus: item.warranty_status,
              });

              return (
                <View key={item.id} className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 shadow-sm">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900 truncate">
                    {item.name}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 mb-4">
                    {item.brand}
                  </Text>

                  {/* Stats list */}
                  <View className="space-y-3">
                    <View>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                        {t("product.price") || "Price"}
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800">
                        {item.price ? `₹${item.price.toLocaleString("en-IN")}` : "—"}
                      </Text>
                    </View>

                    <View>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                        {t("product.warranty") || "Warranty"}
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800">
                        {`${item.warranty_months} months`}
                      </Text>
                    </View>

                    <View>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                        {t("compare.cost_per_day") || "Cost/Day"}
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-900">
                        {item.cost_per_day ? `₹${item.cost_per_day.toFixed(2)}/day` : "—"}
                      </Text>
                    </View>

                    <View>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                        {t("compare.resale") || "Est. Resale"}
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-emerald-700">
                        {resale.estimatedValueInr ? `₹${resale.estimatedValueInr.toLocaleString("en-IN")}` : "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Insights Box */}
          {comparison && comparison.insights.length > 0 && (
            <View className="bg-cream-100 border border-cream-200 rounded-3xl p-5 mb-6">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800 mb-3">
                📊 {t("compare.insights_title") || "Comparison Insights"}
              </Text>
              <View className="space-y-2">
                {comparison.insights.map((insight, idx) => (
                  <Text key={idx} style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-800 leading-5">
                    {insight}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
