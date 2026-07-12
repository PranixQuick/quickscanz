import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getSessionWithBiometric, hasBiometric } from "../../src/lib/biometric";
import { supabase } from "../../src/lib/supabase";

export default function UnlockScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hasBiometric().then((v) => {
      setAvailable(v);
      setChecking(false);
    });
  }, []);

  async function unlock() {
    setError("");
    setChecking(true);
    try {
      const session = await getSessionWithBiometric();
      if (!session) {
        setError("Unable to unlock. Please sign in again.");
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/");
    } finally {
      setChecking(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-cream-100 px-8">
      <Text className="text-2xl font-bold text-ink-700">Welcome back</Text>
      <Text className="text-center text-ink-500">
        {available
          ? "Use your fingerprint or face to unlock QuickScanZ."
          : "Biometric unlock is not available on this device."}
      </Text>

      {checking ? (
        <ActivityIndicator />
      ) : (
        <Pressable onPress={unlock} className="rounded-2xl bg-brand-500 px-8 py-3.5 active:opacity-90">
          <Text className="font-semibold text-white">Unlock</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.replace("/login")}>
        <Text className="text-sm text-ink-500 underline">Sign in with a different account</Text>
      </Pressable>

      {!!error && <Text className="text-center text-sm text-red-600">{error}</Text>}
    </View>
  );
}
