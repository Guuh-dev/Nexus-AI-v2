import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { CompanionMascot } from "@/components/CompanionMascot";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";
import type { AssistantResponse, Category, Priority } from "@/types";

type Capture = NonNullable<AssistantResponse["capture"]>;

const CATEGORIES: [Category, string][] = [
  ["desenvolvimento", "Dev"],
  ["estudos", "Estudos"],
  ["dinheiro", "Dinheiro"],
  ["saude", "Saúde"],
  ["organizacao", "Organização"],
  ["pessoal", "Pessoal"],
];

export function QuickCapture({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, assistantBusy, lastAssistantMeta, quickCapture, saveCapture, cancelAssistant } = useNexus();
  const [text, setText] = useState("");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [minutes, setMinutes] = useState("25");
  const [saving, setSaving] = useState(false);
  const requestToken = useRef(0);

  useEffect(() => {
    if (!visible) {
      requestToken.current += 1;
      setText("");
      setCapture(null);
      setMinutes("25");
      setSaving(false);
    }
  }, [visible]);

  const interpret = async () => {
    const token = ++requestToken.current;
    const result = await quickCapture(text);
    if (result && requestToken.current === token) {
      setCapture(result);
      setMinutes(String(result.estimatedMinutes));
    }
  };

  const close = () => {
    requestToken.current += 1;
    cancelAssistant();
    onClose();
  };

  const patch = <K extends keyof Capture>(key: K, value: Capture[K]) =>
    setCapture((current) => (current ? { ...current, [key]: value } : current));

  const captureReady = Boolean(capture && [
    capture.title,
    capture.context,
    capture.firstStep,
    capture.expectedResult,
    capture.doneWhen,
  ].every((value) => typeof value === "string" && value.trim().length >= 2));

  const save = async () => {
    if (!capture) return;
    setSaving(true);
    try {
      const saved = await saveCapture({
        ...capture,
        estimatedMinutes: Math.max(5, Math.min(240, Number(minutes) || 25)),
      });
      if (saved) close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <CompanionMascot mascot="byte" state={assistantBusy ? "thinking" : "idle"} size={52} />
              <View style={styles.flex}>
                <NexusText variant="mono" color={colors.primarySoft}>CAPTURA RÁPIDA</NexusText>
                <NexusText variant="title">Jogue a ideia. O Nexus organiza.</NexusText>
              </View>
            </View>

            {!capture ? (
              <>
                <Field
                  label="O que precisa lembrar ou fazer?"
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={1000}
                  placeholder="Tenho que mandar proposta para três clientes amanhã..."
                />
                <Card style={[styles.hint, { backgroundColor: `${colors.primary}0D` }]}>
                  <NexusText variant="caption" secondary>
                    O Nexus propõe título, contexto, primeiro passo, resultado, critério, categoria, prioridade, duração e data. Você sempre revisa antes de salvar.
                  </NexusText>
                </Card>
                <View style={styles.actions}>
                  <NexusButton label="Cancelar" variant="ghost" onPress={close} style={styles.flex} />
                  {assistantBusy ? (
                    <NexusButton label="Parar" variant="secondary" onPress={cancelAssistant} style={styles.flex} />
                  ) : (
                    <NexusButton
                      label="Organizar"
                      onPress={() => void interpret()}
                      disabled={text.trim().length < 2}
                      style={styles.flex}
                    />
                  )}
                </View>
              </>
            ) : (
              <>
                {lastAssistantMeta?.source === "local" ? (
                  <Card style={[styles.sourceBanner, { borderColor: `${colors.warning}66`, backgroundColor: `${colors.warning}0D` }]}>
                    <NexusText variant="mono" color={colors.warning}>INTERPRETAÇÃO LOCAL/OFFLINE</NexusText>
                    <NexusText variant="caption" secondary>A inteligência remota não respondeu. O dispositivo organizou uma sugestão local; revise todos os campos antes de salvar.</NexusText>
                  </Card>
                ) : (
                  <NexusText variant="mono" color={colors.success}>INTERPRETAÇÃO REMOTA</NexusText>
                )}
                <Field label="Título" value={capture.title} onChangeText={(value) => patch("title", value)} maxLength={120} />
                <Field
                  label="Descrição"
                  value={capture.description ?? ""}
                  onChangeText={(value) => patch("description", value)}
                  multiline
                  maxLength={300}
                />
                <Field
                  label="Contexto"
                  value={capture.context ?? ""}
                  onChangeText={(value) => patch("context", value)}
                  multiline
                  maxLength={300}
                />
                <Field
                  label="Primeiro passo"
                  value={capture.firstStep ?? ""}
                  onChangeText={(value) => patch("firstStep", value)}
                  multiline
                  maxLength={240}
                />
                <Field
                  label="Resultado esperado"
                  value={capture.expectedResult ?? ""}
                  onChangeText={(value) => patch("expectedResult", value)}
                  multiline
                  maxLength={300}
                />
                <Field
                  label="Concluído quando"
                  value={capture.doneWhen ?? ""}
                  onChangeText={(value) => patch("doneWhen", value)}
                  multiline
                  maxLength={300}
                />
                <View style={styles.group}>
                  <NexusText variant="caption" secondary>Categoria</NexusText>
                  <View style={styles.chips}>
                    {CATEGORIES.map(([value, label]) => (
                      <ChoiceChip
                        key={value}
                        label={label}
                        selected={capture.category === value}
                        onPress={() => patch("category", value)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.group}>
                  <NexusText variant="caption" secondary>Prioridade</NexusText>
                  <View style={styles.chips}>
                    {(["baixa", "media", "alta"] as Priority[]).map((value) => (
                      <ChoiceChip
                        key={value}
                        label={{ baixa: "Baixa", media: "Média", alta: "Alta" }[value]}
                        selected={capture.priority === value}
                        onPress={() => patch("priority", value)}
                      />
                    ))}
                  </View>
                </View>
                <Field label="Minutos" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} />
                <Field
                  label="Data opcional"
                  value={capture.scheduledDate ?? ""}
                  onChangeText={(value) => patch("scheduledDate", value || undefined)}
                  maxLength={10}
                  placeholder="AAAA-MM-DD"
                />
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <NexusText variant="subtitle">Tarefa recorrente</NexusText>
                    <NexusText variant="caption" secondary>Volta nos próximos planejamentos.</NexusText>
                  </View>
                  <Switch
                    value={capture.recurring}
                    onValueChange={(value) => patch("recurring", value)}
                    trackColor={{ false: colors.borderStrong, true: colors.primary }}
                    thumbColor={colors.onPrimary}
                  />
                </View>
                <View style={styles.actions}>
                  <NexusButton label="Refazer" variant="ghost" disabled={saving} onPress={() => setCapture(null)} style={styles.flex} />
                  <NexusButton label="Salvar captura" loading={saving} disabled={!captureReady} onPress={() => void save()} style={styles.flex} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "94%",
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: { padding: 18, paddingBottom: 28, gap: 15 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  hint: { padding: 12 },
  sourceBanner: { padding: 12, gap: 5 },
  actions: { flexDirection: "row", gap: 9 },
  group: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  switchRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10 },
});
