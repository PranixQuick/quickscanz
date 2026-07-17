import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const { t, fontFamily } = useI18n();
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [researchedItems, setResearchedItems] = useState<ComparisonItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formWarranty, setFormWarranty] = useState("");
  const [formCategory, setFormCategory] = useState("");

  useEffect(() => {
    async function loadProducts() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id);

        if (!error && data) {
          const now = new Date();
          const parsed: ComparisonItem[] = data.map((p) => {
            const pDate = new Date(p.purchase_date);
            const days = Math.max(1, Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
            const cost = p.price ? Number((p.price / days).toFixed(2)) : null;

            const cat = (p.category || "").toLowerCase();
            let lifespan = 5;
            if (cat.includes("phone")) lifespan = 3;
            else if (cat.includes("laptop")) lifespan = 4;
            else if (cat.includes("tv") || cat.includes("television")) lifespan = 7;
            else if (cat.includes("washing") || cat.includes("ac") || cat.includes("fridge")) lifespan = 10;

            const expDate = new Date(p.expiry_date);
            let status: ComparisonItem["warranty_status"] = "active";
            if (now > expDate) {
              status = "expired";
            } else {
              const diffMs = expDate.getTime() - now.getTime();
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              if (diffDays <= 30) {
                status = "expiring_soon";
              }
            }

            return {
              id: p.id,
              name: p.name,
              brand: p.brand,
              category: p.category,
              purchase_date: p.purchase_date,
              price: p.price,
              warranty_months: p.warranty_months,
              avg_lifespan_years: lifespan,
              cost_per_day: cost,
              days_owned: days,
              warranty_status: status,
            };
          });
          setItems(parsed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [user]);

  const allItems = useMemo(() => {
    return [...items, ...researchedItems];
  }, [items, researchedItems]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        Alert.alert("Limit Reached", "You can compare up to 3 products at a time.");
        return prev;
      }
      return [...prev, id];
    });
  }

  const selectedItems = useMemo(() => {
    return allItems.filter((i) => selectedIds.includes(i.id));
  }, [allItems, selectedIds]);

  const comparison = useMemo(() => {
    if (selectedItems.length < 2) return null;

    let bestValue: string | null = null;
    let lowestCost = Infinity;

    let longestWarranty: string | null = null;
    let maxWarranty = 0;

    let bestLifespan: string | null = null;
    let maxLifespan = 0;

    selectedItems.forEach((item) => {
      if (item.cost_per_day !== null && item.cost_per_day < lowestCost) {
        lowestCost = item.cost_per_day;
        bestValue = item.id;
      }
      if (item.warranty_months > maxWarranty) {
        maxWarranty = item.warranty_months;
        longestWarranty = item.id;
      }
      if (item.avg_lifespan_years !== null && item.avg_lifespan_years > maxLifespan) {
        maxLifespan = item.avg_lifespan_years;
        bestLifespan = item.id;
      }
    });

    const insights: string[] = [];
    if (bestValue) {
      const b = selectedItems.find((i) => i.id === bestValue)!;
      insights.push(`💎 ${b.brand} ${b.name} offers the best utility cost value at ₹${lowestCost}/day.`);
    }
    if (longestWarranty) {
      const b = selectedItems.find((i) => i.id === longestWarranty)!;
      insights.push(`🛡️ ${b.brand} ${b.name} provides the longest warranty coverage duration (${maxWarranty} months).`);
    }
    if (bestLifespan) {
      const b = selectedItems.find((i) => i.id === bestLifespan)!;
      insights.push(`⏳ ${b.brand} ${b.name} has the longest expected lifespan (~${b.avg_lifespan_years} years).`);
    }

    return { bestValue, longestWarranty, bestLifespan, insights };
  }, [selectedItems]);

  function handleAddResearchedProduct() {
    if (!formName || !formBrand || !formPrice || !formWarranty || !formCategory) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    const parsedPrice = parseFloat(formPrice);
    const parsedWarranty = parseInt(formWarranty);
    if (isNaN(parsedPrice) || isNaN(parsedWarranty)) {
      Alert.alert("Error", "Price and Warranty must be valid numbers.");
      return;
    }

    const catLower = formCategory.toLowerCase();
    let lifespan = 5;
    if (catLower.includes("phone")) lifespan = 3;
    else if (catLower.includes("laptop")) lifespan = 4;
    else if (catLower.includes("tv") || catLower.includes("television")) lifespan = 7;
    else if (catLower.includes("washing") || catLower.includes("ac") || catLower.includes("fridge")) lifespan = 10;

    const newItem: ComparisonItem = {
      id: `researched_${Date.now()}`,
      name: formName,
      brand: formBrand,
      category: formCategory,
      purchase_date: new Date().toISOString().split("T")[0],
      price: parsedPrice,
      warranty_months: parsedWarranty,
      avg_lifespan_years: lifespan,
      cost_per_day: Number((parsedPrice / 1).toFixed(2)),
      days_owned: 1,
      warranty_status: "active",
    };

    setResearchedItems((prev) => [...prev, newItem]);
    setSelectedIds((prev) => {
      if (prev.length >= 3) {
        Alert.alert("Auto-selected", "Replaced one selection to show the newly added researched product.");
        return [prev[0], prev[1], newItem.id];
      }
      return [...prev, newItem.id];
    });

    // Reset Form
    setFormName("");
    setFormBrand("");
    setFormPrice("");
    setFormWarranty("");
    setFormCategory("");
    setModalVisible(false);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#1a1612" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream-50 px-6 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="flex-row justify-between items-center mb-2">
        <Text style={{ fontFamily: fontFamily(true) }} className="text-xl font-bold text-ink-900">
          {t("explore.compare")}
        </Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          className="flex-row items-center gap-1.5 px-3 py-2 bg-brand-500 rounded-xl active:bg-brand-600"
        >
          <Ionicons name="add" size={14} color="#fdfcf8" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-white uppercase tracking-wider">
            Research Product
          </Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.compare_desc")}
      </Text>

      {allItems.length === 0 ? (
        <View className="bg-white border border-cream-200 rounded-3xl p-6 items-center justify-center shadow-sm">
          <Ionicons name="git-compare-outline" size={32} color="#9ca3af" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800 mt-3 text-center">
            {t("compare.no_products") || "No products available to compare."}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/scan")}
            className="mt-4 px-5 py-2.5 bg-ink-900 rounded-xl active:bg-ink-800 flex-row items-center gap-1.5"
          >
            <Ionicons name="add" size={16} color="#fdfcf8" />
            <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-cream-50 uppercase tracking-wider">
              {t("app.add_product") || "Add Product"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
            {t("compare.select_label") || "Select products to compare (2 or 3)"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 mb-6">
            {allItems.map((i) => {
              const isSelected = selectedIds.includes(i.id);
              const isResearched = i.id.startsWith("researched_");
              return (
                <Pressable
                  key={i.id}
                  onPress={() => toggleSelect(i.id)}
                  className={`px-4 py-3 rounded-2xl border ${
                    isSelected ? "bg-ink-900 border-ink-900" : "bg-white border-cream-200"
                  } mr-2`}
                >
                  <Text
                    style={{ fontFamily: fontFamily(true) }}
                    className={`text-xs font-bold ${isSelected ? "text-cream-50" : "text-ink-900"}`}
                  >
                    {i.name} {isResearched && "🔍"}
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
              <View className="flex-row gap-4 mb-6">
                {selectedItems.map((item) => {
                  const resale = estimateResaleValue({
                    purchaseDate: item.purchase_date,
                    originalPrice: item.price,
                    category: item.category,
                    conditionRating: 4,
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

                      <View className="gap-3">
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
                            {item.warranty_months}m
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                            {t("lifecycle.resale_est") || "Est. Resale"}
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

              {comparison && comparison.insights.length > 0 && (
                <View className="bg-cream-100 border border-cream-200 rounded-3xl p-5 mb-6">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800 mb-3">
                    📊 {t("compare.insights_title") || "Comparison Insights"}
                  </Text>
                  <View className="gap-2">
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
        </>
      )}

      {/* Add Researched Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setModalVisible(false)} />
          <View
            className="bg-cream-50 rounded-t-3xl border-t border-cream-200 overflow-hidden"
          >
            <View className="p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-ink-900">
                  Add Product to Research
                </Text>
                <Pressable onPress={() => setModalVisible(false)} className="p-1 rounded-full active:bg-cream-100">
                  <Ionicons name="close" size={20} color="#1a1612" />
                </Pressable>
              </View>

              <View className="mb-4 gap-3">
                <View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1.5">Product Name</Text>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. iPhone 15 Pro"
                    placeholderTextColor="#9ca3af"
                    style={{ fontFamily: fontFamily(false) }}
                    className="bg-white border border-cream-300 rounded-xl px-4 py-2 text-ink-700 text-sm"
                  />
                </View>

                <View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1.5">Brand</Text>
                  <TextInput
                    value={formBrand}
                    onChangeText={setFormBrand}
                    placeholder="e.g. Apple"
                    placeholderTextColor="#9ca3af"
                    style={{ fontFamily: fontFamily(false) }}
                    className="bg-white border border-cream-300 rounded-xl px-4 py-2 text-ink-700 text-sm"
                  />
                </View>

                <View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1.5">Price (INR)</Text>
                  <TextInput
                    value={formPrice}
                    onChangeText={setFormPrice}
                    placeholder="e.g. 119900"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    style={{ fontFamily: fontFamily(false) }}
                    className="bg-white border border-cream-300 rounded-xl px-4 py-2 text-ink-700 text-sm"
                  />
                </View>

                <View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1.5">Warranty (Months)</Text>
                  <TextInput
                    value={formWarranty}
                    onChangeText={setFormWarranty}
                    placeholder="e.g. 12"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    style={{ fontFamily: fontFamily(false) }}
                    className="bg-white border border-cream-300 rounded-xl px-4 py-2 text-ink-700 text-sm"
                  />
                </View>

                <View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1.5">Category</Text>
                  <TextInput
                    value={formCategory}
                    onChangeText={setFormCategory}
                    placeholder="e.g. Smartphone"
                    placeholderTextColor="#9ca3af"
                    style={{ fontFamily: fontFamily(false) }}
                    className="bg-white border border-cream-300 rounded-xl px-4 py-2 text-ink-700 text-sm"
                  />
                </View>
              </View>

              <Pressable
                onPress={handleAddResearchedProduct}
                className="w-full bg-ink-900 py-3.5 rounded-2xl items-center active:bg-ink-800"
              >
                <Text style={{ fontFamily: fontFamily(true) }} className="text-cream-50 font-semibold text-sm uppercase tracking-wider">
                  Add to Compare
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
