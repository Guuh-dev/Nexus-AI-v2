import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
import { roadmapProgress } from "@/features/learning/roadmap";
import { useNexus } from "@/providers/NexusProvider";
import type { LearningRoadmap, RoadmapLesson, RoadmapPhase } from "@/types";

export function RoadmapCard({
  roadmap,
  active,
  onSetActive,
  onToggleLesson,
}: {
  roadmap: LearningRoadmap;
  active: boolean;
  onSetActive: () => void;
  onToggleLesson: (lessonId: string) => void;
}) {
  const { colors } = useNexus();
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const progress = roadmapProgress(roadmap);

  return (
    <Card
      style={[
        styles.roadmap,
        { borderColor: active ? colors.primary : colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <NexusText
            variant="mono"
            color={active ? colors.primarySoft : colors.textSecondary}
          >
            {active ? "ROADMAP ATIVO" : roadmap.status.toUpperCase()}
          </NexusText>
          <NexusText variant="title">{roadmap.topic}</NexusText>
        </View>
        <NexusText variant="title">{progress.percentage}%</NexusText>
      </View>
      <NexusText variant="caption" secondary>
        {roadmap.outcome}
      </NexusText>
      <ProgressBar progress={progress.percentage / 100} />
      <NexusText variant="caption" secondary>
        {progress.completed}/{progress.total} lições • {roadmap.weeklyMinutes}{" "}
        min/semana
      </NexusText>

      {roadmap.phases.map((phase) => (
        <View key={phase.id} style={styles.phase}>
          <NexusText variant="subtitle">
            {phase.order + 1}. {phase.title}
          </NexusText>
          <NexusText variant="caption" secondary>
            {phase.objective}
          </NexusText>
          {phase.lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              roadmap={roadmap}
              phase={phase}
              lesson={lesson}
              expanded={expandedLessonId === lesson.id}
              onToggleExpanded={() =>
                setExpandedLessonId((current) =>
                  current === lesson.id ? null : lesson.id,
                )
              }
              onComplete={() => onToggleLesson(lesson.id)}
            />
          ))}
        </View>
      ))}

      {!active ? (
        <NexusButton
          label="Tornar principal"
          variant="secondary"
          onPress={onSetActive}
          fullWidth
        />
      ) : null}
    </Card>
  );
}

function LessonCard({
  roadmap,
  phase,
  lesson,
  expanded,
  onToggleExpanded,
  onComplete,
}: {
  roadmap: LearningRoadmap;
  phase: RoadmapPhase;
  lesson: RoadmapLesson;
  expanded: boolean;
  onToggleExpanded: () => void;
  onComplete: () => void;
}) {
  const { colors } = useNexus();
  const guidance = getLessonGuidance(roadmap, phase, lesson);

  return (
    <View
      style={[
        styles.lesson,
        {
          borderColor: lesson.completed ? `${colors.success}55` : colors.border,
        },
      ]}
    >
      <View style={styles.lessonHeader}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: lesson.completed }}
          accessibilityLabel={`${lesson.completed ? "Reabrir" : "Concluir"} ${lesson.title}`}
          onPress={onComplete}
          style={[
            styles.checkbox,
            {
              borderColor: lesson.completed
                ? colors.success
                : colors.primarySoft,
              backgroundColor: lesson.completed
                ? colors.success
                : "transparent",
            },
          ]}
        >
          {lesson.completed ? <NexusText color="#07120B">✓</NexusText> : null}
        </Pressable>
        <View style={styles.flex}>
          <NexusText
            variant="subtitle"
            style={lesson.completed ? styles.completed : undefined}
          >
            {lesson.title}
          </NexusText>
          <NexusText
            variant="caption"
            secondary
            numberOfLines={expanded ? undefined : 2}
          >
            {guidance.objective}
          </NexusText>
          <NexusText variant="caption" color={colors.primarySoft}>
            {lesson.estimatedMinutes} min
          </NexusText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onToggleExpanded}
        style={[
          styles.instructionsButton,
          {
            backgroundColor: `${colors.primary}10`,
            borderColor: `${colors.primary}35`,
          },
        ]}
      >
        <NexusText variant="caption" color={colors.primarySoft}>
          {expanded ? "Ocultar instruções ↑" : "Ver exatamente o que fazer ↓"}
        </NexusText>
      </Pressable>

      {expanded ? (
        <View style={[styles.guidance, { borderTopColor: colors.border }]}>
          <NexusText variant="mono" color={colors.primarySoft}>
            PASSO A PASSO
          </NexusText>
          {guidance.steps.map((step, index) => (
            <View key={`${lesson.id}-${index}`} style={styles.stepRow}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <NexusText variant="caption" color={colors.primarySoft}>
                  {index + 1}
                </NexusText>
              </View>
              <NexusText variant="caption" style={styles.flex}>
                {step}
              </NexusText>
            </View>
          ))}
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: `${colors.success}0D`,
                borderColor: `${colors.success}35`,
              },
            ]}
          >
            <NexusText variant="mono" color={colors.success}>
              ENTREGA
            </NexusText>
            <NexusText variant="caption">{guidance.deliverable}</NexusText>
          </View>
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: `${colors.warning}0B`,
                borderColor: `${colors.warning}30`,
              },
            ]}
          >
            <NexusText variant="mono" color={colors.warning}>
              CONCLUÍDO QUANDO
            </NexusText>
            <NexusText variant="caption">{guidance.successCriteria}</NexusText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  roadmap: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flex: { flex: 1 },
  phase: { gap: 9, marginTop: 9 },
  lesson: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  lessonHeader: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  completed: { textDecorationLine: "line-through", opacity: 0.65 },
  instructionsButton: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  guidance: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 9,
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBox: { borderWidth: 1, borderRadius: 13, padding: 11, gap: 5 },
});
