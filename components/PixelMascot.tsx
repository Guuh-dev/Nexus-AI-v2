import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";
import type { MascotSkin } from "@/types";

export type MascotState = "idle" | "thinking" | "celebrating" | "sleeping" | "warning";
type Pixel = readonly [number, number, "body" | "soft" | "eye" | "accent" | "shade"];

const BODY: Pixel[] = [
  [4,1,"body"],[5,1,"body"],[6,1,"body"],[7,1,"body"],[3,2,"body"],[4,2,"soft"],[5,2,"soft"],[6,2,"soft"],[7,2,"soft"],[8,2,"body"],
  [2,3,"body"],[3,3,"soft"],[4,3,"eye"],[5,3,"soft"],[6,3,"soft"],[7,3,"eye"],[8,3,"soft"],[9,3,"body"],
  [2,4,"body"],[3,4,"soft"],[4,4,"soft"],[5,4,"accent"],[6,4,"accent"],[7,4,"soft"],[8,4,"soft"],[9,4,"body"],
  [3,5,"body"],[4,5,"body"],[5,5,"body"],[6,5,"body"],[7,5,"body"],[8,5,"body"],
  [5,6,"body"],[6,6,"body"],[7,6,"shade"],[8,6,"body"],[8,7,"body"],[9,7,"body"],
  [4,8,"body"],[5,8,"body"],[6,8,"body"],[7,8,"body"],[8,8,"body"],[9,8,"shade"],
  [3,9,"body"],[4,9,"soft"],[5,9,"soft"],[6,9,"soft"],[7,9,"soft"],[8,9,"body"],
  [3,10,"shade"],[4,10,"body"],[5,10,"body"],[6,10,"body"],[7,10,"body"],[8,10,"shade"],
];

const SKIN_COLORS: Record<MascotSkin, string> = { classic: "", shadow: "#71717A", galaxy: "#7C3AED", emerald: "#10B981", gold: "#F59E0B", ice: "#38BDF8", rose: "#EC4899", professor: "#8B5CF6" };

export function PixelMascot({ state = "idle", size = 48, skin, accessory }: { state?: MascotState; size?: number; skin?: MascotSkin; accessory?: string }) {
  const { colors, data } = useNexus();
  const scale = useRef(new Animated.Value(1)).current;
  const pixel = size / 12;
  const selectedSkin = skin ?? data.preferences.mascot.skin;
  const selectedAccessory = accessory === undefined ? data.preferences.mascot.equippedAccessory : accessory;
  const skinColor = SKIN_COLORS[selectedSkin] || colors.primary;
  const palette = useMemo(() => ({
    body: state === "warning" ? colors.warning : state === "sleeping" ? colors.textSecondary : skinColor,
    soft: state === "sleeping" ? colors.borderStrong : selectedSkin === "shadow" ? "#A1A1AA" : colors.primarySoft,
    eye: state === "sleeping" ? colors.textSecondary : state === "celebrating" ? colors.success : colors.text,
    accent: state === "celebrating" ? colors.success : colors.warning,
    shade: `${skinColor}A8`,
  }), [colors, selectedSkin, skinColor, state]);

  useEffect(() => {
    if (data.preferences.reducedMotion || state === "idle" || state === "sleeping") return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 420, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]), { iterations: state === "celebrating" ? 3 : 2 });
    animation.start();
    return () => animation.stop();
  }, [data.preferences.reducedMotion, scale, state]);

  const block = (x: number, y: number, width: number, height: number, color: string, key: string) => (
    <View key={key} style={{ position: "absolute", left: x * pixel, top: y * pixel, width: width * pixel, height: height * pixel, backgroundColor: color }} />
  );

  return (
    <Animated.View accessibilityRole="image" accessibilityLabel={`Mascote Nexus ${state}${selectedAccessory ? ` com ${selectedAccessory}` : ""}`} style={[styles.container, { width: size, height: size, transform: [{ scale }] }]}>
      {BODY.map(([x, y, kind], index) => block(x, y, 1, 1, palette[kind], `${x}-${y}-${index}`))}
      {state === "thinking" ? block(9, 1, 1, 1, colors.primarySoft, "thought-1") : null}
      {state === "thinking" ? block(10, 0, 1, 1, `${colors.primarySoft}99`, "thought-2") : null}
      {state === "sleeping" ? block(9, 1, 1.4, 0.45, colors.primarySoft, "sleep-1") : null}
      {state === "sleeping" ? block(10, 0, 1.2, 0.45, `${colors.primarySoft}AA`, "sleep-2") : null}
      {selectedSkin === "professor" || selectedAccessory === "glasses" ? <>
        <View style={{ position: "absolute", left: 2.8 * pixel, top: 2.55 * pixel, width: 2.4 * pixel, height: 1.7 * pixel, borderWidth: Math.max(1, pixel * .24), borderColor: colors.text, borderRadius: pixel * .25 }} />
        <View style={{ position: "absolute", left: 6.7 * pixel, top: 2.55 * pixel, width: 2.4 * pixel, height: 1.7 * pixel, borderWidth: Math.max(1, pixel * .24), borderColor: colors.text, borderRadius: pixel * .25 }} />
        {block(5.15, 3.25, 1.55, .25, colors.text, "bridge")}
      </> : null}
      {selectedAccessory === "crown" ? <>
        {block(3, .1, 1, 1.6, colors.warning, "crown-a")}{block(5.3, -.35, 1.2, 2, colors.warning, "crown-b")}{block(8, .1, 1, 1.6, colors.warning, "crown-c")}{block(3, 1.2, 6, .75, "#FDE68A", "crown-base")}
      </> : null}
      {selectedAccessory === "headphones" ? <>
        <View style={{ position: "absolute", left: 2.1 * pixel, top: 1.5 * pixel, width: 7.8 * pixel, height: 4.1 * pixel, borderTopWidth: Math.max(2, pixel * .6), borderColor: colors.primarySoft, borderRadius: 999 }} />
        {block(1.4, 3, 1.2, 3, colors.primarySoft, "phone-l")}{block(9.4, 3, 1.2, 3, colors.primarySoft, "phone-r")}
      </> : null}
      {selectedAccessory === "cap" ? <>{block(2.8, .85, 6.2, 1.2, colors.primarySoft, "cap")}{block(8.5, 1.65, 2.2, .65, colors.primarySoft, "cap-visor")}</> : null}
      {selectedAccessory === "scarf" ? <>
        {block(3, 5.15, 6.1, 1.15, colors.danger, "scarf-neck")}
        {block(7.5, 6, 1.4, 3.2, colors.danger, "scarf-tail")}
        {block(8.8, 8.3, 1.3, .8, "#FCA5A5", "scarf-tip")}
      </> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ container: { position: "relative" } });
