import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";
import { estimateResaleValue } from "../src/lib/calculations";
import { API_BASE_URL } from "../src/lib/api";
import * as WebBrowser from "expo-web-browser";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState<"wallet" | "buy">("wallet");
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [compResult, setCompResult] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_demo", false);

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
    return items.filter((i) => selectedIds.includes(i.id));
  }, [items, selectedIds]);

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
      insights.push(`⏳ ${b.brand} ${b.name} has the longest expected lifespan (~${b.avg_lifespan_years} years)`);
    }

    return { bestValue, longestWarranty, bestLifespan, insights };
  }, [selectedItems]);

  async function handleCompareToBuy() {
    if (!selectedWalletId || !candidateQuery) {
      Alert.alert("Error", "Please select a wallet product and enter a candidate product name.");
      return;
    }
    const walletItem = items.find(i => i.id === selectedWalletId);
    if (!walletItem) return;

    setCompLoading(true);
    setCompResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/compare/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletName: walletItem.name,
          walletBrand: walletItem.brand,
          walletCategory: walletItem.category,
          candidateQuery: candidateQuery
        })
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.ok && resData.data) {
          setCompResult(resData.data);
        } else {
          Alert.alert("Comparison Error", "Could not fetch comparison data.");
        }
      } else {
        Alert.alert("Error", "Failed to connect to comparison server.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setCompLoading(false);
    }
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
      <Text style={{ fontFamily: fontFamily(true) }} className="text-xl font-bold text-ink-900 mb-2">
        {t("explore.compare")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.compare_desc")}
      </Text>

      {/* Mode Switcher */}
      <View className="mb-6 flex-row bg-cream-100 p-1 rounded-2xl border border-cream-200">
        <Pressable
          onPress={() => {
            setCompareMode("wallet");
            setCompResult(null);
          }}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            compareMode === "wallet" ? "bg-white shadow-xs" : ""
          }`}
        >
          <Text style={{ fontFamily: fontFamily(compareMode === "wallet") }} className={`text-xs font-semibold ${compareMode === "wallet" ? "text-brand-500 font-bold" : "text-ink-500"}`}>
            Wallet Products
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setCompareMode("buy")}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            compareMode === "buy" ? "bg-white shadow-xs" : ""
          }`}
        >
          <Text style={{ fontFamily: fontFamily(compareMode === "buy") }} className={`text-xs font-semibold ${compareMode === "buy" ? "text-brand-500 font-bold" : "text-ink-500"}`}>
            Compare to Buy
          </Text>
        </Pressable>
      </View>

      {compareMode === "wallet" ? (
        items.length === 0 ? (
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
          </>
        )
      ) : (
        /* Compare to Buy Flow */
        <View className="gap-6">
          <View>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
              1. Select a wallet product you own
            </Text>
            {items.length === 0 ? (
              <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 italic">
                No products in your wallet. Add a product first.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                {items.map((i) => {
                  const isSel = selectedWalletId === i.id;
                  return (
                    <Pressable
                      key={i.id}
                      onPress={() => setSelectedWalletId(i.id)}
                      className={`px-4 py-3 rounded-2xl border ${
                        isSel ? "bg-ink-900 border-ink-900" : "bg-white border-cream-200"
                      }`}
                    >
                      <Text style={{ fontFamily: fontFamily(true) }} className={`text-xs font-bold ${isSel ? "text-cream-50" : "text-ink-900"}`}>
                        {i.name}
                      </Text>
                      <Text style={{ fontFamily: fontFamily(false) }} className={`text-[10px] mt-0.5 ${isSel ? "text-cream-200" : "text-ink-400"}`}>
                        {i.brand}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
              2. Enter potential purchase candidate
            </Text>
            <View className="flex-row items-center rounded-2xl border border-cream-300 bg-white px-4 py-1">
              <Ionicons name="search" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
              <TextInput
                value={candidateQuery}
                onChangeText={setCandidateQuery}
                placeholder="e.g. iPhone 16 Pro, IFB Washer..."
                editable={!compLoading}
                className="flex-1 py-3.5 text-ink-700 text-sm"
              />
            </View>
          </View>

          <Pressable
            onPress={handleCompareToBuy}
            disabled={compLoading || !selectedWalletId || !candidateQuery}
            className="items-center rounded-2xl bg-ink-900 py-4 active:scale-[0.98] active:opacity-95 disabled:opacity-50 shadow-sm"
          >
            {compLoading ? (
              <ActivityIndicator color="#fdfcf8" />
            ) : (
              <Text style={{ fontFamily: fontFamily(true) }} className="font-bold text-cream-50 text-sm">
                Compare Wallet vs Candidate →
              </Text>
            )}
          </Pressable>

          {compResult && (
            <View className="gap-6 mt-2">
              <View className="flex-row gap-4">
                {/* Left Card: Wallet Product */}
                {(() => {
                  const w = items.find(x => x.id === selectedWalletId);
                  if (!w) return null;
                  return (
                    <View className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 shadow-sm">
                      <View className="bg-cream-100 rounded-full px-2.5 py-0.5 self-start mb-2">
                        <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-500 font-bold uppercase">
                          Your Wallet
                        </Text>
                      </View>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900 truncate">
                        {w.name}
                      </Text>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 mb-4">
                        {w.brand}
                      </Text>

                      <View className="space-y-3">
                        <View>
                          <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                            Original Price
                          </Text>
                          <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800">
                            {w.price ? `₹${w.price.toLocaleString("en-IN")}` : "—"}
                          </Text>
                        </View>
                        <View>
                          <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                            Warranty
                          </Text>
                          <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800">
                            {w.warranty_months}m
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Right Card: Candidate Product */}
                <View className="flex-1 bg-white border border-brand-500 border-2 rounded-3xl p-4 shadow-sm">
                  <View className="bg-brand-50 rounded-full px-2.5 py-0.5 self-start mb-2">
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-brand-600 font-bold uppercase">
                      New Candidate
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900 truncate">
                    {compResult.candidate.name}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 mb-4">
                    {compResult.candidate.brand}
                  </Text>

                  <View className="space-y-3">
                    <View>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                        Current Price
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-brand-600">
                        {compResult.candidate.price}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-300 uppercase">
                        User Rating
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800">
                        ⭐ {compResult.candidate.rating}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Specs Comparison Details */}
              <View className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-800 mb-3">
                  📋 Feature Specifications Comparison
                </Text>
                <View className="space-y-2.5">
                  {Object.entries(compResult.candidate.specs).map(([key, val]) => (
                    <View key={key} className="flex-row justify-between border-b border-cream-100 pb-2">
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400">{key}</Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs text-ink-800 font-medium">{val as string}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Comparison Verdict */}
              <View className="bg-brand-50 border border-brand-500/20 rounded-3xl p-5">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-brand-600 mb-3">
                  💡 Pranix AI Comparison Verdict
                </Text>
                <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-800 leading-5">
                  {compResult.comparison.verdict}
                </Text>
              </View>

              {/* Purchase Quick Links */}
              <View className="flex-row gap-3">
                {compResult.comparison.buyLinks?.map((link: string, idx: number) => (
                  <Pressable
                    key={idx}
                    onPress={() => WebBrowser.openBrowserAsync(link)}
                    className="flex-1 flex-row items-center justify-center rounded-2xl border border-cream-300 bg-white py-3.5 active:opacity-90"
                  >
                    <Ionicons name="cart-outline" size={16} color="#4b5563" style={{ marginRight: 6 }} />
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-ink-700 font-bold text-xs uppercase tracking-wide">
                      {link.includes("amazon") ? "Amazon" : "Flipkart"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
