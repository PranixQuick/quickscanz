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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/unlock" />
      <Stack.Screen name="(tabs)" />
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
