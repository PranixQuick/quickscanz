import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../src/i18n";
import { useAariaSpeech } from "../../src/features/aaria/useAariaSpeech";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  wallet: "wallet-outline",
  scan: "camera-outline",
  claims: "chatbubbles-outline",
  account: "person-outline",
};

const TAB_SPEECH: Record<string, Record<string, string>> = {
  index: {
    en: "Sure, navigating to Home",
    ml: "ശരി, ഹോമിലേക്ക് പോകുന്നു",
    hi: "बिल्कुल, होम पर जा रहे हैं",
    te: "తప్పకుండా, హోమ్ కి వెళ్తున్నాము",
    ta: "நிச்சயமாக, முகப்பு பக்கத்திற்கு செல்கிறது",
    kn: "ಖಂಡಿತ, ಮುಖಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇವೆ",
  },
  wallet: {
    en: "Opening your Warranty Wallet",
    ml: "ശരി, വാലറ്റ് കാണിക്കാം",
    hi: "आपका वारंटी वॉलेट खोल रहे हैं",
    te: "మీ వారంటీ వాలెట్ ఓపెన్ చేస్తున్నాము",
    ta: "உங்கள் வாரண்டி வாலட்டைத் திறக்கிறது",
    kn: "ನಿಮ್ಮ ವಾರಂಟಿ ವ್ಯಾಲೆಟ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ",
  },
  scan: {
    en: "Opening Invoice Scanner",
    ml: "ശരി, ഇൻവോയ്സ് സ്കാനർ തുറക്കുന്നു",
    hi: "इन्वॉयस स्कैनर खोल रहे हैं",
    te: "ఇన్వాయిస్ స్కానర్ ఓపెన్ చేస్తున్నాము",
    ta: "இன்வாய்ஸ் ஸ்கேனரைத் திறக்கிறது",
    kn: "ಇನ್‌ವಾಯ್ಸ್ ಸ್ಕ್ಯಾನರ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ",
  },
  claims: {
    en: "Navigating to Claims",
    ml: "ശരി, ക്ലെയിംസ് വിഭാഗത്തിലേക്ക് പോകുന്നു",
    hi: "दावे अनुभाग पर जा रहे हैं",
    te: "క్లెయిమ్స్ కి వెళ్తున్నాము",
    ta: "உரிமைகோரல்கள் பக்கத்திற்கு செல்கிறது",
    kn: "ಕ್ಲೈಮ್‌ಗಳ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇವೆ",
  },
  account: {
    en: "Opening Account Settings",
    ml: "ശരി, നിങ്ങളുടെ പ്രൊഫൈൽ വിവരങ്ങൾ കാണിക്കാം",
    hi: "खाता सेटिंग्स खोल रहे हैं",
    te: "ఖాతా సెట్టింగులను ఓపెన్ చేస్తున్నాము",
    ta: "கணக்கு அமைப்புகளைத் திறக்கிறது",
    kn: "ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ",
  },
};

export default function TabsLayout() {
  const { locale, t, fontFamily } = useI18n();
  const aaria = useAariaSpeech(locale);

  const getSpeechListener = (tabName: string) => ({
    tabPress: () => {
      console.log("[TabsLayout] tabPress triggered for:", tabName);
      aaria.stop().catch(() => {});
      AsyncStorage.getItem("aaria_voice_enabled")
        .then((val) => {
          const enabled = val === null ? true : val === "true";
          console.log("[TabsLayout] voice enabled:", enabled);
          if (!enabled) return;

          const speechMap = TAB_SPEECH[tabName];
          const text = speechMap?.[locale] ?? speechMap?.["en"] ?? "";
          console.log("[TabsLayout] speaking text:", text);
          if (text) {
            aaria.speak(text).catch((err: any) => console.error("[TabsLayout] Speech error:", err));
          }
        })
        .catch((err) => {
          console.error("[TabsLayout] AsyncStorage error:", err);
        });
    },
  });

  return (
    <Tabs
      key={locale}
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
      <Tabs.Screen
        name="index"
        options={{ title: t("nav.home") || "Home" }}
        listeners={getSpeechListener("index")}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: t("nav.wallet") || "Wallet" }}
        listeners={getSpeechListener("wallet")}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: t("nav.scan") || "Scan" }}
        listeners={getSpeechListener("scan")}
      />
      <Tabs.Screen
        name="claims"
        options={{ title: t("nav.claims") || "Claims" }}
        listeners={getSpeechListener("claims")}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t("nav.account") || "Account" }}
        listeners={getSpeechListener("account")}
      />
    </Tabs>
  );
}
