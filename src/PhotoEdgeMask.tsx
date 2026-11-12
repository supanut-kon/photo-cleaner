import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import NativeMaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { type FeatherFrame } from "./photoFeather";

// The library's class declaration still extends the removed NativeMethods type.
const MaskedView = NativeMaskedView as unknown as React.ComponentType<
  ViewProps & { maskElement: React.ReactElement }
>;

export default function PhotoEdgeMask({ frame, children }: { frame: FeatherFrame | null; children: React.ReactNode }) {
  if (!frame?.axis) return <View style={StyleSheet.absoluteFill}>{children}</View>;
  const horizontal = frame.axis === "horizontal";
  const edge = frame.feather / (horizontal ? frame.width : frame.height);
  return <MaskedView style={StyleSheet.absoluteFill} maskElement={
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["transparent", "black", "black", "transparent"]}
        locations={[0, edge, 1 - edge, 1]}
        start={{ x: 0, y: 0 }} end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
        style={{ position: "absolute", left: frame.x, top: frame.y, width: frame.width, height: frame.height }} />
    </View>
  }>{children}</MaskedView>;
}
