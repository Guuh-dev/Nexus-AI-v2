import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { PixelMascot } from "@/components/PixelMascot";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useNexus } from "@/providers/NexusProvider";

const stages = [
  "Entendendo sua missão...",
  "Organizando suas prioridades...",
  "Montando um plano realista...",
  "Preparando seu painel...",
];

export function LoadingPlan({ onCancel }: { onCancel: () => void }) {
  const { loadingStage, colors, data } = useNexus();
  const opacity = useRef(new Animated.Value(1)).current;
  const index = Math.max(0, stages.indexOf(loadingStage));

  useEffect(() => {
    if (data.preferences.reducedMotion) return;
    opacity.setValue(0.4);
    Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [data.preferences.reducedMotion, loadingStage, opacity]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.glow, { backgroundColor: `${colors.primary}18` }]} />
      <PixelMascot state="thinking" size={86} />
      <NexusText variant="mono" color={colors.primarySoft}>NEXUS PROCESSANDO</NexusText>
      <Animated.View style={{ opacity }}>
        <NexusText variant="title" style={styles.center}>{loadingStage}</NexusText>
      </Animated.View>
      <View style={styles.progressWrap}>
        <ProgressBar progress={(index + 1) / stages.length} />
        <NexusText variant="caption" secondary>{index + 1} de {stages.length}</NexusText>
      </View>
      <NexusText secondary style={styles.center}>O carregamento possui limite. Se a IA não responder, seu plano local assume automaticamente.</NexusText>
      <NexusButton label="Cancelar" variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, overflow: "hidden" },
  glow: { position: "absolute", width: 280, height: 280, borderRadius: 140 },
  center: { textAlign: "center" },
  progressWrap: { width: "100%", maxWidth: 360, gap: 8 },
});
