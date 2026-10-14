import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { type Photo } from "./photos";
import PhotoEdgeMask from "./PhotoEdgeMask";
import { photoFeather } from "./photoFeather";

export default function SoftPhoto({ source, width, height }: { source: Photo["source"]; width: number; height: number }) {
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [decoded, setDecoded] = useState<{ source: Photo["source"]; width: number; height: number } | null>(null);
  const imageWidth = decoded?.source === source ? decoded.width : width;
  const imageHeight = decoded?.source === source ? decoded.height : height;
  const frame = photoFeather(imageWidth, imageHeight, bounds.width, bounds.height);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}
    onLayout={({ nativeEvent }) => setBounds(previous => previous.width === nativeEvent.layout.width && previous.height === nativeEvent.layout.height
      ? previous : { width: nativeEvent.layout.width, height: nativeEvent.layout.height })}>
    <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover"
      cachePolicy="memory-disk" transition={0} blurRadius={18} />
    <PhotoEdgeMask frame={frame}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain"
        cachePolicy="memory-disk" transition={0}
        onLoad={({ source: loaded }) => setDecoded({ source, width: loaded.width, height: loaded.height })} />
    </PhotoEdgeMask>
  </View>;
}
