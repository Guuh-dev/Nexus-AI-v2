import { StyleSheet, View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

export function ProgressBar({ progress, color, height = 7 }: { progress: number; color?: string; height?: number }) {
  const { colors } = useNexus();
  const safe = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe * 100) }}
      style={[styles.track, { height, backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.fill, { width: `${safe * 100}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
});
