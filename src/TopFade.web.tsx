import React from "react";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import { type TopFadeProps } from "./TopFade";

export default function TopFade({ height, dark }: TopFadeProps) {
  const mask = "linear-gradient(to bottom, black 55%, transparent)";
  return <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0,
    height, pointerEvents: "none", maskImage: mask, WebkitMaskImage: mask }}>
    <BlurView intensity={55} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
  </div>;
}
