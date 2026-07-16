import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../features/auth/AuthProvider";
import { useI18n } from "../i18n";
import { useAariaSpeech } from "../features/aaria/useAariaSpeech";
import { supabase } from "../lib/supabase";

export default function FloatingAariaButton() {
  const { user } = useAuth();
  const { locale, t, fontFamily } = useI18n();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const aaria = useAariaSpeech(locale);

  // Fetch profile name to greet user
  useEffect(() => {
    if (!user) {
      setGreeted(false);
      setDisplayName("");
      return;
    }

    const userId = user.id;

    async function fetchProfile() {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();
        if (data?.display_name) {
          const name = data.display_name.replace(/^(Mr|Mrs|Ms)\.\s+/i, "");
          setDisplayName(name);

          // Greet user on first load
          if (!greeted) {
            setGreeted(true);
            const welcomeText = locale === "ml" ? `സ്വാഗതം, ${name}` : `Welcome back, ${name}`;
            await aaria.speak(welcomeText);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfile();
  }, [user, locale]);


  if (!user) return null;

  async function handleAsk() {
    if (!query.trim()) return;
    const q = query.trim();
    setQuery("");
    setLoading(true);
    setResponse("");

    try {
      const answer = await aaria.ask(q, (understood) => {
        // Resolve intent on-device
        if (understood.intent === "get_warranty_status") {
          return "I can help you check your warranties. Please select a product from your wallet to view detailed status.";
        }
        if (understood.intent === "register_product") {
          return "To register a product, tap the scan button on your home tab or fill the form in Add Product.";
        }
        return "I am Aaria, your voice assistant. I am here to help you manage your warranties and file claims.";
      });
      if (answer) {
        setResponse(answer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          setVisible(true);
          setResponse("");
          setQuery("");
        }}
        className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-ink-900 items-center justify-center shadow-lg z-50 active:opacity-90"
      >
        <Ionicons name="sparkles" size={24} color="#fdfcf8" />
      </Pressable>

      {/* Voice Assistant Overlay Modal */}
      <Modal visible={visible} animationType="slide" transparent>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => {
          aaria.stop();
          setVisible(false);
        }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-cream-50 rounded-t-3xl border-t border-cream-200 overflow-hidden"
          >
            <Pressable>
              {/* Header */}
              <View className="bg-white border-b border-cream-100 px-6 py-4 flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <Text style={{ fontFamily: fontFamily(true) }} className="text-base font-bold text-ink-900">
                    Pranix Aaria
                  </Text>
                  <Text className="text-[10px] bg-cream-200 text-ink-500 px-2 py-0.5 rounded-full font-bold uppercase">
                    {locale}
                  </Text>
                </View>
                <Pressable onPress={() => {
                  aaria.stop();
                  setVisible(false);
                }} className="p-1 rounded-full active:bg-cream-100">
                  <Ionicons name="close" size={20} color="#1a1612" />
                </Pressable>
              </View>

              {/* Body */}
              <View className="p-6 min-h-[220px]">
                {/* Listening/Speaking State */}
                {loading ? (
                  <View className="items-center justify-center py-6">
                    <ActivityIndicator size="small" color="#1a1612" />
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mt-2">
                      Thinking...
                    </Text>
                  </View>
                ) : aaria.speaking ? (
                  <View className="items-center justify-center py-6">
                    <View className="flex-row gap-1.5 items-center mb-3">
                      <View className="w-1.5 h-6 bg-brand-500 rounded-full" />
                      <View className="w-1.5 h-8 bg-brand-600 rounded-full" />
                      <View className="w-1.5 h-6 bg-brand-500 rounded-full" />
                    </View>
                    <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-brand-600">
                      Speaking...
                    </Text>
                  </View>
                ) : (
                  <View className="py-4 items-center">
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-sm text-ink-600 text-center leading-5 px-4">
                      {response || "I am Aaria, your voice assistant. Ask me anything about your product warranties or claims."}
                    </Text>
                  </View>
                )}

                {/* Input Query Bar */}
                <View className="flex-row gap-2 mt-4 pt-4 border-t border-cream-100">
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleAsk}
                    placeholder="Ask Aaria (e.g. Check my warranty status)"
                    placeholderTextColor="#9ca3af"
                    style={{ fontFamily: fontFamily(false) }}
                    className="flex-1 bg-white border border-cream-300 rounded-xl px-4 py-2.5 text-ink-700 text-sm"
                  />
                  <Pressable
                    onPress={handleAsk}
                    disabled={loading || !query.trim()}
                    className="w-11 h-11 bg-ink-900 rounded-xl items-center justify-center active:opacity-90 disabled:opacity-40"
                  >
                    <Ionicons name="arrow-up" size={18} color="#fdfcf8" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}
