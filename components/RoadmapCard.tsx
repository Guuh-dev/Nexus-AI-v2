import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/ui/Field";
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
}: {
  roadmap: LearningRoadmap;
  active: boolean;
  onSetActive: () => void;
}) {
  const {
    colors,
    renameRoadmap,
    archiveRoadmap,
    deleteRoadmap,
    regenerateRoadmap,
  } = useNexus();
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "regenerate" | "delete" | null>(null);
  const [titleDraft, setTitleDraft] = useState(roadmap.topic);
  const [mutationBusy, setMutationBusy] = useState(false);
  const progress = roadmapProgress(roadmap);
  const statusLabel = roadmap.status === "archived"
    ? "ARQUIVADO"
    : roadmap.status === "completed"
      ? "CONCLUÍDO"
      : roadmap.status === "paused"
        ? "PAUSADO"
        : "EM ANDAMENTO";

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
            {active ? "ROADMAP ATIVO" : statusLabel}
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${showActions ? "Ocultar" : "Mostrar"} gerenciamento de ${roadmap.topic}`}
        onPress={() => setShowActions((value) => !value)}
        style={[styles.manageToggle, { borderColor: colors.border }]}
      >
        <NexusText variant="caption" secondary>{showActions ? "Fechar gerenciamento ↑" : "Gerenciar roadmap ···"}</NexusText>
      </Pressable>

      {showActions ? (
        <View style={styles.actions}>
          <NexusButton label="Renomear" variant="ghost" onPress={() => { setTitleDraft(roadmap.topic); setDialog("rename"); }} style={styles.action} />
          {roadmap.status !== "archived" ? <NexusButton label="Arquivar" variant="ghost" onPress={() => { void archiveRoadmap(roadmap.id); }} style={styles.action} /> : null}
          <NexusButton label="Regenerar" variant="ghost" onPress={() => setDialog("regenerate")} style={styles.action} />
          <NexusButton label="Excluir" variant="danger" onPress={() => setDialog("delete")} style={styles.action} />
        </View>
      ) : null}

      {roadmap.status !== "archived" ? roadmap.phases.map((phase) => (
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
            />
          ))}
        </View>
      )) : (
        <NexusText variant="caption" secondary>O conteúdo e o progresso continuam salvos. Torne este roadmap principal para retomá-lo.</NexusText>
      )}

      {!active ? (
        <NexusButton
          label="Tornar principal"
          variant="secondary"
          onPress={onSetActive}
          fullWidth
        />
      ) : null}

      <ConfirmDialog
        visible={dialog === "rename"}
        title="Renomear roadmap"
        message="O progresso e as lições serão preservados."
        confirmLabel="Salvar nome"
        loading={mutationBusy}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (!titleDraft.trim()) return;
          setMutationBusy(true);
          try {
            if (await renameRoadmap(roadmap.id, titleDraft)) setDialog(null);
          } finally {
            setMutationBusy(false);
          }
        }}
      >
        <Field label="Novo nome" value={titleDraft} onChangeText={setTitleDraft} maxLength={160} />
      </ConfirmDialog>
      <ConfirmDialog
        visible={dialog === "regenerate"}
        title="Regenerar esta trilha?"
        message="A IA criará novas fases e lições. O roadmap atual só será substituído se a nova versão passar na validação."
        confirmLabel="Regenerar"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          void regenerateRoadmap(roadmap.id);
        }}
      />
      <ConfirmDialog
        visible={dialog === "delete"}
        title="Excluir roadmap?"
        message="As lições deste roadmap serão removidas. O histórico geral, tarefas, XP e conversas não serão apagados."
        confirmLabel="Excluir"
        destructive
        loading={mutationBusy}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          setMutationBusy(true);
          try {
            if (await deleteRoadmap(roadmap.id)) setDialog(null);
          } finally {
            setMutationBusy(false);
          }
        }}
      />
    </Card>
  );
}

function LessonCard({
  roadmap,
  phase,
  lesson,
  expanded,
  onToggleExpanded,
}: {
  roadmap: LearningRoadmap;
  phase: RoadmapPhase;
  lesson: RoadmapLesson;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { colors, assistantBusy, submitRoadmapEvidence } = useNexus();
  const guidance = getLessonGuidance(roadmap, phase, lesson);
  const [submission, setSubmission] = useState(
    lesson.evidence?.submission ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const evidenceStatus = lesson.completed
    ? "VALIDADA"
    : lesson.evidence?.status === "needs_revision"
      ? "AJUSTE PEDIDO"
      : lesson.evidence?.status === "submitted"
        ? "AGUARDANDO CORREÇÃO"
        : "ENTREGA PENDENTE";
  const canSubmit = submission.trim().length >= 2 &&
    !lesson.completed &&
    !submitting &&
    !assistantBusy;

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
        <View
          accessible
          accessibilityLabel={`${lesson.title}: ${evidenceStatus.toLocaleLowerCase("pt-BR")}`}
          style={[
            styles.statusMark,
            {
              borderColor: lesson.completed
                ? colors.success
                : colors.primarySoft,
              backgroundColor: lesson.completed
                ? colors.success
                : `${colors.primary}16`,
            },
          ]}
        >
          <NexusText color={lesson.completed ? colors.onSuccess : colors.primarySoft}>
            {lesson.completed ? "✓" : "◆"}
          </NexusText>
        </View>
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
          <NexusText
            variant="mono"
            color={lesson.completed ? colors.success : lesson.evidence?.status === "needs_revision" ? colors.warning : colors.textSecondary}
          >
            {evidenceStatus}
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

      {lesson.evidence?.feedback ? (
        <View
          style={[
            styles.feedbackBox,
            {
              borderColor: lesson.completed
                ? `${colors.success}55`
                : `${colors.warning}55`,
              backgroundColor: lesson.completed
                ? `${colors.success}0D`
                : `${colors.warning}0D`,
            },
          ]}
        >
          <NexusText
            variant="mono"
            color={lesson.completed ? colors.success : colors.warning}
          >
            {lesson.completed ? "CORREÇÃO DO ATLAS" : "O QUE AJUSTAR"}
          </NexusText>
          <NexusText variant="caption">{lesson.evidence.feedback}</NexusText>
          {lesson.evidence.nextAdjustment && !lesson.completed ? (
            <>
              <NexusText variant="mono" color={colors.primarySoft}>
                PRÓXIMA TENTATIVA
              </NexusText>
              <NexusText variant="caption">
                {lesson.evidence.nextAdjustment}
              </NexusText>
            </>
          ) : null}
        </View>
      ) : null}

      {!lesson.completed ? (
        <View style={styles.submissionArea}>
          <Field
            label={lesson.evidence?.status === "needs_revision"
              ? "Evidência corrigida"
              : "Evidência da entrega"}
            hint="Descreva o resultado e inclua o que permite conferir o critério: saída, teste, link, trecho ou resposta."
            error={submissionError ?? undefined}
            value={submission}
            onChangeText={(value) => {
              setSubmission(value);
              if (submissionError) setSubmissionError(null);
            }}
            multiline
            maxLength={4000}
            editable={!submitting}
            placeholder="Ex.: implementei…, o teste retornou…, link/resultado…"
          />
          <NexusButton
            label={lesson.evidence?.status === "needs_revision"
              ? "Enviar ajuste ao Atlas"
              : lesson.evidence?.status === "submitted"
                ? "Tentar correção novamente"
                : "Enviar para correção"}
            onPress={() => {
              setSubmitting(true);
              setSubmissionError(null);
              void submitRoadmapEvidence(
                roadmap.id,
                lesson.id,
                submission,
              ).then((result) => {
                if (result === "not_saved") {
                  setSubmissionError(
                    "A entrega não pôde ser salva. Seu texto continua aqui; tente novamente.",
                  );
                } else if (result === "saved_pending") {
                  setSubmissionError(
                    "A entrega está salva, mas a correção não terminou. Tente novamente.",
                  );
                }
              }).finally(() => setSubmitting(false));
            }}
            disabled={!canSubmit}
            loading={submitting}
            fullWidth
          />
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
  manageToggle: { minHeight: 40, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { flexGrow: 1, minWidth: 104 },
  lesson: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  lessonHeader: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  statusMark: {
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
  feedbackBox: { borderWidth: 1, borderRadius: 13, padding: 11, gap: 7 },
  submissionArea: { gap: 10 },
});
