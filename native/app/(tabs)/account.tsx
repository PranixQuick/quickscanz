import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView, TextInput, ActivityIndicator, Linking, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { clearSavedSession } from "../../src/lib/biometric";
import { useI18n } from "../../src/i18n";
import { supabase } from "../../src/lib/supabase";
import LanguageDropdown from "../../src/components/LanguageDropdown";
import HeaderLogo from "../../src/components/HeaderLogo";
import { useAariaSpeech } from "../../src/features/aaria/useAariaSpeech";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { locale, t, fontFamily } = useI18n();

  useEffect(() => {
    console.log("[account.tsx] AccountScreen mounted! User ID:", user?.id);
  }, [user]);

  const [profile, setProfile] = useState<{
    display_name: string | null;
    email: string | null;
    phone: string | null;
  } | null>(null);
  const [subscription, setSubscription] = useState<string>("Free");
  const [loading, setLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const aaria = useAariaSpeech(locale);
  
  // Modals state
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);

  // Edit Profile Form State
  const [editTitle, setEditTitle] = useState<"Mr" | "Mrs" | "Ms" | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Phone Binding Form State
  const [bindingPhone, setBindingPhone] = useState("+91");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Email Binding Form State
  const [bindingEmail, setBindingEmail] = useState("");
  const [bindingPassword, setBindingPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");


  const loadVoicePreference = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem("aaria_voice_enabled");
      setVoiceEnabled(val === null ? true : val === "true");
    } catch (err) {
      console.error(err);
    }
  }, []);

  const toggleVoice = async () => {
    try {
      const nextVal = !voiceEnabled;
      setVoiceEnabled(nextVal);
      await AsyncStorage.setItem("aaria_voice_enabled", String(nextVal));
      if (!nextVal) {
        aaria.stop();
      }
    } catch (err) {
      console.error("[AccountScreen] toggleVoice error:", err);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await loadVoicePreference();
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
      setProfileError(t("account.error_select_title") || "Please select a title.");
      return;
    }
    if (!editName.trim()) {
      setProfileError(t("account.error_enter_name") || "Please enter your name.");
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
      Alert.alert(t("common.success") || "Success", t("account.profile_updated") || "Profile updated successfully.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : (t("account.error_update_failed") || "Failed to update profile."));
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
        t("account.mail_app_not_found") || "Mail App Not Found",
        t("account.mail_app_not_found_desc") || `Please send an email to privacy@quickscanz.com with the subject "Account Deletion Request" to request deletion.`
      );
    });
  }

  async function handleSendPhoneOtp() {
    if (!bindingPhone.trim() || !bindingPhone.startsWith("+")) {
      setPhoneError("Please enter a valid phone number with country code (e.g. +91XXXXXXXXXX)");
      return;
    }
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: bindingPhone.trim() });
      if (error) throw error;
      setPhoneStep(2);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim()) {
      setPhoneError("Please enter the OTP");
      return;
    }
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: bindingPhone.trim(),
        token: phoneOtp.trim(),
        type: "phone_change",
      });
      if (error) throw error;
      Alert.alert(t("common.success") || "Success", "Phone number linked successfully!");
      setPhoneModalVisible(false);
      loadData();
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleLinkEmail() {
    if (!bindingEmail.trim() || !bindingEmail.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (bindingPassword.length < 6) {
      setEmailError("Password must be at least 6 characters");
      return;
    }
    setEmailError("");
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: bindingEmail.trim(),
        password: bindingPassword,
      });
      if (error) throw error;
      Alert.alert(
        t("common.success") || "Success",
        "Verification email sent! Please check your inbox to confirm linking."
      );
      setEmailModalVisible(false);
      loadData();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to link email");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleLinkGoogle() {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: "quickscanz://",
        },
      });
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to link Google account");
    }
  }


  const [seeding, setSeeding] = useState(false);

  async function handleSeedDemoProducts() {
    console.log("[account.tsx] handleSeedDemoProducts start! User:", user?.id);
    if (!user) {
      console.log("[account.tsx] handleSeedDemoProducts: No user logged in!");
      return;
    }
    setSeeding(true);
    try {
      const demoProducts = [
        {
          user_id: user.id,
          name: "Bravia XR 65-inch OLED TV",
          brand: "Sony",
          purchase_date: "2025-11-15",
          warranty_months: 24,
          expiry_date: "2027-11-15",
          price: 249900,
          category: "Television",
          subcategory: "OLED TV",
          model_number: "XR-65A80K",
          serial_number: "SN-9821034A",
          store_name: "Reliance Digital",
          notes: "Premium OLED TV. Outstanding picture quality.",
          is_demo: true
        },
        {
          user_id: user.id,
          name: "MacBook Pro 16-inch M3 Max",
          brand: "Apple",
          purchase_date: "2026-01-10",
          warranty_months: 12,
          expiry_date: "2027-01-10",
          price: 349900,
          category: "Laptop",
          subcategory: "Developer Laptop",
          model_number: "A2991",
          serial_number: "C02L91Z0Q05D",
          store_name: "Apple Store Mumbai",
          notes: "Workhorse machine for development and rendering.",
          is_demo: true
        },
        {
          user_id: user.id,
          name: "800L Bespoke French Door Refrigerator",
          brand: "Samsung",
          purchase_date: "2025-05-20",
          warranty_months: 12,
          expiry_date: "2026-05-20",
          price: 189900,
          category: "Home Appliance",
          subcategory: "Refrigerator",
          model_number: "RF23BB8600AP",
          serial_number: "SAMSUNG-BESPOKE-921",
          store_name: "Samsung Smart Plaza",
          notes: "Smart fridge with customizable panel designs.",
          is_demo: true
        },
        {
          user_id: user.id,
          name: "V15 Detect Cordless Vacuum",
          brand: "Dyson",
          purchase_date: "2025-09-05",
          warranty_months: 24,
          expiry_date: "2027-09-05",
          price: 65900,
          category: "Home Appliance",
          subcategory: "Vacuum Cleaner",
          model_number: "V15-DETECT",
          serial_number: "DYSON-V15-39210",
          store_name: "Dyson Demo Clinic",
          notes: "High-performance cordless vacuum with laser illumination.",
          is_demo: true
        },
        {
          user_id: user.id,
          name: "OnePlus 12 (16GB RAM, 512GB)",
          brand: "OnePlus",
          purchase_date: "2026-03-01",
          warranty_months: 12,
          expiry_date: "2027-03-01",
          price: 69990,
          category: "Smartphone",
          subcategory: "Android Flagship",
          model_number: "CPH2581",
          serial_number: "OP12-99881023",
          store_name: "OnePlus Experience Store",
          notes: "Daily driver phone. Fast charging is incredible.",
          is_demo: true
        },
        {
          user_id: user.id,
          name: "8kg Front Load Washing Machine",
          brand: "Bosch",
          purchase_date: "2025-02-14",
          warranty_months: 36,
          expiry_date: "2028-02-14",
          price: 48500,
          category: "Washing Machine",
          subcategory: "Front Load Washer",
          model_number: "WAJ2846SIN",
          serial_number: "BOSCH-WASHER-8KG",
          store_name: "Croma",
          notes: "Extremely silent and efficient. Uses EcoSilence Drive.",
          is_demo: true
        },
        {
          user_id: user.id,
          name: "1.5 Ton 5-Star Inverter AC",
          brand: "Daikin",
          purchase_date: "2025-04-10",
          warranty_months: 12,
          expiry_date: "2026-04-10",
          price: 52000,
          category: "Air Conditioner",
          subcategory: "Split AC",
          model_number: "FTKM50U",
          serial_number: "DAIKIN-AC-15TON",
          store_name: "Vijay Sales",
          notes: "Living room AC. Great cooling efficiency.",
          is_demo: true
        }
      ];

      console.log("[account.tsx] Inserting demo products...");
      const { error } = await supabase.from("products").insert(demoProducts);
      if (error) {
        console.log("[account.tsx] Insert error:", error);
        throw error;
      }
      console.log("[account.tsx] Insert success!");
      Alert.alert("Success", "Seeded 7 premium demo products successfully!");
      await loadData();
    } catch (err) {
      console.log("[account.tsx] Seed error:", err);
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to seed products");
    } finally {
      console.log("[account.tsx] Seed finished.");
      setSeeding(false);
    }
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
        <HeaderLogo />

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
                  {profile?.display_name || (t("account.new_user") || "New User")}
                </Text>
                <Text className="text-xs text-ink-400">
                  {profile?.email ?? user?.email ?? (t("account.no_email_added") || "No email added")}
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
              <Text className="text-[10px] text-ink-300 font-semibold uppercase tracking-wider">{t("account.subscription") || "Subscription"}</Text>
              <Text className="text-sm font-semibold text-brand-600 mt-0.5">{subscription}</Text>
            </View>
            {subscription === "Free" && (
              <Pressable
                onPress={() => {
                  console.log("[AccountScreen] Upgrade to Pro button clicked!");
                  router.push("/pricing");
                }}
                className="bg-brand-500 px-4 py-2 rounded-xl active:opacity-90"
              >
                <Text className="text-xs font-semibold text-white">{t("account.upgrade") || "Upgrade"}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Linked Accounts */}
        <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 px-1">
          {t("account.linked_accounts") || "Linked Accounts"}
        </Text>
        <View className="bg-white border border-cream-200 rounded-3xl p-4 shadow-sm gap-3 mb-6">
          <Pressable
            disabled={isEmailLinked}
            onPress={() => {
              setBindingEmail("");
              setBindingPassword("");
              setEmailError("");
              setEmailModalVisible(true);
            }}
            className="flex-row justify-between items-center py-1 active:opacity-60"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="mail-outline" size={16} color="#4b5563" />
              <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-ink-700">{t("account.email_address") || "Email Address"}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {!isEmailLinked && (
                <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] text-brand-600 font-bold uppercase">{t("account.link_btn") || "Link"}</Text>
              )}
              <Ionicons
                name={isEmailLinked ? "checkmark-circle" : "add-circle-outline"}
                size={18}
                color={isEmailLinked ? "#0B6E4F" : "#ef4444"}
              />
            </View>
          </Pressable>

          <Pressable
            disabled={isPhoneLinked}
            onPress={() => {
              setBindingPhone("+91");
              setPhoneOtp("");
              setPhoneStep(1);
              setPhoneError("");
              setPhoneModalVisible(true);
            }}
            className="flex-row justify-between items-center py-1 active:opacity-60"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="call-outline" size={16} color="#4b5563" />
              <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-ink-700">{t("account.phone_number") || "Phone Number"}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {!isPhoneLinked && (
                <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] text-brand-600 font-bold uppercase">{t("account.link_btn") || "Link"}</Text>
              )}
              <Ionicons
                name={isPhoneLinked ? "checkmark-circle" : "add-circle-outline"}
                size={18}
                color={isPhoneLinked ? "#0B6E4F" : "#ef4444"}
              />
            </View>
          </Pressable>

          <Pressable
            disabled={isGoogleLinked}
            onPress={handleLinkGoogle}
            className="flex-row justify-between items-center py-1 active:opacity-60"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="logo-google" size={16} color="#4b5563" />
              <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-ink-700">{t("account.google") || "Google"}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {!isGoogleLinked && (
                <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] text-brand-600 font-bold uppercase">{t("account.link_btn") || "Link"}</Text>
              )}
              <Ionicons
                name={isGoogleLinked ? "checkmark-circle" : "add-circle-outline"}
                size={18}
                color={isGoogleLinked ? "#0B6E4F" : "#ef4444"}
              />
            </View>
          </Pressable>
        </View>


        {/* Voice Settings */}
        <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 px-1">
          {t("account.voice_settings") || "Voice Assistant"}
        </Text>
        <View className="bg-white border border-cream-200 rounded-3xl p-4 shadow-sm mb-6">
          <Pressable
            onPress={toggleVoice}
            className="flex-row justify-between items-center py-1 active:opacity-60"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name={voiceEnabled ? "volume-medium-outline" : "volume-mute-outline"} size={16} color="#4b5563" />
              <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-ink-700">
                {t("account.interactive_voice") || "Interactive Voice Guidance"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text style={{ fontFamily: fontFamily(true) }} className={`text-[10px] font-bold uppercase ${voiceEnabled ? "text-brand-600" : "text-ink-400"}`}>
                {voiceEnabled ? t("common.on") || "ON" : t("common.off") || "OFF"}
              </Text>
              <Ionicons
                name={voiceEnabled ? "checkbox" : "square-outline"}
                size={18}
                color={voiceEnabled ? "#0B6E4F" : "#9ca3af"}
              />
            </View>
          </Pressable>
        </View>

        {/* Developer & Testing Tools */}
        <View className="mb-6">
          <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 px-1">
            Testing & Development
          </Text>
          <Pressable
            onPress={handleSeedDemoProducts}
            disabled={seeding}
            className="w-full bg-white border border-cream-200 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 active:bg-cream-50 disabled:opacity-50"
          >
            {seeding ? (
              <ActivityIndicator color="#1a1612" size="small" />
            ) : (
              <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-700">
                🌱 Seed Premium Demo Products
              </Text>
            )}
          </Pressable>
        </View>


        {/* Sign Out Button */}
        <Pressable
          onPress={() =>
            Alert.alert(t("account.sign_out_btn") || "Sign Out", t("account.sign_out_confirm") || "Are you sure you want to sign out?", [
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
          <Text className="text-[10px] text-ink-300 uppercase font-semibold tracking-wider mb-2">{t("account.danger_zone") || "Danger Zone"}</Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                t("account.delete_account_title") || "Delete Account",
                t("account.delete_account_confirm") || "Requesting account deletion will notify our support team to remove your account and all associated data. Do you wish to proceed?",
                [
                  { text: t("common.cancel") || "Cancel", style: "cancel" },
                  { text: t("account.delete_account_btn") || "Request Deletion", style: "destructive", onPress: handleDeleteAccountRequest },
                ]
              )
            }
            className="flex-row items-center gap-1.5 active:opacity-80"
          >
            <Ionicons name="trash-outline" size={12} color="#dc2626" />
            <Text className="text-xs font-semibold text-red-600">{t("account.delete_account_btn") || "Request Account Deletion"}</Text>
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
              <Text className="text-base font-bold text-ink-900">{t("account.edit_profile_title") || "Edit Profile"}</Text>
              <Pressable onPress={() => setProfileModalVisible(false)} className="p-1 rounded-full active:bg-cream-100">
                <Ionicons name="close" size={20} color="#1a1612" />
              </Pressable>
            </View>

            <ScrollView className="p-6 max-h-[500px]">
              {/* Title Selector */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{t("account.title") || "Title"}</Text>
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
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{t("account.full_name") || "Full Name"}</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder={t("account.placeholder_name") || "e.g. John Doe"}
                placeholderTextColor="#9ca3af"
                className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-4"
              />

              {/* Email Input */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{t("account.email_address") || "Email Address"}</Text>
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder={t("account.placeholder_email") || "e.g. john@example.com"}
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-4"
              />

              {/* Phone Input */}
              <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{t("account.phone_number") || "Phone Number"}</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder={t("account.placeholder_phone") || "e.g. +919876543210"}
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
                  <Text className="text-cream-50 font-semibold text-sm">{t("account.save_changes") || "Save Changes"}</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Email Binding Modal */}
      <Modal visible={emailModalVisible} animationType="slide" transparent>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setEmailModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-cream-50 rounded-t-3xl border-t border-cream-200 overflow-hidden"
          >
            <Pressable>
              <View className="bg-white border-b border-cream-100 px-6 py-4 flex-row justify-between items-center">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-ink-900">Link Email Address</Text>
                <Pressable onPress={() => setEmailModalVisible(false)} className="p-1 rounded-full active:bg-cream-100">
                  <Ionicons name="close" size={20} color="#1a1612" />
                </Pressable>
              </View>

              <View className="p-6">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Email Address</Text>
                <TextInput
                  value={bindingEmail}
                  onChangeText={setBindingEmail}
                  placeholder="e.g. you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ fontFamily: fontFamily(false) }}
                  className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-4"
                />

                <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Password</Text>
                <TextInput
                  value={bindingPassword}
                  onChangeText={setBindingPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  autoCapitalize="none"
                  style={{ fontFamily: fontFamily(false) }}
                  className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-6"
                />

                {emailError ? (
                  <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-red-600 text-center mb-4">{emailError}</Text>
                ) : null}

                <Pressable
                  onPress={handleLinkEmail}
                  disabled={emailLoading}
                  className="w-full bg-ink-900 py-3.5 rounded-2xl items-center active:bg-ink-800 disabled:opacity-50 mb-6"
                >
                  {emailLoading ? (
                    <ActivityIndicator color="#fdfcf8" />
                  ) : (
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-cream-50 font-semibold text-sm">Link Email</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Phone Binding Modal */}
      <Modal visible={phoneModalVisible} animationType="slide" transparent>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setPhoneModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-cream-50 rounded-t-3xl border-t border-cream-200 overflow-hidden"
          >
            <Pressable>
              <View className="bg-white border-b border-cream-100 px-6 py-4 flex-row justify-between items-center">
                <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-ink-900">Link Phone Number</Text>
                <Pressable onPress={() => setPhoneModalVisible(false)} className="p-1 rounded-full active:bg-cream-100">
                  <Ionicons name="close" size={20} color="#1a1612" />
                </Pressable>
              </View>

              <View className="p-6">
                {phoneStep === 1 ? (
                  <View>
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Phone Number</Text>
                    <TextInput
                      value={bindingPhone}
                      onChangeText={setBindingPhone}
                      placeholder="e.g. +919876543210"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      style={{ fontFamily: fontFamily(false) }}
                      className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-6"
                    />

                    {phoneError ? (
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-red-600 text-center mb-4">{phoneError}</Text>
                    ) : null}

                    <Pressable
                      onPress={handleSendPhoneOtp}
                      disabled={phoneLoading}
                      className="w-full bg-ink-900 py-3.5 rounded-2xl items-center active:bg-ink-800 disabled:opacity-50 mb-6"
                    >
                      {phoneLoading ? (
                        <ActivityIndicator color="#fdfcf8" />
                      ) : (
                        <Text style={{ fontFamily: fontFamily(true) }} className="text-cream-50 font-semibold text-sm">Send OTP</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-600 mb-4">
                      OTP has been sent to {bindingPhone}.
                    </Text>

                    <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Verification Code</Text>
                    <TextInput
                      value={phoneOtp}
                      onChangeText={setPhoneOtp}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      style={{ fontFamily: fontFamily(false) }}
                      className="w-full bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 mb-6"
                    />

                    {phoneError ? (
                      <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-red-600 text-center mb-4">{phoneError}</Text>
                    ) : null}

                    <Pressable
                      onPress={handleVerifyPhoneOtp}
                      disabled={phoneLoading}
                      className="w-full bg-ink-900 py-3.5 rounded-2xl items-center active:bg-ink-800 disabled:opacity-50 mb-4"
                    >
                      {phoneLoading ? (
                        <ActivityIndicator color="#fdfcf8" />
                      ) : (
                        <Text style={{ fontFamily: fontFamily(true) }} className="text-cream-50 font-semibold text-sm">Verify OTP</Text>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => setPhoneStep(1)}
                      className="w-full py-2 items-center"
                    >
                      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs text-ink-500 font-semibold">Change Phone Number</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}
