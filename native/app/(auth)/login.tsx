import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../../src/lib/supabase";

// Required once, at module scope, so the OAuth browser session resolves
// correctly when the app regains focus after the redirect.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone sign-in is optional and collapsed by default — mirrors the fixed
  // web flow which no longer forces a phone step.
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailLogin() {
    setError("");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setBusy(true);
    try {
      const redirectTo = Linking.createURL("auth/callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data?.url) {
        setError("Could not start Google sign-in.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success" && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const code = queryParams?.code as string | undefined;
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        }
      } else {
        // User cancelled/dismissed the browser — not an error state.
        return;
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp() {
    setError("");
    if (!phone) {
      setError("Enter a phone number.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        setError(error.message);
        return;
      }
      setOtpSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-cream-100"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6" keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center gap-6 py-12">
          <View className="gap-1">
            <Text className="text-3xl font-bold text-ink-700">QuickScanZ</Text>
            <Text className="text-base text-ink-500">Sign in to your warranty wallet.</Text>
          </View>

          <View className="gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="rounded-2xl border border-cream-300 bg-white px-4 py-3.5 text-ink-700"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoComplete="password"
              className="rounded-2xl border border-cream-300 bg-white px-4 py-3.5 text-ink-700"
            />
            <Pressable
              onPress={handleEmailLogin}
              disabled={busy}
              className="items-center rounded-2xl bg-brand-500 py-3.5 active:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Sign in</Text>
              )}
            </Pressable>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-cream-300" />
            <Text className="text-xs text-ink-300">or</Text>
            <View className="h-px flex-1 bg-cream-300" />
          </View>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={busy}
            className="items-center rounded-2xl border border-cream-300 bg-white py-3.5 active:opacity-90 disabled:opacity-50"
          >
            <Text className="font-medium text-ink-700">Continue with Google</Text>
          </Pressable>

          <Pressable onPress={() => setShowPhone((v) => !v)}>
            <Text className="text-center text-sm text-ink-500 underline">
              {showPhone ? "Hide phone sign-in" : "Use phone number instead"}
            </Text>
          </Pressable>

          {showPhone && (
            <View className="gap-3">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91XXXXXXXXXX"
                keyboardType="phone-pad"
                editable={!otpSent}
                className="rounded-2xl border border-cream-300 bg-white px-4 py-3.5 text-ink-700"
              />
              {otpSent && (
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter OTP"
                  keyboardType="number-pad"
                  className="rounded-2xl border border-cream-300 bg-white px-4 py-3.5 text-ink-700"
                />
              )}
              <Pressable
                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={busy}
                className="items-center rounded-2xl bg-ink-700 py-3.5 active:opacity-90 disabled:opacity-50"
              >
                <Text className="font-semibold text-white">{otpSent ? "Verify code" : "Send code"}</Text>
              </Pressable>
            </View>
          )}

          {!!error && <Text className="text-center text-sm text-red-600">{error}</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
