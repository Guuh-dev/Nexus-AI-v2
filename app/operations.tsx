import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import { localDateKey } from "@/utils/dates";

export { RouteErrorBoundary as ErrorBoundary };
export default function OperationsScreen() {
  const { data, colors, createOperation, toggleOperationPhase } = useNexus();
  const [creating, setCreating] = useState(false); const [title, setTitle] = useState(""); const [objective, setObjective] = useState(""); const [deadline, setDeadline] = useState(""); const [phases, setPhases] = useState("Fundação, Execução, Entrega final");
  const save = () => { const safeDeadline = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : localDateKey(new Date(Date.now() + 14 * 86_400_000), data.profile?.timezone); createOperation({ title, objective, deadline: safeDeadline, phaseTitles: phases.split(",").map((item) => item.trim()).filter(Boolean) }); setCreating(false); setTitle(""); setObjective(""); };
  return <Screen><View style={styles.header}><NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} /><View style={styles.flex}><NexusText variant="mono" color={colors.warning}>MODO OPERAÇÃO</NexusText><NexusText variant="display">Objetivos com prazo.</NexusText></View><CompanionMascot mascot="nova" state="idle" size={60} /></View><NexusText secondary>Transforme projetos, estudos, dinheiro ou desafios pessoais em fases mensuráveis.</NexusText>
    <NexusButton label={creating ? "Fechar criação" : "Nova operação"} icon="＋" onPress={() => setCreating((value) => !value)} fullWidth style={styles.topButton} />
    {creating ? <Card style={styles.creator}><Field label="Nome da operação" value={title} onChangeText={setTitle} maxLength={160} placeholder="Primeiro freelance" /><Field label="Objetivo verificável" value={objective} onChangeText={setObjective} multiline maxLength={800} /><Field label="Prazo" value={deadline} onChangeText={setDeadline} maxLength={10} placeholder="AAAA-MM-DD" /><Field label="Fases separadas por vírgula" value={phases} onChangeText={setPhases} multiline maxLength={500} /><NexusButton label="Iniciar operação" onPress={save} disabled={title.trim().length < 2 || objective.trim().length < 2} fullWidth /></Card> : null}
    <View style={styles.list}>{data.operations.length ? data.operations.slice().reverse().map((operation) => { const completed = operation.phases.filter((phase) => phase.completed).length; return <Card key={operation.id} style={[styles.operation, { borderColor: operation.status === "completed" ? `${colors.success}55` : `${colors.warning}44` }]}><View style={styles.row}><View style={styles.flex}><NexusText variant="mono" color={operation.status === "completed" ? colors.success : colors.warning}>{operation.status === "completed" ? "OPERAÇÃO CONCLUÍDA" : `PRAZO ${operation.deadline}`}</NexusText><NexusText variant="title">{operation.title}</NexusText></View><NexusText variant="title">{Math.round((completed / operation.phases.length) * 100)}%</NexusText></View><NexusText variant="caption" secondary>{operation.objective}</NexusText><ProgressBar progress={completed / operation.phases.length} color={colors.warning} />{operation.phases.map((phase) => <Pressable key={phase.id} onPress={() => toggleOperationPhase(operation.id, phase.id)} style={[styles.phase, { borderColor: colors.border }]}><NexusText color={phase.completed ? colors.success : colors.warning}>{phase.completed ? "✓" : "○"}</NexusText><View style={styles.flex}><NexusText variant="subtitle">{phase.title}</NexusText><NexusText variant="caption" secondary>{phase.milestone}</NexusText></View></Pressable>)}<NexusText variant="caption" color={colors.primarySoft}>Recompensa final: +{operation.specialXp} XP</NexusText></Card>; }) : <Card style={styles.empty}><CompanionMascot mascot="nova" state="sleeping" size={70} /><NexusText variant="title">Nenhuma operação ativa</NexusText><NexusText variant="caption" secondary>Crie uma campanha para algo que merece começo, meio e fim.</NexusText></Card>}</View>
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", gap: 12 }, flex: { flex: 1 }, topButton: { marginTop: 22 }, creator: { marginTop: 12, gap: 13 }, list: { marginTop: 24, gap: 13 }, operation: { gap: 12 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, phase: { minHeight: 64, padding: 11, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 10 }, empty: { alignItems: "center", gap: 8 } });
