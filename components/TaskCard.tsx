import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { getTaskGuidance } from "@/features/planning/task-guidance";
import { useNexus } from "@/providers/NexusProvider";
import type { Task } from "@/types";

const CATEGORY_LABELS = {
  desenvolvimento: "DEV",
  estudos: "ESTUDOS",
  dinheiro: "DINHEIRO",
  saude: "SAÚDE",
  organizacao: "ORGANIZAÇÃO",
  pessoal: "PESSOAL",
} as const;

export function TaskCard({
  task,
  onToggle,
  onEdit,
  onPostpone,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onPostpone: () => void;
  onDelete: () => void;
}) {
  const { colors, data } = useNexus();
  const scale = useRef(new Animated.Value(1)).current;
  const [showGuidance, setShowGuidance] = useState(false);
  const guidance = getTaskGuidance(task);

  useEffect(() => {
    if (!task.completed || data.preferences.reducedMotion) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [data.preferences.reducedMotion, scale, task.completed]);

  const priorityColor = task.priority === "alta" ? colors.danger : task.priority === "media" ? colors.warning : colors.textSecondary;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Card style={[styles.card, task.completed && { borderColor: `${colors.success}44` }]}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${task.title}, ${task.estimatedMinutes} minutos, ${task.xp} XP`}
          accessibilityState={{ checked: task.completed }}
          onPress={onToggle}
          style={styles.mainRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: task.completed ? colors.success : colors.borderStrong,
                backgroundColor: task.completed ? colors.success : "transparent",
              },
            ]}
          >
            {task.completed ? <NexusText color="#07120B">✓</NexusText> : null}
          </View>
          <View style={styles.content}>
            <View style={styles.labelRow}>
              <NexusText variant="mono" color={colors.primarySoft}>{CATEGORY_LABELS[task.category]}</NexusText>
              <NexusText variant="caption" color={priorityColor}>{task.priority.toUpperCase()}</NexusText>
            </View>
            <NexusText variant="subtitle" style={task.completed ? styles.completed : undefined}>{task.title}</NexusText>
            {task.description ? <NexusText variant="caption" secondary numberOfLines={showGuidance ? undefined : 2}>{task.description}</NexusText> : null}
            {!showGuidance ? (
              <View style={[styles.quickOutcome, { borderColor: `${colors.success}28`, backgroundColor: `${colors.success}08` }]}>
                <NexusText variant="caption" color={colors.success} numberOfLines={2}>
                  Resultado: {guidance.deliverable}
                </NexusText>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <NexusText variant="caption" secondary>◷ {task.estimatedMinutes} min</NexusText>
              <NexusText variant="caption" color={colors.primarySoft}>+{task.xp} XP</NexusText>
              {task.recurring ? <NexusText variant="caption" secondary>↻ hábito</NexusText> : null}
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${showGuidance ? "Ocultar" : "Mostrar"} instruções de ${task.title}`}
          onPress={() => setShowGuidance((value) => !value)}
          style={[styles.guidanceToggle, { borderTopColor: colors.border, backgroundColor: `${colors.primary}08` }]}
        >
          <NexusText variant="caption" color={colors.primarySoft}>{showGuidance ? "Ocultar plano ↑" : "Como fazer esta tarefa ↓"}</NexusText>
        </Pressable>

        {showGuidance ? (
          <View style={[styles.guidance, { borderTopColor: colors.border }]}>
            <NexusText variant="mono" color={colors.primarySoft}>EXECUÇÃO</NexusText>
            {guidance.steps.map((step, index) => (
              <View key={`${task.id}-${index}`} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}18` }]}>
                  <NexusText variant="caption" color={colors.primarySoft}>{index + 1}</NexusText>
                </View>
                <NexusText variant="caption" style={styles.flex}>{step}</NexusText>
              </View>
            ))}
            <View style={[styles.deliverable, { borderColor: `${colors.success}35`, backgroundColor: `${colors.success}0C` }]}>
              <NexusText variant="mono" color={colors.success}>RESULTADO ESPERADO</NexusText>
              <NexusText variant="caption">{guidance.deliverable}</NexusText>
            </View>
          </View>
        ) : null}

        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TaskAction label="Editar" symbol="✎" onPress={onEdit} />
          <TaskAction label="Adiar" symbol="→" onPress={onPostpone} />
          <TaskAction label="Excluir" symbol="×" onPress={onDelete} danger />
        </View>
      </Card>
    </Animated.View>
  );
}

function TaskAction({ label, symbol, onPress, danger = false }: { label: string; symbol: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useNexus();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.55 : 1 }]}
    >
      <NexusText variant="caption" color={danger ? colors.danger : colors.textSecondary}>{symbol} {label}</NexusText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: "hidden" },
  mainRow: { minHeight: 116, padding: 15, flexDirection: "row", alignItems: "flex-start", gap: 13 },
  checkbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
  content: { flex: 1, gap: 6 },
  flex: { flex: 1 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 3 },
  quickOutcome: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  completed: { textDecorationLine: "line-through", opacity: 0.6 },
  guidanceToggle: { minHeight: 42, borderTopWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  guidance: { borderTopWidth: StyleSheet.hairlineWidth, padding: 15, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  deliverable: { borderWidth: 1, borderRadius: 13, padding: 11, gap: 5 },
  actions: { minHeight: 45, borderTopWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  action: { minHeight: 44, minWidth: 78, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
});
