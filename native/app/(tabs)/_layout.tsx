import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../src/i18n";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  wallet: "wallet-outline",
  scan: "camera-outline",
  claims: "chatbubbles-outline",
  account: "person-outline",
};

export default function TabsLayout() {
  const { t, fontFamily } = useI18n();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1a1612",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontFamily: fontFamily(false),
          fontSize: 10,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? "ellipse-outline"} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("nav.home") || "Home" }} />
      <Tabs.Screen name="wallet" options={{ title: t("nav.wallet") || "Wallet" }} />
      <Tabs.Screen name="scan" options={{ title: t("nav.scan") || "Scan" }} />
      <Tabs.Screen name="claims" options={{ title: t("nav.claims") || "Claims" }} />
      <Tabs.Screen name="account" options={{ title: t("nav.account") || "Account" }} />
    </Tabs>
  );
}
