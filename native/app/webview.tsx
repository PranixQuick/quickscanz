import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { WebView } from "react-native-webview";
import { supabase } from "../src/lib/supabase";

export default function WebViewScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const [injectedJS, setInjectedJS] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session) {
        const sessionData = {
          currentSession: {
            access_token: session.access_token,
            token_type: "bearer",
            expires_in: session.expires_in,
            refresh_token: session.refresh_token,
            user: session.user,
            expires_at: session.expires_at
          },
          expiresAt: session.expires_at
        };
        const cookieValue = encodeURIComponent(JSON.stringify(sessionData.currentSession));
        const js = `
          try {
            localStorage.setItem("sb-yqfwvnrnpydcrzomzdvr-auth-token", JSON.stringify(${JSON.stringify(sessionData)}));
            document.cookie = "sb-yqfwvnrnpydcrzomzdvr-auth-token=" + ${JSON.stringify(cookieValue)} + "; path=/; max-age=31536000; Secure; SameSite=Lax";
          } catch (e) {}
          true;
        `;
        setInjectedJS(js);
      } else {
        setInjectedJS("true;");
      }
      setLoading(false);
    }
    prepare();
  }, []);

  if (loading || !injectedJS) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#0B6E4F" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream-50">
      <Stack.Screen options={{ title: title || "QuickScanZ" }} />
      <WebView
        source={{ uri: url }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        className="flex-1"
        startInLoadingState
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center bg-cream-50">
            <ActivityIndicator color="#0B6E4F" />
          </View>
        )}
      />
    </View>
  );
}
