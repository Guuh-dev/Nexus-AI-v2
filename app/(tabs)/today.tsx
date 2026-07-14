import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MissionCard } from "@/components/MissionCard";
import { PixelMascot } from "@/components/PixelMascot";
import { QuickCapture } from "@/components/QuickCapture";
import { TaskCard } from "@/components/TaskCard";
import { TaskEditor, type TaskEditorValue } from "@/components/TaskEditor";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { getCompanionLine, shouldShowCompanion } from "@/features/companion/companion";
import { nextRoadmapLesson } from "@/features/learning/roadmap";
import { detectReplanSignal } from "@/features/planning/smart-replan";
import { useNexus } from "@/providers/NexusProvider";
import type { Task, WeeklyPlanItem } from "@/types";
import { formatLongDate, localDateKey } from "@/utils/dates";

export { RouteErrorBoundary as ErrorBoundary };

export default function TodayScreen() {
  const params = useLocalSearchParams<{ capture?: string }>();
  const {
    data,
    colors,
    toggleTask,
    toggleMission,
    addTask,
    updateTask,
    deleteTask,
    postponeTask,
    rescheduleCapture,
    deleteScheduledCapture,
    replanDay,
    recoverPlanLocally,
    dismissWarnings,
  } = useNexus();
  const plan = data.activePlan;
  const [editorOpen, setEditorOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [postponeTarget, setPostponeTarget] = useState<Task | null>(null);
  const [replanOpen, setReplanOpen] = useState(false);
  const [smartReplan, setSmartReplan] = useState(false);
  const [preserveIds, setPreserveIds] = useState<string[]>([]);
  const [signalDismissed, setSignalDismissed] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<WeeklyPlanItem | null>(null);
  const [cancelScheduledTarget, setCancelScheduledTarget] = useState<WeeklyPlanItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [taskMutationBusy, setTaskMutationBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    if (params.capture === "1") setCaptureOpen(true);
  }, [params.capture]);

  const stats = useMemo(() => {
    const tasks = plan?.tasks ?? [];
    const completed = tasks.filter((task) => task.completed).length;
    const xp = tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.xp, 0)
      + (plan?.mainMission.completed ? plan.mainMission.xp : 0);
    const focusSeconds = data.progress.focusSessions
      .filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === plan?.date)
      .reduce((sum, session) => sum + session.elapsedSeconds, 0);
    return {
      total: tasks.length,
      completed,
      xp,
      focusMinutes: Math.floor(focusSeconds / 60),
      percentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [data.profile?.timezone, data.progress.focusSessions, plan]);

  const signal = useMemo(() => detectReplanSignal(data), [data]);
  const todayKey = localDateKey(new Date(), data.profile?.timezone);
  const scheduledCaptures = useMemo(() => data.weeklyPlan
    .filter((item) => !item.completed && item.date > todayKey)
    .sort((first, second) => first.date.localeCompare(second.date))
    .slice(0, 12), [data.weeklyPlan, todayKey]);
  const activeRoadmap = data.learning.roadmaps.find(
    (roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active",
  );
  const nextLesson = activeRoadmap?.intake?.includeInDailyPlan === false
    ? undefined
    : activeRoadmap
      ? nextRoadmapLesson(activeRoadmap)
      : undefined;
  const pendingProfessorTopic = data.learning.pendingTopics[0];
  const companionLine = getCompanionLine(data, data.preferences.mascot.companionMood, "today");
  const companionVisible = shouldShowCompanion(data);

  if (!plan || !data.profile) {
    const hasProfile = Boolean(data.profile);
    return (
      <Screen scroll={false}>
        <View style={styles.empty}>
          <PixelMascot state="warning" size={72} />
          <NexusText variant="title">{hasProfile ? "Nenhum plano ativo" : "Perfil ainda não configurado"}</NexusText>
          <NexusText secondary style={styles.center}>
            {hasProfile
              ? "Seu perfil está seguro. Prepare uma missão local para continuar agora."
              : "Conclua o diagnóstico inicial para o Nexus montar sua primeira missão."}
          </NexusText>
          <NexusButton
            label={hasProfile ? "Preparar missão" : "Configurar perfil"}
            onPress={() => {
              if (!hasProfile) {
                router.replace("/onboarding");
                return;
              }
              router.push("/loading-plan");
              void recoverPlanLocally();
            }}
          />
        </View>
      </Screen>
    );
  }

  const saveTask = async (value: TaskEditorValue): Promise<boolean> => {
    if (editingTask) return updateTask(editingTask.id, value);
    return addTask(value);
  };

  const openReplan = (smart: boolean) => {
    setSmartReplan(smart);
    setPreserveIds(
      smart && signal
        ? signal.candidates.slice(0, 2).map((task) => task.id)
        : plan.tasks.filter((task) => !task.completed && task.priority === "alta").slice(0, 2).map((task) => task.id),
    );
    setReplanOpen(true);
  };

  return (
    <>
      <Screen maxWidth={760}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <PixelMascot state={plan.source === "offline" ? "sleeping" : stats.percentage === 100 ? "celebrating" : "idle"} size={46} />
            <View style={styles.flex}>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: plan.source === "ai" ? colors.success : colors.warning }]} />
                <NexusText variant="mono" color={plan.source === "ai" ? colors.success : colors.warning}>
                  {plan.source === "ai" ? "PLANO REMOTO" : "PLANO OFFLINE"}
                </NexusText>
              </View>
              <NexusText variant="title">Hoje, {data.profile.nickname}.</NexusText>
            </View>
            <View style={[styles.streak, { backgroundColor: colors.surface }]}>
              <NexusText color={colors.warning}>♨</NexusText>
              <NexusText variant="subtitle">{data.progress.currentStreak}</NexusText>
            </View>
          </View>
          <NexusText variant="caption" secondary>{formatLongDate(plan.date)}</NexusText>
        </View>

        {data.corruptionWarnings.length ? (
          <Card style={[styles.notice, { borderColor: colors.warning }]}>
            <View style={styles.flex}>
              <NexusText variant="subtitle" color={colors.warning}>Dados recuperados</NexusText>
              <NexusText variant="caption" secondary>{data.corruptionWarnings[0]}</NexusText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" onPress={dismissWarnings} style={styles.closeButton}><NexusText>×</NexusText></Pressable>
          </Card>
        ) : null}
        {plan.warning ? <Card style={[styles.sourceNotice, { borderColor: colors.warning }]}><NexusText variant="caption" color={colors.warning}>{plan.warning}</NexusText></Card> : null}

        {companionVisible ? (
          <Card style={styles.companionCard}>
            <CompanionMascot mascot={data.preferences.mascot.companion} state={stats.percentage === 100 ? "celebrating" : "idle"} size={48} />
            <View style={styles.flex}>
              <NexusText variant="mono" color={colors.primarySoft}>COMPANION</NexusText>
              {data.preferences.mascot.speechEnabled ? (
                <NexusText variant="subtitle">{companionLine}</NexusText>
              ) : (
                <NexusText variant="caption" secondary>Presença visual ativa; falas desativadas.</NexusText>
              )}
            </View>
          </Card>
        ) : null}

        {signal && !signalDismissed ? (
          <Card style={[styles.guidanceCard, { borderColor: signal.severity === "high" ? colors.warning : colors.borderStrong }]}>
            <View style={styles.cardTop}>
              <CompanionMascot mascot="byte" state="warning" size={42} />
              <View style={styles.flex}><NexusText variant="mono" color={colors.warning}>AJUSTE SUGERIDO</NexusText><NexusText variant="title">{signal.title}</NexusText></View>
            </View>
            <NexusText secondary>{signal.message}</NexusText>
            <View style={styles.actions}>
              <NexusButton label="Agora não" variant="ghost" onPress={() => setSignalDismissed(true)} style={styles.flex} />
              <NexusButton label="Replanejar" onPress={() => openReplan(true)} style={styles.flex} />
            </View>
          </Card>
        ) : pendingProfessorTopic ? (
          <Card style={styles.guidanceCard}>
            <View style={styles.cardTop}><CompanionMascot mascot="atlas" state="thinking" size={42} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PROFESSOR ATLAS</NexusText><NexusText variant="title">Mapear {pendingProfessorTopic}</NexusText></View></View>
            <NexusText secondary>Primeiro o Atlas entende nível, objetivo e evidências; depois cria a trilha.</NexusText>
            <NexusButton label="Responder ao Atlas" onPress={() => router.push({ pathname: "/professor-intake", params: { topic: pendingProfessorTopic } })} fullWidth />
          </Card>
        ) : nextLesson && activeRoadmap ? (
          <Card style={styles.guidanceCard}>
            <View style={styles.cardTop}><CompanionMascot mascot="atlas" state="idle" size={42} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PRÓXIMA LIÇÃO</NexusText><NexusText variant="title">{nextLesson.title}</NexusText></View></View>
            <NexusText variant="caption" secondary>{activeRoadmap.topic} • {nextLesson.estimatedMinutes} min</NexusText>
            <NexusButton label="Abrir roadmap" variant="secondary" onPress={() => router.push({ pathname: "/(tabs)/brain", params: { view: "roadmaps" } })} fullWidth />
          </Card>
        ) : null}

        <View style={styles.section}>
          <MissionCard mission={plan.mainMission} onToggle={toggleMission} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><NexusText variant="title">Tarefas</NexusText><NexusText variant="caption" secondary>{stats.completed} de {stats.total} concluídas</NexusText></View>
            <NexusButton label="Adicionar" variant="ghost" compact disabled={plan.tasks.length >= 5} onPress={() => { setEditingTask(undefined); setEditorOpen(true); }} />
          </View>
          <View style={styles.taskList}>
            {plan.tasks.length ? plan.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onEdit={() => { setEditingTask(task); setEditorOpen(true); }}
                onPostpone={() => setPostponeTarget(task)}
                onDelete={() => setDeleteTarget(task)}
              />
            )) : (
              <Card>
                <NexusText variant="subtitle">Nenhuma tarefa para hoje</NexusText>
                <NexusText variant="caption" secondary>
                  A missão principal continua ativa. Adicione uma tarefa quando houver um próximo passo real.
                </NexusText>
              </Card>
            )}
          </View>
        </View>

        {scheduledCaptures.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <NexusText variant="title">Capturas agendadas</NexusText>
                <NexusText variant="caption" secondary>Entram automaticamente no dia escolhido e podem ser alteradas ou canceladas.</NexusText>
              </View>
            </View>
            <View style={styles.scheduledList}>
              {scheduledCaptures.map((item) => (
                <Card key={item.id} style={styles.scheduledCard}>
                  <View style={styles.flex}>
                    <NexusText variant="subtitle">{item.title}</NexusText>
                    <NexusText variant="caption" secondary>{item.date} • {item.estimatedMinutes} min • {item.priority}</NexusText>
                  </View>
                  <View style={styles.scheduledActions}>
                    <NexusButton label="Alterar data" variant="ghost" compact onPress={() => { setScheduleTarget(item); setScheduleDate(item.date); setScheduleError(""); }} />
                    <NexusButton label="Cancelar" variant="danger" compact onPress={() => setCancelScheduledTarget(item)} />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        <Card style={styles.progressCard}>
          <View style={styles.sectionHeader}>
            <View><NexusText variant="mono" color={colors.primarySoft}>PROGRESSO DE HOJE</NexusText><NexusText variant="display">{stats.percentage}%</NexusText></View>
            <NexusText variant="caption" secondary>{plan.totalEstimatedMinutes} min planejados</NexusText>
          </View>
          <ProgressBar progress={stats.percentage / 100} color={stats.percentage >= 70 ? colors.success : colors.primary} height={8} />
          <View style={styles.metrics}><Metric label="Tarefas" value={`${stats.completed}/${stats.total}`} /><Metric label="XP" value={String(stats.xp)} /><Metric label="Foco" value={`${stats.focusMinutes}m`} /></View>
        </Card>

        <View style={styles.quickActions}>
          <NexusButton label="Capturar" variant="secondary" onPress={() => setCaptureOpen(true)} style={styles.flex} />
          <NexusButton label="Focar" variant="secondary" onPress={() => router.push({ pathname: "/(tabs)/focus", params: { taskId: plan.tasks.find((task) => !task.completed)?.id ?? "" } })} style={styles.flex} />
          <NexusButton label="Replanejar" variant="ghost" onPress={() => openReplan(false)} style={styles.flex} />
        </View>

        <Card style={styles.focusMessage}><NexusText variant="mono" color={colors.primarySoft}>DIREÇÃO</NexusText><NexusText variant="subtitle">{plan.focusMessage}</NexusText>{plan.avoidToday.length ? <NexusText variant="caption" secondary>Evite: {plan.avoidToday.join(" • ")}</NexusText> : null}</Card>
      </Screen>

      <QuickCapture visible={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskEditor visible={editorOpen} task={editingTask} onSave={saveTask} onClose={() => setEditorOpen(false)} />
      <ConfirmDialog visible={Boolean(deleteTarget)} title="Excluir esta tarefa?" message="Se ela já estiver concluída, o XP concedido será removido." confirmLabel="Excluir" destructive loading={taskMutationBusy} onCancel={() => setDeleteTarget(null)} onConfirm={async () => { if (!deleteTarget) return; setTaskMutationBusy(true); try { if (await deleteTask(deleteTarget.id)) setDeleteTarget(null); } finally { setTaskMutationBusy(false); } }} />
      <ConfirmDialog visible={Boolean(postponeTarget)} title="Levar para o próximo plano?" message="A tarefa sairá de hoje e será carregada sem duplicação no próximo planejamento." confirmLabel="Adiar" loading={taskMutationBusy} onCancel={() => setPostponeTarget(null)} onConfirm={async () => { if (!postponeTarget) return; setTaskMutationBusy(true); try { if (await postponeTask(postponeTarget.id)) setPostponeTarget(null); } finally { setTaskMutationBusy(false); } }} />
      <ConfirmDialog
        visible={Boolean(scheduleTarget)}
        title="Alterar data da captura"
        message="Use uma data futura. A captura continuará fora do plano de hoje até essa data chegar."
        confirmLabel="Salvar data"
        loading={scheduleBusy}
        onCancel={() => { setScheduleTarget(null); setScheduleError(""); }}
        onConfirm={async () => {
          if (!scheduleTarget) return;
          setScheduleBusy(true);
          setScheduleError("");
          try {
            const saved = await rescheduleCapture(scheduleTarget.id, scheduleDate.trim());
            if (saved) setScheduleTarget(null);
            else setScheduleError("Não foi possível confirmar essa data. Use AAAA-MM-DD e escolha um dia futuro.");
          } finally {
            setScheduleBusy(false);
          }
        }}
      >
        <Field label="Nova data" value={scheduleDate} onChangeText={setScheduleDate} maxLength={10} placeholder="AAAA-MM-DD" error={scheduleError || undefined} />
      </ConfirmDialog>
      <ConfirmDialog
        visible={Boolean(cancelScheduledTarget)}
        title="Cancelar captura agendada?"
        message={cancelScheduledTarget ? `“${cancelScheduledTarget.title}” será removida da fila futura.` : "A captura será removida da fila futura."}
        confirmLabel="Cancelar agendamento"
        destructive
        loading={scheduleBusy}
        onCancel={() => setCancelScheduledTarget(null)}
        onConfirm={async () => {
          if (!cancelScheduledTarget) return;
          setScheduleBusy(true);
          try {
            if (await deleteScheduledCapture(cancelScheduledTarget.id)) setCancelScheduledTarget(null);
          } finally {
            setScheduleBusy(false);
          }
        }}
      />
      <ConfirmDialog
        visible={replanOpen}
        title={smartReplan ? "Aplicar o ajuste?" : "Substituir o plano atual?"}
        message={smartReplan && signal ? `${signal.message} Tarefas concluídas e XP serão preservados.` : "Tarefas concluídas e XP conquistado serão preservados."}
        confirmLabel="Replanejar"
        onCancel={() => setReplanOpen(false)}
        onConfirm={() => { setReplanOpen(false); router.push("/loading-plan"); void replanDay({ ...(smartReplan && signal ? { reason: signal.message, minutesRemaining: signal.suggestedMinutes } : {}), preserveTaskIds: preserveIds }); }}
      >
        <View style={styles.preserveList}>
          <NexusText variant="caption" secondary>Preservar no novo plano (máximo 2)</NexusText>
          {plan.tasks.filter((task) => !task.completed).map((task) => {
            const selected = preserveIds.includes(task.id);
            return (
              <Pressable key={task.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setPreserveIds((current) => selected ? current.filter((id) => id !== task.id) : current.length < 2 ? [...current, task.id] : current)} style={[styles.preserveRow, { borderColor: selected ? colors.primary : colors.border }]}>
                <NexusText color={selected ? colors.primarySoft : colors.textSecondary}>{selected ? "✓" : "○"}</NexusText>
                <NexusText variant="caption" style={styles.flex}>{task.title}</NexusText>
              </Pressable>
            );
          })}
        </View>
      </ConfirmDialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><NexusText variant="title">{value}</NexusText><NexusText variant="caption" secondary>{label}</NexusText></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: 5, marginBottom: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  streak: { minWidth: 52, height: 40, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  notice: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  sourceNotice: { marginTop: 10 },
  companionCard: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 11 },
  guidanceCard: { marginTop: 12, gap: 11 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", gap: 8 },
  section: { marginTop: 22, gap: 11 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  taskList: { gap: 9 },
  scheduledList: { gap: 9 },
  scheduledCard: { gap: 10 },
  scheduledActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  progressCard: { marginTop: 22, gap: 13 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  quickActions: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  focusMessage: { marginTop: 12, marginBottom: 8, gap: 7 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  center: { textAlign: "center" },
  preserveList: { gap: 7 },
  preserveRow: { minHeight: 44, borderWidth: 1, borderRadius: 10, padding: 9, flexDirection: "row", alignItems: "center", gap: 8 },
});
