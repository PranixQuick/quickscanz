import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  wallet: "wallet-outline",
  scan: "camera-outline",
  claims: "chatbubbles-outline",
  account: "person-outline",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1a1612",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? "ellipse-outline"} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="claims" options={{ title: "Claims" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
