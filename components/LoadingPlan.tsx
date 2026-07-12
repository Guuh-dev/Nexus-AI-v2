import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
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

type Props = {
  error: string | null;
  generating: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onUseLocal: () => void;
};

export function LoadingPlan({ error, generating, onCancel, onRetry, onUseLocal }: Props) {
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
      <PixelMascot state={error && !generating ? "idle" : "thinking"} size={86} />
      <NexusText variant="mono" color={colors.primarySoft}>
        {error && !generating ? "NEXUS EM RECUPERAÇÃO" : "NEXUS PROCESSANDO"}
      </NexusText>

      {error && !generating ? (
        <Card style={[styles.recoveryCard, { borderColor: `${colors.warning}66` }]}>
          <NexusText variant="title" style={styles.center}>Seu progresso está seguro</NexusText>
          <NexusText secondary style={styles.center}>{error}</NexusText>
          <View style={styles.actions}>
            <NexusButton label="Tentar novamente" onPress={onRetry} fullWidth />
            <NexusButton label="Continuar com plano local" variant="secondary" onPress={onUseLocal} fullWidth />
            <NexusButton label="Voltar ao diagnóstico" variant="ghost" onPress={onCancel} fullWidth />
          </View>
        </Card>
      ) : (
        <>
          <Animated.View style={{ opacity }}>
            <NexusText variant="title" style={styles.center}>{loadingStage}</NexusText>
          </Animated.View>
          <View style={styles.progressWrap}>
            <ProgressBar progress={(index + 1) / stages.length} />
            <NexusText variant="caption" secondary>{index + 1} de {stages.length}</NexusText>
          </View>
          <NexusText secondary style={styles.center}>
            Limite absoluto de 50 segundos. Se a IA não responder, o plano local assume automaticamente.
          </NexusText>
          <NexusButton label="Cancelar" variant="ghost" onPress={onCancel} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, overflow: "hidden" },
  glow: { position: "absolute", width: 280, height: 280, borderRadius: 140 },
  center: { textAlign: "center" },
  progressWrap: { width: "100%", maxWidth: 360, gap: 8 },
  recoveryCard: { width: "100%", maxWidth: 420, gap: 14 },
  actions: { gap: 10, marginTop: 4 },
});
