import { PRIORITY_XP } from "@/constants/defaults";
import { assistantClientResponseSchema } from "@/schemas/assistant.schema";
import { nextRoadmapLesson } from "@/features/learning/roadmap";
import { createEvidenceBasedWeeklyReview } from "@/features/progress/weekly-review";
import type {
  AppData,
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

export const ASSISTANT_TIMEOUT_MS = 45_000;

type AssistantRunOptions = {
  signal?: AbortSignal;
  messages?: ChatMessage[];
  onStage?: (stage: AssistantStage) => void;
  onDelta?: (delta: string) => void;
};

export class AssistantRemoteError extends Error {
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

function boundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : null;
}

function compactWeeklyEvidence(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const evidence = value as Record<string, unknown>;
  const nonNegativeKeys = [
    "daysRecorded",
    "plannedTasks",
    "completedTasks",
    "missionsCompleted",
    "missionsPlanned",
    "focusMinutes",
    "xpEarned",
    "activeDays",
    "postponedOrCarryOver",
    "roadmapLessonsCompleted",
  ] as const;
  const compact: Record<string, unknown> = {
    weekStart: sanitizeText(
      typeof evidence.weekStart === "string" ? evidence.weekStart : "",
      20,
    ),
    weekEnd: sanitizeText(
      typeof evidence.weekEnd === "string" ? evidence.weekEnd : "",
      20,
    ),
    completionPercentage: boundedNumber(
      evidence.completionPercentage,
      0,
      100,
    ),
    previousCompletionPercentage:
      evidence.previousCompletionPercentage === null
        ? null
        : boundedNumber(evidence.previousCompletionPercentage, 0, 100),
    completionDelta:
      evidence.completionDelta === null
        ? null
        : boundedNumber(evidence.completionDelta, -100, 100),
    score:
      evidence.score === null ? null : boundedNumber(evidence.score, 0, 100),
    confidence:
      evidence.confidence === "insufficient" ||
      evidence.confidence === "low" ||
      evidence.confidence === "medium" ||
      evidence.confidence === "high"
        ? evidence.confidence
        : "insufficient",
    categories: arrayValue(evidence.categories)
      .filter((item): item is string => typeof item === "string")
      .map((item) => sanitizeText(item, 60))
      .filter(Boolean)
      .slice(0, 8),
    facts: arrayValue(evidence.facts)
      .filter((item): item is string => typeof item === "string")
      .map((item) => sanitizeText(item, 240))
      .filter(Boolean)
      .slice(0, 8),
  };
  for (const key of nonNegativeKeys) {
    compact[key] = boundedNumber(evidence[key], 0, 1_000_000);
  }
  return compact;
}

function compactExperience(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const experience = value as Record<string, unknown>;
  const assistantVerbosity = experience.assistantVerbosity;
  const atlasPersonality = experience.atlasPersonality;
  const companionMood = experience.companionMood;
  return {
    ...(assistantVerbosity === "compact" ||
    assistantVerbosity === "balanced" ||
    assistantVerbosity === "detailed"
      ? { assistantVerbosity }
      : {}),
    ...(atlasPersonality === "teacher" ||
    atlasPersonality === "mentor" ||
    atlasPersonality === "coach" ||
    atlasPersonality === "strict" ||
    atlasPersonality === "friendly"
      ? { atlasPersonality }
      : {}),
    ...(companionMood === "happy" ||
    companionMood === "playful" ||
    companionMood === "motivational" ||
    companionMood === "serious" ||
    companionMood === "strict" ||
    companionMood === "calm" ||
    companionMood === "quiet"
      ? { companionMood }
      : {}),
  };
}

function compactRoadmapEvidenceReview(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const review = value as Record<string, unknown>;
  const lesson = review.lesson &&
    typeof review.lesson === "object" &&
    !Array.isArray(review.lesson)
    ? review.lesson as Record<string, unknown>
    : {};
  const roadmap = review.roadmap &&
    typeof review.roadmap === "object" &&
    !Array.isArray(review.roadmap)
    ? review.roadmap as Record<string, unknown>
    : {};
  const phase = review.phase &&
    typeof review.phase === "object" &&
    !Array.isArray(review.phase)
    ? review.phase as Record<string, unknown>
    : {};
  const submission = sanitizeText(
    typeof review.submission === "string" ? review.submission : "",
    4000,
  );
  if (!submission) return undefined;
  return {
    roadmap: {
      topic: sanitizeText(
        typeof roadmap.topic === "string" ? roadmap.topic : "",
        160,
      ),
      outcome: sanitizeText(
        typeof roadmap.outcome === "string" ? roadmap.outcome : "",
        600,
      ),
      currentLevel: roadmap.currentLevel,
      intent: roadmap.intent,
    },
    phase: {
      title: sanitizeText(
        typeof phase.title === "string" ? phase.title : "",
        160,
      ),
      objective: sanitizeText(
        typeof phase.objective === "string" ? phase.objective : "",
        500,
      ),
    },
    lesson: {
      title: sanitizeText(
        typeof lesson.title === "string" ? lesson.title : "",
        160,
      ),
      objective: sanitizeText(
        typeof lesson.objective === "string" ? lesson.objective : "",
        400,
      ),
      steps: arrayValue(lesson.steps)
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeText(item, 240))
        .filter(Boolean)
        .slice(0, 5),
      deliverable: sanitizeText(
        typeof lesson.deliverable === "string" ? lesson.deliverable : "",
        400,
      ),
      successCriteria: sanitizeText(
        typeof lesson.successCriteria === "string"
          ? lesson.successCriteria
          : "",
        400,
      ),
      estimatedMinutes: boundedNumber(lesson.estimatedMinutes, 5, 180),
    },
    submission,
    ...(typeof review.priorFeedback === "string"
      ? { priorFeedback: sanitizeText(review.priorFeedback, 2000) }
      : {}),
    ...(typeof review.priorAdjustment === "string"
      ? { priorAdjustment: sanitizeText(review.priorAdjustment, 1000) }
      : {}),
  };
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
  const weeklyEvidence = mode === "weekly_review"
    ? compactWeeklyEvidence(context.weeklyEvidence)
    : undefined;
  const observableFacts = mode === "weekly_review"
    ? arrayValue(context.observableFacts)
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeText(item, 240))
        .filter(Boolean)
        .slice(0, 7)
    : [];
  const experience = compactExperience(context.experience);
  const roadmapEvidenceReview = mode === "evidence_review"
    ? compactRoadmapEvidenceReview(context.roadmapEvidenceReview)
    : undefined;
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
    ...(typeof context.conversationSummary === "string"
      ? { conversationSummary: sanitizeText(context.conversationSummary, 1600) }
      : {}),
    ...(experience ? { experience } : {}),
    ...(mode === "roadmap" && context.professorIntake
      ? { professorIntake: context.professorIntake }
      : {}),
    ...(roadmapEvidenceReview ? { roadmapEvidenceReview } : {}),
    ...(weeklyEvidence ? { weeklyEvidence } : {}),
    ...(observableFacts.length ? { observableFacts } : {}),
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
    ...(experience ? { experience } : {}),
    ...(mode === "roadmap" && context.professorIntake
      ? { professorIntake: context.professorIntake }
      : {}),
    ...(roadmapEvidenceReview ? { roadmapEvidenceReview } : {}),
    ...(weeklyEvidence ? { weeklyEvidence } : {}),
    ...(observableFacts.length ? { observableFacts } : {}),
  };
}

function safeTask(task: Task) {
  return {
    id: task.id,
    title: sanitizeText(task.title, 120),
    ...(task.context
      ? { context: sanitizeText(task.context, 280) }
      : {}),
    ...(task.firstStep
      ? { firstStep: sanitizeText(task.firstStep, 240) }
      : {}),
    ...(task.expectedResult
      ? { expectedResult: sanitizeText(task.expectedResult, 280) }
      : {}),
    ...(task.doneWhen
      ? { doneWhen: sanitizeText(task.doneWhen, 280) }
      : {}),
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
  const activeRoadmapId = data.learning.activeRoadmapId;
  const roadmapCandidates = data.learning.roadmaps
    .filter((roadmap) => roadmap.status === "active")
    .sort((first, second) => {
      if (first.id === activeRoadmapId) return -1;
      if (second.id === activeRoadmapId) return 1;
      return second.updatedAt.localeCompare(first.updatedAt);
    })
    .slice(0, 3);
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
    roadmaps: roadmapCandidates.map((roadmap) => {
      const nextLesson = nextRoadmapLesson(roadmap);
      return {
        id: roadmap.id,
        active: roadmap.id === activeRoadmapId,
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
        ...(nextLesson
          ? {
              nextLesson: {
                title: sanitizeText(nextLesson.title, 160),
                objective: sanitizeText(
                  nextLesson.objective ?? nextLesson.description,
                  400,
                ),
                steps: (nextLesson.steps ?? [])
                  .map((step) => sanitizeText(step, 240))
                  .filter(Boolean)
                  .slice(0, 5),
                deliverable: sanitizeText(
                  nextLesson.deliverable ?? "",
                  400,
                ),
                successCriteria: sanitizeText(
                  nextLesson.successCriteria ?? "",
                  400,
                ),
                estimatedMinutes: nextLesson.estimatedMinutes,
                ...(nextLesson.evidence
                  ? {
                      evidence: {
                        status: nextLesson.evidence.status,
                        feedback: sanitizeText(
                          nextLesson.evidence.feedback ?? "",
                          500,
                        ),
                        nextAdjustment: sanitizeText(
                          nextLesson.evidence.nextAdjustment ?? "",
                          500,
                        ),
                      },
                    }
                  : {}),
              },
            }
          : {}),
      };
    }),
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
  const title = sanitizeText(
    message.replace(/^(tenho que|preciso|lembrar de)\s+/i, ""),
    120,
  );
  return {
    message: "Organizei sua captura. Revise antes de adicionar ao plano.",
    capture: {
      title,
      description: sanitizeText(message, 300),
      context: "Captura organizada localmente a partir da anotação; confirme o contexto antes de salvar.",
      firstStep: `Abra o recurso necessário e inicie “${title}”.`,
      expectedResult: `Uma entrega observável relacionada a “${title}”.`,
      doneWhen: "A entrega esperada foi conferida e registrada.",
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
  return createEvidenceBasedWeeklyReview(data);
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

function actionableMessage(error: unknown): string {
  if (error instanceof AssistantRemoteError) {
    if (error.code === "missing_key")
      return "A IA ainda não foi configurada no servidor. Tente novamente mais tarde.";
    if (error.code === "unauthorized")
      return "A IA precisa ser reconfigurada no servidor. Tente novamente mais tarde.";
    if (error.code === "rate_limit")
      return "A IA está ocupada agora. Aguarde alguns instantes e tente novamente.";
    if (error.code === "payment_required")
      return "A IA está temporariamente sem cota. Tente novamente mais tarde.";
    if (error.code === "provider_unavailable" || error.code === "provider_busy")
      return "A IA está temporariamente indisponível. Tente novamente.";
    if (error.code === "timeout")
      return "A IA demorou mais que o esperado. Tente novamente.";
    if (error.code === "offline")
      return "Você está sem conexão. Reconecte-se e tente novamente.";
    if (error.status === 404 || error.status === 405)
      return "O aplicativo encontrou um backend incompatível. Tente novamente após a atualização do serviço.";
  }
  if (error instanceof NexusApiError && error.code === "incompatible") {
    return "O aplicativo encontrou um backend incompatível. Tente novamente após a atualização do serviço.";
  }
  return "A IA está temporariamente indisponível. Tente novamente.";
}

function shouldRetryBackend(error: unknown): boolean {
  if (error instanceof NexusApiError) return error.code === "unreachable";
  if (!(error instanceof AssistantRemoteError)) return false;
  return (
    error.code === "provider_busy" ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

async function waitForBackend(signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 450));
  if (signal.aborted) throw new Error("cancelled");
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
    if (request.mode === "capture") {
      options.onStage?.("local");
      return {
        ...localCapture(request.message, input.data),
        warning: "Captura interpretada offline. Revise antes de salvar.",
        meta: {
          source: "local",
          latencyMs: 0,
          attempts: 0,
          errorCode: "offline",
          requestId: request.requestId,
        },
      };
    }
    throw new AssistantRemoteError(
      "offline",
      "Você está sem conexão. Reconecte-se e tente novamente.",
    );
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
    let lastError: unknown;
    let receivedDelta = false;
    for (let backendAttempt = 0; backendAttempt < 2; backendAttempt += 1) {
      try {
        const result = canStream
          ? await remoteStream(request, controller.signal, (delta) => {
              receivedDelta = true;
              options.onDelta?.(delta);
            })
          : await remote(request, controller.signal);
        options.onStage?.("finalizing");
        return {
          ...result,
          ...(result.meta
            ? {
                meta: {
                  ...result.meta,
                  attempts: Math.min(
                    8,
                    result.meta.attempts + backendAttempt,
                  ),
                },
              }
            : {}),
        };
      } catch (error) {
        lastError = error;
        if (
          backendAttempt === 1 ||
          receivedDelta ||
          controller.signal.aborted ||
          !shouldRetryBackend(error)
        ) {
          break;
        }
        options.onStage?.("connecting");
        await waitForBackend(controller.signal);
      }
    }
    throw lastError ?? new AssistantRemoteError(
      "provider_unavailable",
      "A IA está temporariamente indisponível.",
    );
  } catch (error) {
    if (options.signal?.aborted) throw new Error("cancelled");
    const endpoint =
      error instanceof AssistantRemoteError ? error.endpoint : undefined;
    const code = controller.signal.aborted ? "timeout" : errorCode(error);
    if (request.mode === "capture") {
      options.onStage?.("local");
      return {
        ...localCapture(request.message, input.data),
        warning: "Captura interpretada localmente porque a IA falhou. Revise antes de salvar.",
        meta: {
          source: "local",
          latencyMs: Date.now() - startedAt,
          attempts: 1,
          errorCode: code,
          ...(endpoint ? { endpoint } : {}),
          requestId: request.requestId,
        },
      };
    }
    throw new AssistantRemoteError(
      code,
      actionableMessage(error),
      error instanceof AssistantRemoteError ? error.status : undefined,
      endpoint,
    );
  } finally {
    clearTimeout(timeout);
    clearTimeout(generatingTimer);
    options.signal?.removeEventListener("abort", parentAbort);
  }
}
