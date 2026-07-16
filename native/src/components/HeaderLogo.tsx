import React from "react";
import { View, Text, Image } from "react-native";

import { useI18n } from "../i18n";

interface HeaderLogoProps {
  title?: string;
  showText?: boolean;
}

export default function HeaderLogo({ title, showText = true }: HeaderLogoProps) {
  const { fontFamily } = useI18n();

  return (
    <View className="flex-row items-center gap-2.5">
      <Image
        source={require("../../assets/icon.png")}
        style={{ width: 24, height: 24, borderRadius: 6 }}
        resizeMode="contain"
      />
      {showText && (
        <Text
          style={{ fontFamily: fontFamily(true) }}
          className="text-base font-bold text-ink-900 tracking-tight"
        >
          {title || "QuickScanZ"}
        </Text>
      )}
    </View>
  );
}

