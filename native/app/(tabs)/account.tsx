import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView, TextInput, ActivityIndicator, Linking, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { clearSavedSession } from "../../src/lib/biometric";
import { useI18n } from "../../src/i18n";
import { supabase } from "../../src/lib/supabase";
import LanguageDropdown from "../../src/components/LanguageDropdown";

function AppLogo() {
  return (
    <View className="w-8 h-8 rounded-xl bg-ink-900 justify-center items-center">
      <View className="w-4.5 h-4.5 flex-wrap flex-row gap-[3px] justify-center items-center">
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50" />
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50 opacity-60" />
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50 opacity-60" />
        <View className="w-1.5 h-1.5 rounded-[2px] bg-cream-50 opacity-25" />
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { locale, t } = useI18n();

  const [profile, setProfile] = useState<{
    display_name: string | null;
    email: string | null;
    phone: string | null;
  } | null>(null);
  const [subscription, setSubscription] = useState<string>("Free");
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Edit Profile Form State
  const [editTitle, setEditTitle] = useState<"Mr" | "Mrs" | "Ms" | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("display_name, email, phone")
        .eq("id", user.id)
        .single();
      if (!profErr && prof) {
        setProfile(prof);
        // Pre-fill form state
        const parts = prof.display_name?.split(". ") ?? [];
        if (parts.length > 1 && ["Mr", "Mrs", "Ms"].includes(parts[0])) {
          setEditTitle(parts[0] as "Mr" | "Mrs" | "Ms");
          setEditName(parts.slice(1).join(". "));
        } else {
          setEditTitle(null);
          setEditName(prof.display_name ?? "");
        }
        setEditEmail(prof.email ?? user.email ?? "");
        setEditPhone(prof.phone ?? user.phone ?? "");
      }

      // 2. Fetch Subscription Plan
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub && sub.plan) {
        setSubscription(sub.plan.name);
      } else {
        setSubscription("Free");
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSignOut() {
    await clearSavedSession();
    await signOut();
    router.replace("/login");
  }

  async function handleSaveProfile() {
    if (!user) return;
    if (!editTitle) {
      setProfileError("Please select a title.");
      return;
    }
    if (!editName.trim()) {
      setProfileError("Please enter your name.");
      return;
    }
    setProfileError("");
    setSavingProfile(true);
    try {
      const displayName = `${editTitle}. ${editName.trim()}`;
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
        }, { onConflict: "id" });

      if (error) throw error;
      setProfile({
        display_name: displayName,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      });
      setProfileModalVisible(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleDeleteAccountRequest() {
    const userEmail = profile?.email ?? user?.email ?? "";
    const subject = encodeURIComponent("Account Deletion Request");
    const body = encodeURIComponent(
      `Please delete my account and all data.\n\nRegistered User ID: ${user?.id}\nRegistered Contact: ${userEmail || user?.phone || ""}`
    );
    const mailtoUrl = `mailto:privacy@quickscanz.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(
        "Mail App Not Found",
        `Please send an email to privacy@quickscanz.com with the subject "Account Deletion Request" to request deletion.`
      );
    });
  }

  const isGoogleLinked = user?.app_metadata.providers?.includes("google");
  const isEmailLinked = !!user?.email;
  const isPhoneLinked = !!user?.phone;

  if (loading && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#1a1612" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream-50 pt-12">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 border-b border-cream-200 bg-cream-50">
        <View className="flex-row items-center gap-2">
          <AppLogo />
          <Text className="text-lg font-bold text-ink-900 tracking-tight">QuickScanZ</Text>
        </View>
        <Pressable
          onPress={() => setLangModalVisible(true)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-200 active:opacity-85"
        >
          <Text className="text-xs text-ink-900 font-semibold uppercase">{locale}</Text>
          <Ionicons name="chevron-down" size={12} color="#1a1612" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Profile Card */}
        <View className="bg-white border border-cream-200 rounded-3xl p-5 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center">
                <Text className="text-cream-100 font-bold text-lg">
                  {profile?.display_name?.replace(/^(Mr|Mrs|Ms)\.\s+/i, "").charAt(0).toUpperCase() || "G"}
                </Text>
              </View>
              <View>
                <Text className="text-base font-bold text-ink-900">
                  {profile?.display_name || "New User"}
                </Text>
                <Text className="text-xs text-ink-400">
                  {profile?.email ?? user?.email ?? "No email added"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setProfileModalVisible(true)}
              className="w-8 h-8 rounded-full bg-cream-100 items-center justify-center active:bg-cream-200"
            >
              <Ionicons name="pencil" size={14} color="#1a1612" />
            </Pressable>
          </View>
          <View className="pt-4 border-t border-cream-100 flex-row justify-between items-center">
            <View>
              <Text className="text-[10px] text-ink-300 font-semibold uppercase tracking-wider">Subscription</Text>
              <Text className="text-sm font-semibold text-brand-600 mt-0.5">{subscription}</Text>
            </View>
            {subscription === "Free" && (
              <Pressable
                onPress={() => router.push("/pricing")}
                className="bg-brand-500 px-4 py-2 rounded-xl active:opacity-90"
              >
                <Text className="text-xs font-semibold text-white">Upgrade</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Linked Accounts */}
        <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 px-1">
          Linked Accounts
        </Text>
        <View className="bg-white border border-cream-200 rounded-3xl p-4 shadow-sm gap-3 mb-6">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ionicons name="mail-outline" size={16} color="#4b5563" />
              <Text className="text-sm text-ink-700">Email Address</Text>
            </View>
            <Ionicons
              name={isEmailLinked ? "checkmark-circle" : "close-circle"}
              size={18}
              color={isEmailLinked ? "#0B6E4F" : "#9ca3af"}
            />
          </View>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ionicons name="call-outline" size={16} color="#4b5563" />
              <Text className="text-sm text-ink-700">Phone Number</Text>
            </View>
            <Ionicons
              name={isPhoneLinked ? "checkmark-circle" : "close-circle"}
              size={18}
              color={isPhoneLinked ? "#0B6E4F" : "#9ca3af"}
            />
          </View>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ionicons name="logo-google" size={16} color="#4b5563" />
              <Text className="text-sm text-ink-700">Google</Text>
            </View>
            <Ionicons
              name={isGoogleLinked ? "checkmark-circle" : "close-circle"}
              size={18}
              color={isGoogleLinked ? "#0B6E4F" : "#9ca3af"}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={() =>
            Alert.alert(t("account.sign_out_btn") || "Sign Out", "Are you sure you want to sign out?", [
              { text: t("common.cancel") || "Cancel", style: "cancel" },
              { text: t("account.sign_out_btn") || "Sign Out", style: "destructive", onPress: handleSignOut },
            ])
          }
          className="w-full bg-white border border-red-200 py-3.5 rounded-2xl items-center active:bg-red-50 mb-8"
        >
          <Text className="font-semibold text-red-600">
            {t("account.sign_out_btn") || "Sign Out"}
          </Text>
        </Pressable>

        {/* Danger Zone */}
        <View className="border-t border-cream-200 pt-4 items-center">
          <Text className="text-[10px] text-ink-300 uppercase font-semibold tracking-wider mb-2">Danger Zone</Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Delete Account",
                "Requesting account deletion will notify our support team to remove your account and all associated data. Do you wish to proceed?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Request Deletion", style: "destructive", onPress: handleDeleteAccountRequest },
                ]
              )
            }
            className="flex-row items-center gap-1.5 active:opacity-80"
          >
            <Ionicons name="trash-outline" size={12} color="#dc2626" />
            <Text className="text-xs font-semibold text-red-600">Request Account Deletion</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Language Picker Dropdown */}
      <LanguageDropdown visible={langModalVisible} onClose={() => setLangModalVisible(false)} />

      {/* Profile Edit Modal */}
      <Modal visible={profileModalVisible} animationType="slide" transparent>
        <Pressable className="flex-1 bg-black/40 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-cream-50 rounded-t-3xl border-t border-cream-200 overflow-hidden"
          >
            <View className="bg-white border-b border-cream-100 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-base font-bold text-ink-900">Edit Profile</Text>
              <Pressable onPress={() => setProfileModalVisible(false)} className="p-1 rounded-full active:bg-cream-100">
                <Ionicons name="close" size={20} color="#1a1612" />
              </Pressable>
            </View>

            <ScrollView className="p-6 max-h-[500px]">
              {/* Title Selector */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Title</Text>
              <View className="flex-row gap-2 mb-4">
                {(["Mr", "Mrs", "Ms"] as const).map((tVal) => (
                  <Pressable
                    key={tVal}
                    onPress={() => setEditTitle(tVal)}
                    className={`flex-1 items-center py-2.5 rounded-xl border ${
                      editTitle === tVal ? "bg-brand-50 border-brand-500" : "bg-white border-cream-200"
                    }`}
                  >
                    <Text className={`text-sm ${editTitle === tVal ? "font-semibold text-brand-600" : "text-ink-700"}`}>
                      {tVal}.
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Name Input */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Full Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. John Doe"
                placeholderTextColor="#9ca3af"
                className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-4"
              />

              {/* Email Input */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Email Address</Text>
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="e.g. john@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-4"
              />

              {/* Phone Input */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Phone Number</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. +919876543210"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                autoCapitalize="none"
                className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-6"
              />

              {profileError ? (
                <Text className="text-sm text-red-600 text-center mb-4">{profileError}</Text>
              ) : null}

              <Pressable
                onPress={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-ink-900 py-3.5 rounded-2xl items-center active:bg-ink-800 disabled:opacity-50 mb-6"
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fdfcf8" />
                ) : (
                  <Text className="text-cream-50 font-semibold text-sm">Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}
