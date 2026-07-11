import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import type { Category, Weekday } from "@/types";
import { localDateKey } from "@/utils/dates";

export { RouteErrorBoundary as ErrorBoundary };
const DAYS: [Weekday,string][] = [[0,"D"],[1,"S"],[2,"T"],[3,"Q"],[4,"Q"],[5,"S"],[6,"S"]];
const CATEGORIES: [Category,string][] = [["desenvolvimento","Dev"],["estudos","Estudos"],["dinheiro","Dinheiro"],["saude","Saúde"],["organizacao","Organização"],["pessoal","Pessoal"]];
export default function HabitsScreen() {
  const { data, colors, createHabit, toggleHabitToday } = useNexus();
  const [creating, setCreating] = useState(false); const [title, setTitle] = useState(""); const [category, setCategory] = useState<Category>("saude"); const [days, setDays] = useState<Weekday[]>([1,2,3,4,5]); const [target, setTarget] = useState(5); const [time, setTime] = useState("");
  const today = localDateKey(new Date(), data.profile?.timezone);
  const save = () => { createHabit({ title, category, activeDays: days, targetPerWeek: target, ...(/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? { reminderTime: time } : {}) }); setTitle(""); setCreating(false); };
  return <Screen><View style={styles.header}><NexusButton label="Voltar" variant="ghost" onPress={() => router.back()} /><View style={styles.flex}><NexusText variant="mono" color={colors.success}>HÁBITOS INTELIGENTES</NexusText><NexusText variant="display">Consistência sem culpa.</NexusText></View><CompanionMascot mascot="pulse" size={60} /></View><NexusText secondary>Rotinas têm frequência, pausa planejada e streak próprio. Um dia ruim não apaga toda a história.</NexusText><NexusButton label={creating ? "Fechar" : "Novo hábito"} icon="＋" onPress={() => setCreating((value) => !value)} fullWidth style={styles.topButton} />
    {creating ? <Card style={styles.creator}><Field label="Hábito" value={title} onChangeText={setTitle} maxLength={160} placeholder="Revisar inglês por 25 minutos" /><Group title="Categoria"><View style={styles.chips}>{CATEGORIES.map(([value,label]) => <ChoiceChip key={value} label={label} selected={category === value} onPress={() => setCategory(value)} />)}</View></Group><Group title="Dias"><View style={styles.chips}>{DAYS.map(([value,label]) => <ChoiceChip key={value} label={label} selected={days.includes(value)} onPress={() => setDays(days.includes(value) ? days.filter((item) => item !== value) : [...days,value].sort() as Weekday[])} />)}</View></Group><Group title="Meta semanal"><View style={styles.chips}>{[1,2,3,4,5,6,7].map((value) => <ChoiceChip key={value} label={`${value}x`} selected={target === value} onPress={() => setTarget(value)} />)}</View></Group><Field label="Horário opcional" value={time} onChangeText={setTime} maxLength={5} placeholder="18:00" /><NexusButton label="Criar hábito" onPress={save} disabled={title.trim().length < 2 || !days.length} fullWidth /></Card> : null}
    <View style={styles.list}>{data.habits.length ? data.habits.map((habit) => { const done = habit.completedDates.includes(today); const recent = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); const key = localDateKey(date, data.profile?.timezone); return { key, done: habit.completedDates.includes(key) }; }); return <Card key={habit.id} style={[styles.habit, { borderColor: done ? `${colors.success}55` : colors.border }]}><View style={styles.row}><Pressable onPress={() => toggleHabitToday(habit.id)} style={[styles.check, { borderColor: done ? colors.success : colors.borderStrong, backgroundColor: done ? `${colors.success}18` : "transparent" }]}><NexusText color={done ? colors.success : colors.textSecondary}>{done ? "✓" : "○"}</NexusText></Pressable><View style={styles.flex}><NexusText variant="title">{habit.title}</NexusText><NexusText variant="caption" secondary>{habit.targetPerWeek}x/semana • ♨ {habit.currentStreak} • recorde {habit.bestStreak}</NexusText></View></View><View style={styles.weekDots}>{recent.map((day) => <View key={day.key} style={[styles.dayDot, { backgroundColor: day.done ? colors.success : colors.surfaceAlt }]} />)}</View><NexusButton label={done ? "Desmarcar hoje" : "Concluir hoje"} variant={done ? "ghost" : "secondary"} onPress={() => toggleHabitToday(habit.id)} fullWidth /></Card>; }) : <Card style={styles.empty}><CompanionMascot mascot="pulse" state="sleeping" size={70} /><NexusText variant="title">Nenhum hábito ainda</NexusText><NexusText variant="caption" secondary>Comece com algo pequeno o bastante para sobreviver aos dias difíceis.</NexusText></Card>}</View>
  </Screen>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.group}><NexusText variant="caption" secondary>{title}</NexusText>{children}</View>; }
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", gap: 12 }, flex: { flex: 1 }, topButton: { marginTop: 22 }, creator: { marginTop: 12, gap: 13 }, group: { gap: 8 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, list: { marginTop: 24, gap: 12 }, habit: { gap: 13 }, row: { flexDirection: "row", alignItems: "center", gap: 11 }, check: { width: 46, height: 46, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" }, weekDots: { flexDirection: "row", gap: 7 }, dayDot: { flex: 1, height: 7, borderRadius: 4 }, empty: { alignItems: "center", gap: 8 } });
