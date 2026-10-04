import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";
import type { DayReview } from "@/schemas/lock-in.schema";
import { localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";
export function ExecutionReview() {
  const { data, colors, saveEvidence, deleteEvidence, saveDayReview, prepareTomorrow } = useNexus();
  const current = data.lockIn.reviews?.find((r) => r.date === localDateKey(new Date(), data.profile?.timezone));
  const [outcome, setOutcome] = useState<DayReview["outcome"]>(current?.outcome ?? "unknown");
  const [reason, setReason] = useState(current?.reason ?? "");
  const [nextAction, setNextAction] = useState(current?.nextAction ?? "");
  const [text, setText] = useState("");
  const evidenceId = useRef<string | undefined>(undefined);
  const [kind, setKind] = useState<"text" | "link">("text");
  const [taskId, setTaskId] = useState<string | undefined>(data.activePlan?.tasks[0]?.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(data.lockIn.revision);
  const run = async (work: () => Promise<boolean>, success: string) => { if (busy) return; setBusy(true); setMessage(""); try { if (await work()) setMessage(success); else setMessage("Não foi possível gravar. Seu rascunho foi mantido."); } catch (e) { setMessage(e instanceof Error ? e.message : "Revise os campos."); } finally { setBusy(false); } };
  return <View style={{ gap: 16 }}>
    <Card style={{ gap: 14 }}><NexusText variant="eyebrow" color={colors.primarySoft}>Revisão de hoje</NexusText><NexusText variant="title">O que realmente aconteceu?</NexusText>
      <NexusText variant="caption" secondary>Observado pelo app: {data.activePlan?.tasks.filter((t) => t.completed).length ?? 0} tarefas com conclusão registrada. Esse registro não comprova sozinho a qualidade da entrega.</NexusText>
      <NexusText variant="eyebrow" secondary>Seu relato sobre a missão</NexusText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["completed", "partial", "not_completed", "unknown"] as const).map((id) => <ChoiceChip key={id} label={{ completed: "Concluída", partial: "Parcial", not_completed: "Não concluída", unknown: "Não sei" }[id]} selected={outcome === id} onPress={() => setOutcome(id)} />)}</View>
      <Field label="O que mudou ou bloqueou? (opcional)" value={reason} onChangeText={setReason} maxLength={500} multiline /><Field label="Próxima ação para amanhã" value={nextAction} onChangeText={setNextAction} maxLength={300} multiline />
      {revision !== data.lockIn.revision && <><NexusText color={colors.warning}>O plano mudou desde que você abriu a revisão.</NexusText><NexusButton label="Revisar fatos atualizados" variant="secondary" onPress={() => setRevision(data.lockIn.revision)} /></>}
      <NexusButton label="Salvar revisão" loading={busy} disabled={revision !== data.lockIn.revision} onPress={() => { void run(() => saveDayReview({ outcome, reason, nextAction }, revision), "Revisão confirmada."); }} />
      <NexusButton label="Preparar rascunho de amanhã" variant="secondary" loading={busy} onPress={() => { void run(prepareTomorrow, "Rascunho salvo. Confirme as janelas amanhã."); }} />
      {data.lockIn.tomorrow && <><NexusText variant="subtitle">Amanhã: {data.lockIn.tomorrow.mission || "Escolher o resultado"}</NexusText><NexusText secondary>{data.lockIn.tomorrow.explanation}</NexusText><NexusText>Próxima ação: {data.lockIn.tomorrow.firstAction || "Ainda não definida"}</NexusText></>}
    </Card>
    <Card style={{ gap: 14 }}><NexusText variant="title">Evidências da entrega</NexusText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><ChoiceChip label="Relato / texto" selected={kind === "text"} onPress={() => setKind("text")} /><ChoiceChip label="Link" selected={kind === "link"} onPress={() => setKind("link")} /></View>
      <NexusText variant="eyebrow" secondary>Vincular a</NexusText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{data.activePlan?.tasks.map((t) => <ChoiceChip key={t.id} label={t.title} selected={taskId === t.id} onPress={() => setTaskId(t.id)} />)}<ChoiceChip label="Sem tarefa vinculada" selected={!taskId} onPress={() => setTaskId(undefined)} /></View>
      <Field label={kind === "link" ? "Link da entrega" : "O que você entregou?"} value={text} onChangeText={setText} maxLength={1000} multiline />
      <NexusButton label="Guardar evidência" variant="secondary" disabled={!text.trim() || busy} onPress={() => { void run(async () => { evidenceId.current ??= createId("evidence"); const ok = await saveEvidence({ id: evidenceId.current, taskId, text: text.trim(), kind, origin: "user_reported", createdAt: new Date().toISOString() }); if (ok) { setText(""); evidenceId.current = undefined; } return ok; }, "Evidência salva como relato seu."); }} />
      {data.lockIn.evidence?.slice(-20).reverse().map((e) => <View key={e.id} style={{ gap: 6, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.border }}><NexusText>{e.text}</NexusText><NexusText variant="caption" secondary>{e.origin === "user_reported" ? "Relatado por você" : "Observado pelo sistema"} · {new Date(e.createdAt).toLocaleDateString("pt-BR")}</NexusText><NexusButton label="Excluir evidência" compact variant="ghost" loading={busy} onPress={() => { void run(() => deleteEvidence(e.id), "Evidência e referências removidas."); }} /></View>)}
    </Card>
    {message && <NexusText color={colors.warning}>{message}</NexusText>}
    <NexusButton label="Revisar capacidade e missão" variant="ghost" onPress={() => router.push("/(tabs)/plan")} />
  </View>;
}
