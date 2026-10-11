import React from "react";
import { colors, fonts } from "./ui";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { ActivityIndicator, View, Text } from "react-native";
export default function MobilePreview() {
  return (
    <WithSkiaWeb
      getComponent={() => import("./AppContent")}
      opts={{ locateFile: () => "/canvaskit.wasm" }}
      fallback={
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <ActivityIndicator color={colors.accent} />
          <Text style={{ fontFamily: fonts.regular, color: colors.ink }}>
            Opening your photos…
          </Text>
        </View>
      }
    />
  );
}
