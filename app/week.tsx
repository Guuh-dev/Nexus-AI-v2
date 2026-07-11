import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import type { Category, Priority } from "@/types";
import { addDays, formatShortDate, localDateKey } from "@/utils/dates";

export { RouteErrorBoundary as ErrorBoundary };
const CATEGORIES: [Category,string][] = [["desenvolvimento","Dev"],["estudos","Estudos"],["dinheiro","Dinheiro"],["saude","Saúde"],["organizacao","Organização"],["pessoal","Pessoal"]];
export default function WeekScreen() {
  const { data, colors, addWeeklyPlanItem, moveWeeklyPlanItem } = useNexus();
  const start = localDateKey(new Date(), data.profile?.timezone); const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const [selectedDate, setSelectedDate] = useState(start); const [creating, setCreating] = useState(false); const [title, setTitle] = useState(""); const [minutes, setMinutes] = useState("30"); const [category, setCategory] = useState<Category>("estudos"); const [priority, setPriority] = useState<Priority>("media");
  const capacity = data.profile?.availableMinutes ?? 120;
  const save = () => { addWeeklyPlanItem({ date: selectedDate, title, category, estimatedMinutes: Number(minutes) || 30, priority }); setTitle(""); setCreating(false); };
  return <Screen><View style={styles.header}><NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PLANEJAMENTO SEMANAL</NexusText><NexusText variant="display">Sete dias visíveis.</NexusText></View><CompanionMascot mascot="byte" size={58} /></View><NexusText secondary>Distribua tarefas pela capacidade real. Toque nas setas para mover sem perder o item.</NexusText>
    <View style={styles.dayTabs}>{days.map((date, index) => <ChoiceChip key={date} label={`${["Hoje","Amanhã"][index] ?? formatShortDate(date)}\n${formatShortDate(date)}`} selected={selectedDate === date} onPress={() => setSelectedDate(date)} />)}</View>
    <NexusButton label={creating ? "Fechar" : "Adicionar à semana"} icon="＋" onPress={() => setCreating((value) => !value)} fullWidth />
    {creating ? <Card style={styles.creator}><Field label="Tarefa" value={title} onChangeText={setTitle} maxLength={160} /><Field label="Minutos" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} /><View style={styles.chips}>{CATEGORIES.map(([value,label]) => <ChoiceChip key={value} label={label} selected={category === value} onPress={() => setCategory(value)} />)}</View><View style={styles.chips}>{(["baixa","media","alta"] as Priority[]).map((value) => <ChoiceChip key={value} label={value} selected={priority === value} onPress={() => setPriority(value)} />)}</View><NexusButton label="Salvar na semana" onPress={save} disabled={title.trim().length < 2} fullWidth /></Card> : null}
    <View style={styles.columns}>{days.map((date, dayIndex) => { const items = data.weeklyPlan.filter((item) => item.date === date); const used = items.reduce((sum, item) => sum + item.estimatedMinutes, 0); return <Card key={date} style={[styles.day, { borderColor: used > capacity ? `${colors.danger}66` : selectedDate === date ? colors.primary : colors.border }]}><Pressable onPress={() => setSelectedDate(date)}><View style={styles.row}><View><NexusText variant="mono" color={selectedDate === date ? colors.primarySoft : colors.textSecondary}>DIA {dayIndex + 1}</NexusText><NexusText variant="title">{dayIndex === 0 ? "Hoje" : formatShortDate(date)}</NexusText></View><NexusText color={used > capacity ? colors.danger : colors.textSecondary}>{used}/{capacity}m</NexusText></View><ProgressBar progress={Math.min(1, used / capacity)} color={used > capacity ? colors.danger : colors.primary} /></Pressable>{items.length ? items.map((item) => <View key={item.id} style={[styles.item, { borderColor: colors.border }]}><View style={styles.flex}><NexusText variant="subtitle">{item.title}</NexusText><NexusText variant="caption" secondary>{item.estimatedMinutes} min • {item.category} • {item.priority}</NexusText></View><View style={styles.move}><NexusButton label="‹" variant="ghost" disabled={dayIndex === 0} onPress={() => moveWeeklyPlanItem(item.id, days[dayIndex - 1] ?? date)} /><NexusButton label="›" variant="ghost" disabled={dayIndex === 6} onPress={() => moveWeeklyPlanItem(item.id, days[dayIndex + 1] ?? date)} /></View></View>) : <NexusText variant="caption" secondary>Nenhum item planejado.</NexusText>}{used > capacity ? <NexusText variant="caption" color={colors.danger}>Sobrecarga detectada: mova ou reduza tarefas.</NexusText> : null}</Card>; })}</View>
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", gap: 12 }, flex: { flex: 1 }, dayTabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginVertical: 22 }, creator: { marginTop: 12, gap: 12 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, columns: { marginTop: 22, gap: 11 }, day: { gap: 12 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 }, item: { minHeight: 68, padding: 10, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 }, move: { flexDirection: "row" } });
