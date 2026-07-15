import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";
import type { Product } from "../src/lib/types";

export default function SmartHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, fontFamily } = useI18n();
  const [devices, setDevices] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // ... (unchanged useEffect) ...
  useEffect(() => {
    async function loadDevices() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_demo", false);
        if (!error && data) {
          // Filter products likely to be smart devices
          const smartCats = ["Smartphones", "Laptops", "Appliances", "Electronics", "Smart Devices"];
          setDevices(data.filter(p => p.category && smartCats.includes(p.category)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDevices();
  }, [user]);

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
        {t("explore.smart_home")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.smart_home_desc")}
      </Text>

      {/* Smart Hub Status */}
      <View className="bg-white border border-cream-200 rounded-3xl p-5 mb-6 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center">
            <Ionicons name="wifi" size={18} color="#0B6E4F" />
          </View>
          <View>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900">
              {t("smart.hub_connected") || "QuickScanZ IoT Hub"}
            </Text>
            <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-emerald-700 mt-0.5 font-semibold">
              Online · {devices.length} Devices Linked
            </Text>
          </View>
        </View>
        <Pressable className="px-3 py-1.5 rounded-xl bg-cream-100 active:bg-cream-200">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-900">
            Configure
          </Text>
        </Pressable>
      </View>

      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
        {t("smart.device_list") || "Connected Devices & Warranties"}
      </Text>

      {devices.length === 0 ? (
        <View className="bg-white border border-cream-200 rounded-3xl p-6 items-center">
          <Ionicons name="phone-portrait-outline" size={32} color="#9ca3af" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800 mt-3 text-center">
            {t("smart.no_devices") || "No connected devices found"}
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
        devices.map((dev) => (
          <View key={dev.id} className="bg-white border border-cream-200 rounded-3xl p-4 mb-4 shadow-sm flex-row items-center justify-between">
            <View className="flex-1 min-w-0 pr-4">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900 truncate">
                {dev.name}
              </Text>
              <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 mt-0.5">
                {dev.brand} · {dev.category}
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1 bg-cream-100 px-2 py-0.5 rounded-full">
                <Ionicons name="shield-checkmark" size={10} color="#0B6E4F" />
                <Text style={{ fontFamily: fontFamily(true) }} className="text-[9px] font-bold text-emerald-800">
                  {dev.warranty_months}m
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
