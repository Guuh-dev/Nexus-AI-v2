import { PRIORITY_XP } from "@/constants/defaults";
import { assistantClientResponseSchema } from "@/schemas/assistant.schema";
import { professorIntakeSchema } from "@/schemas/expansion.schema";
import { createStarterRoadmap } from "@/features/learning/roadmap";
import type {
  AppData,
  AssistantRequest,
  AssistantResponse,
  ChatKind,
  ChatMessage,
  Task,
  WeeklyReview,
} from "@/types";
import { localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";
import { fetchNexusApi, NexusApiError } from "@/services/api-config";

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function compactAssistantContext(context: Record<string, unknown>, mode: AssistantRequest["mode"]): Record<string, unknown> {
  if (JSON.stringify(context).length <= 32_000) return context;
  const memories = arrayValue(context.memories) as Array<{ pinned?: unknown }>;
  const pinned = memories.filter((memory) => memory?.pinned === true).slice(-12);
  const recentMemories = memories.slice(-16);
  const compactMemories = [...pinned, ...recentMemories].filter((memory, index, all) => all.indexOf(memory) === index);
  return {
    kind: context.kind,
    today: context.today,
    progress: context.progress,
    recentHistory: arrayValue(context.recentHistory).slice(-7),
    focus: arrayValue(context.focus).slice(-12),
    memories: compactMemories.map((memory) => {
      if (!memory || typeof memory !== "object") return memory;
      const item = memory as { content?: unknown } & Record<string, unknown>;
      return { ...item, content: sanitizeText(typeof item.content === "string" ? item.content : "", 300) };
    }),
    conversation: arrayValue(context.conversation).slice(-8).map((message) => {
      if (!message || typeof message !== "object") return message;
      const item = message as { role?: unknown; content?: unknown };
      return { role: item.role, content: sanitizeText(typeof item.content === "string" ? item.content : "", 1000) };
    }),
    roadmaps: arrayValue(context.roadmaps).slice(0, 2),
    operations: arrayValue(context.operations).slice(0, 3),
    habits: arrayValue(context.habits).slice(0, 10),
    ...(typeof context.conversationSummary === "string" ? { conversationSummary: sanitizeText(context.conversationSummary, 2500) } : {}),
    ...(mode === "roadmap" && context.professorIntake ? { professorIntake: context.professorIntake } : {}),
  };
}

function safeTask(task: Task) {
  return { id: task.id, title: task.title, category: task.category, priority: task.priority, minutes: task.estimatedMinutes, completed: task.completed, postponed: Boolean(task.postponedFrom) };
}

export function buildAssistantContext(data: AppData, kind: ChatKind, messages: ChatMessage[] = []): Record<string, unknown> {
  const recentHistory = data.history.slice(-21).map((day) => ({
    date: day.date,
    completion: day.completionPercentage,
    xp: day.xpEarned,
    focusMinutes: day.focusMinutes,
    countedForStreak: day.countedForStreak,
    tasks: day.plan.tasks.map(safeTask),
  }));
  const focus = data.progress.focusSessions.slice(-30).map((session) => ({ task: session.taskTitle, minutes: Math.floor(session.elapsedSeconds / 60), status: session.status, at: session.completedAt, mode: session.mode }));
  const pinnedMemories = data.brain.memories.filter((memory) => memory.pinned).slice(-40);
  const memoryPool = [...pinnedMemories, ...data.brain.memories.slice(-80)]
    .filter((memory, index, all) => all.findIndex((candidate) => candidate.id === memory.id) === index);
  return {
    kind,
    today: data.activePlan ? {
      date: data.activePlan.date,
      mission: data.activePlan.mainMission,
      tasks: data.activePlan.tasks.map(safeTask),
      totalMinutes: data.activePlan.totalEstimatedMinutes,
    } : null,
    recentHistory,
    focus,
    progress: { xp: data.progress.totalXp, streak: data.progress.currentStreak, attributes: data.progress.attributes },
    memories: memoryPool.map(({ kind: memoryKind, content, confidence, pinned }) => ({ kind: memoryKind, content, confidence, pinned })),
    conversation: messages.slice(-40).map(({ role, content }) => ({ role, content: sanitizeText(content, 4000) })),
    roadmaps: data.learning.roadmaps.filter((roadmap) => roadmap.status === "active").slice(0, 5).map((roadmap) => ({
      topic: roadmap.topic,
      outcome: roadmap.outcome,
      ...(roadmap.intake ? { intake: {
        knowledgeLevel: roadmap.intake.knowledgeLevel,
        knownConcepts: sanitizeText(roadmap.intake.knownConcepts, 500),
        previousAttempts: sanitizeText(roadmap.intake.previousAttempts, 500),
        proofProject: sanitizeText(roadmap.intake.proofProject, 500),
        motivation: sanitizeText(roadmap.intake.motivation, 400),
        deadline: roadmap.intake.deadline,
        weeklyMinutes: roadmap.intake.weeklyMinutes,
        sessionMinutes: roadmap.intake.sessionMinutes,
        resources: roadmap.intake.resources,
        constraints: roadmap.intake.constraints,
        preferredMethods: roadmap.intake.preferredMethods,
      } } : {}),
      phases: roadmap.phases.map((phase) => ({ title: phase.title, completed: phase.lessons.filter((lesson) => lesson.completed).length, total: phase.lessons.length })),
    })),
    operations: data.operations.filter((operation) => operation.status === "active").slice(0, 5),
    habits: data.habits.slice(0, 20).map((habit) => ({ title: habit.title, target: habit.targetPerWeek, streak: habit.currentStreak, completedDates: habit.completedDates.slice(-14) })),
  };
}

function localCapture(message: string, data: AppData): AssistantResponse {
  const normalized = message.toLocaleLowerCase("pt-BR");
  const category = /cliente|proposta|venda|dinheiro|orçamento|pagamento/.test(normalized) ? "dinheiro"
    : /estud|prova|exercício|trabalho da escola|revis/.test(normalized) ? "estudos"
      : /treino|saúde|correr|academia|futebol/.test(normalized) ? "saude"
        : /código|program|app|site|deploy|github/.test(normalized) ? "desenvolvimento"
          : /arrumar|organizar|limpar/.test(normalized) ? "organizacao" : "pessoal";
  const priority = /urgente|hoje|importante|prazo/.test(normalized) ? "alta" : /quando der|sem pressa/.test(normalized) ? "baixa" : "media";
  const minutesMatch = normalized.match(/(\d{1,3})\s*(?:min|minutos)/);
  const estimatedMinutes = Math.max(5, Math.min(240, minutesMatch?.[1] ? Number(minutesMatch[1]) : 25));
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledDate = normalized.includes("amanhã") ? localDateKey(tomorrow, data.profile?.timezone) : undefined;
  return {
    message: "Organizei sua captura. Revise antes de adicionar ao plano.",
    capture: { title: sanitizeText(message.replace(/^(tenho que|preciso|lembrar de)\s+/i, ""), 120), category, priority, estimatedMinutes, xp: PRIORITY_XP[priority], recurring: false, ...(scheduledDate ? { scheduledDate } : {}) },
    warning: "A inteligência estava indisponível; usei a interpretação local.",
  };
}

export function createLocalWeeklyReview(data: AppData): WeeklyReview {
  const days = data.history.slice(-7);
  const completion = days.length ? Math.round(days.reduce((sum, day) => sum + day.completionPercentage, 0) / days.length) : 0;
  const xp = days.reduce((sum, day) => sum + day.xpEarned, 0);
  const focusMinutes = days.reduce((sum, day) => sum + day.focusMinutes, 0);
  const end = localDateKey(new Date(), data.profile?.timezone);
  const startDate = new Date(); startDate.setDate(startDate.getDate() - 6);
  return {
    id: createId("review"), weekStart: localDateKey(startDate, data.profile?.timezone), weekEnd: end,
    completionPercentage: completion, xpEarned: xp, focusMinutes, consistencyScore: completion,
    highlights: completion >= 70 ? ["Você manteve uma semana de execução consistente."] : ["Você registrou dados reais para ajustar a próxima semana."],
    patterns: days.length < 3 ? ["Ainda faltam alguns dias para identificar padrões com confiança."] : [completion >= 70 ? "Planos menores parecem estar funcionando." : "A capacidade planejada pode estar acima do tempo real."],
    keep: ["Registrar conclusões e sessões de foco."], cut: ["Tarefas vagas ou grandes demais para um único bloco."],
    nextWeekFocus: data.profile?.mainGoal ?? "Avançar na missão principal.", challenge: "Concluir a missão principal em três dias da próxima semana.",
    source: "local", createdAt: new Date().toISOString(),
  };
}

function localFallback(request: AssistantRequest, data: AppData): AssistantResponse {
  if (request.mode === "capture") return localCapture(request.message, data);
  if (request.mode === "roadmap" || request.mode === "professor") {
    const intakeResult = professorIntakeSchema.safeParse(request.context.professorIntake);
    const intake = intakeResult.success ? intakeResult.data : undefined;
    const roadmap = createStarterRoadmap(intake?.topic ?? request.message, request.profile, intake);
    return { message: `Preparei uma trilha local inicial para ${roadmap.topic}. Quando a IA voltar, o Professor Atlas poderá refiná-la com você.`, roadmap, warning: "Roadmap local ativado." };
  }
  if (request.mode === "weekly_review") return { message: "Sua revisão foi calculada com os dados locais.", weeklyReview: createLocalWeeklyReview(data), warning: "Revisão local ativada." };
  return { message: "Estou em modo local agora. Seu histórico continua seguro. Posso ajudar a reduzir o plano, escolher a próxima ação ou registrar uma ideia quando a conexão voltar.", warning: "Nexus Brain em modo local." };
}

async function remote(request: AssistantRequest, signal: AbortSignal): Promise<AssistantResponse> {
  const response = await fetchNexusApi("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", "X-Nexus-Client-Id": request.clientId }, body: JSON.stringify(request), signal });
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("invalid_response");
  const body = await response.json() as unknown;
  if (!response.ok) {
    const errorBody = body && typeof body === "object" && "error" in body ? (body as { error?: { message?: unknown } }).error : undefined;
    throw new Error(typeof errorBody?.message === "string" ? errorBody.message : `http_${response.status}`);
  }
  const parsed = assistantClientResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("invalid_response");
  return parsed.data;
}

export async function askNexus(
  input: Omit<AssistantRequest, "requestId" | "clientId" | "profile" | "context"> & { data: AppData; context?: Record<string, unknown> },
  options: { signal?: AbortSignal; messages?: ChatMessage[] } = {},
): Promise<AssistantResponse> {
  const profile = input.data.profile;
  if (!profile) throw new Error("Perfil indisponível");
  const request: AssistantRequest = {
    mode: input.mode,
    requestId: createId(`assistant-${input.mode}`),
    clientId: input.data.installationId,
    message: sanitizeText(input.message, 4000),
    profile,
    context: compactAssistantContext({ ...buildAssistantContext(input.data, input.mode === "professor" || input.mode === "roadmap" ? "professor" : "brain", options.messages), ...(input.context ?? {}) }, input.mode),
  };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return localFallback(request, input.data);
  const controller = new AbortController();
  const parentAbort = () => controller.abort();
  options.signal?.addEventListener("abort", parentAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    return await remote(request, controller.signal);
  } catch (error) {
    if (options.signal?.aborted) throw new Error("cancelled");
    const fallback = localFallback(request, input.data);
    if (error instanceof NexusApiError && error.code === "incompatible") {
      return { ...fallback, warning: "O APK está conectado a um backend antigo. Publique a V2.1 no Render para reativar a IA." };
    }
    return fallback;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", parentAbort);
  }
}
