import { Stack } from "expo-router";
import {
  useFonts,
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../ui";
export default function RootLayout() {
  const [loaded, error] = useFonts({ SpaceMono_400Regular, SpaceMono_700Bold });
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
