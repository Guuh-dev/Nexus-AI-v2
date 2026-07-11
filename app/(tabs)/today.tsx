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
import { Card } from "@/components/ui/Card";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { nextRoadmapLesson } from "@/features/learning/roadmap";
import { detectReplanSignal } from "@/features/planning/smart-replan";
import { useNexus } from "@/providers/NexusProvider";
import type { DashboardSection, Task } from "@/types";
import { formatLongDate, localDateKey } from "@/utils/dates";

export { RouteErrorBoundary as ErrorBoundary };

export default function TodayScreen() {
  const params = useLocalSearchParams<{ capture?: string }>();
  const { data, colors, toggleTask, toggleMission, addTask, updateTask, deleteTask, postponeTask, replanDay, dismissWarnings, toggleHabitToday, toggleOperationPhase } = useNexus();
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

  useEffect(() => { if (params.capture === "1") setCaptureOpen(true); }, [params.capture]);

  const stats = useMemo(() => {
    const total = plan?.tasks.length ?? 0;
    const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;
    const xp = (plan?.tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.xp, 0) ?? 0) + (plan?.mainMission.completed ? plan.mainMission.xp : 0);
    const focusSeconds = data.progress.focusSessions.filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === plan?.date).reduce((sum, session) => sum + session.elapsedSeconds, 0);
    return { total, completed, xp, focusMinutes: Math.floor(focusSeconds / 60), percentage: total ? Math.round((completed / total) * 100) : 0 };
  }, [data.profile?.timezone, data.progress.focusSessions, plan]);
  const signal = useMemo(() => detectReplanSignal(data), [data]);
  const activeOperation = data.operations.find((operation) => operation.status === "active");
  const today = plan?.date ?? localDateKey(new Date(), data.profile?.timezone);
  const todayHabits = data.habits.filter((habit) => !habit.pausedUntil || habit.pausedUntil < today).slice(0, 4);
  const activeRoadmap = data.learning.roadmaps.find((roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active");
  const nextLesson = activeRoadmap?.intake?.includeInDailyPlan === false ? undefined : activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  const pendingProfessorTopic = data.learning.pendingTopics[0];

  if (!plan || !data.profile) return <Screen scroll={false}><View style={styles.empty}><PixelMascot state="warning" size={72} /><NexusText variant="title">Nenhum plano ativo</NexusText><NexusText secondary style={styles.center}>Seu perfil está seguro. Volte ao início para preparar a missão de hoje.</NexusText><NexusButton label="Voltar ao início" onPress={() => router.replace("/")} /></View></Screen>;

  const saveTask = (value: TaskEditorValue) => { if (editingTask) updateTask(editingTask.id, value); else addTask(value); };
  const sectionGap = data.preferences.dashboard.density === "compacta" ? 17 : data.preferences.dashboard.density === "ampla" ? 32 : 25;
  const sections = data.preferences.dashboard.sections.filter((section) => !data.preferences.dashboard.hiddenSections.includes(section));

  const renderSection = (section: DashboardSection) => {
    if (section === "smart") return (
      <View key={section} style={[styles.section, { marginTop: sectionGap }]}>
        {signal && !signalDismissed ? <Card style={[styles.smartCard, { backgroundColor: `${signal.severity === "high" ? colors.warning : colors.primary}0D`, borderColor: `${signal.severity === "high" ? colors.warning : colors.primary}55` }]}><View style={styles.smartTop}><CompanionMascot mascot="byte" state="warning" size={46} /><View style={styles.flex}><NexusText variant="mono" color={signal.severity === "high" ? colors.warning : colors.primarySoft}>REPLANEJAMENTO INTELIGENTE</NexusText><NexusText variant="title">{signal.title}</NexusText></View></View><NexusText secondary>{signal.message}</NexusText><View style={styles.actions}><NexusButton label="Agora não" variant="ghost" onPress={() => setSignalDismissed(true)} style={styles.flex} /><NexusButton label="Ver ajuste" onPress={() => { setSmartReplan(true); setPreserveIds(signal.candidates.slice(0, 2).map((task) => task.id)); setReplanOpen(true); }} style={styles.flex} /></View></Card> : pendingProfessorTopic ? <Card style={[styles.smartCard, { backgroundColor: `${colors.primary}0C`, borderColor: `${colors.primary}44` }]}><View style={styles.smartTop}><CompanionMascot mascot="atlas" state="thinking" size={46} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>ENTREVISTA DO PROFESSOR</NexusText><NexusText variant="title">Vamos mapear {pendingProfessorTopic}?</NexusText></View></View><NexusText secondary>Atlas quer entender seu nível e objetivo antes de criar uma trilha que realmente sirva para você.</NexusText><NexusButton label="Responder ao Atlas" onPress={() => router.push({ pathname: "/professor-intake", params: { topic: pendingProfessorTopic } })} fullWidth /></Card> : nextLesson && activeRoadmap ? <Card style={[styles.smartCard, { backgroundColor: `${colors.primary}0C` }]}><View style={styles.smartTop}><CompanionMascot mascot="atlas" state="idle" size={46} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PRÓXIMA EVOLUÇÃO</NexusText><NexusText variant="title">{nextLesson.title}</NexusText></View></View><NexusText variant="caption" secondary>{activeRoadmap.topic} • {nextLesson.estimatedMinutes} min</NexusText><NexusButton label="Abrir roadmap" variant="secondary" onPress={() => router.push("/(tabs)/brain")} fullWidth /></Card> : null}
      </View>
    );
    if (section === "mission") return <View key={section} style={[styles.section, { marginTop: sectionGap }]}><MissionCard mission={plan.mainMission} onToggle={toggleMission} /></View>;
    if (section === "tasks") return (
      <View key={section} style={[styles.section, { marginTop: sectionGap }]}>
        <View style={styles.sectionHeader}><View><NexusText variant="title">Tarefas de hoje</NexusText><NexusText variant="caption" secondary>{stats.completed} de {stats.total} concluídas</NexusText></View><Pressable accessibilityRole="button" accessibilityLabel="Adicionar tarefa" accessibilityState={{ disabled: plan.tasks.length >= 5 }} disabled={plan.tasks.length >= 5} onPress={() => { setEditingTask(undefined); setEditorOpen(true); }} style={[styles.addButton, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}55`, opacity: plan.tasks.length >= 5 ? 0.35 : 1 }]}><NexusText variant="title" color={colors.primarySoft}>＋</NexusText></Pressable></View>
        <View style={styles.taskList}>{plan.tasks.map((task) => <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} onEdit={() => { setEditingTask(task); setEditorOpen(true); }} onPostpone={() => setPostponeTarget(task)} onDelete={() => setDeleteTarget(task)} />)}</View>
      </View>
    );
    if (section === "operation") return activeOperation ? <View key={section} style={[styles.section, { marginTop: sectionGap }]}><View style={styles.sectionHeader}><NexusText variant="title">Operação ativa</NexusText><NexusButton label="Abrir" variant="ghost" onPress={() => router.push("/operations")} /></View><Card style={[styles.operationCard, { borderColor: `${colors.warning}44` }]}><NexusText variant="mono" color={colors.warning}>OPERAÇÃO</NexusText><NexusText variant="title">{activeOperation.title}</NexusText><NexusText variant="caption" secondary>{activeOperation.objective}</NexusText><ProgressBar progress={activeOperation.phases.filter((phase) => phase.completed).length / activeOperation.phases.length} color={colors.warning} />{activeOperation.phases.slice(0, 3).map((phase) => <Pressable key={phase.id} onPress={() => toggleOperationPhase(activeOperation.id, phase.id)} style={styles.miniRow}><NexusText color={phase.completed ? colors.success : colors.warning}>{phase.completed ? "✓" : "○"}</NexusText><NexusText variant="caption" style={styles.flex}>{phase.title}</NexusText></Pressable>)}</Card></View> : null;
    if (section === "habits") return todayHabits.length ? <View key={section} style={[styles.section, { marginTop: sectionGap }]}><View style={styles.sectionHeader}><NexusText variant="title">Hábitos inteligentes</NexusText><NexusButton label="Gerenciar" variant="ghost" onPress={() => router.push("/habits")} /></View><Card style={styles.habitCard}>{todayHabits.map((habit) => { const done = habit.completedDates.includes(today); return <Pressable key={habit.id} onPress={() => toggleHabitToday(habit.id)} style={[styles.habitRow, { borderBottomColor: colors.border }]}><NexusText color={done ? colors.success : colors.primarySoft}>{done ? "✓" : "○"}</NexusText><View style={styles.flex}><NexusText variant="subtitle">{habit.title}</NexusText><NexusText variant="caption" secondary>♨ {habit.currentStreak} • meta {habit.targetPerWeek}x</NexusText></View></Pressable>; })}</Card></View> : null;
    if (section === "quick") return <View key={section} style={[styles.section, { marginTop: sectionGap }]}><NexusText variant="title">Ações rápidas</NexusText><View style={styles.quickGrid}><QuickAction icon="✦" label="Capturar ideia" onPress={() => setCaptureOpen(true)} /><QuickAction icon="◎" label="Iniciar foco" onPress={() => router.push({ pathname: "/(tabs)/focus", params: { taskId: plan.tasks.find((task) => !task.completed)?.id ?? "" } })} /><QuickAction icon="↻" label="Replanejar" onPress={() => { setSmartReplan(false); setPreserveIds(plan.tasks.filter((task) => !task.completed && task.priority === "alta").slice(0, 2).map((task) => task.id)); setReplanOpen(true); }} /><QuickAction icon="▦" label="Planejar semana" onPress={() => router.push("/week")} /><QuickAction icon="★" label="Operações" onPress={() => router.push("/operations")} /><QuickAction icon="✎" label="Personalizar" onPress={() => router.push("/customize")} /></View></View>;
    if (section === "progress") return <View key={section} style={[styles.section, { marginTop: sectionGap }]}><Card style={styles.progressCard}><View style={styles.sectionHeader}><View><NexusText variant="mono" color={colors.primarySoft}>EXECUÇÃO DIÁRIA</NexusText><NexusText variant="display">{stats.percentage}%</NexusText></View><NexusText variant="caption" secondary>{plan.totalEstimatedMinutes} min planejados</NexusText></View><ProgressBar progress={stats.percentage / 100} color={stats.percentage >= 70 ? colors.success : colors.primary} height={9} /><View style={styles.metrics}><Metric label="Concluídas" value={`${stats.completed}/${stats.total}`} /><Metric label="XP hoje" value={String(stats.xp)} /><Metric label="Foco" value={`${stats.focusMinutes}m`} /></View></Card></View>;
    if (section === "message") return <Card key={section} style={[styles.focusMessage, { marginTop: sectionGap, backgroundColor: `${colors.primary}0E` }]}><NexusText variant="mono" color={colors.primarySoft}>ORDEM DO NEXUS</NexusText><NexusText variant="subtitle">“{plan.focusMessage}”</NexusText><NexusText variant="caption" secondary>Evite: {plan.avoidToday.join(" • ")}</NexusText></Card>;
    return null;
  };

  return (
    <>
      <Screen>
        <CommandBackground effect={data.preferences.dashboard.backgroundEffect} />
        <View style={styles.header}>
          <View style={styles.brandRow}><PixelMascot state={plan.source === "offline" ? "sleeping" : stats.percentage === 100 ? "celebrating" : "idle"} size={48} /><View style={styles.flex}><View style={styles.onlineRow}><View style={[styles.onlineDot, { backgroundColor: plan.source === "ai" ? colors.success : colors.warning }]} /><NexusText variant="mono" color={plan.source === "ai" ? colors.success : colors.warning}>{plan.source === "ai" ? "NEXUS ONLINE" : "PLANO OFFLINE"}</NexusText></View><NexusText variant="title">Fala, {data.profile.nickname}.</NexusText></View><View style={styles.streak}><NexusText color={colors.warning}>♨</NexusText><NexusText variant="subtitle">{data.progress.currentStreak}</NexusText></View></View>
          <NexusText variant="caption" secondary>{formatLongDate(plan.date)}</NexusText>
        </View>
        {data.corruptionWarnings.length ? <Card style={[styles.warningCard, { borderColor: `${colors.warning}55` }]}><View style={styles.warningText}><NexusText variant="subtitle" color={colors.warning}>Recuperação concluída</NexusText><NexusText variant="caption" secondary>{data.corruptionWarnings[0]}</NexusText></View><Pressable onPress={dismissWarnings} style={styles.closeButton}><NexusText>×</NexusText></Pressable></Card> : null}
        {plan.warning ? <View style={[styles.sourceNotice, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}44` }]}><NexusText variant="caption" color={colors.warning}>⚠ {plan.warning}</NexusText></View> : null}
        {sections.map(renderSection)}
      </Screen>

      <QuickCapture visible={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskEditor visible={editorOpen} task={editingTask} onSave={saveTask} onClose={() => setEditorOpen(false)} />
      <ConfirmDialog visible={Boolean(deleteTarget)} title="Excluir esta tarefa?" message="Se ela já estiver concluída, o XP concedido será removido." confirmLabel="Excluir" destructive onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) deleteTask(deleteTarget.id); setDeleteTarget(null); }} />
      <ConfirmDialog visible={Boolean(postponeTarget)} title="Deixar para o próximo plano?" message="A tarefa sairá de hoje e será carregada para o próximo planejamento sem duplicação." confirmLabel="Adiar tarefa" onCancel={() => setPostponeTarget(null)} onConfirm={() => { if (postponeTarget) postponeTask(postponeTarget.id); setPostponeTarget(null); }} />
      <ConfirmDialog visible={replanOpen} title={smartReplan ? "Aplicar ajuste inteligente?" : "Substituir o plano atual?"} message={smartReplan && signal ? `${signal.message} Tarefas concluídas e XP continuarão preservados.` : "As tarefas concluídas continuarão no histórico e o XP já conquistado será preservado."} confirmLabel="Replanejar" onCancel={() => setReplanOpen(false)} onConfirm={() => { setReplanOpen(false); router.push("/loading-plan"); void replanDay({ ...(smartReplan && signal ? { reason: signal.message, minutesRemaining: signal.suggestedMinutes } : {}), preserveTaskIds: preserveIds }); }}>
        <View style={styles.preserveList}><NexusText variant="caption" secondary>Levar para o novo plano (máximo 2)</NexusText>{plan.tasks.filter((task) => !task.completed).map((task) => { const selected = preserveIds.includes(task.id); return <Pressable key={task.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setPreserveIds((current) => selected ? current.filter((id) => id !== task.id) : current.length < 2 ? [...current, task.id] : current)} style={[styles.preserveRow, { borderColor: selected ? colors.primary : colors.border }]}><NexusText color={selected ? colors.primarySoft : colors.textSecondary}>{selected ? "✓" : "○"}</NexusText><NexusText variant="caption" style={styles.flex}>{task.title}</NexusText></Pressable>; })}</View>
      </ConfirmDialog>
    </>
  );
}

function CommandBackground({ effect }: { effect: string }) { const { colors } = useNexus(); if (effect === "nenhum") return null; return <View pointerEvents="none" style={[styles.backgroundEffect, { borderColor: `${colors.primary}${effect === "aurora" ? "26" : "12"}`, backgroundColor: effect === "aurora" ? `${colors.primary}06` : "transparent", transform: [{ rotate: effect === "scanlines" ? "0deg" : "45deg" }] }]} />; }
function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) { const { colors } = useNexus(); return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}><View style={[styles.quickIcon, { backgroundColor: `${colors.primary}18` }]}><NexusText variant="title" color={colors.primarySoft}>{icon}</NexusText></View><NexusText variant="caption">{label}</NexusText></Pressable>; }
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><NexusText variant="title">{value}</NexusText><NexusText variant="caption" secondary>{label}</NexusText></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, header: { gap: 6, marginBottom: 8 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 12 }, onlineRow: { flexDirection: "row", alignItems: "center", gap: 7 }, onlineDot: { width: 7, height: 7, borderRadius: 4 },
  streak: { minWidth: 54, height: 42, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, warningCard: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }, warningText: { flex: 1, gap: 3 }, closeButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  sourceNotice: { marginTop: 12, borderRadius: 13, borderWidth: 1, padding: 11 }, section: { gap: 13 }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, addButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, taskList: { gap: 11 },
  smartCard: { gap: 12 }, smartTop: { flexDirection: "row", alignItems: "center", gap: 10 }, actions: { flexDirection: "row", gap: 9 }, operationCard: { gap: 10 }, miniRow: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 34 }, habitCard: { paddingVertical: 4 }, habitRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, quickAction: { width: "31%", minWidth: 104, minHeight: 94, flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 12, justifyContent: "space-between", gap: 8 }, quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  progressCard: { gap: 15 }, metrics: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, metric: { flex: 1, alignItems: "center", gap: 2 }, focusMessage: { marginBottom: 8, gap: 10 }, empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }, center: { textAlign: "center" },
  backgroundEffect: { position: "absolute", width: 430, height: 430, top: 80, right: -210, borderWidth: 1 },
  preserveList: { gap: 7 }, preserveRow: { minHeight: 46, borderWidth: 1, borderRadius: 12, padding: 9, flexDirection: "row", alignItems: "center", gap: 8 },
});
