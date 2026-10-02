import { PixelHabitat } from "@/components/PixelHabitat";
import { CompanionMascot } from "@/components/CompanionMascot";
import { peekFocusRuntime, type FocusRuntime } from "@/services/focus-runtime.service";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusIcon } from "@/components/ui/NexusIcon";
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
  const plan = data.activePlan!;
  const goal = data.lockIn.goals.find((g) => g.state === "primary");
  const next = plan.tasks.find((t) => !t.completed && plan.mainMission.taskIds?.includes(t.id)) ?? plan.tasks.find((t) => !t.completed);
  const signal = detectReplanSignal(data);
  const date = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short", timeZone: data.profile?.timezone }).replace("-feira", "");
  const save = async (value: TaskEditorValue) => editing ? updateTask(editing.id, value) : addTask(value);
  return <><Screen maxWidth={620}><View style={{ gap: 14, paddingTop: 10, paddingBottom: 20 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><NexusText style={{ letterSpacing: 7, fontWeight: "600" }}>NEXUS</NexusText><Pressable accessibilityRole="button" accessibilityLabel="Configurações" onPress={() => router.push("/settings")} style={{ minHeight: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.surface }}><NexusIcon name="settings" color={colors.text} size={21} /></Pressable></View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 74 }}><View style={{ flex: 1, gap: 8 }}><NexusText variant="mono" secondary style={{ fontSize: 10 }}>{date.toLocaleUpperCase("pt-BR")}</NexusText><NexusText variant="display">Seu próximo passo,{"\n"}{data.profile?.nickname}.</NexusText></View>{data.preferences.mascot.showCompanion && <CompanionMascot mascot={data.preferences.mascot.companion} state={session?.status === "paused" ? "sleeping" : plan.mainMission.completed ? "celebrating" : "idle"} size={48} />}</View>
    {data.preferences.mascot.showCompanion && <PixelHabitat pose={session?.status === "paused" ? "sleeping" : session?.status === "running" ? "thinking" : plan.mainMission.completed ? "celebrating" : "idle"} />}
    {data.preferences.mascot.speechEnabled && shouldShowCompanion(data) && <NexusText variant="caption" secondary>{getCompanionLine(data, data.preferences.mascot.companion === "atlas" ? data.preferences.mascot.atlasMood ?? data.preferences.mascot.companionMood : data.preferences.mascot.companionMood)}</NexusText>}

    <Card elevated style={{ gap: 12, padding: 20 }}>
      <NexusText variant="mono" color={plan.mainMission.completed ? colors.success : colors.primary} style={{ fontSize: 11 }}>{plan.mainMission.completed ? "MISSÃO CONCLUÍDA" : "01 / MISSÃO DE HOJE"}</NexusText>
      <NexusText variant="display" style={{ fontSize: 25, lineHeight: 30 }}>{plan.mainMission.title}</NexusText>
      <NexusText variant="caption" secondary numberOfLines={1}>Para: {goal?.result}</NexusText>
      <NexusText secondary>{plan.mainMission.doneWhen ? `Concluído quando: ${plan.mainMission.doneWhen}` : plan.mainMission.description}</NexusText>
      {(next || session) && <><View style={{ height: 1, backgroundColor: colors.borderStrong, marginVertical: 3 }} /><NexusText variant="mono" color={colors.primarySoft} style={{ fontSize: 10 }}>COMECE POR AQUI</NexusText><NexusText variant="subtitle">{session?.nextAction || next?.firstStep || "Revisar a entrega da sessão"}</NexusText><NexusButton label={session ? session.status === "completed" ? "Revisar sessão" : "Continuar sessão" : "Iniciar foco"} icon="▶" onPress={() => router.push({ pathname: "/(tabs)/focus", params: next ? { taskId: next.id } : {} })} /><NexusText variant="caption" secondary style={{ textAlign: "center" }}>{session ? `${minutes(Math.floor(session.elapsedBase / 60))} registrados · ${session.status === "paused" ? "sessão pausada" : session.status === "completed" ? "entrega aguardando revisão" : "sessão em andamento"}` : `${minutes(plan.mainMission.estimatedMinutes)} planejados · nas tarefas vinculadas`}</NexusText></>}
      {!next && !session && <><NexusText color={colors.success}>As tarefas registradas foram concluídas.</NexusText><NexusButton label="Revisar meu dia" variant="secondary" onPress={() => router.push("/(tabs)/progress")} /></>}
    </Card>
    <Pressable accessibilityRole="button" accessibilityLabel="Revisar capacidade no Plano" onPress={() => router.push("/(tabs)/plan")}><Card style={{ flexDirection: "row", alignItems: "center", paddingVertical: 15 }}><View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}><NexusIcon name="clock" color={colors.textSecondary} size={28} /><View><NexusText variant="caption" secondary>Capacidade confirmada</NexusText><NexusText variant="title">{minutes(plan.execution?.capacityMinutes ?? 0)}</NexusText></View></View><View style={{ paddingLeft: 20, borderLeftWidth: 1, borderColor: colors.borderStrong, gap: 2 }}><NexusText variant="caption" secondary>Buffer</NexusText><NexusText variant="subtitle">{minutes(plan.execution?.bufferMinutes ?? 0)}</NexusText></View></Card></Pressable>
    {signal && <Card style={{ gap: 8, borderColor: colors.warning }}><NexusText color={colors.warning}>{signal.title}</NexusText><NexusText secondary>{signal.message}</NexusText></Card>}
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}><NexusText variant="title">Próximos passos</NexusText><NexusButton label="Adicionar" compact variant="ghost" onPress={() => { setEditing(undefined); setEditorOpen(true); }} /></View>
    {plan.tasks.map((task) => <Card key={task.id} style={{ gap: 12, padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Pressable accessibilityRole="checkbox" accessibilityLabel={task.completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`} accessibilityState={{ checked: task.completed, disabled: busy !== null }} disabled={busy !== null} onPress={() => { setBusy(task.id); void toggleTask(task.id).finally(() => setBusy(null)); }} style={{ minHeight: 44, width: 44, alignItems: "center", justifyContent: "center" }}><View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: task.completed ? colors.success : colors.textSecondary, backgroundColor: task.completed ? `${colors.success}18` : "transparent", alignItems: "center", justifyContent: "center" }}>{task.completed && <NexusText color={colors.success}>✓</NexusText>}</View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Detalhes de ${task.title}`} onPress={() => setDetails(details === task.id ? null : task.id)} style={{ flex: 1, minHeight: 44, gap: 3, justifyContent: "center" }}><NexusText variant="subtitle" style={task.completed ? { color: colors.textSecondary, textDecorationLine: "line-through" } : undefined}>{task.title}</NexusText><NexusText variant="caption" secondary>{minutes(task.estimatedMinutes)} · {task.completed ? "concluída" : plan.mainMission.taskIds?.includes(task.id) ? "missão" : "avulsa"}</NexusText></Pressable><NexusIcon name="chevron" color={colors.textSecondary} size={17} /></View>
      {details === task.id && <><NexusText secondary>{task.context}</NexusText><NexusText>Primeira ação: {task.firstStep}</NexusText><NexusText>Resultado: {task.expectedResult}</NexusText><NexusText>Concluído quando: {task.doneWhen}</NexusText>{task.completedAt && <NexusText secondary>Conclusão registrada: {new Date(task.completedAt).toLocaleTimeString("pt-BR", { timeZone: data.profile?.timezone })}</NexusText>}<NexusButton label="Editar tarefa" variant="ghost" compact onPress={() => { setEditing(task); setEditorOpen(true); }} /></>}
    </Card>)}
    {data.corruptionWarnings.length > 0 && <NexusText color={colors.warning}>{data.corruptionWarnings.join("\n")}</NexusText>}
  </View></Screen><TaskEditor visible={editorOpen} task={editing} onSave={save} onClose={() => setEditorOpen(false)} /></>;
}
