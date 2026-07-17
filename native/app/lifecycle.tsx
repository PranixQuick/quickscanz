import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";
import { getWarrantyStatus } from "../src/lib/calculations";

interface LifecycleProduct {
  id: string;
  name: string;
  brand: string;
  category: string | null;
  purchase_date: string;
  expiry_date: string;
  price: number | null;
  warranty_days_remaining: number;
  days_owned: number;
  cost_per_day: number | null;
  avg_lifespan_years: number | null;
  lifespan_percent_used: number | null;
  warranty_status: string;
  manual_url?: string | null;
}

export default function LifecycleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, fontFamily } = useI18n();
  const [products, setProducts] = useState<LifecycleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("product_lifecycle")
          .select("*")
          .eq("user_id", user.id)
          .order("lifespan_percent_used", { ascending: false, nullsFirst: false });
        if (!error && data) {
          setProducts(data as LifecycleProduct[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [user]);

  const totalValue = products.reduce((s, p) => s + (p.price || 0), 0);
  const avgCostPerDay = products.filter((p) => p.cost_per_day).reduce((s, p) => s + (p.cost_per_day || 0), 0) / Math.max(products.filter((p) => p.cost_per_day).length, 1);

  function handleScheduleTechnician(productName: string) {
    Alert.alert(
      t("lifecycle.schedule_title") || "Schedule Technician",
      t("lifecycle.schedule_confirm", { name: productName }) || `Would you like to connect with an authorized technician for ${productName}?`,
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: t("common.confirm") || "Connect Now",
          onPress: () => {
            Alert.alert(t("common.success") || "Success", t("lifecycle.booking_success") || "Technician booking request submitted. A coordinator will call you in 30 minutes.");
          }
        }
      ]
    );
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
        {t("explore.lifecycle")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.lifecycle_desc")}
      </Text>

      {products.length === 0 ? (
        <View className="bg-white border border-cream-200 rounded-3xl p-6 items-center">
          <Ionicons name="clipboard-outline" size={32} color="#9ca3af" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800 mt-3 text-center">
            {t("lifecycle.no_products") || "No registered products yet"}
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
          {/* Summary stats */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 items-center shadow-sm">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900">
                ₹{totalValue.toLocaleString("en-IN")}
              </Text>
              <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 mt-1 uppercase tracking-wider">
                Total Invested
              </Text>
            </View>
            <View className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 items-center shadow-sm">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900">
                {products.length}
              </Text>
              <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 mt-1 uppercase tracking-wider">
                Products
              </Text>
            </View>
            <View className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 items-center shadow-sm">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900">
                ₹{avgCostPerDay.toFixed(1)}
              </Text>
              <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 mt-1 uppercase tracking-wider">
                Avg Cost/Day
              </Text>
            </View>
          </View>

          {/* Product cards */}
          {products.map((p) => {
            const lifePct = p.lifespan_percent_used || 0;
            const warrantyPct = Math.max(0, Math.min(100,
              p.warranty_days_remaining > 0
                ? (p.warranty_days_remaining / (p.warranty_days_remaining + p.days_owned)) * 100
                : 0
            ));

            const lifeColor =
              lifePct > 80 ? "text-red-500" :
              lifePct > 60 ? "text-amber-500" :
              "text-emerald-500";

            const lifeBg =
              lifePct > 80 ? "bg-red-500" :
              lifePct > 60 ? "bg-amber-500" :
              "bg-emerald-500";

            return (
              <View key={p.id} className="bg-white border border-cream-200 rounded-3xl p-5 mb-5 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 min-w-0 pr-2">
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900 truncate">
                      {p.name}
                    </Text>
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mt-0.5">
                      {p.brand}{p.category ? ` · ${p.category}` : ""}
                    </Text>
                  </View>
                  {p.cost_per_day && (
                    <View className="items-end">
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800">
                        ₹{p.cost_per_day}/day
                      </Text>
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 mt-0.5">
                        {p.days_owned} days owned
                      </Text>
                    </View>
                  )}
                </View>

                {/* Lifespan bar */}
                {p.lifespan_percent_used !== null && (
                  <View className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 uppercase tracking-wider">
                        Life used
                      </Text>
                      <Text style={{ fontFamily: fontFamily(true) }} className={`text-[9px] font-medium ${lifeColor}`}>
                        {lifePct}%{p.avg_lifespan_years ? ` of ~${p.avg_lifespan_years}yr lifespan` : ""}
                      </Text>
                    </View>
                    <View className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${lifeBg}`}
                        style={{ width: `${Math.min(lifePct, 100)}%` }}
                      />
                    </View>
                  </View>
                )}

                {/* Warranty bar */}
                <View className="mb-4">
                  <View className="flex-row justify-between mb-1">
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400 uppercase tracking-wider">
                      Warranty
                    </Text>
                    <Text style={{ fontFamily: fontFamily(true) }} className={`text-[9px] font-medium ${
                      p.warranty_status === "expired" ? "text-red-500" :
                      p.warranty_status === "expiring_soon" ? "text-amber-600" :
                      "text-emerald-700"
                    }`}>
                      {p.warranty_days_remaining > 0
                        ? `${p.warranty_days_remaining} days left`
                        : "Expired"}
                    </Text>
                  </View>
                  <View className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${
                        p.warranty_status === "expired" ? "bg-red-400" :
                        p.warranty_status === "expiring_soon" ? "bg-amber-400" :
                        "bg-emerald-500"
                      }`}
                      style={{ width: `${warrantyPct}%` }}
                    />
                  </View>
                </View>

                {/* Replacement hint */}
                {lifePct >= 75 && p.avg_lifespan_years && (
                  <View className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-amber-700">
                      ⚡ {lifePct >= 90 ? "Consider replacing soon" : "Approaching end of expected lifespan"} — {Math.round((p.avg_lifespan_years * 365 - p.days_owned) / 365 * 10) / 10}yr estimated remaining
                    </Text>
                  </View>
                )}

                {/* Actions Grid */}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => handleScheduleTechnician(p.name)}
                    className="flex-1 bg-ink-900 py-3 rounded-2xl items-center justify-center flex-row gap-1 active:bg-ink-800"
                  >
                    <Ionicons name="construct-outline" size={14} color="#fdfcf8" />
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-cream-50">
                      {t("lifecycle.book_technician") || "Book Tech"}
                    </Text>
                  </Pressable>

                  {p.manual_url ? (
                    <Pressable
                      onPress={() => Linking.openURL(p.manual_url!)}
                      className="flex-1 bg-cream-100 py-3 rounded-2xl items-center justify-center flex-row gap-1 active:bg-cream-200"
                    >
                      <Ionicons name="document-text-outline" size={14} color="#1a1612" />
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-900">
                        {t("lifecycle.view_manual") || "Manual"}
                      </Text>
                    </Pressable>
                  ) : (
                    <View className="flex-1 bg-cream-50 py-3 rounded-2xl items-center justify-center flex-row gap-1 opacity-50">
                      <Ionicons name="document-text-outline" size={14} color="#9ca3af" />
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-300">
                        {t("lifecycle.no_manual") || "No Manual"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Spare Parts Estimates */}
                <View className="mt-4 pt-3 border-t border-cream-100">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[11px] font-bold text-ink-500 mb-2">
                    {t("lifecycle.spare_parts") || "Estimated Spare Parts Cost"}
                  </Text>
                  <View className="flex-row justify-between bg-cream-50 p-2.5 rounded-xl">
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-800">
                      {p.category === "Smartphone" ? "Battery Replacement" : p.category === "Air Conditioner" ? "Compressor" : "Standard Servicing"}
                    </Text>
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-900">
                      {p.category === "Smartphone" ? "₹1,499" : p.category === "Air Conditioner" ? "₹4,499" : "₹799"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
