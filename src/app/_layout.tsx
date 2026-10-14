import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
  WorkSans_800ExtraBold,
} from "@expo-google-fonts/work-sans";
import { ActivityIndicator, View } from "react-native";
import { ThemeProvider, useTheme } from "../theme";
import { useEffect } from "react";
import * as SystemUI from "expo-system-ui";

export default function RootLayout() {
  return <ThemeProvider><ThemedLayout /></ThemeProvider>;
}
function ThemedLayout() {
  const { colors } = useTheme();
  useEffect(() => { void SystemUI.setBackgroundColorAsync(colors.bg); }, [colors.bg]);
  const [loaded, error] = useFonts({
    GeistPixel: require("../../assets/fonts/GeistPixel-Square.ttf"),
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    WorkSans_800ExtraBold,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
