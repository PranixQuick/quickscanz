import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useI18n } from "../src/i18n";

interface FamilyMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function FamilyScreen() {
  const { user } = useAuth();
  const { t, fontFamily } = useI18n();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  async function loadMembers() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id);
      if (!error && data) {
        setMembers(data as FamilyMember[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, [user]);

  async function handleInvite() {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert(t("common.error") || "Error", t("family.invalid_email") || "Please enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      const { error } = await supabase.from("family_members").insert({
        user_id: user?.id,
        email: email.trim(),
        role: "member",
      });
      if (error) throw error;
      Alert.alert(t("common.success") || "Success", t("family.invite_success") || "Invitation sent successfully.");
      setEmail("");
      loadMembers();
    } catch (err) {
      Alert.alert(t("common.error") || "Error", err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
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
        {t("explore.family_vault")}
      </Text>
      <Text style={{ fontFamily: fontFamily(false) }} className="text-xs text-ink-400 mb-6 leading-5">
        {t("explore.family_vault_desc")}
      </Text>

      {/* Invite member form */}
      <View className="bg-white border border-cream-200 rounded-3xl p-5 mb-6 shadow-sm space-y-4">
        <View>
          <Text style={{ fontFamily: fontFamily(true) }} className="text-[10px] font-bold text-ink-500 uppercase mb-1.5">
            {t("family.invite_label") || "Add Family Member by Email"}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="e.g. spouse@family.com"
            placeholderTextColor="#9ca3af"
            style={{ fontFamily: fontFamily(false) }}
            className="w-full bg-cream-50 border border-cream-100 rounded-2xl px-4 py-3 text-ink-900 text-sm mb-3"
          />
        </View>

        <Pressable
          onPress={handleInvite}
          disabled={inviting}
          className="w-full bg-ink-900 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 active:bg-ink-800 disabled:opacity-50"
        >
          {inviting ? (
            <ActivityIndicator color="#fdfcf8" size="small" />
          ) : (
            <>
              <Ionicons name="person-add" size={16} color="#fdfcf8" />
              <Text style={{ fontFamily: fontFamily(true) }} className="font-semibold text-cream-50 text-sm">
                {t("family.invite_button") || "Invite Member"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-500 uppercase mb-3">
        {t("family.members_list") || "Vault Members"}
      </Text>

      {members.length === 0 ? (
        <View className="bg-white border border-cream-200 rounded-3xl p-6 items-center">
          <Ionicons name="people-outline" size={32} color="#9ca3af" />
          <Text style={{ fontFamily: fontFamily(true) }} className="text-sm font-semibold text-ink-800 mt-3 text-center">
            {t("family.no_members") || "You are the only member in this vault. Add family members to share access to warranties and invoices."}
          </Text>
        </View>
      ) : (
        members.map((member) => (
          <View key={member.id} className="bg-white border border-cream-200 rounded-3xl p-4 mb-4 shadow-sm flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-cream-100 items-center justify-center">
                <Ionicons name="person" size={14} color="#1a1612" />
              </View>
              <View>
                <Text style={{ fontFamily: fontFamily(true) }} className="text-xs font-bold text-ink-900">
                  {member.email}
                </Text>
                <Text style={{ fontFamily: fontFamily(false) }} className="text-[9px] text-ink-400">
                  Joined on {new Date(member.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View className="bg-cream-100 px-2.5 py-0.5 rounded-full">
              <Text style={{ fontFamily: fontFamily(true) }} className="text-[9px] font-bold text-ink-500 uppercase">
                {member.role}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
