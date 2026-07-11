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
  onSave: (value: TaskEditorValue) => void;
  onClose: () => void;
}) {
  const { colors } = useNexus();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("desenvolvimento");
  const [priority, setPriority] = useState<Priority>("media");
  const [minutes, setMinutes] = useState("25");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setCategory(task?.category ?? "desenvolvimento");
    setPriority(task?.priority ?? "media");
    setMinutes(String(task?.estimatedMinutes ?? 25));
    setRecurring(task?.recurring ?? false);
    setError("");
  }, [task, visible]);

  const save = () => {
    const parsedMinutes = Number(minutes);
    if (title.trim().length < 2) return setError("Escreva um título com pelo menos 2 caracteres.");
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 5 || parsedMinutes > 240) {
      return setError("Escolha entre 5 e 240 minutos.");
    }
    onSave({
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      category,
      priority,
      estimatedMinutes: Math.round(parsedMinutes),
      recurring,
    });
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.keyboardRoot}
      >
        <Pressable onPress={onClose} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
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
                  <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={styles.close}>
                    <NexusText variant="title">×</NexusText>
                  </Pressable>
                </View>
                <Field label="Título" value={title} onChangeText={setTitle} maxLength={120} placeholder="O que precisa ser executado?" />
                <Field
                  label="Descrição opcional"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={300}
                  multiline
                  placeholder="Defina o resultado esperado"
                />
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
                    thumbColor="#FFFFFF"
                  />
                </View>
                {error ? <NexusText variant="caption" color={colors.danger}>{error}</NexusText> : null}
                <NexusButton label={task ? "Salvar alterações" : "Adicionar ao plano"} onPress={save} fullWidth />
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
