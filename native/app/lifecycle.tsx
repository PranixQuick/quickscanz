import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";
import { getWarrantyStatus } from "../src/lib/calculations";
import type { Product } from "../src/lib/types";

export default function LifecycleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, fontFamily } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
          setProducts(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [user]);

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
        products.map((p) => {
          const status = getWarrantyStatus(p.expiry_date);
          return (
            <View key={p.id} className="bg-white border border-cream-200 rounded-3xl p-5 mb-5 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900">
                    {p.name}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mt-0.5">
                    {p.brand}
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${
                  status === "active" ? "bg-emerald-50" : status === "expiring_soon" ? "bg-amber-50" : "bg-red-50"
                }`}>
                  <Text style={{ fontFamily: fontFamily(true) }} className={`text-[10px] font-bold uppercase ${
                    status === "active" ? "text-emerald-700" : status === "expiring_soon" ? "text-amber-700" : "text-red-700"
                  }`}>
                    {t(`warranty_status.${status}`) || status}
                  </Text>
                </View>
              </View>

              {/* Progress/Health bar */}
              <View className="mb-4">
                <View className="flex-row justify-between text-[10px] text-ink-300 mb-1">
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-300">
                    {t("lifecycle.purchased") || "Purchased"}: {p.purchase_date}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-300">
                    {t("lifecycle.expires") || "Expires"}: {p.expiry_date}
                  </Text>
                </View>
                <View className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${
                      status === "active" ? "bg-emerald-500" : status === "expiring_soon" ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: status === "expired" ? "100%" : "60%" }}
                  />
                </View>
              </View>

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

              {/* Mock Spare Parts Estimates */}
              <View className="mt-4 pt-3 border-t border-cream-100">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-[11px] font-bold text-ink-500 mb-2">
                  {t("lifecycle.spare_parts") || "Estimated Spare Parts Cost"}
                </Text>
                <View className="flex-row justify-between bg-cream-50 p-2.5 rounded-xl">
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-800">
                    {p.category === "Smartphones" ? "Battery Replacement" : p.category === "Air Conditioners" ? "Compressor" : "Standard Servicing"}
                  </Text>
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-900">
                    {p.category === "Smartphones" ? "₹1,499" : p.category === "Air Conditioners" ? "₹4,499" : "₹799"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
