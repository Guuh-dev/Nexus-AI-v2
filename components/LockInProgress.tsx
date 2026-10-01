import { PrivateJournal } from "@/components/PrivateJournal";
import { View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { CompanionMascot } from "@/components/CompanionMascot";
import { ExecutionReview } from "@/components/ExecutionReview";
import { useNexus } from "@/providers/NexusProvider";
import { executionSummary } from "@/features/lock-in/review";
export function LockInProgress() {
  const { data, colors } = useNexus();
  const summary = executionSummary(data);
  return <Screen><View style={{ gap: 18, paddingBottom: 24 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}><View style={{ flex: 1 }}><NexusText variant="mono" color={colors.primarySoft}>NEXUS / PROGRESSO</NexusText><NexusText variant="display">O avanço que ficou.</NexusText></View>{data.preferences.mascot.showCompanion && <CompanionMascot mascot="nexus" state="idle" size={68} />}</View>
    <Card style={{ gap: 10 }}><NexusText variant="subtitle">Registros, com suas fontes</NexusText><NexusText>{summary.observedMinutes} min de foco registrado · {summary.evidenceCount} evidências</NexusText><NexusText secondary>Foco registrado mede segmentos da sessão, com pausas excluídas. Não é medição de atenção.</NexusText><NexusText>Revisões: {summary.counts.completed} concluídas · {summary.counts.partial} parciais · {summary.counts.not_completed} não concluídas · {summary.counts.unknown} desconhecidas.</NexusText><NexusText secondary>Contagem de relatos de dias revisados; dias sem revisão não entram como sucesso ou fracasso.</NexusText></Card>
    <ExecutionReview />
    <PrivateJournal />
    <Card style={{ gap: 10 }}><NexusText variant="subtitle">Seu histórico foi preservado</NexusText><NexusText secondary>{data.history.length} dias arquivados · {data.progress.focusSessions.length} sessões · {data.progress.totalXp} XP históricos.</NexusText>{data.progress.focusSessions.slice(-8).reverse().map((s) => <View key={s.id} style={{ gap: 4 }}><NexusText>{s.taskTitle} · {Math.floor(s.elapsedSeconds / 60)} min</NexusText><NexusText secondary>{s.nextAction ? `Retomar por: ${s.nextAction}` : s.reflection || "Sem relato da entrega"}</NexusText>{s.captures?.map((c) => <NexusText key={c.id} variant="caption" secondary>Ideia guardada: {c.text}</NexusText>)}</View>)}</Card>
  </View></Screen>;
}
