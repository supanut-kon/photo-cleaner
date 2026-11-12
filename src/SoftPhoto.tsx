import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { type Photo } from "./photos";
import { useTheme } from "./theme";

export default function SoftPhoto({ source }: { source: Photo["source"]; width: number; height: number }) {
  const { colors } = useTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.lavender }]}>
    <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain"
      cachePolicy="memory-disk" transition={0} />
  </View>;
}
