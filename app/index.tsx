import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { NexusText } from "@/components/ui/NexusText";
import { PixelMascot } from "@/components/PixelMascot";
import { useNexus } from "@/providers/NexusProvider";
import { getIntelligenceStatus } from "@/services/status.service";
import { OTA_RELEASE } from "@/constants/release";

export default function Index() {
  const { ready, data, colors } = useNexus();
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.82)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const reduced = data.preferences.reducedMotion;
    const animation = Animated.parallel([
      Animated.timing(reveal, { toValue: 1, duration: reduced ? 80 : 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, damping: 9, stiffness: 100, useNativeDriver: true }),
      Animated.timing(scan, { toValue: 1, duration: reduced ? 80 : 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [data.preferences.reducedMotion, pulse, reveal, scan]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      if (!data.onboardingCompleted || !data.profile) router.replace("/onboarding");
      else if (!data.discoveryCompleted) router.replace("/discovery");
      else router.replace("/(tabs)/today");
    }, data.preferences.reducedMotion ? 180 : 1250);
    return () => clearTimeout(timer);
  }, [data.discoveryCompleted, data.onboardingCompleted, data.preferences.reducedMotion, data.profile, ready]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    void getIntelligenceStatus(controller.signal).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [ready]);

  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-160, 220] });
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.grid, { borderColor: `${colors.primary}12` }]} />
      <Animated.View style={[styles.orbitOuter, { borderColor: `${colors.primary}20`, opacity: reveal, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[styles.orbitInner, { borderColor: `${colors.primarySoft}38`, opacity: reveal, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[styles.scan, { backgroundColor: `${colors.primary}20`, transform: [{ translateY: scanY }] }]} />
      <Animated.View style={[styles.core, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}44`, opacity: reveal, transform: [{ scale: pulse }] }]}>
        <PixelMascot state={ready ? "idle" : "thinking"} size={96} />
      </Animated.View>
      <Animated.View style={[styles.copy, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <NexusText variant="mono" color={colors.primarySoft}>PERSONAL MISSION OS</NexusText>
        <NexusText variant="display" style={styles.brand}>NEXUS AI</NexusText>
        <View style={styles.statusRow}><View style={[styles.dot, { backgroundColor: ready ? colors.success : colors.warning }]} /><NexusText variant="caption" secondary>{ready ? "SISTEMAS SINCRONIZADOS" : "RECUPERANDO SEU PROGRESSO"}</NexusText></View>
      </Animated.View>
      <View style={styles.version}><NexusText variant="mono" secondary>NEXUS CORE • V{OTA_RELEASE.label}</NexusText></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24, overflow: "hidden" },
  grid: { position: "absolute", width: 420, height: 420, borderWidth: 1, transform: [{ rotate: "45deg" }] },
  orbitOuter: { position: "absolute", width: 330, height: 330, borderRadius: 165, borderWidth: 1 },
  orbitInner: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1 },
  scan: { position: "absolute", width: "100%", height: 2 },
  core: { width: 160, height: 160, borderRadius: 48, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  copy: { alignItems: "center", gap: 8 }, brand: { fontSize: 36, letterSpacing: 2 }, statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 }, version: { position: "absolute", bottom: 38 },
});
