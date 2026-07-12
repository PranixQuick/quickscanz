import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { clearSavedSession } from "../../src/lib/biometric";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await clearSavedSession();
    await signOut();
    router.replace("/login");
  }

  return (
    <View className="flex-1 gap-6 bg-cream-100 px-6 py-12">
      <View>
        <Text className="text-sm text-ink-500">Signed in as</Text>
        <Text className="text-xl font-bold text-ink-700">{user?.email ?? "Unknown"}</Text>
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
    </View>
  );
}
