import { View, Text } from "react-native";

export default function ClaimsScreen() {
  return (
    <View className="flex-1 gap-3 bg-cream-100 px-6 py-12">
      <Text className="text-2xl font-bold text-ink-700">Claims</Text>
      <Text className="text-ink-500">
        The Aaria claim assistant lands in M3. This screen will mirror the web claim flow
        (/claim), calling the same Supabase-backed claim session tables and AI endpoints.
      </Text>
    </View>
  );
}
