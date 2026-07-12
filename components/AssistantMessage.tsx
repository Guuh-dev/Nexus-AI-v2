import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";
import { NexusText } from "@/components/ui/NexusText";

import { parseAssistantMessage } from "@/features/assistant/message-format";

export function AssistantMessage({ content, onPrompt }: { content: string; onPrompt?: (prompt: string) => void }) {
  const { colors } = useNexus();
  const blocks = useMemo(() => parseAssistantMessage(content), [content]);
  const [expanded, setExpanded] = useState(false);
  const isLong = blocks.length > 7 || content.length > 780;
  const visible = expanded || !isLong ? blocks : blocks.slice(0, 5);

  return (
    <View style={styles.stack}>
      {visible.map((block, index) => {
        if (block.type === "heading") {
          return (
            <NexusText key={`${block.type}-${index}`} variant="subtitle" color={colors.primarySoft}>
              {block.text}
            </NexusText>
          );
        }
        if (block.type === "bullet") {
          return (
            <View key={`${block.type}-${index}`} style={styles.row}>
              <View style={[styles.marker, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}>
                <NexusText variant="caption" color={colors.primarySoft}>
                  {block.index ?? "•"}
                </NexusText>
              </View>
              <NexusText style={styles.flex}>{block.text}</NexusText>
            </View>
          );
        }
        return <NexusText key={`${block.type}-${index}`}>{block.text}</NexusText>;
      })}
      {onPrompt ? (
        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" onPress={() => onPrompt("Simplifique sua última resposta em no máximo 3 passos curtos, sem repetir contexto.")} style={[styles.quick, { borderColor: `${colors.primary}35` }]}><NexusText variant="caption" color={colors.primarySoft}>Simplificar</NexusText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => onPrompt("Transforme sua última resposta em uma única tarefa objetiva, com entrega e critério de conclusão. Proponha a ação para eu confirmar.")} style={[styles.quick, { borderColor: `${colors.primary}35` }]}><NexusText variant="caption" color={colors.primarySoft}>Virar tarefa</NexusText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => onPrompt("Me guie somente no primeiro passo. Faça uma pergunta por vez e espere minha resposta.")} style={[styles.quick, { borderColor: `${colors.primary}35` }]}><NexusText variant="caption" color={colors.primarySoft}>Me guiar</NexusText></Pressable>
        </View>
      ) : null}
      {isLong ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
          style={[styles.details, { borderColor: `${colors.primary}44`, backgroundColor: `${colors.primary}0D` }]}
        >
          <NexusText variant="caption" color={colors.primarySoft}>
            {expanded ? "Mostrar menos" : `Ver detalhes (${blocks.length - visible.length} blocos)`}
          </NexusText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  marker: { width: 26, height: 26, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 1 },
  flex: { flex: 1 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 2 },
  quick: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  details: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 2 },
});
