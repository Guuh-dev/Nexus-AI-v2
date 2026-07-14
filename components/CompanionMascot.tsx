import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { PixelMascot, type MascotState } from "@/components/PixelMascot";
import { useNexus } from "@/providers/NexusProvider";
import type { MascotId, ProfessorVariant } from "@/types";

type Pixel = readonly [number, number, "body" | "soft" | "eye" | "accent" | "shade"];

const ATLAS: Pixel[] = [[4,1,"accent"],[5,1,"accent"],[6,1,"accent"],[7,1,"accent"],[3,2,"body"],[4,2,"soft"],[5,2,"soft"],[6,2,"soft"],[7,2,"soft"],[8,2,"body"],[2,3,"body"],[3,3,"soft"],[4,3,"eye"],[5,3,"soft"],[6,3,"soft"],[7,3,"eye"],[8,3,"soft"],[9,3,"body"],[2,4,"body"],[3,4,"soft"],[4,4,"soft"],[5,4,"accent"],[6,4,"accent"],[7,4,"soft"],[8,4,"soft"],[9,4,"body"],[3,5,"body"],[4,5,"body"],[5,5,"body"],[6,5,"body"],[7,5,"body"],[8,5,"body"],[5,6,"body"],[6,6,"body"],[7,6,"shade"],[8,6,"body"],[8,7,"body"],[9,7,"body"],[4,8,"body"],[5,8,"body"],[6,8,"body"],[7,8,"body"],[8,8,"body"],[9,8,"shade"],[3,9,"body"],[4,9,"soft"],[5,9,"soft"],[6,9,"soft"],[7,9,"soft"],[8,9,"body"],[3,10,"shade"],[4,10,"body"],[5,10,"body"],[6,10,"body"],[7,10,"body"],[8,10,"shade"]];
const NOVA: Pixel[] = [[2,1,"body"],[9,1,"body"],[2,2,"body"],[3,2,"soft"],[8,2,"soft"],[9,2,"body"],[3,3,"body"],[4,3,"soft"],[5,3,"soft"],[6,3,"soft"],[7,3,"soft"],[8,3,"body"],[3,4,"body"],[4,4,"eye"],[5,4,"soft"],[6,4,"soft"],[7,4,"eye"],[8,4,"body"],[3,5,"body"],[4,5,"soft"],[5,5,"accent"],[6,5,"accent"],[7,5,"soft"],[8,5,"body"],[4,6,"body"],[5,6,"body"],[6,6,"body"],[7,6,"body"],[4,7,"body"],[5,7,"soft"],[6,7,"soft"],[7,7,"body"],[5,8,"shade"],[6,8,"shade"],[4,9,"body"],[7,9,"body"]];
const BYTE: Pixel[] = [[3,1,"accent"],[4,1,"accent"],[5,1,"accent"],[6,1,"accent"],[7,1,"accent"],[8,1,"accent"],[2,2,"body"],[3,2,"body"],[4,2,"body"],[5,2,"body"],[6,2,"body"],[7,2,"body"],[8,2,"body"],[9,2,"body"],[2,3,"body"],[3,3,"eye"],[4,3,"soft"],[5,3,"soft"],[6,3,"soft"],[7,3,"soft"],[8,3,"eye"],[9,3,"body"],[2,4,"body"],[3,4,"soft"],[4,4,"soft"],[5,4,"accent"],[6,4,"accent"],[7,4,"soft"],[8,4,"soft"],[9,4,"body"],[2,5,"shade"],[3,5,"body"],[4,5,"body"],[5,5,"body"],[6,5,"body"],[7,5,"body"],[8,5,"body"],[9,5,"shade"],[3,6,"body"],[4,6,"soft"],[5,6,"soft"],[6,6,"soft"],[7,6,"soft"],[8,6,"body"],[3,7,"body"],[8,7,"body"],[4,8,"shade"],[7,8,"shade"]];
const PULSE: Pixel[] = [[5,1,"body"],[6,1,"body"],[4,2,"body"],[5,2,"soft"],[6,2,"soft"],[7,2,"body"],[3,3,"body"],[4,3,"soft"],[5,3,"eye"],[6,3,"eye"],[7,3,"soft"],[8,3,"body"],[2,4,"body"],[3,4,"soft"],[4,4,"body"],[5,4,"accent"],[6,4,"accent"],[7,4,"body"],[8,4,"soft"],[9,4,"body"],[3,5,"body"],[4,5,"soft"],[5,5,"body"],[6,5,"body"],[7,5,"soft"],[8,5,"body"],[4,6,"body"],[5,6,"shade"],[6,6,"shade"],[7,6,"body"],[4,7,"soft"],[5,7,"body"],[6,7,"body"],[7,7,"soft"],[5,8,"body"],[6,8,"body"],[3,9,"accent"],[8,9,"accent"]];


const ORBIT: Pixel[] = [[5,0,"accent"],[6,0,"accent"],[5,1,"body"],[6,1,"body"],[3,2,"body"],[4,2,"soft"],[5,2,"soft"],[6,2,"soft"],[7,2,"soft"],[8,2,"body"],[2,3,"body"],[3,3,"soft"],[4,3,"eye"],[5,3,"soft"],[6,3,"soft"],[7,3,"eye"],[8,3,"soft"],[9,3,"body"],[1,4,"accent"],[2,4,"body"],[3,4,"soft"],[4,4,"soft"],[5,4,"accent"],[6,4,"accent"],[7,4,"soft"],[8,4,"soft"],[9,4,"body"],[10,4,"accent"],[2,5,"body"],[3,5,"body"],[4,5,"body"],[5,5,"body"],[6,5,"body"],[7,5,"body"],[8,5,"body"],[9,5,"body"],[3,6,"shade"],[4,6,"body"],[5,6,"soft"],[6,6,"soft"],[7,6,"body"],[8,6,"shade"],[4,7,"body"],[5,7,"body"],[6,7,"body"],[7,7,"body"],[3,8,"accent"],[8,8,"accent"]];
const EMBER: Pixel[] = [[6,0,"accent"],[5,1,"accent"],[6,1,"soft"],[7,1,"accent"],[4,2,"accent"],[5,2,"soft"],[6,2,"body"],[7,2,"soft"],[8,2,"accent"],[3,3,"body"],[4,3,"soft"],[5,3,"body"],[6,3,"body"],[7,3,"body"],[8,3,"soft"],[9,3,"body"],[3,4,"body"],[4,4,"soft"],[5,4,"eye"],[6,4,"soft"],[7,4,"eye"],[8,4,"soft"],[9,4,"body"],[3,5,"body"],[4,5,"body"],[5,5,"soft"],[6,5,"accent"],[7,5,"soft"],[8,5,"body"],[9,5,"body"],[4,6,"body"],[5,6,"body"],[6,6,"body"],[7,6,"body"],[8,6,"body"],[4,7,"shade"],[5,7,"body"],[6,7,"body"],[7,7,"body"],[8,7,"shade"],[5,8,"body"],[6,8,"soft"],[7,8,"body"],[4,9,"accent"],[8,9,"accent"]];

const SHAPES: Record<Exclude<MascotId, "nexus">, Pixel[]> = { atlas: ATLAS, nova: NOVA, byte: BYTE, pulse: PULSE, orbit: ORBIT, ember: EMBER };
const LABELS: Record<MascotId, string> = { nexus: "Nexus", atlas: "Professor Atlas", nova: "Nova", byte: "Byte", pulse: "Pulse", orbit: "Orbit", ember: "Ember" };

export function CompanionMascot({ mascot, state = "idle", size = 48, variant }: { mascot: MascotId; state?: MascotState; size?: number; variant?: ProfessorVariant }) {
  const { colors, data } = useNexus();
  const lift = useRef(new Animated.Value(0)).current;
  const pixels = useMemo(() => mascot === "nexus" ? [] : SHAPES[mascot], [mascot]);
  const pixel = size / 12;

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
  const professorColor = { classic: colors.primary, emerald: colors.success, gold: colors.warning, ice: colors.primarySoft, rose: colors.danger }[professorVariant];
  const mascotColor = mascot === "atlas" ? professorColor : ({
    nova: colors.warning,
    byte: colors.primarySoft,
    pulse: colors.danger,
    orbit: colors.primary,
    ember: colors.danger,
  } as const)[mascot];
  const softColor = `${mascotColor}C8`;
  const color = (kind: Pixel[2]) => {
    if (kind === "eye") return state === "sleeping" ? colors.textSecondary : colors.text;
    if (kind === "accent") return state === "celebrating" ? colors.success : colors.warning;
    if (kind === "soft") return softColor;
    if (kind === "shade") return `${mascotColor}99`;
    return state === "warning" ? colors.warning : mascotColor;
  };

  return <Animated.View accessibilityRole="image" accessibilityLabel={`${LABELS[mascot]} ${state}`} style={[styles.container, { width: size, height: size, transform: [{ translateY: lift }] }]}>
    {pixels.map(([x, y, kind], index) => <View key={`${x}-${y}-${index}`} style={{ position: "absolute", left: x * pixel, top: y * pixel, width: pixel, height: pixel, backgroundColor: color(kind) }} />)}
    {mascot === "atlas" ? <>
      <View style={{ position: "absolute", left: 2.8 * pixel, top: 2.6 * pixel, width: 2.4 * pixel, height: 1.6 * pixel, borderWidth: Math.max(1, pixel * .22), borderColor: colors.text, borderRadius: pixel * .2 }} />
      <View style={{ position: "absolute", left: 6.7 * pixel, top: 2.6 * pixel, width: 2.4 * pixel, height: 1.6 * pixel, borderWidth: Math.max(1, pixel * .22), borderColor: colors.text, borderRadius: pixel * .2 }} />
      <View style={{ position: "absolute", left: 5.15 * pixel, top: 3.2 * pixel, width: 1.55 * pixel, height: Math.max(1, pixel * .2), backgroundColor: colors.text }} />
    </> : null}
  </Animated.View>;
}

export const MASCOT_LABELS = LABELS;
const styles = StyleSheet.create({ container: { position: "relative" } });
