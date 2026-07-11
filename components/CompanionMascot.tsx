import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { PixelMascot, type MascotState } from "@/components/PixelMascot";
import { useNexus } from "@/providers/NexusProvider";
import type { MascotId, ProfessorVariant } from "@/types";

type Pixel = readonly [number, number, "body" | "soft" | "eye" | "accent"];

const ATLAS: Pixel[] = [
  [2,1,"body"],[3,1,"body"],[4,1,"body"],[5,1,"body"],[1,2,"body"],[2,2,"body"],[5,2,"body"],[6,2,"body"],
  [1,3,"body"],[2,3,"body"],[3,3,"body"],[4,3,"body"],[5,3,"body"],[6,3,"body"],[2,4,"body"],[3,4,"body"],[4,4,"body"],[5,4,"body"],
  [5,5,"body"],[6,5,"body"],[2,6,"body"],[3,6,"body"],[4,6,"body"],[5,6,"body"],
  [1,2,"soft"],[2,2,"soft"],[3,2,"soft"],[4,2,"soft"],[5,2,"soft"],[6,2,"soft"],[2,2,"eye"],[5,2,"eye"],[3,3,"accent"],[4,3,"accent"],
];
const NOVA: Pixel[] = [
  [1,1,"body"],[6,1,"body"],[1,2,"body"],[2,2,"soft"],[5,2,"soft"],[6,2,"body"],[2,3,"body"],[3,3,"soft"],[4,3,"soft"],[5,3,"body"],
  [2,4,"eye"],[3,4,"body"],[4,4,"body"],[5,4,"eye"],[2,5,"body"],[3,5,"accent"],[4,5,"accent"],[5,5,"body"],[3,6,"body"],[4,6,"body"],
];
const BYTE: Pixel[] = [
  [2,1,"accent"],[3,1,"accent"],[4,1,"accent"],[5,1,"accent"],[1,2,"body"],[2,2,"body"],[3,2,"body"],[4,2,"body"],[5,2,"body"],[6,2,"body"],
  [1,3,"body"],[2,3,"eye"],[3,3,"body"],[4,3,"body"],[5,3,"eye"],[6,3,"body"],[1,4,"body"],[2,4,"body"],[3,4,"accent"],[4,4,"accent"],[5,4,"body"],[6,4,"body"],
  [2,5,"soft"],[3,5,"soft"],[4,5,"soft"],[5,5,"soft"],[2,6,"body"],[5,6,"body"],
];
const PULSE: Pixel[] = [
  [3,1,"body"],[4,1,"body"],[2,2,"body"],[3,2,"soft"],[4,2,"soft"],[5,2,"body"],[1,3,"body"],[2,3,"soft"],[3,3,"eye"],[4,3,"eye"],[5,3,"soft"],[6,3,"body"],
  [2,4,"body"],[3,4,"accent"],[4,4,"accent"],[5,4,"body"],[2,5,"soft"],[3,5,"body"],[4,5,"body"],[5,5,"soft"],[3,6,"body"],[4,6,"body"],
];

const SHAPES: Record<Exclude<MascotId, "nexus">, Pixel[]> = { atlas: ATLAS, nova: NOVA, byte: BYTE, pulse: PULSE };
const LABELS: Record<MascotId, string> = { nexus: "Nexus", atlas: "Professor Atlas", nova: "Nova", byte: "Byte", pulse: "Pulse" };

export function CompanionMascot({ mascot, state = "idle", size = 48, variant }: { mascot: MascotId; state?: MascotState; size?: number; variant?: ProfessorVariant }) {
  const { colors, data } = useNexus();
  const lift = useRef(new Animated.Value(0)).current;
  const pixels = useMemo(() => mascot === "nexus" ? [] : SHAPES[mascot], [mascot]);
  const pixel = size / 8;

  useEffect(() => {
    if (mascot === "nexus" || data.preferences.reducedMotion || state === "sleeping") return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(lift, { toValue: -2, duration: 700, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [data.preferences.reducedMotion, lift, mascot, state]);

  if (mascot === "nexus") return <PixelMascot state={state} size={size} />;
  const professorVariant = variant ?? data.preferences.mascot.professorVariant;
  const professorColor = {
    classic: colors.primary,
    emerald: "#10B981",
    gold: "#F59E0B",
    ice: "#38BDF8",
    rose: "#EC4899",
  }[professorVariant];
  const color = (kind: Pixel[2]) => {
    if (kind === "eye") return state === "sleeping" ? colors.textSecondary : colors.text;
    if (kind === "accent") return state === "celebrating" ? colors.success : colors.warning;
    if (kind === "soft") return mascot === "atlas" ? `${professorColor}B8` : colors.primarySoft;
    return state === "warning" ? colors.warning : mascot === "atlas" ? professorColor : colors.primary;
  };

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={`${LABELS[mascot]} ${state}`}
      style={[styles.container, { width: size, height: size, transform: [{ translateY: lift }] }]}
    >
      {pixels.map(([x, y, kind], index) => (
        <View key={`${x}-${y}-${index}`} style={{ position: "absolute", left: x * pixel, top: y * pixel, width: pixel, height: pixel, backgroundColor: color(kind) }} />
      ))}
    </Animated.View>
  );
}

export const MASCOT_LABELS = LABELS;

const styles = StyleSheet.create({ container: { position: "relative" } });
