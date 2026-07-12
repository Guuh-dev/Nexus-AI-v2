import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { AssistantMessage } from "@/components/AssistantMessage";
import { CompanionMascot } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { Card } from "@/components/ui/Card";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import {
  isChatAtEnd,
  shouldShowChatJump,
  type ChatScrollPosition,
} from "@/components/brain/chat-scroll";
import { useNexus } from "@/providers/NexusProvider";
import type {
  AssistantMeta,
  ChatKind,
  ChatMessage,
  ChatThread,
} from "@/types";

export type BrainChatListHandle = {
  scrollToEnd: (animated?: boolean) => void;
};

type Props = {
  thread: ChatThread;
  kind: ChatKind;
  assistantBusy: boolean;
  assistantStageLabel: string;
  lastAssistantMeta: AssistantMeta | null;
  reducedMotion: boolean;
  positions: Map<string, ChatScrollPosition>;
  onQuickPrompt: (prompt: string) => void;
  onApplyAction: (
    threadId: string,
    actionId: string,
    accept: boolean,
  ) => void;
  onCancel: () => void;
};

export const BrainChatList = forwardRef<BrainChatListHandle, Props>(
  function BrainChatList(
    {
      thread,
      kind,
      assistantBusy,
      assistantStageLabel,
      lastAssistantMeta,
      reducedMotion,
      positions,
      onQuickPrompt,
      onApplyAction,
      onCancel,
    },
    forwardedRef,
  ) {
    const { colors } = useNexus();
    const listRef = useRef<FlatList<ChatMessage>>(null);
    const stickToEnd = useRef(true);
    const pendingRestore = useRef(true);
    const [showJump, setShowJump] = useState(false);

    const scrollToEnd = useCallback(
      (animated = !reducedMotion) => {
        stickToEnd.current = true;
        setShowJump(false);
        positions.set(thread.id, {
          offset: Number.MAX_SAFE_INTEGER,
          atEnd: true,
        });
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated });
        });
      },
      [positions, reducedMotion, thread.id],
    );

    useImperativeHandle(
      forwardedRef,
      () => ({ scrollToEnd }),
      [scrollToEnd],
    );

    useLayoutEffect(() => {
      const saved = positions.get(thread.id);
      stickToEnd.current = saved?.atEnd ?? true;
      pendingRestore.current = true;
      setShowJump(saved ? !saved.atEnd : false);
    }, [positions, thread.id]);

    const restoreOrFollow = useCallback(() => {
      if (pendingRestore.current) {
        pendingRestore.current = false;
        const saved = positions.get(thread.id);
        requestAnimationFrame(() => {
          if (saved && !saved.atEnd) {
            listRef.current?.scrollToOffset({
              animated: false,
              offset: Math.max(0, saved.offset),
            });
          } else {
            listRef.current?.scrollToEnd({ animated: false });
          }
        });
        return;
      }
      if (stickToEnd.current) {
        // Streaming updates the last row frequently. Never animate each delta:
        // keeping the viewport anchored avoids the visible "rubber band" jump.
        listRef.current?.scrollToEnd({ animated: false });
      }
    }, [positions, thread.id]);

    const onScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const metrics = {
          offset: contentOffset.y,
          viewport: layoutMeasurement.height,
          content: contentSize.height,
        };
        const atEnd = isChatAtEnd(metrics);
        stickToEnd.current = atEnd;
        positions.set(thread.id, {
          offset: Math.max(0, contentOffset.y),
          atEnd,
        });
        setShowJump(shouldShowChatJump(metrics));
      },
      [positions, thread.id],
    );

    const renderMessage = useCallback(
      ({ item, index }: { item: ChatMessage; index: number }) => (
        <View
          style={[
            styles.message,
            item.role === "user" ? styles.userMessage : styles.assistantMessage,
            {
              backgroundColor:
                item.role === "user" ? `${colors.primary}22` : colors.surface,
              borderColor:
                item.role === "user" ? `${colors.primary}66` : colors.border,
            },
          ]}
        >
          <NexusText
            variant="mono"
            color={
              item.role === "user"
                ? colors.primarySoft
                : kind === "professor"
                  ? colors.warning
                  : colors.success
            }
          >
            {item.role === "user"
              ? "VOCÊ"
              : kind === "professor"
                ? "ATLAS"
                : "NEXUS"}
          </NexusText>
          {item.role === "assistant" ? (
            <AssistantMessage
              content={item.content}
              onPrompt={
                index === thread.messages.length - 1 && !assistantBusy
                  ? onQuickPrompt
                  : undefined
              }
            />
          ) : (
            <NexusText>{item.content}</NexusText>
          )}
          {item.actions?.map((action) => (
            <Card
              key={action.id}
              style={[
                styles.actionCard,
                { borderColor: `${colors.primary}55` },
              ]}
            >
              <NexusText variant="mono" color={colors.primarySoft}>
                AÇÃO PROPOSTA
              </NexusText>
              <NexusText variant="subtitle">{action.title}</NexusText>
              <NexusText variant="caption" secondary>
                {action.description}
              </NexusText>
              {action.status === "proposed" ? (
                <View style={styles.actionButtons}>
                  <NexusButton
                    label="Não aplicar"
                    variant="ghost"
                    onPress={() =>
                      onApplyAction(thread.id, action.id, false)
                    }
                    style={styles.flex}
                  />
                  <NexusButton
                    label="Confirmar"
                    onPress={() => onApplyAction(thread.id, action.id, true)}
                    style={styles.flex}
                  />
                </View>
              ) : (
                <NexusText
                  variant="caption"
                  color={
                    action.status === "accepted"
                      ? colors.success
                      : colors.textSecondary
                  }
                >
                  {action.status === "accepted"
                    ? "✓ Ação confirmada"
                    : "Ação recusada"}
                </NexusText>
              )}
            </Card>
          ))}
        </View>
      ),
      [
        assistantBusy,
        colors,
        kind,
        onApplyAction,
        onQuickPrompt,
        thread.id,
        thread.messages.length,
      ],
    );

    const footer = (
      <View style={styles.footerStack}>
        {assistantBusy ? (
          <Card style={styles.thinking}>
            <View style={styles.thinkingRow}>
              {kind === "professor" ? (
                <CompanionMascot mascot="atlas" state="thinking" size={34} />
              ) : (
                <PixelMascot state="thinking" size={34} />
              )}
              <View style={styles.flex}>
                <NexusText variant="subtitle">
                  {assistantStageLabel === "CONECTANDO"
                    ? "Acordando o backend..."
                    : assistantStageLabel === "FINALIZANDO"
                      ? "Organizando a resposta..."
                      : assistantStageLabel === "MODO LOCAL"
                        ? "Preparando uma resposta offline..."
                        : "Analisando seu contexto..."}
                </NexusText>
                <NexusText variant="caption" secondary>
                  {assistantStageLabel === "CONECTANDO"
                    ? "Testando o servidor principal e a rota de recuperação."
                    : "Histórico compacto, padrões e tempo disponível."}
                </NexusText>
              </View>
            </View>
            <NexusButton label="Cancelar" variant="ghost" onPress={onCancel} />
          </Card>
        ) : null}
        {!assistantBusy && lastAssistantMeta ? (
          <View
            style={[
              styles.signal,
              {
                borderColor:
                  lastAssistantMeta.source === "remote"
                    ? `${colors.success}55`
                    : `${colors.warning}55`,
              },
            ]}
          >
            <NexusText
              variant="caption"
              color={
                lastAssistantMeta.source === "remote"
                  ? colors.success
                  : colors.warning
              }
            >
              {lastAssistantMeta.source === "remote"
                ? "● IA REMOTA"
                : "● MODO LOCAL"}
            </NexusText>
            <NexusText variant="caption" secondary>
              {lastAssistantMeta.model ? `${lastAssistantMeta.model} • ` : ""}
              {Math.max(1, Math.round(lastAssistantMeta.latencyMs / 1000))}s
              {lastAssistantMeta.attempts > 1
                ? ` • ${lastAssistantMeta.attempts} tentativas`
                : ""}
            </NexusText>
          </View>
        ) : null}
      </View>
    );

    return (
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={thread.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ItemSeparatorComponent={MessageSeparator}
          ListFooterComponent={footer}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={40}
          windowSize={9}
          onScroll={onScroll}
          onLayout={restoreOrFollow}
          onContentSizeChange={restoreOrFollow}
          scrollEventThrottle={32}
          accessibilityLabel={`Conversa com ${kind === "professor" ? "Professor Atlas" : "Nexus Brain"}`}
        />
        {showJump ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir para a mensagem mais recente"
            onPress={() => scrollToEnd()}
            style={[
              styles.jump,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.primary,
              },
            ]}
          >
            <NexusText variant="caption" color={colors.primarySoft}>
              ↓ Ir ao final
            </NexusText>
          </Pressable>
        ) : null}
      </View>
    );
  },
);

function MessageSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  separator: { height: 11 },
  flex: { flex: 1 },
  message: {
    maxWidth: "92%",
    padding: 14,
    borderRadius: 19,
    borderWidth: 1,
    gap: 8,
  },
  userMessage: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  assistantMessage: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  actionCard: { marginTop: 4, gap: 8 },
  actionButtons: { flexDirection: "row", gap: 8, marginTop: 5 },
  footerStack: { gap: 11, paddingTop: 11 },
  thinking: { gap: 12 },
  thinkingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  signal: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  jump: {
    position: "absolute",
    right: 18,
    bottom: 10,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
