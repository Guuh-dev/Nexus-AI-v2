import { PRIORITY_XP } from "@/constants/defaults";
import { assistantClientResponseSchema } from "@/schemas/assistant.schema";
import { professorIntakeSchema } from "@/schemas/expansion.schema";
import {
  createStarterRoadmap,
  nextRoadmapLesson,
} from "@/features/learning/roadmap";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
import { getTaskGuidance } from "@/features/planning/task-guidance";
import type {
  AppData,
  AssistantMeta,
  AssistantRequest,
  AssistantResponse,
  AssistantStage,
  ChatKind,
  ChatMessage,
  Task,
  WeeklyReview,
} from "@/types";
import { localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";
import { fetchNexusApi, NexusApiError } from "@/services/api-config";

export const ASSISTANT_TIMEOUT_MS = 35_000;

type AssistantRunOptions = {
  signal?: AbortSignal;
  messages?: ChatMessage[];
  onStage?: (stage: AssistantStage) => void;
  onDelta?: (delta: string) => void;
};

class AssistantRemoteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = "AssistantRemoteError";
  }
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function compactAssistantContext(
  context: Record<string, unknown>,
  mode: AssistantRequest["mode"],
): Record<string, unknown> {
  const memories = arrayValue(context.memories) as ({ pinned?: unknown; content?: unknown } & Record<string, unknown>)[];
  const pinned = memories.filter((memory) => memory?.pinned === true).slice(-8);
  const recentMemories = memories.slice(-10);
  const compactMemories = [...pinned, ...recentMemories]
    .filter((memory, index, all) => all.indexOf(memory) === index)
    .map((memory) => ({
      kind: memory.kind,
      confidence: memory.confidence,
      pinned: memory.pinned === true,
      content: sanitizeText(
        typeof memory.content === "string" ? memory.content : "",
        280,
      ),
    }));

  const conversationLimit = mode === "roadmap" ? 4 : mode === "capture" ? 2 : 8;
  const compact = {
    kind: context.kind,
    today: context.today,
    progress: context.progress,
    recentHistory: arrayValue(context.recentHistory).slice(-7),
    focus: arrayValue(context.focus).slice(-10),
    memories: compactMemories,
    conversation: arrayValue(context.conversation)
      .slice(-conversationLimit)
      .map((message) => {
        if (!message || typeof message !== "object") return message;
        const item = message as { role?: unknown; content?: unknown };
        return {
          role: item.role,
          content: sanitizeText(
            typeof item.content === "string" ? item.content : "",
            1200,
          ),
        };
      }),
    roadmaps: arrayValue(context.roadmaps).slice(
      0,
      mode === "professor" || mode === "roadmap" ? 3 : 1,
    ),
    operations: arrayValue(context.operations).slice(0, 3),
    habits: arrayValue(context.habits).slice(0, 8),
    ...(typeof context.conversationSummary === "string"
      ? { conversationSummary: sanitizeText(context.conversationSummary, 1600) }
      : {}),
    ...(mode === "roadmap" && context.professorIntake
      ? { professorIntake: context.professorIntake }
      : {}),
  };

  // Last safety net: keep client payload comfortably below the API body limit.
  const serialized = JSON.stringify(compact);
  if (serialized.length <= 22_000) return compact;
  return {
    kind: compact.kind,
    today: compact.today,
    progress: compact.progress,
    memories: compactMemories.slice(-6),
    conversation: compact.conversation.slice(-6),
    ...(mode === "roadmap" && context.professorIntake
      ? { professorIntake: context.professorIntake }
      : {}),
  };
}

function safeTask(task: Task) {
  return {
    id: task.id,
    title: sanitizeText(task.title, 120),
    category: task.category,
    priority: task.priority,
    minutes: task.estimatedMinutes,
    completed: task.completed,
    postponed: Boolean(task.postponedFrom),
  };
}

export function buildAssistantContext(
  data: AppData,
  kind: ChatKind,
  messages: ChatMessage[] = [],
): Record<string, unknown> {
  const recentHistory = data.history.slice(-10).map((day) => ({
    date: day.date,
    completion: day.completionPercentage,
    xp: day.xpEarned,
    focusMinutes: day.focusMinutes,
    countedForStreak: day.countedForStreak,
    tasks: day.plan.tasks.slice(0, 8).map(safeTask),
  }));
  const focus = data.progress.focusSessions.slice(-14).map((session) => ({
    task: sanitizeText(session.taskTitle, 120),
    minutes: Math.floor(session.elapsedSeconds / 60),
    status: session.status,
    at: session.completedAt,
    mode: session.mode,
  }));
  const pinnedMemories = data.brain.memories
    .filter((memory) => memory.pinned)
    .slice(-10);
  const memoryPool = [
    ...pinnedMemories,
    ...data.brain.memories.slice(-14),
  ].filter(
    (memory, index, all) =>
      all.findIndex((candidate) => candidate.id === memory.id) === index,
  );
  return {
    kind,
    today: data.activePlan
      ? {
          date: data.activePlan.date,
          mission: data.activePlan.mainMission,
          tasks: data.activePlan.tasks.slice(0, 10).map(safeTask),
          totalMinutes: data.activePlan.totalEstimatedMinutes,
        }
      : null,
    recentHistory,
    focus,
    progress: {
      xp: data.progress.totalXp,
      streak: data.progress.currentStreak,
      attributes: data.progress.attributes,
    },
    memories: memoryPool.map(
      ({ kind: memoryKind, content, confidence, pinned }) => ({
        kind: memoryKind,
        content: sanitizeText(content, 300),
        confidence,
        pinned,
      }),
    ),
    conversation: messages
      .slice(-12)
      .map(({ role, content }) => ({
        role,
        content: sanitizeText(content, 1200),
      })),
    roadmaps: data.learning.roadmaps
      .filter((roadmap) => roadmap.status === "active")
      .slice(0, 3)
      .map((roadmap) => ({
        topic: roadmap.topic,
        outcome: roadmap.outcome,
        ...(roadmap.intake
          ? {
              intake: {
                knowledgeLevel: roadmap.intake.knowledgeLevel,
                knownConcepts: sanitizeText(roadmap.intake.knownConcepts, 350),
                previousAttempts: sanitizeText(
                  roadmap.intake.previousAttempts,
                  350,
                ),
                proofProject: sanitizeText(roadmap.intake.proofProject, 350),
                motivation: sanitizeText(roadmap.intake.motivation, 250),
                deadline: roadmap.intake.deadline,
                weeklyMinutes: roadmap.intake.weeklyMinutes,
                sessionMinutes: roadmap.intake.sessionMinutes,
                resources: roadmap.intake.resources.slice(0, 8),
                constraints: roadmap.intake.constraints.slice(0, 8),
                preferredMethods: roadmap.intake.preferredMethods.slice(0, 8),
              },
            }
          : {}),
        phases: roadmap.phases.slice(0, 8).map((phase) => ({
          title: phase.title,
          completed: phase.lessons.filter((lesson) => lesson.completed).length,
          total: phase.lessons.length,
        })),
      })),
    operations: data.operations
      .filter((operation) => operation.status === "active")
      .slice(0, 3),
    habits: data.habits.slice(0, 8).map((habit) => ({
      title: habit.title,
      target: habit.targetPerWeek,
      streak: habit.currentStreak,
      completedDates: habit.completedDates.slice(-7),
    })),
  };
}

function localCapture(message: string, data: AppData): AssistantResponse {
  const normalized = message.toLocaleLowerCase("pt-BR");
  const category = /cliente|proposta|venda|dinheiro|orçamento|pagamento/.test(
    normalized,
  )
    ? "dinheiro"
    : /estud|prova|exercício|trabalho da escola|revis/.test(normalized)
      ? "estudos"
      : /treino|saúde|correr|academia|futebol/.test(normalized)
        ? "saude"
        : /código|program|app|site|deploy|github/.test(normalized)
          ? "desenvolvimento"
          : /arrumar|organizar|limpar/.test(normalized)
            ? "organizacao"
            : "pessoal";
  const priority = /urgente|hoje|importante|prazo/.test(normalized)
    ? "alta"
    : /quando der|sem pressa/.test(normalized)
      ? "baixa"
      : "media";
  const minutesMatch = normalized.match(/(\d{1,3})\s*(?:min|minutos)/);
  const estimatedMinutes = Math.max(
    5,
    Math.min(240, minutesMatch?.[1] ? Number(minutesMatch[1]) : 25),
  );
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledDate = normalized.includes("amanhã")
    ? localDateKey(tomorrow, data.profile?.timezone)
    : undefined;
  return {
    message: "Organizei sua captura. Revise antes de adicionar ao plano.",
    capture: {
      title: sanitizeText(
        message.replace(/^(tenho que|preciso|lembrar de)\s+/i, ""),
        120,
      ),
      category,
      priority,
      estimatedMinutes,
      xp: PRIORITY_XP[priority],
      recurring: false,
      ...(scheduledDate ? { scheduledDate } : {}),
    },
    warning: "A inteligência estava indisponível; usei a interpretação local.",
  };
}

export function createLocalWeeklyReview(data: AppData): WeeklyReview {
  const days = data.history.slice(-7);
  const completion = days.length
    ? Math.round(
        days.reduce((sum, day) => sum + day.completionPercentage, 0) /
          days.length,
      )
    : 0;
  const xp = days.reduce((sum, day) => sum + day.xpEarned, 0);
  const focusMinutes = days.reduce((sum, day) => sum + day.focusMinutes, 0);
  const end = localDateKey(new Date(), data.profile?.timezone);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  return {
    id: createId("review"),
    weekStart: localDateKey(startDate, data.profile?.timezone),
    weekEnd: end,
    completionPercentage: completion,
    xpEarned: xp,
    focusMinutes,
    consistencyScore: completion,
    highlights:
      completion >= 70
        ? ["Você manteve uma semana de execução consistente."]
        : ["Você registrou dados reais para ajustar a próxima semana."],
    patterns:
      days.length < 3
        ? ["Ainda faltam alguns dias para identificar padrões com confiança."]
        : [
            completion >= 70
              ? "Planos menores parecem estar funcionando."
              : "A capacidade planejada pode estar acima do tempo real.",
          ],
    keep: ["Registrar conclusões e sessões de foco."],
    cut: ["Tarefas vagas ou grandes demais para um único bloco."],
    nextWeekFocus: (() => {
      const activeRoadmap = data.learning.roadmaps.find(
        (roadmap) =>
          roadmap.id === data.learning.activeRoadmapId &&
          roadmap.status === "active",
      );
      const lesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
      if (lesson) return `Concluir ${lesson.title} e registrar a entrega prática.`;
      const nextTask = data.activePlan?.tasks.find((task) => !task.completed);
      if (nextTask) return `Finalizar ${nextTask.title} em um bloco de ${nextTask.estimatedMinutes} min.`;
      return data.profile?.mainGoal ?? "Avançar na missão principal.";
    })(),
    challenge: (() => {
      const unfinished = data.activePlan?.tasks.filter((task) => !task.completed).slice(0, 2).map((task) => task.title) ?? [];
      return unfinished.length
        ? `Concluir: ${unfinished.join(" + ")}.`
        : "Planejar 3 blocos pequenos e concluir pelo menos 2 com entrega visível.";
    })(),
    source: "local",
    createdAt: new Date().toISOString(),
  };
}

function localBrainMessage(request: AssistantRequest, data: AppData): string {
  const goal = sanitizeText(
    data.profile?.mainGoal ?? "sua missão principal",
    120,
  );
  const message = request.message.toLocaleLowerCase("pt-BR");
  if (/agora|próxim|começ|fazer/.test(message)) {
    const nextTask = data.activePlan?.tasks.find((task) => !task.completed);
    if (nextTask) {
      const guidance = getTaskGuidance(nextTask);
      return `Estou em modo local. Seu melhor próximo passo é “${nextTask.title}”. Faça agora: ${guidance.steps
        .slice(0, 3)
        .map((step, index) => `${index + 1}) ${step}`)
        .join(" ")} Resultado esperado: ${guidance.deliverable}`;
    }
    return `Estou em modo local. Escolha uma ação de 15 minutos que mova ${goal} para frente e termine com uma entrega visível, não apenas tempo gasto.`;
  }
  if (/trav|difícil|desanim|procrast/.test(message)) {
    return `Estou em modo local. Reduza o problema para um bloco de 10 minutos: abra o material, execute uma única ação e pare somente depois de registrar o que avançou.`;
  }
  return `Estou em modo local, mas seu histórico continua seguro. Para avançar em ${goal}, transforme sua pergunta em uma ação pequena, com duração e resultado observável.`;
}

function localFallback(
  request: AssistantRequest,
  data: AppData,
  meta: AssistantMeta,
): AssistantResponse {
  if (request.mode === "capture")
    return { ...localCapture(request.message, data), meta };
  if (request.mode === "roadmap") {
    const intakeResult = professorIntakeSchema.safeParse(
      request.context.professorIntake,
    );
    const intake = intakeResult.success ? intakeResult.data : undefined;
    const roadmap = createStarterRoadmap(
      intake?.topic ?? request.message,
      request.profile,
      intake,
    );
    return {
      message: `Preparei uma trilha local inicial para ${roadmap.topic}. Assim que a conexão remota voltar, o Professor Atlas poderá refiná-la com você.`,
      roadmap,
      warning: "Roadmap local ativado.",
      meta,
    };
  }
  if (request.mode === "professor") {
    const activeRoadmap = data.learning.roadmaps.find(
      (roadmap) =>
        roadmap.id === data.learning.activeRoadmapId &&
        roadmap.status === "active",
    );
    const lesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
    const phase = activeRoadmap?.phases.find((item) =>
      item.lessons.some((candidate) => candidate.id === lesson?.id),
    );
    const nextStep =
      activeRoadmap && phase && lesson
        ? (() => {
            const guidance = getLessonGuidance(activeRoadmap, phase, lesson);
            return `Lição: “${lesson.title}”. Objetivo: ${guidance.objective} Passos: ${guidance.steps
              .slice(0, 4)
              .map((step, index) => `${index + 1}) ${step}`)
              .join(
                " ",
              )} Entrega: ${guidance.deliverable} Conclua quando: ${guidance.successCriteria}`;
          })()
        : "Escolha uma habilidade concreta, descreva o que já sabe e produza uma pequena prova de domínio hoje.";
    return {
      message: `Atlas está em modo local. ${nextStep}`,
      warning: "Professor Atlas em modo local. Nenhum roadmap novo foi criado.",
      meta,
    };
  }
  if (request.mode === "weekly_review") {
    return {
      message: "Sua revisão foi calculada com os dados locais.",
      weeklyReview: createLocalWeeklyReview(data),
      warning: "Revisão local ativada.",
      meta,
    };
  }
  return {
    message: localBrainMessage(request, data),
    warning: "Nexus Brain em modo local.",
    meta,
  };
}

function extractRemoteError(
  body: unknown,
  status: number,
): { code: string; message: string } {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: { code?: unknown; message?: unknown } })
      .error;
    return {
      code: typeof error?.code === "string" ? error.code : `http_${status}`,
      message:
        typeof error?.message === "string"
          ? error.message
          : `Falha HTTP ${status}`,
    };
  }
  return { code: `http_${status}`, message: `Falha HTTP ${status}` };
}

type StreamEnvelope = {
  delta?: unknown;
  error?: { code?: unknown; message?: unknown };
} & Partial<AssistantResponse>;

function parseSseBlock(
  block: string,
  onDelta: (delta: string) => void,
): { result?: AssistantResponse; error?: AssistantRemoteError } {
  const event = block.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
  const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
  if (!data) return {};
  let parsed: StreamEnvelope;
  try { parsed = JSON.parse(data) as StreamEnvelope; } catch { return {}; }
  if (event === "delta" && typeof parsed.delta === "string") {
    onDelta(parsed.delta);
    return {};
  }
  if (event === "error") {
    const code = typeof parsed.error?.code === "string" ? parsed.error.code : "provider_unavailable";
    const message = typeof parsed.error?.message === "string" ? parsed.error.message : "A inteligência está temporariamente indisponível.";
    return { error: new AssistantRemoteError(code, message) };
  }
  if (event === "result") {
    const validated = assistantClientResponseSchema.safeParse(parsed);
    if (validated.success) return { result: validated.data };
    return { error: new AssistantRemoteError("invalid_response", "A resposta em streaming não passou pela validação do Nexus.") };
  }
  return {};
}

async function remoteStream(
  request: AssistantRequest,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
): Promise<AssistantResponse> {
  const startedAt = Date.now();
  const response = await fetchNexusApi("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Nexus-Client-Id": request.clientId,
    },
    body: JSON.stringify(request),
    signal,
  });
  const endpoint = response.url || undefined;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/event-stream")) {
    const body = type.includes("application/json") ? await response.json() as unknown : null;
    if (!response.ok) {
      const details = extractRemoteError(body, response.status);
      throw new AssistantRemoteError(details.code, details.message, response.status, endpoint);
    }
    const parsed = assistantClientResponseSchema.safeParse(body);
    if (!parsed.success) throw new AssistantRemoteError("invalid_response", "O backend não abriu o canal de streaming.", response.status, endpoint);
    return parsed.data;
  }

  let buffer = "";
  let result: AssistantResponse | undefined;
  const consume = (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseSseBlock(block, onDelta);
      if (parsed.error) throw parsed.error;
      if (parsed.result) result = parsed.result;
      boundary = buffer.indexOf("\n\n");
    }
  };

  const reader = response.body?.getReader?.();
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      consume(decoder.decode(value, { stream: true }));
    }
  } else {
    consume(await response.text());
  }
  if (buffer.trim()) consume(`${buffer}\n\n`);
  if (!result) throw new AssistantRemoteError("invalid_response", "O streaming terminou sem resposta final.", response.status, endpoint);
  return {
    ...result,
    meta: {
      source: "remote",
      latencyMs: Date.now() - startedAt,
      attempts: result.meta?.attempts ?? 1,
      ...(result.meta?.model ? { model: result.meta.model } : {}),
      ...(result.meta?.reasoningTokens !== undefined ? { reasoningTokens: result.meta.reasoningTokens } : {}),
      ...(endpoint ? { endpoint } : {}),
      requestId: request.requestId,
    },
  };
}

async function remote(
  request: AssistantRequest,
  signal: AbortSignal,
): Promise<AssistantResponse> {
  const startedAt = Date.now();
  const response = await fetchNexusApi("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Nexus-Client-Id": request.clientId,
    },
    body: JSON.stringify(request),
    signal,
  });
  const endpoint = response.url || undefined;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new AssistantRemoteError(
      "invalid_response",
      "O backend respondeu em um formato inesperado.",
      response.status,
      endpoint,
    );
  }
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const details = extractRemoteError(body, response.status);
    throw new AssistantRemoteError(
      details.code,
      details.message,
      response.status,
      endpoint,
    );
  }
  const parsed = assistantClientResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new AssistantRemoteError(
      "invalid_response",
      "A resposta remota não passou pela validação do Nexus.",
      response.status,
      endpoint,
    );
  }
  return {
    ...parsed.data,
    meta: {
      source: "remote",
      latencyMs: Date.now() - startedAt,
      attempts: parsed.data.meta?.attempts ?? 1,
      ...(parsed.data.meta?.model ? { model: parsed.data.meta.model } : {}),
      ...(parsed.data.meta?.reasoningTokens !== undefined
        ? { reasoningTokens: parsed.data.meta.reasoningTokens }
        : {}),
      ...(endpoint ? { endpoint } : {}),
      requestId: request.requestId,
    },
  };
}

function errorCode(error: unknown): string {
  if (error instanceof AssistantRemoteError) return error.code;
  if (error instanceof NexusApiError) return error.code;
  if (error instanceof Error && /abort|timeout/i.test(error.message))
    return "timeout";
  return "unreachable";
}

function warningFor(error: unknown): string {
  if (error instanceof AssistantRemoteError) {
    if (error.code === "missing_key")
      return "O backend está online, mas a chave do OpenRouter não foi configurada no Render.";
    if (error.code === "unauthorized")
      return "A chave do OpenRouter foi recusada. Atualize o secret no Render.";
    if (error.code === "rate_limit")
      return "Os modelos gratuitos estão ocupados. Usei o modo local nesta tentativa.";
    if (error.code === "payment_required")
      return "A cota remota terminou. O modo local continua disponível.";
    if (error.code === "provider_unavailable")
      return "O provedor remoto não respondeu. O modo local assumiu esta tentativa.";
    if (error.code === "timeout")
      return "A IA demorou demais. Ativei o modo local sem prender a tela.";
    if (error.status === 404 || error.status === 405)
      return "O APK encontrou um backend antigo. Publique a versão atual no Render.";
  }
  if (error instanceof NexusApiError && error.code === "incompatible") {
    return "O APK está conectado a um backend antigo. Publique a versão atual no Render para reativar a IA.";
  }
  return "Não foi possível alcançar a inteligência remota. O modo local assumiu sem perder seus dados.";
}

export async function askNexus(
  input: Omit<
    AssistantRequest,
    "requestId" | "clientId" | "profile" | "context"
  > & { data: AppData; context?: Record<string, unknown> },
  options: AssistantRunOptions = {},
): Promise<AssistantResponse> {
  const profile = input.data.profile;
  if (!profile) throw new Error("Perfil indisponível");
  const request: AssistantRequest = {
    mode: input.mode,
    requestId: createId(`assistant-${input.mode}`),
    clientId: input.data.installationId,
    message: sanitizeText(input.message, 4000),
    profile,
    context: compactAssistantContext(
      {
        ...buildAssistantContext(
          input.data,
          input.mode === "professor" || input.mode === "roadmap"
            ? "professor"
            : "brain",
          options.messages,
        ),
        experience: {
          assistantVerbosity: input.data.preferences.mascot.assistantVerbosity,
          atlasPersonality: input.data.preferences.mascot.atlasPersonality,
          companionMood: input.data.preferences.mascot.companionMood,
        },
        ...(input.context ?? {}),
      },
      input.mode,
    ),
  };
  const startedAt = Date.now();
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    options.onStage?.("local");
    return localFallback(request, input.data, {
      source: "local",
      latencyMs: 0,
      attempts: 0,
      errorCode: "offline",
      requestId: request.requestId,
    });
  }

  const controller = new AbortController();
  const parentAbort = () => controller.abort();
  options.signal?.addEventListener("abort", parentAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);
  const generatingTimer = setTimeout(
    () => options.onStage?.("generating"),
    650,
  );
  options.onStage?.("connecting");
  try {
    const canStream = Boolean(options.onDelta) && (request.mode === "brain" || request.mode === "professor");
    const result = canStream
      ? await remoteStream(request, controller.signal, options.onDelta!)
      : await remote(request, controller.signal);
    options.onStage?.("finalizing");
    return result;
  } catch (error) {
    if (options.signal?.aborted) throw new Error("cancelled");
    options.onStage?.("local");
    const endpoint =
      error instanceof AssistantRemoteError ? error.endpoint : undefined;
    const fallback = localFallback(request, input.data, {
      source: "local",
      latencyMs: Date.now() - startedAt,
      attempts: 1,
      errorCode: controller.signal.aborted ? "timeout" : errorCode(error),
      ...(endpoint ? { endpoint } : {}),
      requestId: request.requestId,
    });
    return { ...fallback, warning: warningFor(error) };
  } finally {
    clearTimeout(timeout);
    clearTimeout(generatingTimer);
    options.signal?.removeEventListener("abort", parentAbort);
  }
}
