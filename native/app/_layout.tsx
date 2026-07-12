import "../global.css";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/features/auth/AuthProvider";

/**
 * Redirects between the (auth) and (tabs) route groups based on session state.
 * NOTE (M1 known gap): this only gates on "is there a Supabase session" — it
 * does not yet force the biometric /unlock screen on cold start/resume. Wiring
 * that in (bootstrap from SecureStore via src/lib/biometric.ts before trusting
 * AsyncStorage's session, then require a successful unlock) is a follow-up.
 */
function RootNavigation() {
  const { loading, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [loading, session, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/unlock" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
