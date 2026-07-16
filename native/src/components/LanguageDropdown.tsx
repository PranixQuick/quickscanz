import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n, LOCALES, LOCALE_LABELS } from "../i18n";

interface LanguageDropdownProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageDropdown({ visible, onClose }: LanguageDropdownProps) {
  const { locale, setLocale } = useI18n();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-center items-center px-6">
        <Pressable className="w-full max-w-[320px] bg-cream-50 rounded-3xl border border-cream-200 overflow-hidden shadow-xl">
          <View className="bg-white border-b border-cream-100 px-6 py-4 flex-row justify-between items-center">
            <Text className="text-base font-bold text-ink-900">Select Language</Text>
            <Pressable onPress={onClose} className="p-1 rounded-full active:bg-cream-100">
              <Ionicons name="close" size={20} color="#1a1612" />
            </Pressable>
          </View>
          <ScrollView className="max-h-[300px] p-4">
            <View className="gap-2">
              {LOCALES.map((l) => {
                const active = locale === l;
                return (
                  <Pressable
                    key={l}
                    onPress={() => {
                      setLocale(l);
                      onClose();
                    }}
                    className={`flex-row justify-between items-center px-4 py-3.5 rounded-2xl border ${
                      active ? "bg-brand-50 border-brand-500" : "bg-white border-cream-200"
                    }`}
                  >
                    <Text className={`text-sm ${active ? "font-semibold text-brand-600" : "text-ink-700"}`}>
                      {LOCALE_LABELS[l]}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color="#0B6E4F" />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
