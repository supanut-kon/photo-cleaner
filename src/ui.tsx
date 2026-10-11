import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
export const colors = {
  bg: "#FFFEFA",
  paper: "#FFFFFF",
  ink: "#222222",
  muted: "#65616A",
  accent: "#8241BD",
  purple: "#A66DE2",
  lavender: "#E2CBF5",
  lime: "#E8F69B",
  mint: "#BAE8C9",
  yellow: "#FFE6A5",
  line: "#222222",
  coral: "#A7354B",
  peach: "#F9C5CE",
};
export const fonts = {
  regular: "SpaceMono_400Regular",
  bold: "SpaceMono_700Bold",
};
export const hardShadow = "3px 3px 0 #222222";

// Bundle the same typewriter face on both mobile platforms and the preview.
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  styles: T,
): T {
  const result = Object.fromEntries(
    Object.entries(styles).map(([key, value]) => {
      const style = value as TextStyle & ViewStyle;
      return [
        key,
        style.fontSize
          ? {
              ...style,
              fontFamily:
                style.fontWeight && Number(style.fontWeight) >= 500
                  ? fonts.bold
                  : fonts.regular,
              fontWeight: "normal",
            }
          : style,
      ];
    }),
  ) as T;
  return StyleSheet.create(result);
}
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const Icon = ({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Ionicons name={name} size={size} color={color} />;
export function Button({
  label,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.4 },
        pressed && {
          transform: [{ translateX: 2 }, { translateY: 2 }],
          boxShadow: "none",
        },
        style,
      ]}
    >
      {icon && (
        <Icon name={icon} size={19} color={secondary ? colors.ink : "white"} />
      )}
      <Text style={[s.buttonText, secondary && { color: colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  icon,
  onPress,
  label,
  style,
  color,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        pressed && {
          transform: [{ translateX: 2 }, { translateY: 2 }],
          boxShadow: "none",
        },
        style,
      ]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}
export function Pill({
  text,
  icon,
  color = colors.accent,
}: {
  text: string;
  icon?: IconName;
  color?: string;
}) {
  return (
    <View style={s.pill}>
      {icon && <Icon name={icon} size={13} color={color} />}
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}
const s = themedStyles({
  button: {
    minHeight: 52,
    borderRadius: 7,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.ink,
    boxShadow: hardShadow,
  },
  secondary: { backgroundColor: colors.yellow },
  buttonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: colors.ink,
    boxShadow: "2px 2px 0 #222222",
  },
  pill: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderRadius: 5,
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  pillText: { fontSize: 10, fontWeight: "600", letterSpacing: 0 },
});
