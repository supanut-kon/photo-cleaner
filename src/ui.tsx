import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from "expo-glass-effect";
import Ionicons from "@expo/vector-icons/Ionicons";
import LibraryGlass, { libraryGlassEnabled } from "./LibraryGlass";
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
export const glassShadow = "0 8px 24px rgba(61,88,125,0.12)";
export const nativeGlassAvailable = Platform.OS === "ios"
  && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

// Keep the pixel signature in the brand; general UI text uses Work Sans.
function textFont(weight: TextStyle["fontWeight"]) {
  const numericWeight = weight === "bold" ? 700 : Number(weight ?? 400);
  if (numericWeight >= 800) return fonts.extraBold;
  if (numericWeight >= 700) return fonts.bold;
  if (numericWeight >= 600) return fonts.semibold;
  if (numericWeight >= 500) return fonts.medium;
  return fonts.regular;
}
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
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

// Use Apple's native refractive material on supported iPhones. Other platforms
// retain a clear, light backdrop blur rather than an opaque imitation.
export function Glass({ blurTarget, intensity = 35, radius = 20 }: {
  blurTarget?: React.RefObject<View | null>;
  intensity?: number;
  radius?: number;
}) {
  const { dark } = useTheme();
  if (libraryGlassEnabled) return <LibraryGlass radius={radius} dark={dark} />;
  if (nativeGlassAvailable) {
    return <GlassView
      glassEffectStyle="regular"
      colorScheme={dark ? "dark" : "light"}
      isInteractive
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
      <BlurView
        tint={dark ? "dark" : "light"}
        intensity={Math.min(intensity, 24)}
        blurTarget={blurTarget}
        blurMethod={Platform.OS === "android" && blurTarget ? "dimezisBlurView" : "none"}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <LinearGradient
        colors={dark ? ["rgba(12,21,36,0.75)", "rgba(18,30,48,0.5)", "rgba(25,42,65,0.65)"] : ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.28)"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
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
          transform: [{ scale: 0.98 }],
        },
        style,
      ]}
    >
      <Glass intensity={25} />
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
          transform: [{ scale: 0.95 }],
        },
        style,
      ]}
    >
      <Glass radius={22} />
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
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: glassShadow,
  },
  secondary: { backgroundColor: colors.paper },
  buttonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: glassShadow,
  },
  pill: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillText: { fontSize: 11, fontWeight: "600", letterSpacing: 0 },
});
