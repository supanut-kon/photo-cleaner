import React, { type RefObject } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import NativeMaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export type TopFadeProps = { height: number; target: RefObject<React.ComponentRef<typeof View> | null>; dark: boolean };

// Match the existing mask adapter: upstream still declares the removed NativeMethods type.
const MaskedView = NativeMaskedView as unknown as React.ComponentType<
  ViewProps & { maskElement: React.ReactElement }
>;

// Only blur the status-bar edge; the transparent end avoids a hard cutoff.
export default function TopFade({ height, target, dark }: TopFadeProps) {
  return <View pointerEvents="none" style={[styles.edge, { height }]}>
    <MaskedView style={StyleSheet.absoluteFill} maskElement={
      <LinearGradient colors={["black", "black", "transparent"]}
        locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
    }>
      <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus"
        intensity={55} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
    </MaskedView>
  </View>;
}
const styles = StyleSheet.create({ edge: { position: "absolute", top: 0, left: 0, right: 0 } });
