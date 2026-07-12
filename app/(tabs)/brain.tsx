import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PixelMascot } from "@/components/PixelMascot";
import { RoadmapCard } from "@/components/RoadmapCard";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { useNexus } from "@/providers/NexusProvider";
import type { ChatKind, ChatThread } from "@/types";

export { RouteErrorBoundary as ErrorBoundary };

type ViewMode = "home" | "chat" | "memory" | "roadmaps";

export default function BrainScreen() {
  const {
    data,
    colors,
    assistantBusy,
    assistantStage,
    lastAssistantMeta,
    createThread,
    selectThread,
    renameThread,
    archiveThread,
    deleteThread,
    sendChatMessage,
    deleteMemory,
    toggleMemoryPinned,
    applyAssistantAction,
    toggleRoadmapLesson,
    setActiveRoadmap,
    cancelAssistant,
  } = useNexus();
  const [kind, setKind] = useState<ChatKind>("brain");
  const [mode, setMode] = useState<ViewMode>("home");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roadmapTopic, setRoadmapTopic] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChatThread | null>(null);
  const [renameTarget, setRenameTarget] = useState<ChatThread | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const activeId =
    kind === "brain"
      ? data.brain.activeBrainThreadId
      : data.brain.activeProfessorThreadId;
  const active = data.brain.threads.find(
    (thread) => thread.id === activeId && thread.kind === kind,
  );
  const threads = useMemo(
    () =>
      data.brain.threads
        .filter(
          (thread) =>
            thread.kind === kind &&
            thread.archived === showArchived &&
            (!search.trim() ||
              `${thread.title} ${thread.messages.map((item) => item.content).join(" ")}`
                .toLocaleLowerCase("pt-BR")
                .includes(search.toLocaleLowerCase("pt-BR"))),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.brain.threads, kind, search, showArchived],
  );

  const changeKind = (next: ChatKind) => {
    setKind(next);
    setMode("home");
    setMessage("");
  };
  const openThread = (thread: ChatThread) => {
    selectThread(thread.kind, thread.id);
    setMode("chat");
  };
  const newThread = () => {
    const id = createThread(kind);
    selectThread(kind, id);
    setMode("chat");
  };
  const send = () => {
    const clean = message.trim();
    if (!active || !clean || assistantBusy) return;
    setMessage("");
    void sendChatMessage(active.id, clean);
  };

  const assistantStageLabel = {
    idle: kind === "brain" ? "BRAIN ONLINE" : "PROFESSOR ONLINE",
    connecting: "CONECTANDO",
    generating: "GERANDO",
    finalizing: "FINALIZANDO",
    local: "MODO LOCAL",
  }[assistantStage];

  if (mode === "chat" && active) {
    return (
      <Screen>
        <View style={styles.chatHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode("home")}
            style={[styles.backButton, { borderColor: colors.border }]}
          >
            <NexusText>‹</NexusText>
          </Pressable>
          {kind === "brain" ? (
            <PixelMascot
              state={assistantBusy ? "thinking" : "idle"}
              size={44}
            />
          ) : (
            <CompanionMascot
              mascot="atlas"
              state={assistantBusy ? "thinking" : "idle"}
              size={44}
            />
          )}
          <View style={styles.flex}>
            <NexusText variant="title" numberOfLines={1}>
              {active.title}
            </NexusText>
            <NexusText
              variant="mono"
              color={
                assistantBusy
                  ? colors.warning
                  : lastAssistantMeta?.source === "local"
                    ? colors.warning
                    : colors.success
              }
            >
              {assistantBusy
                ? assistantStageLabel
                : lastAssistantMeta?.source === "local"
                  ? "LOCAL ATIVO"
                  : assistantStageLabel}
            </NexusText>
          </View>
        </View>
        <View style={styles.messages}>
          {active.messages.map((item) => (
            <View
              key={item.id}
              style={[
                styles.message,
                item.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage,
                {
                  backgroundColor:
                    item.role === "user"
                      ? `${colors.primary}22`
                      : colors.surface,
                  borderColor:
                    item.role === "user"
                      ? `${colors.primary}66`
                      : colors.border,
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
              <NexusText>{item.content}</NexusText>
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
                          void applyAssistantAction(active.id, action.id, false)
                        }
                        style={styles.flex}
                      />
                      <NexusButton
                        label="Confirmar"
                        onPress={() =>
                          void applyAssistantAction(active.id, action.id, true)
                        }
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
          ))}
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
              <NexusButton
                label="Cancelar"
                variant="ghost"
                onPress={cancelAssistant}
              />
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
        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <Field
            label={
              kind === "professor"
                ? "Pergunte ou conte como foi a prática"
                : "Converse com seu copiloto"
            }
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={4000}
            placeholder={
              kind === "professor"
                ? "Quero aprender React do zero e criar algo real..."
                : "Estou cansado hoje. Reorganiza sem abandonar a missão."
            }
          />
          <NexusButton
            label={assistantBusy ? "Aguarde" : "Enviar"}
            icon="↑"
            onPress={send}
            disabled={assistantBusy || !message.trim()}
            fullWidth
          />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen>
        <View style={styles.hero}>
          <View style={styles.flex}>
            <NexusText variant="mono" color={colors.primarySoft}>
              NEXUS INTELLIGENCE
            </NexusText>
            <NexusText variant="display">
              {mode === "memory"
                ? "Memória sob seu controle."
                : mode === "roadmaps"
                  ? "Trilhas de domínio."
                  : "Um cérebro para sua missão."}
            </NexusText>
          </View>
          {kind === "brain" ? (
            <PixelMascot state="idle" size={58} />
          ) : (
            <CompanionMascot mascot="atlas" state="idle" size={60} />
          )}
        </View>
        <View style={styles.tabs}>
          <ChoiceChip
            label="Copiloto"
            selected={kind === "brain"}
            onPress={() => changeKind("brain")}
          />
          <ChoiceChip
            label="Professor"
            selected={kind === "professor"}
            onPress={() => changeKind("professor")}
          />
          <ChoiceChip
            label={`Memórias ${data.brain.memories.length}`}
            selected={mode === "memory"}
            onPress={() => setMode(mode === "memory" ? "home" : "memory")}
          />
          <ChoiceChip
            label="Roadmaps"
            selected={mode === "roadmaps"}
            onPress={() => setMode(mode === "roadmaps" ? "home" : "roadmaps")}
          />
        </View>

        {mode === "memory" ? (
          <View style={styles.section}>
            <Card
              style={[
                styles.memoryIntro,
                { backgroundColor: `${colors.primary}0E` },
              ]}
            >
              <NexusText variant="subtitle">Você manda na memória.</NexusText>
              <NexusText variant="caption" secondary>
                Fixe o que nunca deve ser esquecido ou exclua qualquer item. As
                conversas continuam disponíveis separadamente.
              </NexusText>
            </Card>
            {data.brain.memories.length ? (
              data.brain.memories
                .slice()
                .sort(
                  (a, b) =>
                    Number(b.pinned) - Number(a.pinned) ||
                    b.updatedAt.localeCompare(a.updatedAt),
                )
                .map((memory) => (
                  <Card key={memory.id} style={styles.memoryCard}>
                    <View style={styles.row}>
                      <NexusText variant="mono" color={colors.primarySoft}>
                        {memory.kind.toUpperCase()}
                      </NexusText>
                      <NexusText
                        color={
                          memory.pinned ? colors.warning : colors.textSecondary
                        }
                      >
                        {memory.pinned ? "★" : "☆"}
                      </NexusText>
                    </View>
                    <NexusText>{memory.content}</NexusText>
                    <View style={styles.actionButtons}>
                      <NexusButton
                        label={memory.pinned ? "Desafixar" : "Fixar"}
                        variant="ghost"
                        onPress={() => toggleMemoryPinned(memory.id)}
                        style={styles.flex}
                      />
                      <NexusButton
                        label="Esquecer"
                        variant="ghost"
                        onPress={() => deleteMemory(memory.id)}
                        style={styles.flex}
                      />
                    </View>
                  </Card>
                ))
            ) : (
              <Empty
                title="Nenhuma memória extra ainda"
                text="As memórias úteis aparecerão conforme você conversa. Seu perfil e histórico já fazem parte do contexto."
                mascot="byte"
              />
            )}
          </View>
        ) : null}

        {mode === "roadmaps" ? (
          <View style={styles.section}>
            <Card style={styles.roadmapCreator}>
              <View style={styles.row}>
                <CompanionMascot mascot="atlas" state="thinking" size={52} />
                <View style={styles.flex}>
                  <NexusText variant="title">Novo domínio</NexusText>
                  <NexusText variant="caption" secondary>
                    Antes do roadmap, Atlas mede seu nível, objetivo, recursos e
                    limitações.
                  </NexusText>
                </View>
              </View>
              <Field
                label="O que quer aprender?"
                value={roadmapTopic}
                onChangeText={setRoadmapTopic}
                maxLength={160}
                placeholder="Escreva aqui ou veja sugestões na entrevista"
              />
              <NexusButton
                label={
                  roadmapTopic.trim()
                    ? "Começar entrevista"
                    : "Ver sugestões do Atlas"
                }
                onPress={() => {
                  const topic = roadmapTopic.trim();
                  setRoadmapTopic("");
                  router.push(
                    topic
                      ? { pathname: "/professor-intake", params: { topic } }
                      : "/professor-intake",
                  );
                }}
                fullWidth
              />
            </Card>
            {data.learning.pendingTopics.length ? (
              <Card style={styles.roadmapCreator}>
                <NexusText variant="mono" color={colors.primarySoft}>
                  DIAGNÓSTICOS PENDENTES
                </NexusText>
                <NexusText variant="caption" secondary>
                  Você escolheu várias áreas. Atlas entrevistará uma por vez
                  para não criar roadmaps genéricos.
                </NexusText>
                <View style={styles.tabs}>
                  {data.learning.pendingTopics.map((topic) => (
                    <ChoiceChip
                      key={topic}
                      label={topic}
                      selected={false}
                      onPress={() =>
                        router.push({
                          pathname: "/professor-intake",
                          params: { topic },
                        })
                      }
                    />
                  ))}
                </View>
              </Card>
            ) : null}
            {data.learning.roadmaps.map((roadmap) => (
              <RoadmapCard
                key={roadmap.id}
                roadmap={roadmap}
                active={data.learning.activeRoadmapId === roadmap.id}
                onSetActive={() => setActiveRoadmap(roadmap.id)}
                onToggleLesson={(lessonId) =>
                  toggleRoadmapLesson(roadmap.id, lessonId)
                }
              />
            ))}
          </View>
        ) : null}

        {mode === "home" ? (
          <>
            <Card
              style={[
                styles.modeCard,
                {
                  backgroundColor:
                    kind === "brain"
                      ? `${colors.primary}0E`
                      : `${colors.warning}0D`,
                  borderColor:
                    kind === "brain"
                      ? `${colors.primary}44`
                      : `${colors.warning}44`,
                },
              ]}
            >
              <View style={styles.row}>
                {kind === "brain" ? (
                  <PixelMascot state="idle" size={50} />
                ) : (
                  <CompanionMascot mascot="atlas" state="idle" size={52} />
                )}
                <View style={styles.flex}>
                  <NexusText
                    variant="mono"
                    color={
                      kind === "brain" ? colors.primarySoft : colors.warning
                    }
                  >
                    {kind === "brain"
                      ? "COPILOTO PESSOAL"
                      : "MENTOR DE APRENDIZADO"}
                  </NexusText>
                  <NexusText variant="title">
                    {kind === "brain"
                      ? "Contexto, não conversa genérica."
                      : "Aprenda, pratique, prove domínio."}
                  </NexusText>
                </View>
              </View>
              <NexusText secondary>
                {kind === "brain"
                  ? "O Brain conhece sua missão, progresso, adiamentos, foco, energia e memórias aprovadas."
                  : "O Atlas cria roadmaps, acompanha lições e mantém conversas antigas para continuar exatamente de onde você parou."}
              </NexusText>
              <NexusButton
                label={kind === "brain" ? "Nova conversa" : "Nova aula"}
                icon="＋"
                onPress={newThread}
                fullWidth
              />
            </Card>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <NexusText variant="title">Conversas</NexusText>
                <ChoiceChip
                  label={
                    showArchived ? "Arquivadas" : `${threads.length} ativas`
                  }
                  selected={showArchived}
                  onPress={() => setShowArchived((value) => !value)}
                />
              </View>
              <Field
                label="Buscar no histórico"
                value={search}
                onChangeText={setSearch}
                placeholder="Título ou mensagem..."
                maxLength={100}
              />
              {threads.length ? (
                threads.map((thread) => (
                  <Pressable
                    key={thread.id}
                    onPress={() => openThread(thread)}
                    style={[
                      styles.thread,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.threadIcon,
                        { backgroundColor: `${colors.primary}18` },
                      ]}
                    >
                      {thread.kind === "brain" ? (
                        <PixelMascot size={32} />
                      ) : (
                        <CompanionMascot mascot="atlas" size={32} />
                      )}
                    </View>
                    <View style={styles.flex}>
                      <NexusText variant="subtitle" numberOfLines={1}>
                        {thread.title}
                      </NexusText>
                      <NexusText variant="caption" secondary numberOfLines={2}>
                        {thread.messages.at(-1)?.content ?? "Conversa vazia"}
                      </NexusText>
                    </View>
                    <View style={styles.threadActions}>
                      <Pressable
                        accessibilityLabel="Renomear conversa"
                        onPress={(event) => {
                          event.stopPropagation();
                          setRenameTarget(thread);
                          setRenameValue(thread.title);
                        }}
                      >
                        <NexusText color={colors.primarySoft}>✎</NexusText>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Arquivar conversa"
                        onPress={(event) => {
                          event.stopPropagation();
                          archiveThread(thread.id);
                        }}
                      >
                        <NexusText secondary>⌁</NexusText>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Excluir conversa"
                        onPress={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(thread);
                        }}
                      >
                        <NexusText color={colors.danger}>×</NexusText>
                      </Pressable>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Empty
                  title={
                    search ? "Nada encontrado" : "Seu histórico começa aqui"
                  }
                  text={
                    search
                      ? "Tente outro termo."
                      : "Crie uma conversa. Ela ficará salva para você continuar depois."
                  }
                  mascot={kind === "brain" ? "byte" : "atlas"}
                />
              )}
            </View>
          </>
        ) : null}
      </Screen>
      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Excluir esta conversa?"
        message="As mensagens serão removidas. Memórias extraídas continuarão disponíveis até você apagá-las na área Memórias."
        confirmLabel="Excluir"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteThread(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        visible={Boolean(renameTarget)}
        title="Renomear conversa"
        message="Use um nome curto para encontrar este assunto depois."
        confirmLabel="Salvar"
        onCancel={() => setRenameTarget(null)}
        onConfirm={() => {
          if (renameTarget && renameValue.trim())
            renameThread(renameTarget.id, renameValue);
          setRenameTarget(null);
        }}
      >
        <Field
          label="Nome"
          value={renameValue}
          onChangeText={setRenameValue}
          maxLength={100}
        />
      </ConfirmDialog>
    </>
  );
}

function Empty({
  title,
  text,
  mascot,
}: {
  title: string;
  text: string;
  mascot: "atlas" | "byte";
}) {
  return (
    <Card style={styles.empty}>
      <CompanionMascot mascot={mascot} state="sleeping" size={64} />
      <NexusText variant="title">{title}</NexusText>
      <NexusText variant="caption" secondary style={styles.center}>
        {text}
      </NexusText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  section: { marginTop: 24, gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modeCard: { marginTop: 22, gap: 15 },
  thread: {
    minHeight: 88,
    padding: 12,
    borderWidth: 1,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  threadIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  threadActions: { alignItems: "center", gap: 12, paddingHorizontal: 5 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 28 },
  center: { textAlign: "center" },
  memoryIntro: { gap: 6 },
  memoryCard: { gap: 10 },
  actionButtons: { flexDirection: "row", gap: 8, marginTop: 5 },
  roadmapCreator: { gap: 13 },
  roadmap: { gap: 12 },
  phase: { gap: 7, marginTop: 5 },
  lesson: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: { gap: 11 },
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
  composer: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
});
