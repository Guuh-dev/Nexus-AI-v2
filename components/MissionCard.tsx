import { Pressable, StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useNexus } from "@/providers/NexusProvider";
import type { MainMission } from "@/types";

export function MissionCard({ mission, onToggle }: { mission: MainMission; onToggle: () => void }) {
  const { colors } = useNexus();
  return (
    <Card style={[styles.card, { borderColor: mission.completed ? `${colors.success}66` : `${colors.primary}55` }]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: `${colors.primary}20` }]}>
          <NexusText variant="mono" color={colors.primarySoft}>MISSÃO PRINCIPAL</NexusText>
        </View>
        <NexusText variant="caption" color={colors.warning}>ALTA</NexusText>
      </View>
      <NexusText variant="title" style={mission.completed ? styles.completedText : undefined}>{mission.title}</NexusText>
      <NexusText secondary>{mission.description}</NexusText>
      <View style={styles.metaRow}>
        <NexusText variant="caption" secondary>◷ {mission.estimatedMinutes} min</NexusText>
        <NexusText variant="caption" color={colors.primarySoft}>+{mission.xp} XP</NexusText>
      </View>
      <ProgressBar progress={mission.completed ? 1 : 0} color={mission.completed ? colors.success : colors.primary} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Missão principal: ${mission.title}`}
        accessibilityState={{ checked: mission.completed }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.completeButton,
          {
            backgroundColor: mission.completed ? `${colors.success}1F` : colors.surfaceAlt,
            borderColor: mission.completed ? colors.success : colors.borderStrong,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <NexusText variant="subtitle" color={mission.completed ? colors.success : colors.text}>
          {mission.completed ? "✓ Missão concluída" : "Marcar missão como concluída"}
        </NexusText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 13, borderWidth: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  completeButton: { minHeight: 48, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  completedText: { textDecorationLine: "line-through", opacity: 0.72 },
});
