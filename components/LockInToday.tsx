import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { TaskEditor, type TaskEditorValue } from "@/components/TaskEditor";
import { useNexus } from "@/providers/NexusProvider";
import { detectReplanSignal } from "@/features/planning/smart-replan";
import type { Task } from "@/types";

export function LockInToday() {
  const { data, colors, toggleTask, addTask, updateTask } = useNexus();
  const [busy, setBusy] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const plan = data.activePlan!;
  const next = plan.tasks.find((t) => !t.completed);
  const signal = detectReplanSignal(data);
  const save = async (value: TaskEditorValue) => editing ? updateTask(editing.id, value) : addTask(value);
  return <><Screen><View style={{ gap: 16, paddingBottom: 20 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><NexusText variant="title">Hoje, {data.profile?.nickname}.</NexusText><NexusButton label="Configurações" compact variant="ghost" onPress={() => router.push("/settings")} /></View>
    <Card style={{ gap: 14 }}>
      <NexusText variant="mono" color={plan.mainMission.completed ? colors.success : colors.primarySoft}>{plan.mainMission.completed ? "MISSÃO CONCLUÍDA" : "MISSÃO CONFIRMADA"}</NexusText>
      <NexusText variant="display">{plan.mainMission.title}</NexusText>
      <NexusText secondary>{plan.mainMission.description}</NexusText>
      <NexusText variant="caption">{plan.mainMission.estimatedMinutes} min nas tarefas vinculadas · plano local</NexusText>
      {next && <><NexusText variant="subtitle">Próxima ação</NexusText><NexusText>{next.firstStep}</NexusText><NexusButton label="Iniciar próxima ação" onPress={() => router.push({ pathname: "/(tabs)/focus", params: { taskId: next.id } })} /></>}
      {!next && <NexusText color={colors.success}>As tarefas registradas foram concluídas. Você pode encerrar o dia ou revisar o próximo passo.</NexusText>}
    </Card>
    <Card style={{ gap: 8 }}><NexusText variant="subtitle">Capacidade confirmada: {plan.execution?.capacityMinutes} min</NexusText><NexusText secondary>Buffer: {plan.execution?.bufferMinutes} min · tarefas: {plan.totalEstimatedMinutes} min. O esforço da missão não é somado novamente.</NexusText><NexusButton label="Revisar Plano" variant="secondary" onPress={() => router.push("/(tabs)/plan")} /></Card>
    {signal && <Card style={{ gap: 8, borderColor: colors.warning }}><NexusText color={colors.warning}>{signal.title}</NexusText><NexusText secondary>{signal.message}</NexusText></Card>}
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><NexusText variant="title">Tarefas</NexusText><NexusButton label="Adicionar" compact variant="secondary" onPress={() => { setEditing(undefined); setEditorOpen(true); }} /></View>
    {plan.tasks.map((task) => <Card key={task.id} style={{ gap: 10 }}>
      <NexusText variant="subtitle">{task.completed ? "✓ " : ""}{task.title}</NexusText>
      <NexusText secondary>{task.estimatedMinutes} min · {task.completed ? "concluída" : "pendente"} · {plan.mainMission.taskIds?.includes(task.id) ? "missão" : "avulsa"}</NexusText>
      {details === task.id && <><NexusText secondary>{task.context}</NexusText><NexusText>Primeira ação: {task.firstStep}</NexusText><NexusText>Resultado: {task.expectedResult}</NexusText><NexusText>Concluído quando: {task.doneWhen}</NexusText>{task.completedAt && <NexusText secondary>Conclusão registrada: {new Date(task.completedAt).toLocaleTimeString("pt-BR", { timeZone: data.profile?.timezone })}</NexusText>}</>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <NexusButton label={task.completed ? "Reabrir" : "Concluir"} variant="secondary" compact loading={busy === task.id} disabled={busy !== null} onPress={() => { setBusy(task.id); void toggleTask(task.id).finally(() => setBusy(null)); }} />
        <NexusButton label={details === task.id ? "Ocultar detalhes" : "Detalhes"} variant="ghost" compact onPress={() => setDetails(details === task.id ? null : task.id)} />
        <NexusButton label="Editar" variant="ghost" compact onPress={() => { setEditing(task); setEditorOpen(true); }} />
      </View>
    </Card>)}
    {data.corruptionWarnings.length > 0 && <NexusText color={colors.warning}>{data.corruptionWarnings.join("\n")}</NexusText>}
  </View></Screen><TaskEditor visible={editorOpen} task={editing} onSave={save} onClose={() => setEditorOpen(false)} /></>;
}
