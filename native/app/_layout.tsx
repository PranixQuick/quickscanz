import "../global.css";
import React, { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { View, ActivityIndicator, ScrollView, Pressable, Text } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/features/auth/AuthProvider";
import { I18nProvider } from "../src/i18n";

// ─── Custom Error Boundary for Release Build Debugging ────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (__DEV__) {
        return (
          <View className="flex-1 bg-cream-100 px-6 py-12 justify-center">
            <Text className="text-xl font-bold text-red-600 mb-2">App Error Detected</Text>
            <Text className="text-sm text-ink-500 mb-4 leading-5">
              QuickScanZ Premium encountered a rendering error. Please review the stack trace below to identify the issue:
            </Text>
            <ScrollView className="flex-1 bg-white border border-cream-300 rounded-2xl p-4 mb-6">
              <Text className="text-[10px] text-red-600 font-mono leading-4">
                {this.state.error?.stack || this.state.error?.message || "Unknown rendering exception"}
              </Text>
            </ScrollView>
            <Pressable
              onPress={() => this.setState({ hasError: false, error: null })}
              className="items-center rounded-2xl bg-brand-500 py-4 active:opacity-90 shadow-sm"
            >
              <Text className="font-semibold text-white text-sm">Reset & Try Again</Text>
            </Pressable>
          </View>
        );
      }

      // Friendly Production Error screen
      return (
        <View className="flex-1 bg-cream-50 px-6 py-12 justify-center items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-cream-100 mb-4">
            <Text className="text-2xl">⚠️</Text>
          </View>
          <Text className="text-lg font-bold text-ink-900 text-center mb-1">Something went wrong</Text>
          <Text className="text-xs text-ink-400 text-center leading-5 px-6 mb-6">
            QuickScanZ Premium encountered an unexpected rendering error. Please tap the button below to reload the app.
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            className="w-full max-w-[280px] items-center rounded-2xl bg-ink-900 py-3.5 active:bg-ink-800 shadow-sm"
          >
            <Text className="font-semibold text-cream-50 text-sm">Tap to retry</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Redirects between the (auth) and (tabs) route groups based on session state.
 */
function RootNavigation() {
  const { loading, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastSessionIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const sessionId = session?.user?.id ?? null;

    // Prevent duplicate redirects for the same session state
    if (lastSessionIdRef.current === sessionId) {
      return;
    }

    if (!session && !inAuthGroup) {
      lastSessionIdRef.current = null;
      router.replace("/login");
    } else if (session && inAuthGroup) {
      lastSessionIdRef.current = sessionId;
      router.replace("/");
    }
  }, [loading, session, segments[0], router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#fdfcf8" },
        headerTintColor: "#1a1612",
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        headerShadowVisible: false, // Clean flat look
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/unlock" options={{ headerShown: false }} />
      <Stack.Screen name="pricing" options={{ title: "Upgrade" }} />
      <Stack.Screen name="product/[id]" options={{ title: "Product Details" }} />
      <Stack.Screen name="product/add" options={{ title: "Add Product" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
