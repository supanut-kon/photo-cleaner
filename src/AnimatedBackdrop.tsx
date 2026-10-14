import React, { useEffect, useId, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "./theme";
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useReducedMotion,
  useSharedValue, withRepeat, withTiming, type SharedValue,
} from "react-native-reanimated";

function ColorCloud({ color, name, size, left, top, offset, phase, opacity }: {
  color: string; name: string; size: number; left: number; top: number;
  offset: number; phase: SharedValue<number>;
  opacity: number;
}) {
  const gradientId = `cloud-${useId().replace(/:/g, "")}`;
  const motion = useAnimatedStyle(() => {
    const angle = phase.get() * Math.PI * 2 + offset;
    return {
      transform: [
        { translateX: Math.sin(angle) * size * 0.19 },
        { translateY: Math.cos(angle) * size * 0.16 },
        { scale: 1 + Math.sin(angle + 1) * 0.12 },
      ],
    };
  });
  return <Animated.View testID={`ambient-color-${name}`} style={[
    { position: "absolute", width: size, height: size, left, top }, motion,
  ]}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.3" stopColor={color} stopOpacity={opacity * (0.46 / 0.7)} />
          <Stop offset="0.65" stopColor={color} stopOpacity={opacity * (0.15 / 0.7)} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${gradientId})`} />
    </Svg>
  </Animated.View>;
}

export default function AnimatedBackdrop() {
  const { colors } = useTheme();
  const [bounds, setBounds] = useState({ width: 390, height: 844 });
  const phase = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const update = (state: string) => {
      cancelAnimation(phase);
      if (state === "active" && !reducedMotion) {
        phase.set(0);
        phase.set(withRepeat(withTiming(1, {
          duration: 28000, easing: Easing.linear,
        }), -1, false));
      }
    };
    update(AppState.currentState);
    const subscription = AppState.addEventListener("change", update);
    return () => { subscription.remove(); cancelAnimation(phase); };
  }, [phase, reducedMotion]);

  // Feathered vector gradients avoid continuously blurring a full-screen image.
  const size = bounds.width * 1.55;
  return <View pointerEvents="none" accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    onLayout={({ nativeEvent }) => setBounds(nativeEvent.layout)}
    style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: colors.ambientBackground }]}>
    <ColorCloud name="blue" color="#8C9BFF" size={size} opacity={colors.cloudOpacity}
      left={-size * 0.42} top={-size * 0.22} offset={0} phase={phase} />
    <ColorCloud name="peach" color="#FFB09F" size={size} opacity={colors.cloudOpacity}
      left={bounds.width - size * 0.64} top={bounds.height * 0.34}
      offset={2.1} phase={phase} />
    <ColorCloud name="mint" color="#94DFC0" size={size} opacity={colors.cloudOpacity}
      left={-size * 0.27} top={bounds.height - size * 0.65}
      offset={4.2} phase={phase} />
  </View>;
}
