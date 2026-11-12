import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AnimatedBackdrop from "./AnimatedBackdrop";
import { useTheme, type Palette } from "./theme";
export { useTheme } from "./theme";
export type { Palette } from "./theme";
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return React.useMemo(() => factory(colors), [factory, colors]);
}
export const fonts = {
  regular: "WorkSans_400Regular",
  medium: "WorkSans_500Medium",
  semibold: "WorkSans_600SemiBold",
  bold: "WorkSans_700Bold",
  extraBold: "WorkSans_800ExtraBold",
  display: "GeistPixel",
};
export const hardShadow = "4px 4px 0 #151512";

// Keep the pixel signature in the brand; general UI text uses Work Sans.
function textFont(weight: TextStyle["fontWeight"]) {
  const numericWeight = weight === "bold" ? 700 : Number(weight ?? 400);
  if (numericWeight >= 800) return fonts.extraBold;
  if (numericWeight >= 700) return fonts.bold;
  if (numericWeight >= 600) return fonts.semibold;
  if (numericWeight >= 500) return fonts.medium;
  return fonts.regular;
}
export function themedStyles<T extends { [K in keyof T]: ViewStyle | TextStyle | ImageStyle }>(
  styles: T,
): T {
  const result = Object.fromEntries(
    Object.entries(styles).map(([key, value]) => {
      const style = value as TextStyle & ViewStyle;
      return [
        key,
        (style.fontSize || style.fontWeight)
          ? {
              ...style,
              fontFamily:
                key === "wordmark"
                  ? fonts.display : textFont(style.fontWeight),
              fontWeight: "normal" as const,
            }
          : style,
      ];
    }),
  ) as T;
  return StyleSheet.create(result);
}
export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function Backdrop() {
  return <AnimatedBackdrop />;
}

export const Icon = ({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.ink} />;
};
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
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
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
          transform: [{ translateX: 3 }, { translateY: 3 }],
          boxShadow: "none",
        },
        style,
      ]}
    >
      {icon && (
        <Icon name={icon} size={19} color={colors.ink} />
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
  const s = useThemedStyles(createStyles);
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
  color,
}: {
  text: string;
  icon?: IconName;
  color?: string;
}) {
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
  return (
    <View style={s.pill}>
      {icon && <Icon name={icon} size={13} color={color ?? colors.accent} />}
      <Text style={[s.pillText, { color: color ?? colors.accent }]}>{text}</Text>
    </View>
  );
}
const createStyles = (colors: Palette) => themedStyles({
  button: {
    minHeight: 52,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.line,
    boxShadow: hardShadow,
  },
  secondary: { backgroundColor: colors.paper },
  buttonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 4,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.line,
    boxShadow: hardShadow,
  },
  pill: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderRadius: 4,
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: colors.line,
  },
  pillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0 },
});
