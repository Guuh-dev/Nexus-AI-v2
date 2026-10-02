import { View } from "react-native";
import { Field } from "@/components/ui/Field";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { intervalRows, serializeIntervals, type DraftInterval } from "@/features/lock-in/planning";
import { useNexus } from "@/providers/NexusProvider";

export function TimeIntervalsField({ value, onChange, reservations = false, error }: {
  value: string; onChange: (value: string) => void; reservations?: boolean; error?: string;
}) {
  const { colors } = useNexus();
  const rows = intervalRows(value);
  const title = reservations ? "Horários ocupados (opcional)" : "Quando você pode trabalhar hoje?";
  const clockInput = (text: string) => { const digits = text.replace(/\D/g, "").slice(0, 4); return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits; };
  const update = (index: number, patch: Partial<DraftInterval>) => onChange(serializeIntervals(rows.map((row, i) => i === index ? { ...row, ...patch, ...(!reservations ? { label: "" } : {}) } : row)));
  return <View style={{ gap: 12 }}>
    <NexusText variant="subtitle">{title}</NexusText>
    <NexusText variant="caption" secondary>{reservations ? "Adicione escola, estudos, tarefas da casa ou outros compromissos com início e fim. Não inventamos seus horários." : "Adicione uma ou mais janelas livres. Exemplo: início 13:00, fim 22:00."}</NexusText>
    {rows.map((row, index) => <View key={index} style={{ gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14 }}>
      {reservations && <Field label={`Nome do compromisso ${index + 1} (opcional)`} value={row.label} maxLength={24} placeholder="Ex.: Escola" onChangeText={(label) => update(index, { label: label.replace(/[|,\n]/g, " ") })} />}
      {!reservations && row.label ? <NexusText color={colors.warning}>Revise este intervalo: {row.label}</NexusText> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label={`Início ${reservations ? "do compromisso" : "da janela"} ${index + 1}`} value={row.start} placeholder="13:00" maxLength={5} autoCapitalize="none" autoCorrect={false} inputMode="numeric" onChangeText={(start) => update(index, { start: clockInput(start) })} /></View>
        <View style={{ flex: 1 }}><Field label={`Fim ${reservations ? "do compromisso" : "da janela"} ${index + 1}`} value={row.end} placeholder="14:00" maxLength={5} autoCapitalize="none" autoCorrect={false} inputMode="numeric" onChangeText={(end) => update(index, { end: clockInput(end) })} /></View>
      </View>
      <NexusButton compact variant="ghost" label={`Remover ${reservations ? "compromisso" : "janela"} ${index + 1}`} onPress={() => onChange(serializeIntervals(rows.filter((_, i) => i !== index)))} />
    </View>)}
    {error && <NexusText accessibilityRole="alert" color={colors.danger}>{error}</NexusText>}
    <NexusButton variant="secondary" compact disabled={rows.length >= (reservations ? 40 : 20)} label={reservations ? "+ Adicionar compromisso" : "+ Adicionar janela livre"} onPress={() => onChange(serializeIntervals([...rows, { label: "", start: "", end: "" }]))} />
  </View>;
}
