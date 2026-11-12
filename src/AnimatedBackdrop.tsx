import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "./theme";

export default function AnimatedBackdrop() {
  const { colors } = useTheme();
  return <View pointerEvents="none" accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { backgroundColor: colors.ambientBackground }]} />;
}
