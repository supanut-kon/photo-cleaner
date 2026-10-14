import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme, useThemedStyles, type Palette, themedStyles, Glass, Icon, type IconName } from "./ui";

const tabs = [
  { value: "clean", icon: "albums-outline", activeIcon: "albums", label: "Clean up" },
  { value: "library", icon: "grid-outline", activeIcon: "grid", label: "Library" },
  { value: "edits", icon: "color-wand-outline", activeIcon: "color-wand", label: "Edits" },
] as const;
type Tab = typeof tabs[number]["value"];

export default function BottomNavigation({ selected, onSelect }: {
  selected: Tab; onSelect: (tab: Tab) => void;
}) {
  const { colors } = useTheme();
  const s = useThemedStyles(createStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const index = tabs.findIndex((tab) => tab.value === selected);
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(withTiming(index, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [index, position]);
  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * trackWidth / tabs.length }],
  }));

  return <View style={s.floating}>
    <View pointerEvents="none" style={s.surface}>
      <Glass radius={34} intensity={40} />
    </View>
    <View style={s.track} onLayout={({ nativeEvent }) => setTrackWidth(nativeEvent.layout.width)}>
      {trackWidth > 0 && <Animated.View pointerEvents="none" testID="navigation-selection"
        style={[s.selection, { width: trackWidth / tabs.length }, indicator]}>
        <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]}
          style={[StyleSheet.absoluteFill, { borderRadius: 27 }]} />
      </Animated.View>}
      {tabs.map((tab) => {
        const active = selected === tab.value;
        return <Pressable key={tab.value} accessibilityRole="tab"
          accessibilityLabel={tab.label} accessibilityState={{ selected: active }}
          onPress={() => { if (!active) onSelect(tab.value); }}
          style={({ pressed }) => [s.tab, pressed && s.pressed]}>
          <Icon name={(active ? tab.activeIcon : tab.icon) as IconName} size={22}
            color={active ? colors.accent : colors.muted} />
          <Text style={[s.label, active && s.activeLabel]}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

const createStyles = (colors: Palette) => themedStyles({
  floating: {
    position: "absolute", bottom: 18, alignSelf: "center", width: "82%",
    maxWidth: 340, height: 68, zIndex: 10, borderRadius: 34, padding: 7,
    boxShadow: "0 10px 28px rgba(40,65,100,0.18), 0 2px 6px rgba(40,65,100,0.06)",
  },
  surface: {
    ...StyleSheet.absoluteFill, borderRadius: 34, overflow: "hidden",
    borderWidth: 1, borderColor: colors.brightBorder,
    backgroundColor: colors.navigation,
  },
  track: { flex: 1, flexDirection: "row" },
  selection: {
    position: "absolute", top: 0, bottom: 0, borderRadius: 27, overflow: "hidden",
    borderWidth: 1, borderColor: colors.brightBorder,
  },
  tab: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 27 },
  pressed: { transform: [{ scale: 0.93 }] },
  label: { fontSize: 11, fontWeight: "600", color: colors.muted },
  activeLabel: { color: colors.accent, fontWeight: "700" },
});
