import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";
import type { Product } from "../src/lib/types";

export default function EnergyScreen() {
  const { user } = useAuth();
  const { t, fontFamily } = useI18n();
  const [appliances, setAppliances] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppliances() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_demo", false);
        if (!error && data) {
          // Filter to high energy appliances
          const energyCats = ["Air Conditioners", "Refrigerators", "Washing Machines", "Appliances"];
          setAppliances(data.filter(p => p.category && energyCats.includes(p.category)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAppliances();
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
        {t("explore.energy_monitor")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.energy_monitor_desc")}
      </Text>

      {/* Energy Meter Card */}
      <View className="bg-white border border-cream-200 rounded-3xl p-5 mb-6 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase">
              {t("energy.daily_est") || "Daily Consumption"}
            </Text>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-2xl font-bold text-ink-900 mt-1">
              {appliances.length > 0 ? `${(appliances.length * 2.4).toFixed(1)} kWh` : "0 kWh"}
            </Text>
          </View>
          <View className="w-12 h-12 bg-amber-50 rounded-2xl items-center justify-center">
            <Ionicons name="flash-outline" size={24} color="#D97706" />
          </View>
        </View>

        <View className="flex-row gap-4 pt-3 border-t border-cream-100">
          <View className="flex-1">
            <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-300">
              Monthly Cost (Est)
            </Text>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-800 mt-0.5">
              {appliances.length > 0 ? `₹${Math.round(appliances.length * 2.4 * 30 * 7)}` : "₹0"}
            </Text>
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-300">
              Carbon Footprint
            </Text>
            <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-800 mt-0.5">
              {appliances.length > 0 ? `${(appliances.length * 2.4 * 30 * 0.8).toFixed(1)} kg CO2` : "0 kg"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
        {t("energy.appliances_ratings") || "Appliance Efficiency Ratings"}
      </Text>

      {appliances.length === 0 ? (
        <View className="bg-white border border-cream-200 rounded-3xl p-6 items-center">
          <Ionicons name="flash-off-outline" size={32} color="#9ca3af" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800 mt-3 text-center">
            {t("energy.no_appliances") || "No heavy appliances registered yet. Add AC, Refrigerator, or Washing Machine."}
          </Text>
        </View>
      ) : (
        appliances.map((app) => (
          <View key={app.id} className="bg-white border border-cream-200 rounded-3xl p-4 mb-4 shadow-sm flex-row items-center justify-between">
            <View className="flex-1 min-w-0 pr-4">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-bold text-ink-900 truncate">
                {app.name}
              </Text>
              <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 mt-0.5">
                {app.brand} · Est. 2.4 kWh/day
              </Text>
            </View>
            <View className="flex-row gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name="star" size={12} color={star <= 4 ? "#D97706" : "#e5e7eb"} />
              ))}
            </View>
          </View>
        ))
      )}

      {/* Energy Saving Tips */}
      <View className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mt-4">
        <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-amber-800 mb-2">
          💡 Smart Savings Tip
        </Text>
        <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-amber-800 leading-5">
          Setting your AC to 24°C instead of 18°C can reduce its electricity usage by up to 18%.
        </Text>
      </View>
    </ScrollView>
  );
}
