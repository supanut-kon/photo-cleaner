import React from "react";
import { StyleSheet } from "react-native";
import { isRunningInExpoGo } from "expo";
import { loadGlassBackend } from "./glassBackend";

const backend = loadGlassBackend(
  isRunningInExpoGo(),
  process.env.EXPO_PUBLIC_GLASS_BACKEND === "library",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Static imports would initialize an unavailable native module in Expo Go.
  () => require("@sbaiahmed1/react-native-blur") as typeof import("@sbaiahmed1/react-native-blur"),
);

export const libraryGlassEnabled = backend !== null;

export default function LibraryGlass({ radius, dark = false }: { radius: number; dark?: boolean }) {
  if (!backend) return null;
  const { LiquidGlassView } = backend;
  return <LiquidGlassView
    glassType="clear"
    glassTintColor={dark ? "#101B30CC" : "#FFFFFF33"}
    glassOpacity={0.9}
    isInteractive
    ignoreSafeArea={false}
    reducedTransparencyFallbackColor={dark ? "#101722" : "#F4F6FA"}
    style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
  />;
}
