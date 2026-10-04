import { PrivateJournal } from "@/components/PrivateJournal";
import { StyleSheet, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { Divider, ScreenHeader, SectionHeader, Stat } from "@/components/ui/Layout";
import { CompanionMascot } from "@/components/CompanionMascot";
import { ExecutionReview } from "@/components/ExecutionReview";
import { useNexus } from "@/providers/NexusProvider";
import { executionSummary } from "@/features/lock-in/review";
export function LockInProgress() {
  const { data, colors } = useNexus();
  const summary = executionSummary(data);
  const sessions = data.progress.focusSessions.slice(-8).reverse();
  return <Screen><View style={styles.page}>
    <ScreenHeader eyebrow="Progresso" title="O avanço que ficou." trailing={data.preferences.mascot.showCompanion ? <CompanionMascot mascot="nexus" state="idle" size={56} /> : undefined} />
    <Card style={styles.gap14}>
      <View style={styles.stats}>
        <Stat label="min de foco" value={String(summary.observedMinutes)} />
        <Stat label="evidências" value={String(summary.evidenceCount)} />
        <Stat label="sequência" value={`${data.progress.currentStreak}d`} />
        <Stat label="XP total" value={String(data.progress.totalXp)} />
      </View>
      <NexusText variant="caption" secondary>Foco registrado mede segmentos da sessão, com pausas excluídas. Não é medição de atenção.</NexusText>
      <Divider />
      <NexusText variant="eyebrow" secondary>Relatos dos dias revisados</NexusText>
      <View style={styles.counts}>
        <Count label="Concluídas" value={summary.counts.completed} color={colors.success} />
        <Count label="Parciais" value={summary.counts.partial} color={colors.warning} />
        <Count label="Não concluídas" value={summary.counts.not_completed} color={colors.danger} />
        <Count label="Desconhecidas" value={summary.counts.unknown} color={colors.textSecondary} />
      </View>
      <NexusText variant="caption" secondary>Contagem de relatos de dias revisados; dias sem revisão não entram como sucesso ou fracasso.</NexusText>
    </Card>
    <ExecutionReview />
    <PrivateJournal />
    <SectionHeader title="Histórico preservado" meta={`${data.history.length} dias arquivados · ${data.progress.focusSessions.length} sessões`} />
    <Card style={styles.list}>
      {sessions.length === 0 && <NexusText secondary style={styles.empty}>Suas sessões de foco aparecem aqui depois de salvas.</NexusText>}
      {sessions.map((s, index) => <View key={s.id}>
        {index > 0 && <Divider />}
        <View style={styles.session}>
          <View style={styles.sessionHead}><NexusText variant="subtitle" style={styles.flex}>{s.taskTitle}</NexusText><NexusText variant="caption" secondary>{Math.floor(s.elapsedSeconds / 60)} min</NexusText></View>
          <NexusText variant="caption" secondary>{s.nextAction ? `Retomar por: ${s.nextAction}` : s.reflection || "Sem relato da entrega"}</NexusText>
          {s.captures?.map((c) => <NexusText key={c.id} variant="caption" secondary>Ideia guardada: {c.text}</NexusText>)}
        </View>
      </View>)}
    </Card>
  </View></Screen>;
}

function Count({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.count}><View style={[styles.dot, { backgroundColor: color }]} /><NexusText variant="subtitle">{value}</NexusText><NexusText variant="caption" secondary>{label}</NexusText></View>;
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 24 },
  gap14: { gap: 14 },
  flex: { flex: 1 },
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  count: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: { paddingVertical: 4 },
  empty: { paddingVertical: 12 },
  session: { gap: 4, paddingVertical: 12 },
  sessionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
});
