import React from "react";
import { StyleSheet, View } from "react-native";
import { LiquidGlassView } from "@sbaiahmed1/react-native-blur";

// The library supplies its own web blur fallback without native view managers.
export const libraryGlassEnabled = true;

export default function LibraryGlass({ radius, dark = false }: { radius: number; dark?: boolean }) {
  // Round the actual blur and tint layers. clip-path would establish a backdrop
  // root and stop the blur from sampling the content behind this surface.
  const webProps = { dataSet: { glassSurface: "true" } };
  return <View pointerEvents="none" {...webProps}
    style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
    {React.createElement("style", null,
      '[data-glass-surface="true"] > div > div { border-radius: inherit; }')}
    <LiquidGlassView
      pointerEvents="none"
      glassType="clear"
      glassTintColor={dark ? "#101B30CC" : "#FFFFFF33"}
      glassOpacity={0.9}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  </View>;
}
