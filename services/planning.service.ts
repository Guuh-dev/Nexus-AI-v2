import { MAIN_MISSION_XP, PRIORITY_XP } from "@/constants/defaults";
import type { Category, DailyPlan, PlanRequest, PlanResponse, Profile, Task } from "@/types";
import { createId, stableHash } from "@/utils/ids";
import { NexusError, codeFromStatus, isAbortError } from "@/utils/errors";
import { sanitizeText } from "@/utils/text";
import { makeActionTask, profileMission } from "@/features/context/synthesis";
import { weekdayFromKey } from "@/utils/dates";
import { fetchNexusApi } from "@/services/api-config";

const CATEGORY_TASKS: Record<Category, { title: string; description: string }[]> = {
  desenvolvimento: [
    { title: "Construir uma entrega visível", description: "Transforme conhecimento em algo que possa ser demonstrado hoje." },
    { title: "Praticar uma habilidade central", description: "Faça um bloco sem distrações na habilidade que mais aproxima você da meta." },
    { title: "Melhorar um projeto do portfólio", description: "Escolha uma melhoria pequena, termine e registre o resultado." },
  ],
  estudos: [
    { title: "Estudo ativo da prioridade", description: "Aprenda um conceito e teste a memória sem consultar a resposta." },
    { title: "Revisão com exercícios", description: "Resolva questões e anote exatamente onde errou." },
    { title: "Resumo de cinco minutos", description: "Explique o conteúdo com palavras simples para fixar." },
  ],
  dinheiro: [
    { title: "Executar uma ação de receita", description: "Faça uma ação que possa gerar conversa, proposta ou venda." },
    { title: "Prospectar com qualidade", description: "Encontre contatos adequados e envie abordagens personalizadas." },
    { title: "Fortalecer sua oferta", description: "Melhore prova, proposta ou demonstração do que você vende." },
  ],
  saude: [
    { title: "Movimentar o corpo", description: "Faça um treino compatível com sua energia e termine melhor do que começou." },
    { title: "Cuidar da recuperação", description: "Organize água, alimentação e descanso para sustentar a execução." },
    { title: "Bloco curto de mobilidade", description: "Reduza tensão e prepare o corpo para o restante do dia." },
  ],
  organizacao: [
    { title: "Preparar o campo de execução", description: "Organize ambiente, arquivos e próxima ação antes de começar." },
    { title: "Limpar pendências pequenas", description: "Resolva o que está ocupando atenção sem contribuir para a meta." },
    { title: "Planejar o próximo bloco", description: "Defina horário, duração e resultado esperado da próxima sessão." },
  ],
  pessoal: [
    { title: "Fazer uma pausa intencional", description: "Recupere energia sem cair em distração infinita." },
    { title: "Registrar o progresso", description: "Anote o que avançou, o que travou e qual será o próximo movimento." },
    { title: "Cuidar de uma relação importante", description: "Separe alguns minutos para uma conversa ou gesto genuíno." },
  ],
};

function taskKey(title: string): string {
  return title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9áàâãéêíóôõúç]/gi, "");
}

function taskMinutes(profile: Profile, taskCount: number): number {
  const intensityFactor = profile.intensity === "leve" ? 0.65 : profile.intensity === "intenso" ? 0.95 : 0.8;
  const usable = Math.max(20, Math.floor(profile.availableMinutes * intensityFactor));
  return Math.max(10, Math.floor(usable / Math.max(2, taskCount + 1)));
}

export function generateLocalPlan(request: PlanRequest, warning?: string): DailyPlan {
  const { profile, date, requestId } = request;
  const activeToday = profile.activeDays.includes(weekdayFromKey(date));
  const taskCount = activeToday ? Math.min(5, Math.max(2, profile.maxDailyTasks)) : 2;
  const minutes = taskMinutes(profile, taskCount);
  const carryCandidates = request.carryOver ?? [];
  const explicitCarry = carryCandidates.filter((task) => !task.completed && (task.recurring || Boolean(task.postponedFrom) || task.scheduledDate === date));
  const automaticHighPriority = carryCandidates
    .filter((task) => !task.completed && task.priority === "alta" && !explicitCarry.some((explicit) => explicit.id === task.id))
    .slice(0, 2);
  const carried = [...explicitCarry, ...automaticHighPriority]
    .slice(0, taskCount)
    .map((task) => ({
      ...task,
      id: createId("carry"),
      completed: false,
      completedAt: undefined,
      postponedFrom: task.postponedFrom ?? date,
    }));
  const used = new Set(carried.map((task) => taskKey(task.title)));
  const generated: Task[] = [];
  const seed = stableHash(`${date}:${profile.mainGoal}:${profile.nickname}`);
  const categories = profile.priorities.length > 0 ? profile.priorities : (["pessoal"] as Category[]);
  const synthesized = profileMission(profile);

  if (activeToday && request.context?.learning && generated.length + carried.length < taskCount) {
    const learning = request.context.learning;
    generated.push({
      id: createId("learning-task"),
      title: sanitizeText(learning.nextLesson, 120),
      description: `Sessão guiada pelo Professor Atlas para avançar em ${sanitizeText(learning.topic, 120)}. Resultado: entregue uma evidência prática sem recomeçar pelo básico.`,
      category: "estudos",
      priority: "media",
      estimatedMinutes: Math.max(5, Math.min(180, learning.estimatedMinutes)),
      xp: PRIORITY_XP.media,
      recurring: false,
      completed: false,
    });
  }

  if (activeToday && categories.includes("dinheiro") && generated.length + carried.length < taskCount) {
    const commercial = makeActionTask(profile.mainGoal, "dinheiro", profile.skillLevel);
    if (!used.has(taskKey(commercial.title))) {
      used.add(taskKey(commercial.title));
      generated.push({ id: createId("revenue-task"), ...commercial });
    }
  }

  for (let index = 0; generated.length + carried.length < taskCount && index < 24; index += 1) {
    const category = categories[(seed + index) % categories.length] ?? "pessoal";
    const templates = CATEGORY_TASKS[category];
    const template = templates[(seed + index + Math.floor(index / categories.length)) % templates.length];
    if (!template || used.has(taskKey(template.title))) continue;
    used.add(taskKey(template.title));
    const priority = index === 0 ? "alta" : index < 3 ? "media" : "baixa";
    generated.push({
      id: createId("task"),
      title: template.title,
      description: template.description,
      category,
      priority,
      estimatedMinutes: minutes,
      xp: PRIORITY_XP[priority],
      recurring: false,
      completed: false,
    });
  }

  const tasks = [...carried, ...generated].slice(0, taskCount).map((task) => {
    const { completedAt: _completedAt, ...safeTask } = task;
    return safeTask;
  });
  const missionMinutes = activeToday
    ? Math.max(20, Math.min(180, Math.floor(profile.availableMinutes * 0.35)))
    : Math.max(15, Math.min(30, Math.floor(profile.availableMinutes * 0.2)));

  return {
    date,
    mainMission: {
      title: synthesized.title,
      description: `${synthesized.description} Resultado esperado: ${synthesized.result}`,
      estimatedMinutes: missionMinutes,
      priority: "alta",
      completed: false,
      xp: MAIN_MISSION_XP,
    },
    tasks,
    focusMessage:
      profile.assistantTone === "direto"
        ? "Sem negociar com a preguiça: escolha a primeira ação e execute."
        : profile.assistantTone === "treinador"
          ? "Você não precisa vencer o ano hoje. Precisa vencer o próximo bloco."
          : "Tamo junto: começa pequeno, termina bonito e registra a vitória.",
    avoidToday: ["Trocar de prioridade no meio do bloco", "Consumir conteúdo sem aplicar", "Esperar motivação perfeita"],
    totalEstimatedMinutes: missionMinutes + tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    source: "offline",
    warning: warning ?? (activeToday ? "Plano offline criado com suas preferências." : "Dia leve: hoje está fora da sua rotina ativa."),
    createdAt: new Date().toISOString(),
    requestId,
  };
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function requestRemotePlan(request: PlanRequest, signal: AbortSignal): Promise<PlanResponse> {
  const response = await fetchNexusApi("/api/generate-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Nexus-Request-Id": request.requestId,
      "X-Nexus-Client-Id": request.clientId,
    },
    body: JSON.stringify(request),
    signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new NexusError("invalid_response", undefined, response.status);
  }
  const payload = (await response.json()) as Partial<PlanResponse> & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    const code = payload.error?.code;
    if (code === "missing_key") throw new NexusError("missing_key", undefined, response.status);
    throw new NexusError(codeFromStatus(response.status), undefined, response.status);
  }
  if (!payload.plan) throw new NexusError("invalid_response", undefined, response.status);
  return payload as PlanResponse;
}

export async function generatePlan(
  request: PlanRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PlanResponse> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { plan: generateLocalPlan(request, "Você está offline. Criamos uma missão temporária com base nas suas preferências."), warning: "Modo offline" };
  }

  const timeoutMs = Math.min(45_000, Math.max(50, options.timeoutMs ?? 45_000));
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);
    const abortFromParent = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromParent, { once: true });
    try {
      return await requestRemotePlan(request, controller.signal);
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted) throw new NexusError("cancelled");
      const permanentConfigurationError =
        error instanceof NexusError &&
        (error.code === "missing_key" || error.code === "unauthorized" || error.code === "payment_required");
      const retryable =
        !permanentConfigurationError &&
        !isAbortError(error) &&
        (error instanceof TypeError ||
          (error instanceof NexusError && typeof error.status === "number" && shouldRetry(error.status)));
      if (!retryable || attempt === 1) break;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromParent);
    }
  }

  const timedOut = isAbortError(lastError);
  const error = lastError instanceof NexusError ? lastError : new NexusError(timedOut ? "timeout" : "offline");
  return {
    plan: generateLocalPlan(request, error.message),
    warning: error.message,
  };
}
