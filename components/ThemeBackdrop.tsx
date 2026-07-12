import { StyleSheet, View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";

export function ThemeBackdrop() {
  const { colors, visuals } = useNexus();
  if (visuals.backdrop === "none") return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {visuals.backdrop === "glow" ? <View style={[styles.glow, { backgroundColor: `${colors.primary}18` }]} /> : null}
      {visuals.backdrop === "aurora" ? <>
        <View style={[styles.auroraOne, { backgroundColor: `${colors.primary}18` }]} />
        <View style={[styles.auroraTwo, { backgroundColor: `${colors.primarySoft}12` }]} />
      </> : null}
      {visuals.backdrop === "grid" ? Array.from({ length: 9 }, (_, index) => <View key={`v-${index}`} style={[styles.vertical, { left: `${index * 12.5}%`, backgroundColor: `${colors.primary}0B` }]} />) : null}
      {visuals.backdrop === "grid" ? Array.from({ length: 14 }, (_, index) => <View key={`h-${index}`} style={[styles.horizontal, { top: `${index * 8}%`, backgroundColor: `${colors.primary}09` }]} />) : null}
      {visuals.backdrop === "scanlines" ? Array.from({ length: 18 }, (_, index) => <View key={index} style={[styles.scanline, { top: `${index * 6}%`, backgroundColor: `${colors.primary}08` }]} />) : null}
      {visuals.backdrop === "stars" ? Array.from({ length: 18 }, (_, index) => <View key={index} style={[styles.star, { left: `${(index * 37) % 96}%`, top: `${(index * 53) % 88}%`, backgroundColor: index % 3 ? `${colors.primarySoft}55` : `${colors.primary}77` }]} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", width: 360, height: 360, borderRadius: 180, top: -180, right: -110, transform: [{ scaleX: 1.25 }] },
  auroraOne: { position: "absolute", width: 420, height: 260, borderRadius: 180, top: -130, left: -170, transform: [{ rotate: "18deg" }] },
  auroraTwo: { position: "absolute", width: 340, height: 300, borderRadius: 180, top: 130, right: -210, transform: [{ rotate: "-22deg" }] },
  vertical: { position: "absolute", top: 0, bottom: 0, width: 1 },
  horizontal: { position: "absolute", left: 0, right: 0, height: 1 },
  scanline: { position: "absolute", left: 0, right: 0, height: 1 },
  star: { position: "absolute", width: 2, height: 2, borderRadius: 1 },
});
