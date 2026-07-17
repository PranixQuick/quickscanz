import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../features/auth/AuthProvider";
import { useI18n } from "../i18n";
import { useAariaSpeech } from "../features/aaria/useAariaSpeech";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { aariaListen } from "../features/aaria/aariaClient";

let globalLastGreetedLocale = "";

export default function FloatingAariaButton() {
  const { user } = useAuth();
  const router = useRouter();
  const { locale, t, fontFamily } = useI18n();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const aaria = useAariaSpeech(locale);

  // Sync preference when modal opens
  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem("aaria_voice_enabled").then((val) => {
        setVoiceEnabled(val === null ? true : val === "true");
      });
    }
  }, [visible]);

  const toggleVoice = async () => {
    try {
      const nextVal = !voiceEnabled;
      setVoiceEnabled(nextVal);
      await AsyncStorage.setItem("aaria_voice_enabled", String(nextVal));
      if (!nextVal) {
        aaria.stop();
      }
    } catch (err) {
      console.error("[FloatingAariaButton] toggleVoice error:", err);
    }
  };

  // Fetch profile name to greet user
  useEffect(() => {
    console.log("[FloatingAariaButton] useEffect triggered. user:", user?.id, "locale:", locale);
    if (!user) {
      globalLastGreetedLocale = "";
      setDisplayName("");
      return;
    }

    const userId = user.id;

    async function fetchProfile() {
      try {
        console.log("[FloatingAariaButton] Fetching profile for:", userId);
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();
        
        if (error) {
          console.error("[FloatingAariaButton] Profile fetch error:", error);
          return;
        }
        
        console.log("[FloatingAariaButton] Profile fetch success:", data);

        if (data?.display_name) {
          const name = data.display_name.replace(/^(Mr|Mrs|Ms)\.\s+/i, "");
          setDisplayName(name);

          // Greet user on first load or when switching locale
          if (globalLastGreetedLocale !== locale) {
            globalLastGreetedLocale = locale;
            let welcomeText = "";
            switch (locale) {
              case "ml":
                welcomeText = `സ്വാഗതം, ${name}`;
                break;
              case "hi":
                welcomeText = `स्वागत है, ${name}`;
                break;
              case "te":
                welcomeText = `స్వాగతం, ${name}`;
                break;
              case "ta":
                welcomeText = `வரவேற்கிறோம், ${name}`;
                break;
              case "kn":
                welcomeText = `ಸ್ವಾಗತ, ${name}`;
                break;
              default:
                welcomeText = `Welcome back, ${name}`;
            }
            console.log("[FloatingAariaButton] Speaking greeting:", welcomeText);
            aaria.speak(welcomeText).catch((err: any) => console.error("[FloatingAariaButton] Greeting speech error:", err));
          }
        }
      } catch (err) {
        console.error("[FloatingAariaButton] Catch block error:", err);
      }
    }
    fetchProfile();
  }, [user, locale]);


  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Microphone access is required to use speech-to-text.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (!recording) return;
    setTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const response = await aariaListen(base64Audio, { langHint: locale });
        if (response && response.text) {
          setQuery(response.text);
        }
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleAsk() {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    setQuery("");
    setLoading(true);
    setResponse("");

    // Voice navigation intent router (multilingual)
    let targetRoute = "";
    let speechConfirm = "";

    if (q.includes("home") || q.includes("ഹോം")) {
      targetRoute = "/";
      speechConfirm = locale === "ml" ? "ശരി, ഹോമിലേക്ക് പോകുന്നു" : "Sure, navigating to Home";
    } else if (q.includes("wallet") || q.includes("വാലറ്റ്")) {
      targetRoute = "/(tabs)/wallet";
      speechConfirm = locale === "ml" ? "ശരി, വാലറ്റ് കാണിക്കാം" : "Opening your Warranty Wallet";
    } else if (q.includes("scan") || q.includes("സ്കാൻ")) {
      targetRoute = "/(tabs)/scan";
      speechConfirm = locale === "ml" ? "ശരി, ഇൻവോയ്സ് സ്കാനർ തുറക്കുന്നു" : "Opening Invoice Scanner";
    } else if (q.includes("claim") || q.includes("ക്ലെയിം")) {
      targetRoute = "/(tabs)/claims";
      speechConfirm = locale === "ml" ? "ശരി, ക്ലെയിംസ് വിഭാഗത്തിലേക്ക് പോകുന്നു" : "Navigating to Claims";
    } else if (q.includes("account") || q.includes("അക്കൗണ്ട്")) {
      targetRoute = "/(tabs)/account";
      speechConfirm = locale === "ml" ? "ശരി, നിങ്ങളുടെ പ്രൊഫൈൽ വിവരങ്ങൾ കാണിക്കാം" : "Opening Account Settings";
    } else if (q.includes("upgrade") || q.includes("pricing") || q.includes("അപ്ഗ്രേഡ്")) {
      targetRoute = "/pricing";
      speechConfirm = locale === "ml" ? "ശരി, അപ്ഗ്രേഡ് ഓപ്ഷനുകൾ കാണിക്കാം" : "Sure, showing upgrade plans";
    } else if (q.includes("assistant") || q.includes("buying") || q.includes("ഷോപ്പിംഗ്")) {
      targetRoute = "/buying-assistant";
      speechConfirm = locale === "ml" ? "ശരി, ബയിംഗ് അസിസ്റ്റന്റിലേക്ക് പോകുന്നു" : "Opening Buying Assistant";
    } else if (q.includes("lifecycle") || q.includes("ലൈഫ്")) {
      targetRoute = "/lifecycle";
      speechConfirm = locale === "ml" ? "ശരി, ലൈഫ് സൈക്കിൾ പേജ് തുറക്കുന്നു" : "Opening Product Lifecycle";
    } else if (q.includes("compare") || q.includes("താരതമ്യം")) {
      targetRoute = "/compare";
      speechConfirm = locale === "ml" ? "ശരി, താരതമ്യം കാണിക്കാം" : "Opening Product Comparison";
    }

    if (targetRoute) {
      setResponse(speechConfirm);
      await aaria.speak(speechConfirm);
      setTimeout(() => {
        setVisible(false);
        router.push(targetRoute);
      }, 1000);
      setLoading(false);
      return;
    }

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


  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <View
        style={{
          position: "absolute",
          bottom: 96,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          elevation: 99,
          zIndex: 99,
        }}
      >
        <Pressable
          onPress={() => {
            setVisible(true);
            setResponse("");
            setQuery("");
          }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 28,
            backgroundColor: "#1a1612",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles" size={24} color="#fdfcf8" />
        </Pressable>
      </View>

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
                
                <View className="flex-row items-center gap-3">
                  {/* Interactive Voice Toggle */}
                  <Pressable
                    onPress={toggleVoice}
                    className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-full ${
                      voiceEnabled ? "bg-brand-50" : "bg-cream-100"
                    } active:opacity-85`}
                  >
                    <Ionicons
                      name={voiceEnabled ? "volume-medium-outline" : "volume-mute-outline"}
                      size={12}
                      color={voiceEnabled ? "#0B6E4F" : "#9ca3af"}
                    />
                    <Text
                      style={{ fontFamily: fontFamily(true) }}
                      className={`text-[8px] font-bold tracking-wider ${
                        voiceEnabled ? "text-brand-700" : "text-ink-400"
                      }`}
                    >
                      {voiceEnabled ? "VOICE ON" : "MUTED"}
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => {
                    aaria.stop();
                    setVisible(false);
                  }} className="p-1 rounded-full active:bg-cream-100">
                    <Ionicons name="close" size={20} color="#1a1612" />
                  </Pressable>
                </View>
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
                <View className="mt-4 pt-4 border-t border-cream-100">
                  <View className="flex-row gap-2">
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
                      onPress={isRecording ? stopRecording : startRecording}
                      className={`w-11 h-11 rounded-xl border items-center justify-center ${
                        isRecording ? "bg-red-50 border-red-200" : "bg-cream-50 border-cream-200"
                      }`}
                    >
                      <Ionicons
                        name={isRecording ? "stop-circle" : "mic"}
                        size={20}
                        color={isRecording ? "#ef4444" : "#1a1612"}
                      />
                    </Pressable>
                    <Pressable
                      onPress={handleAsk}
                      disabled={loading || !query.trim() || isRecording}
                      className="w-11 h-11 bg-ink-900 rounded-xl items-center justify-center active:opacity-90 disabled:opacity-40"
                    >
                      <Ionicons name="arrow-up" size={18} color="#fdfcf8" />
                    </Pressable>
                  </View>
                  {transcribing && (
                    <Text style={{ fontFamily: fontFamily(false) }} className="text-[10px] text-ink-400 text-center mt-2 animate-pulse">
                      Transcribing audio...
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}
