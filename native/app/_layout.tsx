import "../global.css";
import React, { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { View, ActivityIndicator, ScrollView, Pressable, Text, AppState } from "react-native";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { AuthProvider, useAuth } from "../src/features/auth/AuthProvider";
import { I18nProvider, useI18n } from "../src/i18n";
import { useFonts } from "expo-font";
import HeaderLogo from "../src/components/HeaderLogo";
import FloatingAariaButton from "../src/components/FloatingAariaButton";
import { hasSavedSession, isAppUnlocked, setAppUnlocked, setRedirectPathAfterUnlock } from "../src/lib/biometric";


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
  const segments = useSegments() as string[];
  const router = useRouter();
  const lastSessionIdRef = useRef<string | null | undefined>(undefined);
  const { t } = useI18n();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const [fontsLoaded] = useFonts({
    NotoSansDevanagari_Regular: require("../assets/fonts/NotoSansDevanagari_400Regular.ttf"),
    NotoSansDevanagari_Bold: require("../assets/fonts/NotoSansDevanagari_700Bold.ttf"),
    NotoSansTelugu_Regular: require("../assets/fonts/NotoSansTelugu_400Regular.ttf"),
    NotoSansTelugu_Bold: require("../assets/fonts/NotoSansTelugu_700Bold.ttf"),
    NotoSansTamil_Regular: require("../assets/fonts/NotoSansTamil_400Regular.ttf"),
    NotoSansTamil_Bold: require("../assets/fonts/NotoSansTamil_700Bold.ttf"),
    NotoSansKannada_Regular: require("../assets/fonts/NotoSansKannada_400Regular.ttf"),
    NotoSansKannada_Bold: require("../assets/fonts/NotoSansKannada_700Bold.ttf"),
    NotoSansMalayalam_Regular: require("../assets/fonts/NotoSansMalayalam_400Regular.ttf"),
    NotoSansMalayalam_Bold: require("../assets/fonts/NotoSansMalayalam_700Bold.ttf"),
  });

  const [hasSavedBiometric, setHasSavedBiometric] = useState<boolean | null>(null);
  const [unlockedState, setUnlockedState] = useState(isAppUnlocked());

  useEffect(() => {
    hasSavedSession()
      .then((saved) => {
        setHasSavedBiometric(saved);
      })
      .catch(() => {
        setHasSavedBiometric(false);
      });
  }, []);

  // Listen to AppState for App Resume locking
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        hasSavedSession().then((saved) => {
          if (saved) {
            setAppUnlocked(false);
            setUnlockedState(false);
            const currentPath = pathnameRef.current;
            if (currentPath && currentPath !== "/unlock" && currentPath !== "/login") {
              setRedirectPathAfterUnlock(currentPath);
            }
            router.replace("/unlock");
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Keep unlockedState updated when session changes or unlocks
  useEffect(() => {
    if (session) {
      hasSavedSession().then((saved) => {
        if (!saved) {
          setAppUnlocked(true);
          setUnlockedState(true);
        }
      });
    } else {
      hasSavedSession().then((saved) => {
        if (!saved) {
          setAppUnlocked(false);
          setUnlockedState(false);
        }
      });
    }
  }, [session]);

  useEffect(() => {
    if (loading || !fontsLoaded || hasSavedBiometric === null) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onUnlockPage = segments[1] === "unlock";
    const onLoginPage = segments[1] === "login";

    const isUnlocked = isAppUnlocked() || unlockedState;

    if (hasSavedBiometric && !isUnlocked) {
      if (!onUnlockPage) {
        router.replace("/unlock");
      }
      return;
    }

    if (!session) {
      if (!hasSavedBiometric && !onLoginPage && !inAuthGroup) {
        router.replace("/login");
      }
    } else if (session && (onUnlockPage || onLoginPage)) {
      router.replace("/");
    }
  }, [loading, session, segments[0], segments[1], fontsLoaded, hasSavedBiometric, unlockedState, router]);


  if (loading || !fontsLoaded || hasSavedBiometric === null) {

    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <ActivityIndicator />
      </View>
    );
  }

  const showAaria = !!session && segments[0] !== "(auth)" && segments[1] !== "unlock" && segments[1] !== "login";

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: "#fdfcf8" },
          headerTintColor: "#1a1612",
          headerTitle: ({ children }) => <HeaderLogo title={children} />,
          headerShadowVisible: false, // Clean flat look
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/unlock" options={{ headerShown: false }} />
        <Stack.Screen name="pricing" options={{ title: t("explore.upgrade") || "Upgrade" }} />
        <Stack.Screen name="product/[id]" options={{ title: t("product.details") || "Product Details" }} />
        <Stack.Screen name="product/add" options={{ title: t("explore.add_product") || "Add Product" }} />
        <Stack.Screen name="lifecycle" options={{ title: t("explore.lifecycle") }} />
        <Stack.Screen name="compare" options={{ title: t("explore.compare") }} />
        <Stack.Screen name="buying-assistant" options={{ title: t("explore.buying_assistant") }} />
        <Stack.Screen name="smart-home" options={{ title: t("explore.smart_home") }} />
        <Stack.Screen name="energy" options={{ title: t("explore.energy_monitor") }} />
        <Stack.Screen name="family" options={{ title: t("explore.family_vault") }} />
        <Stack.Screen name="webview" options={{ title: "QuickScanZ" }} />
      </Stack>
      {showAaria && <FloatingAariaButton />}
    </View>
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
