import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/AuthProvider";

interface OnboardingFlowProps {
  visible: boolean;
  onComplete: (displayName: string) => void;
}

export default function OnboardingFlow({ visible, onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState<"Mr" | "Mrs" | "Ms" | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!user) return;
    if (!title) {
      setError("Please select a title (Mr/Mrs/Ms).");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const displayName = `${title}. ${name.trim()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          onboarded_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (updateError) throw updateError;
      onComplete(displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-cream-50"
      >
        <View className="flex-1 justify-center px-6">
          <View className="bg-white border border-cream-200 rounded-3xl p-6 shadow-sm">
            <Text className="text-3xl font-light text-ink-900 text-center mb-2">
              Welcome! 👋
            </Text>
            <Text className="text-sm text-ink-400 text-center mb-6 leading-5">
              Let's get to know you to personalize your QuickScanZ experience.
            </Text>

            {/* Title Selection */}
            <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
              Title
            </Text>
            <View className="flex-row gap-2 mb-4">
              {(["Mr", "Mrs", "Ms"] as const).map((tVal) => (
                <Pressable
                  key={tVal}
                  onPress={() => setTitle(tVal)}
                  className={`flex-1 items-center py-2.5 rounded-xl border ${
                    title === tVal ? "bg-brand-50 border-brand-500" : "bg-white border-cream-200"
                  }`}
                >
                  <Text className={`text-sm ${title === tVal ? "font-semibold text-brand-600" : "text-ink-700"}`}>
                    {tVal}.
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Name Input */}
            <Text className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
              placeholderTextColor="#9ca3af"
              className="w-full bg-white border border-cream-300 rounded-xl px-4 py-3 text-ink-700 mb-6"
            />

            {error ? (
              <Text className="text-sm text-red-600 text-center mb-4">{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="w-full bg-ink-900 py-4 rounded-2xl items-center active:bg-ink-800 disabled:opacity-50"
            >
              {saving ? (
                <ActivityIndicator color="#fdfcf8" />
              ) : (
                <Text className="text-cream-50 font-semibold text-base">Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
