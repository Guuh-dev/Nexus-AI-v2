import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { useNexus } from "@/providers/NexusProvider";
import { confirmSecondaryGoal, draftFor } from "@/features/lock-in/planning";
import type { LockInDraft } from "@/schemas/lock-in.schema";

export function LockInSetup({ onboarding = false }: { onboarding?: boolean }) {
  const { data, colors, saveLockInDraft, confirmLockIn } = useNexus();
  const [draft, setDraft] = useState(() => draftFor(data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewRevision, setReviewRevision] = useState<number | null>(null);
  const patch = <K extends keyof LockInDraft>(key: K, value: LockInDraft[K]) => { setDraft((d) => ({ ...d, [key]: value })); setError(""); setReviewRevision(null); };
  const field = (key: keyof LockInDraft, label: string, maxLength: number, hint?: string) => <Field key={key} label={label} value={String(draft[key])} maxLength={maxLength} hint={hint} onChangeText={(v) => patch(key, v as never)} multiline={maxLength > 200} />;
  const save = async (nextStep = draft.step) => {
    setReviewRevision(null); setBusy(true); setError("");
    const next = { ...draft, step: nextStep };
    try {
      if (!await saveLockInDraft(next)) { setError("Não foi possível salvar. Seu rascunho permanece aqui para tentar novamente."); return; }
      setDraft(next);
    } finally { setBusy(false); }
  };
  let preview: ReturnType<typeof confirmSecondaryGoal> | undefined;
  let previewError = "";
  if (draft.step === 2) {
    try { preview = confirmSecondaryGoal(data, draft, data.lockIn.revision); }
    catch (e) { previewError = e instanceof Error ? e.message : "Revise os campos do plano."; }
  }
  const confirm = async () => {
    if (!preview || reviewRevision === null) return;
    setBusy(true); setError("");
    try {
      if (!await confirmLockIn(draft, reviewRevision)) { setError("A confirmação não foi gravada ou a revisão mudou. Revise o resumo e tente novamente."); setReviewRevision(null); return; }
      router.replace("/(tabs)/today");
    } finally { setBusy(false); }
  };
  const pending = data.activePlan?.tasks.filter((t) => !t.completed) ?? [];
  return <Screen>
    <View style={{ gap: 16, paddingBottom: 28 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <NexusText variant="title">{onboarding ? "Sua primeira missão" : "Plano"}</NexusText>
        {!onboarding && <NexusButton label="Configurações" variant="ghost" compact onPress={() => router.push("/settings")} />}
      </View>
      <NexusText secondary>Objetivo → capacidade → missão. Etapa {draft.step + 1} de 3. Salve a seção antes de sair para retomá-la.</NexusText>
      {draft.step === 0 && <Card style={{ gap: 12 }}>
        {field("name", "Como você se chama?", 80)}
        {data.onboardingCompleted && <><NexusText variant="caption">Destino da meta</NexusText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["primary", "maintenance", "backlog"] as const).map((v) => <ChoiceChip key={v} label={{ primary: "Principal", maintenance: "Manutenção", backlog: "Backlog" }[v]} selected={draft.goalKind === v} onPress={() => patch("goalKind", v)} />)}</View></>}
        {draft.goalKind === "maintenance" && field("maintenanceBudget", "Orçamento diário de manutenção em minutos", 4)}
        {field("result", "Qual resultado você quer alcançar?", 600)}
        {field("why", "Por que isso importa?", 600)}
        {field("doneWhen", "Como comprovar que a meta foi alcançada?", 600)}
        {field("deadline", "Prazo opcional (AAAA-MM-DD)", 10)}
        <NexusText variant="caption">Tipo do prazo</NexusText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["unknown", "target", "external"] as const).map((v) => <ChoiceChip key={v} label={{ unknown: "Ainda não sei", target: "Data desejada", external: "Compromisso externo" }[v]} selected={draft.deadlineType === v} onPress={() => patch("deadlineType", v)} />)}</View>
      </Card>}
      {draft.step === 1 && draft.goalKind === "primary" && <Card style={{ gap: 12 }}>
        {field("date", "Data de hoje (AAAA-MM-DD)", 10)}
        {field("timezone", "Seu fuso horário", 80, "Ex.: America/Sao_Paulo. Os horários abaixo usam este fuso.")}
        {field("windows", "Janelas autorizadas de hoje", 1200, "Uma por linha: 14:00-16:00. Sem janelas confirmadas, não inventamos capacidade.")}
        {field("reservations", "Compromissos, necessidades e transições", 1600, "Intervalos protegidos, uma linha HH:MM-HH:MM por reserva. Sobreposições contam uma vez.")}
        {field("buffer", "Reserva de buffer em minutos", 4)}
        <NexusText secondary>Tempo anterior a agora é descontado. Intensidade não aumenta suas horas. Não há horário limite universal.</NexusText>
      </Card>}
      {draft.step === 2 && <>
        {draft.goalKind === "primary" && <Card style={{ gap: 12 }}>
          {field("mission", "Resultado da missão de hoje", 120)}
          {field("firstAction", "Primeira ação concreta", 240)}
          {field("acceptance", "Concluído quando…", 300)}
          {field("estimate", "Estimativa em minutos (5–240)", 4)}
        </Card>}
        <Card style={{ gap: 10 }}>
          <NexusText variant="subtitle">Revise antes de confirmar</NexusText>
          <NexusText>{draft.result}</NexusText>
          <NexusText secondary>{draft.goalKind === "primary" ? "Uma meta principal" : draft.goalKind === "maintenance" ? `Manutenção: reserva de ${draft.maintenanceBudget} min por dia` : "Backlog: sem alocação de tempo"}. Aceite: {draft.doneWhen || "a definir"}.</NexusText>
          {preview && draft.goalKind === "primary" ? <>
            <NexusText>Capacidade: {preview.activePlan?.execution?.capacityMinutes} min · buffer: {preview.activePlan?.execution?.bufferMinutes} min.</NexusText>
            <NexusText>Missão: {draft.mission} · {draft.estimate} min, contados uma vez.</NexusText>
            {preview.activePlan?.execution?.blocks.map((b) => <NexusText key={b.taskId} secondary>Bloco: {new Date(b.start).toLocaleTimeString("pt-BR", { timeZone: draft.timezone, hour: "2-digit", minute: "2-digit" })}–{new Date(b.end).toLocaleTimeString("pt-BR", { timeZone: draft.timezone, hour: "2-digit", minute: "2-digit" })}</NexusText>)}
          </> : preview ? <NexusText secondary>{draft.goalKind === "backlog" ? "Esta meta ficará guardada, sem consumir capacidade." : "A reserva reduz a capacidade da missão. Confirmar exige que o plano continue viável."}</NexusText> : <NexusText color={colors.warning}>{previewError}</NexusText>}
          {draft.goalKind === "primary" && pending.length > 0 && <NexusText color={colors.warning}>Esta confirmação substitui o plano atual. Pendências guardadas no backlog: {pending.map((t) => t.title).join("; ")}. Entregas concluídas e versão anterior são preservados.</NexusText>}
          <NexusText secondary>Plano local determinístico. Nenhum dado precisa ser enviado à IA para confirmar.</NexusText>
          <NexusButton label={reviewRevision === data.lockIn.revision ? "Resumo revisado" : "Revisei o impacto"} variant="secondary" disabled={!preview || busy} onPress={() => setReviewRevision(data.lockIn.revision)} />
          <NexusButton label={draft.goalKind === "primary" ? "Confirmar meta, janelas e missão" : "Confirmar meta e impacto"} loading={busy} disabled={!preview || reviewRevision !== data.lockIn.revision} onPress={() => { void confirm(); }} />
        </Card>
      </>}
      {error && <NexusText color={colors.danger}>{error}</NexusText>}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {draft.step > 0 && <NexusButton label="Voltar" variant="secondary" disabled={busy} onPress={() => { setReviewRevision(null); void save(draft.goalKind !== "primary" ? 0 : draft.step - 1); }} />}
        <NexusButton label="Salvar seção" variant="secondary" loading={busy} onPress={() => { void save(); }} />
        {draft.step < 2 && <NexusButton label="Salvar e avançar" disabled={busy} onPress={() => { void save(draft.step === 0 && draft.goalKind !== "primary" ? 2 : draft.step + 1); }} />}
      </View>
      {data.lockIn.goals.length > 0 && <Card style={{ gap: 8 }}><NexusText variant="subtitle">Metas preservadas</NexusText>{data.lockIn.goals.map((g) => <NexusText key={g.id} secondary>{g.state === "primary" ? "Principal" : g.state === "candidate" ? "A confirmar" : g.state === "archived" ? "Arquivada" : g.state === "maintenance" ? "Manutenção" : "Backlog"}: {g.result}</NexusText>)}</Card>}
      {data.recurringTasks.length > 0 && <Card style={{ gap: 8 }}><NexusText variant="subtitle">Pendências guardadas</NexusText>{data.recurringTasks.map((t) => <NexusText key={t.id} secondary>{t.title} · {t.estimatedMinutes} min</NexusText>)}<NexusText secondary>Estas pendências não consomem capacidade até serem incluídas conscientemente.</NexusText></Card>}
    </View>
  </Screen>;
}
