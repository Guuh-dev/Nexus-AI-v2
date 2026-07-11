import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";
import type { MascotSkin } from "@/types";

export type MascotState = "idle" | "thinking" | "celebrating" | "sleeping" | "warning";

const bodyPixels = [
  [2, 1], [3, 1], [4, 1], [5, 1], [1, 2], [2, 2], [5, 2], [6, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4],
  [4, 4], [5, 4], [5, 5], [6, 5], [2, 6], [3, 6], [4, 6], [5, 6],
] as const;

const SKIN_COLORS: Record<MascotSkin, string> = {
  classic: "",
  shadow: "#71717A",
  galaxy: "#7C3AED",
  emerald: "#10B981",
  gold: "#F59E0B",
  ice: "#38BDF8",
  rose: "#EC4899",
  professor: "#8B5CF6",
};

export function PixelMascot({ state = "idle", size = 48, skin, accessory }: { state?: MascotState; size?: number; skin?: MascotSkin; accessory?: string }) {
  const { colors, data } = useNexus();
  const scale = useRef(new Animated.Value(1)).current;
  const pixel = size / 8;
  const selectedSkin = skin ?? data.preferences.mascot.skin;
  const selectedAccessory = accessory === undefined ? data.preferences.mascot.equippedAccessory : accessory;
  const skinColor = SKIN_COLORS[selectedSkin] || colors.primary;
  const bodyColor = state === "warning" ? colors.warning : state === "sleeping" ? colors.textSecondary : skinColor;
  const eyeColor = state === "celebrating" ? colors.success : colors.text;
  const pixels = useMemo(() => bodyPixels, []);

  useEffect(() => {
    if (data.preferences.reducedMotion || state === "idle" || state === "sleeping") return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 420, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      { iterations: state === "celebrating" ? 3 : 2 },
    );
    animation.start();
    return () => animation.stop();
  }, [data.preferences.reducedMotion, scale, state]);

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={`Mascote Nexus ${state}`}
      style={[styles.container, { width: size, height: size, transform: [{ scale }] }]}
    >
      {pixels.map(([x, y]) => (
        <View
          key={`${x}-${y}`}
          style={{ position: "absolute", left: x * pixel, top: y * pixel, width: pixel, height: pixel, backgroundColor: bodyColor }}
        />
      ))}
      <View style={{ position: "absolute", left: 2 * pixel, top: 2 * pixel, width: pixel, height: pixel, backgroundColor: eyeColor }} />
      <View style={{ position: "absolute", left: 5 * pixel, top: 2 * pixel, width: pixel, height: pixel, backgroundColor: eyeColor }} />
      {state === "sleeping" ? (
        <View style={{ position: "absolute", left: 6.5 * pixel, top: 0, width: pixel, height: pixel / 2, backgroundColor: colors.primarySoft }} />
      ) : null}
      {selectedSkin === "professor" || selectedAccessory === "glasses" ? (
        <>
          <View style={{ position: "absolute", left: 1.4 * pixel, top: 1.65 * pixel, width: 2.1 * pixel, height: 1.7 * pixel, borderWidth: Math.max(1, pixel * 0.2), borderColor: colors.text }} />
          <View style={{ position: "absolute", left: 4.5 * pixel, top: 1.65 * pixel, width: 2.1 * pixel, height: 1.7 * pixel, borderWidth: Math.max(1, pixel * 0.2), borderColor: colors.text }} />
          <View style={{ position: "absolute", left: 3.4 * pixel, top: 2.3 * pixel, width: 1.2 * pixel, height: Math.max(1, pixel * 0.25), backgroundColor: colors.text }} />
        </>
      ) : null}
      {selectedAccessory === "crown" ? <><View style={{ position: "absolute", left: 2 * pixel, top: 0, width: pixel, height: pixel, backgroundColor: colors.warning }} /><View style={{ position: "absolute", left: 4 * pixel, top: 0, width: pixel, height: pixel, backgroundColor: colors.warning }} /><View style={{ position: "absolute", left: 3 * pixel, top: -0.5 * pixel, width: pixel, height: 1.5 * pixel, backgroundColor: colors.warning }} /></> : null}
      {selectedAccessory === "headphones" ? <><View style={{ position: "absolute", left: 0.3 * pixel, top: 2 * pixel, width: pixel, height: 2.4 * pixel, backgroundColor: colors.primarySoft }} /><View style={{ position: "absolute", left: 6.7 * pixel, top: 2 * pixel, width: pixel, height: 2.4 * pixel, backgroundColor: colors.primarySoft }} /></> : null}
      {selectedAccessory === "cap" ? <><View style={{ position: "absolute", left: 1.5 * pixel, top: 0.5 * pixel, width: 4.5 * pixel, height: pixel, backgroundColor: colors.primarySoft }} /><View style={{ position: "absolute", left: 5.5 * pixel, top: 1.2 * pixel, width: 1.5 * pixel, height: 0.6 * pixel, backgroundColor: colors.primarySoft }} /></> : null}
      {selectedAccessory === "scarf" ? <View style={{ position: "absolute", left: 2 * pixel, top: 4.2 * pixel, width: 4 * pixel, height: 0.65 * pixel, backgroundColor: colors.danger }} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
});
