import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import { Tabs, useLocalSearchParams } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CompanionMascot } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { ProgressRing } from "@/components/ProgressRing";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";
import { ambientSoundUri } from "@/services/ambient-sound.service";
import { clearFocusRuntime, loadFocusRuntime, saveFocusRuntime } from "@/services/focus-runtime.service";
import type { AmbientSound, FocusMode, FocusSession } from "@/types";
import { createId } from "@/utils/ids";
import { focusXpForSeconds } from "@/utils/levels";

export { RouteErrorBoundary as ErrorBoundary };
type TimerStatus = "idle" | "running" | "paused" | "completed";
const MODES: { id: FocusMode; label: string; duration: number; description: string }[] = [
  { id: "sprint", label: "Sprint", duration: 15, description: "Comece sem negociar" },
  { id: "pomodoro", label: "Pomodoro", duration: 25, description: "25 minutos precisos" },
  { id: "profundo", label: "Profundo", duration: 50, description: "50/10 para trabalho sério" },
  { id: "fluxo", label: "Fluxo", duration: 90, description: "Sem interrupção programada" },
  { id: "personalizado", label: "Personalizado", duration: 25, description: "Você escolhe" },
];
const SOUNDS: [AmbientSound,string][] = [["nenhum","Silêncio"],["chuva","Chuva"],["floresta","Floresta"],["cafeteria","Cafeteria"],["ruido_marrom","Ruído marrom"],["ruido_branco","Ruído branco"],["espaco","Espaço"]];
function formatTime(seconds: number) { const safe = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(safe / 60)).padStart(2,"0")}:${String(safe % 60).padStart(2,"0")}`; }

export default function FocusScreen() {
  const params = useLocalSearchParams<{ taskId?: string }>();
  const { data, colors, finishFocusSession } = useNexus();
  const player = useAudioPlayer(null);
  const tasks = useMemo(() => data.activePlan?.tasks ?? [], [data.activePlan?.tasks]);
  const initialId = typeof params.taskId === "string" ? params.taskId : undefined;
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(initialId || tasks.find((task) => !task.completed)?.id);
  const [mode, setMode] = useState<FocusMode>("pomodoro");
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState("25");
  const [intention, setIntention] = useState("");
  const [reflection, setReflection] = useState("");
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("nenhum");
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [elapsedBase, setElapsedBase] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [cancelOpen, setCancelOpen] = useState(false);
  const sessionStartedAt = useRef<string | null>(null);
  const saved = useRef(false);
  const restored = useRef(false);
  const active = status === "running" || status === "paused";
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const totalSeconds = duration * 60;
  const elapsed = Math.min(totalSeconds, elapsedBase + (runStartedAt ? Math.floor((tick - runStartedAt) / 1000) : 0));
  const remaining = Math.max(0, totalSeconds - elapsed);

  useEffect(() => { if (restored.current) return; restored.current = true; void loadFocusRuntime().then((runtime) => { if (!runtime) return; setSelectedTaskId(runtime.taskId); setDuration(runtime.duration); setCustomDuration(String(runtime.duration)); setMode(runtime.mode); setIntention(runtime.intention); setAmbientSound(runtime.ambientSound); setStatus(runtime.status); setElapsedBase(runtime.elapsedBase); setRunStartedAt(runtime.runStartedAt); sessionStartedAt.current = runtime.sessionStartedAt; setTick(Date.now()); }); }, []);
  useEffect(() => { if (status !== "running") return; const interval = setInterval(() => setTick(Date.now()), 250); return () => clearInterval(interval); }, [status]);
  useEffect(() => { if (status === "running" && elapsed >= totalSeconds) { setElapsedBase(totalSeconds); setRunStartedAt(null); setStatus("completed"); player.pause(); void clearFocusRuntime(); } }, [elapsed, player, status, totalSeconds]);
  useEffect(() => { if (!active) return; const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setCancelOpen(true); return true; }); return () => subscription.remove(); }, [active]);
  useEffect(() => { if (!active || !sessionStartedAt.current) return; void saveFocusRuntime({ ...(selectedTaskId ? { taskId: selectedTaskId } : {}), taskTitle: selectedTask?.title ?? "Sessão livre", duration, mode, intention, ambientSound, status: status as "running" | "paused", elapsedBase, runStartedAt, sessionStartedAt: sessionStartedAt.current }); }, [active, ambientSound, duration, elapsedBase, intention, mode, runStartedAt, selectedTask?.title, selectedTaskId, status]);
  useEffect(() => { let cancelled = false; if (!active || status !== "running" || ambientSound === "nenhum") { player.pause(); return; } void ambientSoundUri(ambientSound).then((uri) => { if (!uri || cancelled) return; player.replace(uri); player.loop = true; player.volume = 0.28; player.play(); }).catch(() => undefined); return () => { cancelled = true; }; }, [active, ambientSound, player, status]);

  const chooseMode = (item: typeof MODES[number]) => { setMode(item.id); setDuration(item.duration); setCustomDuration(String(item.duration)); };
  const start = () => { const parsed = Math.max(5, Math.min(360, Number(customDuration) || duration)); setDuration(parsed); setElapsedBase(0); setTick(Date.now()); setRunStartedAt(Date.now()); sessionStartedAt.current = new Date().toISOString(); saved.current = false; setStatus("running"); };
  const pause = () => { setElapsedBase(elapsed); setRunStartedAt(null); setStatus("paused"); player.pause(); };
  const resume = () => { setTick(Date.now()); setRunStartedAt(Date.now()); setStatus("running"); };
  const finish = () => { setElapsedBase(elapsed); setRunStartedAt(null); setStatus("completed"); player.pause(); void clearFocusRuntime(); };
  const saveSession = (markTaskComplete: boolean) => { if (saved.current) return; saved.current = true; const session: FocusSession = { id: createId("focus"), ...(selectedTask ? { taskId: selectedTask.id, category: selectedTask.category } : {}), taskTitle: selectedTask?.title ?? "Sessão de foco livre", plannedMinutes: duration, elapsedSeconds: elapsedBase, xp: focusXpForSeconds(elapsedBase), status: "completed", startedAt: sessionStartedAt.current ?? new Date().toISOString(), completedAt: new Date().toISOString(), mode, intention: intention.trim(), reflection: reflection.trim(), ambientSound }; finishFocusSession(session, markTaskComplete); setStatus("idle"); setElapsedBase(0); setReflection(""); sessionStartedAt.current = null; void clearFocusRuntime(); };
  const cancel = () => { if (elapsed > 0) finishFocusSession({ id: createId("focus-cancelled"), ...(selectedTask ? { taskId: selectedTask.id, category: selectedTask.category } : {}), taskTitle: selectedTask?.title ?? "Sessão de foco livre", plannedMinutes: duration, elapsedSeconds: elapsed, xp: 0, status: "cancelled", startedAt: sessionStartedAt.current ?? new Date().toISOString(), completedAt: new Date().toISOString(), mode, intention: intention.trim(), ambientSound }, false); player.pause(); setCancelOpen(false); setStatus("idle"); setElapsedBase(0); setRunStartedAt(null); sessionStartedAt.current = null; void clearFocusRuntime(); };
  const taskOptions = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);

  return <>
    <Tabs.Screen options={{ tabBarStyle: active ? { display: "none" } : {} }} />
    <Screen scroll={!active}>
      {status === "idle" ? <View style={styles.setup}>
        <View style={styles.header}><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>FOCUS OS</NexusText><NexusText variant="display">Uma intenção. Um bloco.</NexusText></View><CompanionMascot mascot="nova" size={58} /></View>
        <NexusText secondary>Escolha como vai trabalhar. O timer sobrevive ao fechamento do app e recupera o tempo corretamente.</NexusText>
        <View style={styles.section}><NexusText variant="title">Modo</NexusText><View style={styles.modeGrid}>{MODES.map((item) => <Pressable key={item.id} onPress={() => chooseMode(item)} style={[styles.modeCard, { backgroundColor: mode === item.id ? `${colors.primary}18` : colors.surface, borderColor: mode === item.id ? colors.primary : colors.border }]}><NexusText variant="subtitle">{item.label}</NexusText><NexusText variant="caption" secondary>{item.description}</NexusText><NexusText variant="mono" color={colors.primarySoft}>{item.duration} MIN</NexusText></Pressable>)}</View>{mode === "personalizado" ? <Field label="Duração personalizada" value={customDuration} onChangeText={setCustomDuration} keyboardType="number-pad" maxLength={3} hint="Entre 5 e 360 minutos." /> : null}</View>
        <View style={styles.section}><NexusText variant="title">Tarefa</NexusText><View style={styles.taskOptions}>{taskOptions.length ? taskOptions.map((task) => <Pressable key={task.id} onPress={() => setSelectedTaskId(task.id)} style={[styles.taskOption, { backgroundColor: selectedTaskId === task.id ? `${colors.primary}20` : colors.surface, borderColor: selectedTaskId === task.id ? colors.primary : colors.border }]}><NexusText color={selectedTaskId === task.id ? colors.primarySoft : colors.textSecondary}>{selectedTaskId === task.id ? "●" : "○"}</NexusText><View style={styles.flex}><NexusText variant="subtitle">{task.title}</NexusText><NexusText variant="caption" secondary>{task.estimatedMinutes} min • {task.xp} XP</NexusText></View></Pressable>) : <Card><NexusText secondary>Todas as tarefas foram concluídas. Use uma sessão livre.</NexusText></Card>}<ChoiceChip label="Sessão livre" selected={!selectedTaskId} onPress={() => setSelectedTaskId(undefined)} /></View></View>
        <Field label="Intenção da sessão" value={intention} onChangeText={setIntention} multiline maxLength={300} placeholder="Ao final deste bloco, eu terei..." />
        <View style={styles.section}><NexusText variant="title">Ambiente opcional</NexusText><View style={styles.chips}>{SOUNDS.map(([value,label]) => <ChoiceChip key={value} label={label} selected={ambientSound === value} onPress={() => setAmbientSound(value)} />)}</View><NexusText variant="caption" secondary>Sons leves são gerados no próprio dispositivo e funcionam offline.</NexusText></View>
        <Card style={[styles.readyCard, { backgroundColor: `${colors.primary}0F`, borderColor: `${colors.primary}40` }]}><NexusText variant="mono" color={colors.primarySoft}>ALVO</NexusText><NexusText variant="title">{selectedTask?.title ?? "Sessão de foco livre"}</NexusText><NexusText secondary>{customDuration || duration} minutos • {MODES.find((item) => item.id === mode)?.label}</NexusText></Card>
        <NexusButton label="Iniciar foco" icon="◎" onPress={start} fullWidth />
      </View> : null}

      {active ? <View style={styles.active}><PixelMascot state={status === "paused" ? "sleeping" : "thinking"} size={62} /><NexusText variant="mono" color={status === "paused" ? colors.warning : colors.success}>{status === "paused" ? "FOCO PAUSADO" : "FOCO ATIVO"}</NexusText><NexusText variant="title" style={styles.center} numberOfLines={2}>{selectedTask?.title ?? "Sessão de foco livre"}</NexusText>{intention ? <NexusText variant="caption" secondary style={styles.center}>Intenção: {intention}</NexusText> : null}<ProgressRing progress={totalSeconds ? elapsed / totalSeconds : 0} size={220} strokeWidth={12} label={formatTime(remaining)} /><NexusText secondary>{Math.floor(elapsed / 60)} de {duration} minutos • {MODES.find((item) => item.id === mode)?.label}</NexusText>{ambientSound !== "nenhum" ? <NexusText variant="caption" color={colors.primarySoft}>♫ {SOUNDS.find(([value]) => value === ambientSound)?.[1]}</NexusText> : null}<View style={styles.timerActions}>{status === "running" ? <NexusButton label="Pausar" icon="Ⅱ" variant="secondary" onPress={pause} style={styles.flex} /> : <NexusButton label="Retomar" icon="▶" onPress={resume} style={styles.flex} />}<NexusButton label="Finalizar" icon="✓" variant="secondary" onPress={finish} style={styles.flex} /></View><NexusButton label="Cancelar sessão" variant="ghost" onPress={() => setCancelOpen(true)} /></View> : null}

      {status === "completed" ? <View style={styles.completed}><View style={[styles.celebration, { backgroundColor: `${colors.success}16` }]}><PixelMascot state="celebrating" size={96} /></View><NexusText variant="mono" color={colors.success}>SESSÃO CONCLUÍDA</NexusText><NexusText variant="display" style={styles.center}>{formatTime(elapsedBase)} de execução.</NexusText><NexusText secondary style={styles.center}>+{focusXpForSeconds(elapsedBase)} XP de foco. Registre uma frase para transformar tempo em aprendizado.</NexusText><Field label="O que avançou ou descobriu?" value={reflection} onChangeText={setReflection} multiline maxLength={500} placeholder="Consegui..., travei em..., próximo passo..." />{selectedTask && !selectedTask.completed ? <Card style={styles.completionCard}><NexusText variant="subtitle">A tarefa também foi concluída?</NexusText><NexusText variant="caption" secondary>{selectedTask.title}</NexusText><View style={styles.timerActions}><NexusButton label="Ainda não" variant="ghost" onPress={() => saveSession(false)} style={styles.flex} /><NexusButton label="Sim, concluir" onPress={() => saveSession(true)} style={styles.flex} /></View></Card> : <NexusButton label="Salvar sessão" onPress={() => saveSession(false)} fullWidth />}</View> : null}
    </Screen>
    <ConfirmDialog visible={cancelOpen} title="Cancelar esta sessão?" message="O tempo executado será registrado sem XP. Sua tarefa não será alterada." confirmLabel="Cancelar sessão" destructive onCancel={() => setCancelOpen(false)} onConfirm={cancel} />
  </>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, setup: { gap: 22 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 }, section: { gap: 12 }, modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, modeCard: { width: "48%", flexGrow: 1, minHeight: 106, padding: 13, borderRadius: 17, borderWidth: 1, gap: 6 }, taskOptions: { gap: 9 }, taskOption: { minHeight: 68, padding: 13, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, readyCard: { gap: 8 }, active: { flex: 1, minHeight: 670, alignItems: "center", justifyContent: "center", gap: 18 }, center: { textAlign: "center" }, timerActions: { width: "100%", flexDirection: "row", gap: 10 }, completed: { flex: 1, minHeight: 650, alignItems: "center", justifyContent: "center", gap: 16 }, celebration: { width: 160, height: 160, borderRadius: 80, alignItems: "center", justifyContent: "center" }, completionCard: { width: "100%", gap: 13 },
});
