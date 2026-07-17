import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import {
  getStatusConfig,
  getWarrantyStatus,
  formatWarrantyCountdown,
} from "../../src/lib/calculations";
import { useI18n } from "../../src/i18n";
import type { Product } from "../../src/lib/types";
import LanguageDropdown from "../../src/components/LanguageDropdown";
import OnboardingFlow from "../../src/components/OnboardingFlow";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "../../src/lib/api";
import HeaderLogo from "../../src/components/HeaderLogo";

const PRODUCT_COLUMNS =
  "id, user_id, name, brand, purchase_date, warranty_months, expiry_date, price, invoice_url, created_at, category, model_number, serial_number, store_name, notes, is_demo";

export default function HomeScreen() {

  const { user } = useAuth();
  const router = useRouter();
  const { locale, t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Modals state
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  // User Profile
  const [profile, setProfile] = useState<{
    display_name: string | null;
    onboarded_at: string | null;
  } | null>(null);

  // Nudge state
  const [nudge, setNudge] = useState<{
    type: string;
    title: string;
    sub: string;
    action: () => void;
    icon: string;
  } | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const loadProfileAndNudge = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, onboarded_at")
        .eq("id", user.id)
        .single();
      
      if (prof) {
        setProfile(prof);
        // If they haven't finished onboarding (i.e. no name/title), show the onboarding form
        if (!prof.display_name || !prof.onboarded_at) {
          setOnboardingVisible(true);
        }
      } else {
        // Safe fallback: trigger onboarding if no profile row yet
        setOnboardingVisible(true);
      }

      // 2. Compute Nudge (mirroring components/DashboardNudge.tsx logic)
      const { data: realProducts } = await supabase
        .from("products")
        .select("id, name, brand, purchase_date, expiry_date, is_demo")
        .eq("user_id", user.id)
        .eq("is_demo", false);

      if (realProducts && realProducts.length > 0) {
        const now = new Date();
        // Check expiring in <= 60 days
        for (const p of realProducts) {
          const expiry = new Date(p.expiry_date);
          const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
          if (daysLeft > 0 && daysLeft <= 60) {
            setNudge({
              type: "expiring_soon",
              title: `${p.name} warranty ends in ${daysLeft}d`,
              sub: "Tap to review details before it lapses.",
              action: () => router.push(`/product/${p.id}`),
              icon: "bell",
            });
            return;
          }
        }

        // AMC Check (products > 1 year old)
        for (const p of realProducts) {
          if (p.purchase_date) {
            const diffYears = (now.getTime() - new Date(p.purchase_date).getTime()) / (365.25 * 86_400_000);
            if (diffYears > 1) {
              setNudge({
                type: "amc_reminder",
                title: `${p.name} — consider an AMC`,
                sub: "Annual Maintenance Contract protects post-warranty.",
                action: () => router.push(`/product/${p.id}`),
                icon: "wrench",
              });
              return;
            }
          }
        }

        // Default Claim AI
        setNudge({
          type: "try_claim_ai",
          title: "Something not working?",
          sub: "Use AI Claim Assistant for step-by-step help.",
          action: () => router.push("/(tabs)/claims"),
          icon: "shield",
        });
      }
    } catch {
      // safe fallback
    }
  }, [user, router]);

  const loadProducts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("user_id", user.id)
        .order("expiry_date", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setProducts((data as Product[] | null) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadProducts(), loadProfileAndNudge()]);
  }, [loadProducts, loadProfileAndNudge]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // Compute 5 Stats Cards values
  const counts = useMemo(() => {
    const c = { active: 0, expiring_soon: 0, expired: 0, total: 0, withInvoice: 0 };
    for (const p of products) {
      c.total += 1;
      if (p.invoice_url) {
        c.withInvoice += 1;
      }
      const status = getWarrantyStatus(p.expiry_date);
      if (status === "active") c.active += 1;
      else if (status === "expiring_soon") c.expiring_soon += 1;
      else if (status === "expired") c.expired += 1;
    }
    return c;
  }, [products]);

  const greetingSubText = useMemo(() => {
    const trackedText = `${counts.total} ${t("dashboard.products_tracked")}`;
    const statusText =
      counts.expiring_soon > 0
        ? ` · ${counts.expiring_soon} ${t("dashboard.expiring_soon")}`
        : ` · ${t("dashboard.all_looking_good")}`;
    return `${trackedText}${statusText}`;
  }, [counts, t]);

  const capitalizedUserName = useMemo(() => {
    if (profile?.display_name) {
      return profile.display_name;
    }
    return t("onboarding.name_placeholder") || "Friend (Tap to add name)";
  }, [profile, t]);

  function openWebTool(path: string, title: string) {
    router.push({
      pathname: "/webview",
      params: {
        url: `${API_BASE_URL}${path}`,
        title: title,
      },
    });
  }

  const exploreTools = [
    { label: t("explore.lifecycle"), icon: "📊", action: () => router.push("/lifecycle"), desc: t("explore.lifecycle_desc") },
    { label: t("explore.compare"), icon: "⚖️", action: () => router.push("/compare"), desc: t("explore.compare_desc") },
    { label: t("explore.buying_assistant"), icon: "🛒", action: () => router.push("/buying-assistant"), desc: t("explore.buying_assistant_desc") },
    { label: t("explore.smart_home"), icon: "🏠", action: () => router.push("/smart-home"), desc: t("explore.smart_home_desc") },
    { label: t("explore.energy_monitor"), icon: "⚡", action: () => router.push("/energy"), desc: t("explore.energy_monitor_desc") },
    { label: t("explore.family_vault"), icon: "👥", action: () => router.push("/family"), desc: t("explore.family_vault_desc") },
    { label: t("explore.upgrade"), icon: "⭐", action: () => router.push("/pricing"), desc: t("explore.upgrade_desc") },
    { label: t("explore.add_product"), icon: "➕", action: () => router.push("/product/add"), desc: t("explore.add_product_desc") },
  ];


  if (loading && products.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#0B6E4F" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream-50 pt-12">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 border-b border-cream-200 bg-cream-50">
        <HeaderLogo />

        <Pressable
          onPress={() => setLangModalVisible(true)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-200 active:opacity-85"
        >
          <Text className="text-xs text-ink-900 font-semibold uppercase">{locale}</Text>
          <Ionicons name="chevron-down" size={12} color="#1a1612" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAll();
            }}
          />
        }
      >
        {/* Hello Greeting */}
        <View className="mb-6">
          <Pressable onPress={() => setOnboardingVisible(true)}>
            <Text className="text-2xl font-light text-ink-900">
              Hi, <Text className="font-semibold">{capitalizedUserName}</Text> 👋
            </Text>
          </Pressable>
          <Text className="text-xs text-ink-400 mt-1 leading-5">{greetingSubText}</Text>
        </View>

        {/* Nudge Card (M3 suggestion block) */}
        {nudge && !nudgeDismissed && (
          <View className="relative mb-6">
            <Pressable
              onPress={nudge.action}
              className="bg-white border border-cream-200 rounded-3xl p-5 flex-row items-center gap-4 shadow-sm"
            >
              <View className="w-10 h-10 rounded-2xl bg-brand-50 items-center justify-center">
                <Ionicons
                  name={
                    nudge.icon === "bell"
                      ? "notifications-outline"
                      : nudge.icon === "wrench"
                      ? "construct-outline"
                      : "shield-checkmark-outline"
                  }
                  size={18}
                  color="#0B6E4F"
                />
              </View>
              <View className="flex-1 pr-6">
                <Text className="text-sm font-bold text-ink-900 leading-tight mb-0.5">{nudge.title}</Text>
                <Text className="text-xs text-ink-400 leading-normal">{nudge.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </Pressable>
            {/* Dismiss X */}
            <Pressable
              onPress={() => setNudgeDismissed(true)}
              className="absolute top-2 right-2 p-1.5 rounded-full"
            >
              <Ionicons name="close" size={14} color="#9ca3af" />
            </Pressable>
          </View>
        )}

        {/* 5 Stats Cards Grid */}
        <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3 px-1">
          {t("dashboard.metrics_overview")}
        </Text>
        <View className="mb-6">
          {/* Total (Full Width) */}
          <Pressable
            onPress={() => router.push("/(tabs)/wallet")}
            className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm mb-3 active:opacity-90"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{t("dashboard.stats_total")}</Text>
                <Text className="text-4xl font-light text-ink-900 mt-1 leading-none">{counts.total}</Text>
              </View>
              <View className="w-12 h-12 rounded-2xl bg-ink-900 items-center justify-center">
                <Ionicons name="cube-outline" size={22} color="#fdfcf8" />
              </View>
            </View>
          </Pressable>

          {/* Row 1: Active, Expiring */}
          <View className="flex-row gap-3 mb-3">
            <Pressable
              onPress={() => router.push("/(tabs)/wallet")}
              className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 shadow-sm active:opacity-90"
            >
              <Text className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">{t("dashboard.stats_active")}</Text>
              <Text className="text-2xl font-bold text-green-600 mt-1">{counts.active}</Text>
              <Text className="text-[9px] text-ink-300 mt-1">{t("dashboard.stats_sub_active")}</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/wallet")}
              className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 shadow-sm active:opacity-90"
            >
              <Text className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">{t("dashboard.stats_expiring")}</Text>
              <Text className="text-2xl font-bold text-amber-600 mt-1">{counts.expiring_soon}</Text>
              <Text className="text-[9px] text-ink-300 mt-1">{t("dashboard.stats_sub_within_30d")}</Text>
            </Pressable>
          </View>

          {/* Row 2: Expired, Invoiced */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push("/(tabs)/wallet")}
              className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 shadow-sm active:opacity-90"
            >
              <Text className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">{t("dashboard.stats_expired")}</Text>
              <Text className="text-2xl font-bold text-red-600 mt-1">{counts.expired}</Text>
              <Text className="text-[9px] text-ink-300 mt-1">{t("dashboard.stats_sub_expired")}</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/wallet")}
              className="flex-1 bg-white border border-cream-200 rounded-3xl p-4 shadow-sm active:opacity-90"
            >
              <Text className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">{t("dashboard.stats_invoiced")}</Text>
              <Text className="text-2xl font-bold text-brand-600 mt-1">{counts.withInvoice}</Text>
              <Text className="text-[9px] text-ink-300 mt-1">{t("dashboard.stats_sub_invoiced")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Explore Tools Grid */}
        <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3 px-1">
          {t("dashboard.explore_features")}
        </Text>
        <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
          {exploreTools.map((tool) => (
            <Pressable
              key={tool.label}
              onPress={tool.action}
              className="w-[48%] bg-white border border-cream-200 rounded-3xl p-4 shadow-sm active:opacity-90"
            >
              <Text className="text-2xl mb-2">{tool.icon}</Text>
              <Text className="text-sm font-bold text-ink-900 leading-tight mb-0.5">{tool.label}</Text>
              <Text className="text-[9px] text-ink-300 leading-snug">{tool.desc}</Text>
            </Pressable>
          ))}
        </View>


        {/* Signature Attribution */}
        <View className="items-center py-6 mb-4">
          <Text className="text-[10px] text-ink-300 font-semibold tracking-widest uppercase">
            A Pranix AI Labs Product
          </Text>
        </View>
      </ScrollView>


      {/* Language Picker Dropdown */}
      <LanguageDropdown visible={langModalVisible} onClose={() => setLangModalVisible(false)} />

      {/* Onboarding Flow Modal */}
      <OnboardingFlow
        visible={onboardingVisible}
        onComplete={(displayName) => {
          setOnboardingVisible(false);
          setProfile((prev) => prev ? { ...prev, display_name: displayName, onboarded_at: new Date().toISOString() } : null);
        }}
      />
    </View>
  );
}
