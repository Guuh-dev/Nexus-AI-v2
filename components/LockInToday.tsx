import { PixelHabitat } from "@/components/PixelHabitat";
import { peekFocusRuntime, type FocusRuntime } from "@/services/focus-runtime.service";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { QuickCapture } from "@/components/QuickCapture";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusIcon } from "@/components/ui/NexusIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge, Divider, IconButton, SectionHeader, Stat } from "@/components/ui/Layout";
import { TaskEditor, type TaskEditorValue } from "@/components/TaskEditor";
import { useNexus } from "@/providers/NexusProvider";
import { getCompanionLine, shouldShowCompanion } from "@/features/companion/companion";
import { detectReplanSignal } from "@/features/planning/smart-replan";
import type { Task } from "@/types";

const minutes = (value: number) => value >= 60 ? `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}` : `${value} min`;

export function LockInToday() {
  const { data, colors, toggleTask, addTask, updateTask } = useNexus();
  const [session, setSession] = useState<FocusRuntime | null>(null);
  useEffect(() => { let mounted = true; const refresh = () => { void peekFocusRuntime().then((r) => { if (mounted) setSession(r); }).catch(() => undefined); }; refresh(); const timer = setInterval(refresh, 5000); return () => { mounted = false; clearInterval(timer); }; }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  // The launcher shortcut and the Captura widget open nexusai://today?capture=1.
  const params = useLocalSearchParams<{ capture?: string }>();
  const [captureOpen, setCaptureOpen] = useState(false);
  useEffect(() => { if (params.capture === "1") setCaptureOpen(true); }, [params.capture]);
  const plan = data.activePlan!;
  const goal = data.lockIn.goals.find((g) => g.state === "primary");
  const next = plan.tasks.find((t) => !t.completed && plan.mainMission.taskIds?.includes(t.id)) ?? plan.tasks.find((t) => !t.completed);
  const signal = detectReplanSignal(data);
  const date = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short", timeZone: data.profile?.timezone }).replace("-feira", "");
  const save = async (value: TaskEditorValue) => editing ? updateTask(editing.id, value) : addTask(value);
  const done = plan.tasks.filter((t) => t.completed).length;
  const missionDone = plan.mainMission.completed;
  const pose = session?.status === "paused" ? "sleeping" : session?.status === "running" ? "thinking" : missionDone ? "celebrating" : "idle";
  const companionLine = data.preferences.mascot.speechEnabled && shouldShowCompanion(data)
    ? getCompanionLine(data, data.preferences.mascot.companion === "atlas" ? data.preferences.mascot.atlasMood ?? data.preferences.mascot.companionMood : data.preferences.mascot.companionMood)
    : undefined;

  return <><Screen maxWidth={620}><View style={styles.page}>
    <View style={styles.topBar}>
      <View style={styles.flex}>
        <NexusText variant="eyebrow" secondary>{date}</NexusText>
        <NexusText variant="display" accessibilityRole="header">Olá, {data.profile?.nickname}.</NexusText>
      </View>
      <IconButton icon="settings" label="Configurações" onPress={() => router.push("/settings")} />
    </View>

    {data.preferences.mascot.showCompanion ? <PixelHabitat pose={pose} line={companionLine} /> : companionLine ? <NexusText variant="caption" secondary>{companionLine}</NexusText> : null}

    <Card elevated tone={missionDone ? "success" : "accent"} style={styles.mission}>
      <View style={styles.rowBetween}>
        <Badge label={missionDone ? "Missão concluída" : "Missão de hoje"} color={missionDone ? colors.success : colors.primarySoft} icon={missionDone ? "check" : "target"} />
        <NexusText variant="caption" secondary>{minutes(plan.mainMission.estimatedMinutes)}</NexusText>
      </View>
      <View style={styles.missionText}>
        <NexusText variant="display" style={styles.missionTitle}>{plan.mainMission.title}</NexusText>
        {goal?.result ? <NexusText variant="caption" secondary numberOfLines={1}>Rumo a: {goal.result}</NexusText> : null}
      </View>
      <View style={[styles.doneWhen, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <NexusText variant="eyebrow" secondary>{plan.mainMission.doneWhen ? "Concluído quando" : "Descrição"}</NexusText>
        <NexusText>{plan.mainMission.doneWhen || plan.mainMission.description}</NexusText>
      </View>
      {plan.tasks.length > 0 && <View style={styles.progress}>
        <ProgressBar progress={done / plan.tasks.length} color={missionDone ? colors.success : colors.primary} />
        <NexusText variant="caption" secondary>{done} de {plan.tasks.length} passos concluídos</NexusText>
      </View>}
      {(next || session) && <>
        <Divider />
        <View style={styles.nextStep}>
          <NexusText variant="eyebrow" color={colors.primarySoft}>Comece por aqui</NexusText>
          <NexusText variant="subtitle">{session?.nextAction || next?.firstStep || "Revisar a entrega da sessão"}</NexusText>
        </View>
        <NexusButton label={session ? session.status === "completed" ? "Revisar sessão" : "Continuar sessão" : "Iniciar foco"} icon="▶" onPress={() => router.push({ pathname: "/(tabs)/focus", params: next ? { taskId: next.id } : {} })} />
        <NexusText variant="caption" secondary style={styles.center}>{session ? `${minutes(Math.floor(session.elapsedBase / 60))} registrados · ${session.status === "paused" ? "sessão pausada" : session.status === "completed" ? "entrega aguardando revisão" : "sessão em andamento"}` : `${minutes(plan.mainMission.estimatedMinutes)} planejados · nas tarefas vinculadas`}</NexusText>
      </>}
      {!next && !session && <><NexusText color={colors.success}>As tarefas registradas foram concluídas.</NexusText><NexusButton label="Revisar meu dia" variant="secondary" onPress={() => router.push("/(tabs)/progress")} /></>}
    </Card>

    <Pressable accessibilityRole="button" accessibilityLabel="Revisar capacidade no Plano" onPress={() => router.push("/(tabs)/plan")}>
      {({ pressed }) => <Card style={[styles.capacity, pressed && styles.pressed]}>
        <Stat label="Capacidade" value={minutes(plan.execution?.capacityMinutes ?? 0)} />
        <View style={[styles.vRule, { backgroundColor: colors.border }]} />
        <Stat label="Buffer" value={minutes(plan.execution?.bufferMinutes ?? 0)} />
        <View style={[styles.vRule, { backgroundColor: colors.border }]} />
        <Stat label="Sequência" value={`${data.progress.currentStreak}d`} />
        <NexusIcon name="chevron" color={colors.textSecondary} size={16} />
      </Card>}
    </Pressable>

    {signal && <Card tone="warning" style={styles.gap8}><NexusText variant="subtitle" color={colors.warning}>{signal.title}</NexusText><NexusText secondary>{signal.message}</NexusText></Card>}

    <SectionHeader title="Próximos passos" meta={plan.tasks.length ? `${done} de ${plan.tasks.length} concluídos` : undefined} action={<View style={styles.actions}><NexusButton label="Capturar" compact variant="ghost" onPress={() => setCaptureOpen(true)} /><NexusButton label="Adicionar" compact variant="ghost" onPress={() => { setEditing(undefined); setEditorOpen(true); }} /></View>} />
    <Card style={styles.list}>
      {plan.tasks.length === 0 && <NexusText secondary style={styles.listEmpty}>Nenhum passo registrado. Adicione o próximo passo real.</NexusText>}
      {plan.tasks.map((task, index) => <View key={task.id}>
        {index > 0 && <Divider />}
        <View style={styles.taskRow}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={task.completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`} accessibilityState={{ checked: task.completed, disabled: busy !== null }} disabled={busy !== null} onPress={() => { setBusy(task.id); void toggleTask(task.id).finally(() => setBusy(null)); }} style={styles.check}>
            <View style={[styles.checkBox, { borderColor: task.completed ? colors.success : colors.borderStrong, backgroundColor: task.completed ? colors.success : "transparent" }]}>{task.completed && <NexusIcon name="check" color={colors.onSuccess} size={14} />}</View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Detalhes de ${task.title}`} onPress={() => setDetails(details === task.id ? null : task.id)} style={styles.taskText}>
            <NexusText variant="subtitle" style={task.completed ? { color: colors.textSecondary, textDecorationLine: "line-through" } : undefined}>{task.title}</NexusText>
            <NexusText variant="caption" secondary>{minutes(task.estimatedMinutes)} · {task.completed ? "concluída" : plan.mainMission.taskIds?.includes(task.id) ? "missão" : "avulsa"}</NexusText>
          </Pressable>
          <View style={details === task.id ? styles.chevronOpen : undefined}><NexusIcon name="chevron" color={colors.textSecondary} size={16} /></View>
        </View>
        {details === task.id && <View style={[styles.details, { borderColor: colors.border }]}>
          {task.context ? <NexusText secondary>{task.context}</NexusText> : null}
          <Detail label="Primeira ação" value={task.firstStep} />
          <Detail label="Resultado" value={task.expectedResult} />
          <Detail label="Concluído quando" value={task.doneWhen} />
          {task.completedAt && <NexusText variant="caption" secondary>Conclusão registrada: {new Date(task.completedAt).toLocaleTimeString("pt-BR", { timeZone: data.profile?.timezone })}</NexusText>}
          <View style={styles.rowStart}><NexusButton label="Editar tarefa" variant="secondary" compact onPress={() => { setEditing(task); setEditorOpen(true); }} /></View>
        </View>}
      </View>)}
    </Card>
    {data.corruptionWarnings.length > 0 && <Card tone="warning"><NexusText color={colors.warning}>{data.corruptionWarnings.join("\n")}</NexusText></Card>}
  </View></Screen><TaskEditor visible={editorOpen} task={editing} onSave={save} onClose={() => setEditorOpen(false)} /><QuickCapture visible={captureOpen} onClose={() => { setCaptureOpen(false); if (params.capture) router.setParams({ capture: undefined }); }} /></>;
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <View style={styles.detail}><NexusText variant="eyebrow" secondary>{label}</NexusText><NexusText>{value}</NexusText></View>;
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 20 },
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowStart: { flexDirection: "row" },
  actions: { flexDirection: "row", gap: 4 },
  mission: { gap: 16, padding: 20 },
  missionText: { gap: 6 },
  missionTitle: { fontSize: 24, lineHeight: 30 },
  doneWhen: { gap: 4, padding: 12, borderRadius: 12, borderWidth: 1 },
  progress: { gap: 8 },
  nextStep: { gap: 6 },
  center: { textAlign: "center" },
  capacity: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  vRule: { width: 1, alignSelf: "stretch" },
  pressed: { opacity: 0.8 },
  gap8: { gap: 8 },
  list: { paddingVertical: 4, paddingHorizontal: 12 },
  listEmpty: { paddingVertical: 14, paddingHorizontal: 4 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  check: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  checkBox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  taskText: { flex: 1, minHeight: 44, gap: 2, justifyContent: "center" },
  chevronOpen: { transform: [{ rotate: "90deg" }] },
  details: { gap: 12, paddingLeft: 52, paddingRight: 8, paddingBottom: 16 },
  detail: { gap: 3 },
});
