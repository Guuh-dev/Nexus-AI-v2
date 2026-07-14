import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { CATEGORIES, type Category, type Priority, type Task } from "@/types";
import { useNexus } from "@/providers/NexusProvider";

const categoryLabels: Record<Category, string> = {
  desenvolvimento: "Desenvolvimento",
  estudos: "Estudos",
  dinheiro: "Dinheiro",
  saude: "Saúde",
  organizacao: "Organização",
  pessoal: "Pessoal",
};

export type TaskEditorValue = {
  title: string;
  description?: string;
  context?: string;
  firstStep?: string;
  expectedResult?: string;
  doneWhen?: string;
  category: Category;
  priority: Priority;
  estimatedMinutes: number;
  recurring: boolean;
};

export function TaskEditor({
  visible,
  task,
  onSave,
  onClose,
}: {
  visible: boolean;
  task?: Task;
  onSave: (value: TaskEditorValue) => Promise<boolean>;
  onClose: () => void;
}) {
  const { colors } = useNexus();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [doneWhen, setDoneWhen] = useState("");
  const [category, setCategory] = useState<Category>("desenvolvimento");
  const [priority, setPriority] = useState<Priority>("media");
  const [minutes, setMinutes] = useState("25");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setContext(task?.context ?? "");
    setFirstStep(task?.firstStep ?? "");
    setExpectedResult(task?.expectedResult ?? "");
    setDoneWhen(task?.doneWhen ?? "");
    setCategory(task?.category ?? "desenvolvimento");
    setPriority(task?.priority ?? "media");
    setMinutes(String(task?.estimatedMinutes ?? 25));
    setRecurring(task?.recurring ?? false);
    setError("");
    setSaving(false);
  }, [task, visible]);

  const close = () => {
    if (!saving) onClose();
  };

  const save = async () => {
    const parsedMinutes = Number(minutes);
    if (title.trim().length < 2) return setError("Escreva um título com pelo menos 2 caracteres.");
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 5 || parsedMinutes > 240) {
      return setError("Escolha entre 5 e 240 minutos.");
    }
    setSaving(true);
    setError("");
    try {
      const saved = await onSave({
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(context.trim() ? { context: context.trim() } : {}),
        ...(firstStep.trim() ? { firstStep: firstStep.trim() } : {}),
        ...(expectedResult.trim() ? { expectedResult: expectedResult.trim() } : {}),
        ...(doneWhen.trim() ? { doneWhen: doneWhen.trim() } : {}),
        category,
        priority,
        estimatedMinutes: Math.round(parsedMinutes),
        recurring,
      });
      if (saved) onClose();
      else setError("Não foi possível confirmar a gravação. Revise os dados e tente novamente.");
    } catch {
      setError("Não foi possível confirmar a gravação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.keyboardRoot}
      >
        <Pressable onPress={close} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.shell}>
            <Card elevated style={styles.card}>
              <ScrollView
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
              >
                <View style={styles.header}>
                  <View>
                    <NexusText variant="mono" color={colors.primarySoft}>MISSÃO MANUAL</NexusText>
                    <NexusText variant="title">{task ? "Editar tarefa" : "Adicionar tarefa"}</NexusText>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Fechar" disabled={saving} onPress={close} style={styles.close}>
                    <NexusText variant="title">×</NexusText>
                  </Pressable>
                </View>
                <Field label="Título" value={title} onChangeText={setTitle} maxLength={120} placeholder="O que precisa ser executado?" />
                <Field
                  label="Descrição"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={300}
                  multiline
                  placeholder="O que precisa ser feito?"
                />
                <Field
                  label="Contexto curto"
                  value={context}
                  onChangeText={setContext}
                  maxLength={300}
                  multiline
                  placeholder="Por que esta tarefa existe?"
                />
                <Field label="Primeiro passo" value={firstStep} onChangeText={setFirstStep} maxLength={240} placeholder="A menor ação para começar" />
                <Field label="Resultado esperado" value={expectedResult} onChangeText={setExpectedResult} maxLength={300} placeholder="Qual entrega deve existir?" />
                <Field label="Concluído quando" value={doneWhen} onChangeText={setDoneWhen} maxLength={300} placeholder="Critério verificável de conclusão" />
                <View style={styles.section}>
                  <NexusText variant="caption" secondary>Categoria</NexusText>
                  <View style={styles.chips}>
                    {CATEGORIES.map((item) => (
                      <ChoiceChip
                        key={item}
                        label={categoryLabels[item]}
                        selected={category === item}
                        onPress={() => setCategory(item)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.section}>
                  <NexusText variant="caption" secondary>Prioridade</NexusText>
                  <View style={styles.chips}>
                    {(["baixa", "media", "alta"] as const).map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item.charAt(0).toUpperCase() + item.slice(1)}
                        selected={priority === item}
                        onPress={() => setPriority(item)}
                      />
                    ))}
                  </View>
                </View>
                <Field label="Duração em minutos" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} />
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <NexusText variant="subtitle">Repetir nos próximos dias</NexusText>
                    <NexusText variant="caption" secondary>O hábito será preservado no planejamento diário.</NexusText>
                  </View>
                  <Switch
                    value={recurring}
                    onValueChange={setRecurring}
                    trackColor={{ false: colors.borderStrong, true: colors.primary }}
                    thumbColor={colors.onPrimary}
                  />
                </View>
                {error ? <NexusText variant="caption" color={colors.danger}>{error}</NexusText> : null}
                <NexusButton label={task ? "Salvar alterações" : "Adicionar ao plano"} loading={saving} onPress={() => { void save(); }} fullWidth />
              </ScrollView>
            </Card>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  shell: { width: "100%", maxWidth: 720, maxHeight: "94%" },
  card: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 0, overflow: "hidden" },
  content: { padding: 20, paddingBottom: 30, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  section: { gap: 9 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
});
