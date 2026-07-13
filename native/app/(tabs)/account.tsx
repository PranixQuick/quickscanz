import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { clearSavedSession } from "../../src/lib/biometric";
import { useI18n, LOCALES, LOCALE_LABELS } from "../../src/i18n";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();

  async function handleSignOut() {
    await clearSavedSession();
    await signOut();
    router.replace("/login");
  }

  const signedInAsLabel = (() => {
    const val = t("account.signed_in_as");
    return val === "account.signed_in_as" ? "Signed in as" : val;
  })();

  const voiceLanguageLabel = (() => {
    const val = t("account.voice_language");
    return val === "account.voice_language" ? "Voice Assistant Language" : val;
  })();

  const voiceDescLabel = (() => {
    const val = t("account.voice_language_desc");
    return val === "account.voice_language_desc"
      ? "Used by Aaria's 'Read aloud' and 'Ask Aaria' voice features on product screens."
      : val;
  })();

  const confirmSignOutText = (() => {
    const val = t("account.sign_out_confirm");
    return val === "account.sign_out_confirm" ? "Are you sure you want to sign out?" : val;
  })();

  return (
    <ScrollView className="flex-1 bg-cream-100 px-6 py-12" contentContainerStyle={{ gap: 24 }}>
      {/* Signed In Header */}
      <View>
        <Text className="text-sm text-ink-500">{signedInAsLabel}</Text>
        <Text className="text-xl font-bold text-ink-700">{user?.email ?? user?.phone ?? "Unknown"}</Text>
      </View>

      {/* Upgrade Button */}
      <Pressable
        onPress={() => router.push("/pricing")}
        className="items-center rounded-2xl bg-brand-500 py-3.5 active:opacity-90"
      >
        <Text className="font-semibold text-white">
          {t("account.upgrade_to_pro") || "Upgrade to Pro"} →
        </Text>
      </Pressable>

      {/* Language Preferences */}
      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-300">
          {voiceLanguageLabel}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LOCALES.map((l) => (
            <Pressable
              key={l}
              onPress={async () => {
                await setLocale(l);
              }}
              className={`rounded-xl border px-3 py-2 ${
                locale === l ? "border-brand-500 bg-brand-500" : "border-cream-300 bg-white"
              }`}
            >
              <Text className={`text-xs ${locale === l ? "text-white" : "text-ink-500"}`}>
                {LOCALE_LABELS[l]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-2 text-[11px] text-ink-300">
          {voiceDescLabel}
        </Text>
      </View>

      {/* Sign Out Button */}
      <Pressable
        onPress={() =>
          Alert.alert(t("account.sign_out_btn") || "Sign out", confirmSignOutText, [
            { text: t("common.cancel") || "Cancel", style: "cancel" },
            { text: t("account.sign_out_btn") || "Sign out", style: "destructive", onPress: handleSignOut },
          ])
        }
        className="items-center rounded-2xl border border-red-200 bg-white py-3.5 active:opacity-90 mb-12"
      >
        <Text className="font-semibold text-red-600">
          {t("account.sign_out_btn") || "Sign out"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
