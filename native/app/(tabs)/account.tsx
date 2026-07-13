import { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { clearSavedSession } from "../../src/lib/biometric";
import { getLocale, setLocale as persistLocale, LOCALES, type Locale } from "../../src/lib/locale";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    getLocale().then(setLocaleState);
  }, []);

  async function handleSignOut() {
    await clearSavedSession();
    await signOut();
    router.replace("/login");
  }

  async function handleLocaleChange(next: Locale) {
    setLocaleState(next);
    await persistLocale(next);
  }

  return (
    <ScrollView className="flex-1 bg-cream-100 px-6 py-12" contentContainerStyle={{ gap: 24 }}>
      <View>
        <Text className="text-sm text-ink-500">Signed in as</Text>
        <Text className="text-xl font-bold text-ink-700">{user?.email ?? user?.phone ?? "Unknown"}</Text>
      </View>

      <Pressable
        onPress={() => router.push("/pricing")}
        className="items-center rounded-2xl bg-brand-500 py-3.5 active:opacity-90"
      >
        <Text className="font-semibold text-white">Upgrade to Pro →</Text>
      </Pressable>

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-300">
          Voice assistant language
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LOCALES.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => handleLocaleChange(l.code)}
              className={`rounded-xl border px-3 py-2 ${
                locale === l.code ? "border-brand-500 bg-brand-500" : "border-cream-300 bg-white"
              }`}
            >
              <Text className={`text-xs ${locale === l.code ? "text-white" : "text-ink-500"}`}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-2 text-[11px] text-ink-300">
          Used by Aaria&apos;s &quot;Read aloud&quot; and &quot;Ask Aaria&quot; voice features on product screens.
        </Text>
      </View>

      <Pressable
        onPress={() =>
          Alert.alert("Sign out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", style: "destructive", onPress: handleSignOut },
          ])
        }
        className="items-center rounded-2xl border border-red-200 bg-white py-3.5 active:opacity-90"
      >
        <Text className="font-semibold text-red-600">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
