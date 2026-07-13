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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";

// Required once, at module scope, so the OAuth browser session resolves
// correctly when the app regains focus after the redirect.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  
  // Auth methods: "email" | "phone"
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  
  // Email states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Phone states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Helper to format phone numbers to E.164 (India default +91)
  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }

  async function handleEmailAuth() {
    setError("");
    setSuccessMessage("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    setBusy(true);
    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (data?.session) {
          router.replace("/");
        } else {
          setSuccessMessage("Account created! Please check your email inbox to verify your account.");
        }
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setSuccessMessage("");
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
        // User cancelled the browser session
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
    setSuccessMessage("");
    
    const formatted = formatPhone(phone);
    if (formatted.length < 13) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        phone: formatted,
        options: { channel: "sms" }
      });
      if (error) {
        setError(error.message);
        return;
      }
      setOtpSent(true);
      setSuccessMessage(`OTP code sent to ${formatted}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setSuccessMessage("");
    if (otp.length < 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    const formatted = formatPhone(phone);
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ 
        phone: formatted, 
        token: otp, 
        type: "sms" 
      });
      if (error) {
        setError("Invalid OTP code. Please check and try again.");
        return;
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-cream-100"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        className="px-6" 
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center py-12">
          
          {/* Header & Logo Section */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-3xl bg-white border border-cream-300 items-center justify-center shadow-sm mb-4">
              <Image 
                source={require("../../assets/icon.png")} 
                className="w-14 h-14 rounded-2xl" 
                resizeMode="contain" 
              />
            </View>
            <Text className="text-3xl font-extrabold tracking-tight text-ink-700">QuickScanZ</Text>
            <Text className="text-sm font-medium text-ink-500 mt-1.5 text-center">
              Securely scan and organize your warranties
            </Text>
          </View>

          {/* Premium Form Card */}
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-cream-200">
            
            {/* Tab Swapper */}
            <View className="flex-row bg-cream-100 p-1 rounded-2xl mb-6">
              <Pressable
                onPress={() => {
                  setActiveTab("email");
                  setError("");
                  setSuccessMessage("");
                }}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                  activeTab === "email" ? "bg-white shadow-xs" : ""
                }`}
              >
                <Ionicons 
                  name="mail-outline" 
                  size={16} 
                  color={activeTab === "email" ? "#0B6E4F" : "#4b5563"} 
                  style={{ marginRight: 8 }}
                />
                <Text 
                  className={`text-xs font-semibold ${
                    activeTab === "email" ? "text-brand-500 font-bold" : "text-ink-500"
                  }`}
                >
                  Email
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setActiveTab("phone");
                  setError("");
                  setSuccessMessage("");
                }}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                  activeTab === "phone" ? "bg-white shadow-xs" : ""
                }`}
              >
                <Ionicons 
                  name="call-outline" 
                  size={16} 
                  color={activeTab === "phone" ? "#0B6E4F" : "#4b5563"} 
                  style={{ marginRight: 8 }}
                />
                <Text 
                  className={`text-xs font-semibold ${
                    activeTab === "phone" ? "text-brand-500 font-bold" : "text-ink-500"
                  }`}
                >
                  Phone OTP
                </Text>
              </Pressable>
            </View>

            {/* Email Form */}
            {activeTab === "email" && (
              <View className="gap-4">
                <View className="flex-row items-center rounded-2xl border border-cream-300 bg-cream-100/50 px-4 py-1">
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email Address"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    className="flex-1 py-3.5 text-ink-700 text-sm"
                  />
                </View>

                <View className="flex-row items-center rounded-2xl border border-cream-300 bg-cream-100/50 px-4 py-1">
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry
                    autoComplete="password"
                    className="flex-1 py-3.5 text-ink-700 text-sm"
                  />
                </View>

                <Pressable
                  onPress={handleEmailAuth}
                  disabled={busy}
                  className="items-center rounded-2xl bg-brand-500 py-4 active:opacity-90 disabled:opacity-50 shadow-sm mt-2"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-semibold text-white text-sm">
                      {isSignUp ? "Sign Up" : "Sign In"}
                    </Text>
                  )}
                </Pressable>

                {/* Toggle Sign In / Sign Up Link */}
                <Pressable onPress={() => { setIsSignUp(!isSignUp); setError(""); setSuccessMessage(""); }}>
                  <Text className="text-center text-xs text-ink-500 mt-1 font-medium">
                    {isSignUp ? "Already have an account? " : "New to QuickScanZ? "}
                    <Text className="text-brand-500 font-bold underline">
                      {isSignUp ? "Sign In" : "Create Account"}
                    </Text>
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Phone OTP Form */}
            {activeTab === "phone" && (
              <View className="gap-4">
                <View className="flex-row items-center rounded-2xl border border-cream-300 bg-cream-100/50 px-4 py-1">
                  <Ionicons name="call-outline" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                  <Text className="text-ink-700 font-semibold" style={{ marginRight: 4 }}>🇮🇳 +91</Text>
                  <TextInput
                    value={phone}
                    onChangeText={(val) => setPhone(val.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    editable={!otpSent && !busy}
                    className="flex-1 py-3.5 text-ink-700 text-sm tracking-wider"
                  />
                </View>

                {otpSent && (
                  <View className="flex-row items-center rounded-2xl border border-cream-300 bg-cream-100/50 px-4 py-1">
                    <Ionicons name="shield-checkmark-outline" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                    <TextInput
                      value={otp}
                      onChangeText={(val) => setOtp(val.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP code"
                      keyboardType="number-pad"
                      editable={!busy}
                      className="flex-1 py-3.5 text-ink-700 text-sm tracking-widest"
                    />
                  </View>
                )}

                <Pressable
                  onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                  disabled={busy || (otpSent && otp.length < 6) || (!otpSent && phone.length < 10)}
                  className="items-center rounded-2xl bg-brand-500 py-4 active:opacity-90 disabled:opacity-50 shadow-sm mt-2"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-semibold text-white text-sm">
                      {otpSent ? "Verify Code" : "Send OTP Verification"}
                    </Text>
                  )}
                </Pressable>

                {otpSent && (
                  <Pressable 
                    onPress={() => { setOtpSent(false); setOtp(""); setError(""); setSuccessMessage(""); }}
                    disabled={busy}
                  >
                    <Text className="text-center text-xs text-ink-500 underline font-medium">
                      Change phone number
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Error Banner */}
            {!!error && (
              <View className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <Text className="flex-1 text-xs text-red-600 font-medium leading-4" style={{ marginLeft: 8 }}>{error}</Text>
              </View>
            )}

            {/* Success Banner */}
            {!!successMessage && (
              <View className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl flex-row items-center gap-2">
                <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
                <Text className="flex-1 text-xs text-green-700 font-medium leading-4" style={{ marginLeft: 8 }}>{successMessage}</Text>
              </View>
            )}

          </View>

          {/* Social Sign In Divider */}
          <View className="flex-row items-center gap-3 my-6">
            <View className="h-px flex-1 bg-cream-300" />
            <Text className="text-xs font-semibold text-ink-300 uppercase tracking-wider">or connect with</Text>
            <View className="h-px flex-1 bg-cream-300" />
          </View>

          {/* Google Sign In Button */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={busy}
            className="flex-row items-center justify-center rounded-2xl border border-cream-300 bg-white py-4 active:opacity-90 disabled:opacity-50 shadow-sm"
          >
            <FontAwesome name="google" size={18} color="#4b5563" style={{ marginRight: 10 }} />
            <Text className="font-semibold text-ink-700 text-sm">Continue with Google</Text>
          </Pressable>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
