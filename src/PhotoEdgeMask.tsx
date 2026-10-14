import React from "react";
import { StyleSheet, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { type FeatherFrame } from "./photoFeather";

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
