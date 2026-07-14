import { MAIN_MISSION_XP, PRIORITY_XP } from "@/constants/defaults";
import type { Category, DailyPlan, PlanRequest, PlanResponse, Profile, Task } from "@/types";
import { createId, stableHash } from "@/utils/ids";
import { NexusError, codeFromStatus, isAbortError } from "@/utils/errors";
import { sanitizeText } from "@/utils/text";
import { makeActionTask, profileMission } from "@/features/context/synthesis";
import { weekdayFromKey } from "@/utils/dates";
import { fetchNexusApi, NexusApiError } from "@/services/api-config";

type StructuredTaskTemplate = Pick<Task, "title" | "description" | "context" | "firstStep" | "expectedResult" | "doneWhen">;

const CATEGORY_TASKS: Record<Category, StructuredTaskTemplate[]> = {
  desenvolvimento: [
    { title: "Implementar uma função pequena", description: "Conclua uma unidade de comportamento que possa ser executada hoje.", context: "Uma entrega curta reduz o risco de estudar sem aplicar.", firstStep: "Escreva em uma frase a entrada, a saída e o caso principal da função.", expectedResult: "Uma função executável com um exemplo de uso.", doneWhen: "O exemplo produz a saída esperada e o código foi salvo." },
    { title: "Corrigir um erro reproduzível", description: "Encontre a causa de um erro real antes de alterar o código.", context: "Debugging com reprodução gera aprendizado verificável.", firstStep: "Registre os passos exatos que fazem o erro acontecer.", expectedResult: "Causa identificada e correção validada no mesmo cenário.", doneWhen: "O erro não ocorre mais e a verificação anterior continua funcionando." },
    { title: "Adicionar um teste de comportamento", description: "Proteja a função principal de uma regressão concreta.", context: "Um teste torna o resultado do trabalho observável e repetível.", firstStep: "Escolha um comportamento importante e descreva a entrada e a saída esperada.", expectedResult: "Um teste automatizado que falha sem a implementação correta.", doneWhen: "O teste passa e também cobre ao menos um caso de falha." },
  ],
  estudos: [
    { title: "Resolver três questões sem consulta", description: "Use exercícios para medir o que realmente ficou disponível na memória.", context: "Responder antes de revisar revela lacunas reais.", firstStep: "Selecione três questões do mesmo assunto e esconda o gabarito.", expectedResult: "Três respostas registradas e corrigidas.", doneWhen: "Cada erro tem uma correção e a regra que faltava foi anotada." },
    { title: "Explicar um conceito com exemplo", description: "Converta uma definição em explicação própria e aplicável.", context: "Explicar sem copiar testa compreensão, não reconhecimento.", firstStep: "Escolha um conceito e escreva uma frase sem consultar o material.", expectedResult: "Uma explicação curta com exemplo e contraexemplo.", doneWhen: "A explicação foi conferida e as imprecisões foram corrigidas." },
    { title: "Corrigir os erros do último exercício", description: "Transforme erros recentes em regras para a próxima tentativa.", context: "Revisão focada evita repetir o mesmo padrão.", firstStep: "Separe os dois erros mais importantes da sessão anterior.", expectedResult: "Dois erros refeitos corretamente e uma checklist curta.", doneWhen: "As novas respostas estão corretas e a causa de cada erro foi registrada." },
  ],
  dinheiro: [
    { title: "Enviar uma proposta para um prospect", description: "Apresente uma entrega, prazo e próximo passo a uma pessoa compatível.", context: "Esta tarefa só é criada quando a meta atual declara intenção comercial.", firstStep: "Escolha um prospect e registre o problema específico observado.", expectedResult: "Uma proposta personalizada enviada e um follow-up agendado.", doneWhen: "Há evidência do envio, destinatário e data do próximo contato." },
    { title: "Personalizar três abordagens", description: "Prepare mensagens baseadas em problemas observados, sem disparo genérico.", context: "Abordagens específicas produzem um sinal comercial mensurável.", firstStep: "Liste três prospects e uma observação concreta sobre cada um.", expectedResult: "Três mensagens diferentes prontas para envio.", doneWhen: "Cada mensagem cita um contexto real e termina com um próximo passo simples." },
    { title: "Revisar escopo e preço da oferta", description: "Deixe claro o que entra, o que não entra, prazo e valor inicial.", context: "Uma oferta verificável evita propostas vagas.", firstStep: "Escreva a entrega principal em uma frase com início e fim.", expectedResult: "Uma oferta curta com escopo, prazo, preço e critério de aceite.", doneWhen: "A oferta pode ser enviada sem depender de explicação adicional." },
  ],
  saude: [
    { title: "Concluir vinte minutos de treino", description: "Execute um bloco compatível com sua energia atual.", context: "A duração definida evita uma meta de saúde abstrata.", firstStep: "Vista a roupa de treino e prepare um cronômetro de vinte minutos.", expectedResult: "Treino concluído com duração e exercícios registrados.", doneWhen: "O cronômetro terminou e o registro da sessão foi salvo." },
    { title: "Preparar água e refeição de recuperação", description: "Organize uma decisão concreta de recuperação para hoje.", context: "Preparar antes reduz decisões improvisadas depois do treino.", firstStep: "Encha a garrafa e escolha a refeição que já está disponível.", expectedResult: "Água e refeição definidas para o período de recuperação.", doneWhen: "Os itens estão preparados ou separados em local visível." },
    { title: "Executar dez minutos de mobilidade", description: "Trabalhe as regiões mais tensionadas com um bloco curto.", context: "Mobilidade curta é uma entrega mensurável de cuidado físico.", firstStep: "Escolha três movimentos e posicione o cronômetro.", expectedResult: "Dez minutos completos e uma nota simples de desconforto antes/depois.", doneWhen: "Os três movimentos foram feitos e a diferença foi registrada." },
  ],
  organizacao: [
    { title: "Preparar arquivos para o próximo bloco", description: "Deixe aberto apenas o material necessário para iniciar.", context: "Ambiente pronto reduz o custo do primeiro passo.", firstStep: "Feche distrações e abra o arquivo principal da tarefa prioritária.", expectedResult: "Workspace limpo, arquivo correto aberto e próxima ação anotada.", doneWhen: "É possível iniciar a tarefa prioritária sem procurar outro recurso." },
    { title: "Resolver duas pendências de cinco minutos", description: "Feche itens pequenos que ocupam atenção e têm resultado claro.", context: "O limite de duas impede que organização substitua a missão principal.", firstStep: "Liste pendências que realmente cabem em cinco minutos e escolha duas.", expectedResult: "Duas pendências encerradas e removidas da lista.", doneWhen: "Os dois resultados foram confirmados e não exigem novo follow-up." },
    { title: "Agendar o próximo bloco de foco", description: "Defina horário, duração e entrega antes da sessão.", context: "Um compromisso específico é mais executável que uma intenção aberta.", firstStep: "Escolha um horário livre real no calendário de hoje.", expectedResult: "Bloco agendado com tarefa e resultado esperado.", doneWhen: "O evento ou lembrete tem horário, duração e nome da entrega." },
  ],
  pessoal: [
    { title: "Fazer uma pausa de dez minutos", description: "Recupere energia com início e fim definidos.", context: "Uma pausa com limite evita virar distração sem fim.", firstStep: "Ative um cronômetro de dez minutos e afaste a tela principal.", expectedResult: "Pausa concluída e retorno à próxima ação no horário.", doneWhen: "O cronômetro terminou e a tarefa seguinte foi reaberta." },
    { title: "Registrar avanço, bloqueio e próximo passo", description: "Feche o dia com três informações objetivas.", context: "Um registro curto preserva continuidade sem inventar interpretações.", firstStep: "Escreva uma frase sobre o que ficou pronto.", expectedResult: "Um registro de três linhas: avanço, bloqueio e próxima ação.", doneWhen: "As três linhas estão preenchidas com fatos do dia." },
    { title: "Enviar uma mensagem para uma pessoa importante", description: "Faça um contato curto e genuíno que estava sendo adiado.", context: "Relações melhoram com ações observáveis, não lembretes vagos.", firstStep: "Escolha uma pessoa e escreva a primeira frase da mensagem.", expectedResult: "Uma mensagem enviada ou uma conversa agendada.", doneWhen: "O contato foi enviado e, se necessário, o próximo horário foi combinado." },
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
  const synthesized = profileMission(profile);
  const commercialIntent = synthesized.intent === "sell_service" || synthesized.intent === "get_clients" || synthesized.intent === "financial_goal";
  const preferredCategories = profile.priorities.length > 0 ? profile.priorities : (["pessoal"] as Category[]);
  const categories = (commercialIntent ? preferredCategories : preferredCategories.filter((category) => category !== "dinheiro"));
  if (!categories.length) categories.push(synthesized.intent === "health" ? "saude" : synthesized.intent === "exam" || synthesized.intent === "learn_skill" ? "estudos" : "desenvolvimento");

  if (activeToday && request.context?.learning && generated.length + carried.length < taskCount) {
    const learning = request.context.learning;
    generated.push({
      id: createId("learning-task"),
      title: sanitizeText(learning.nextLesson, 120),
      description: `Sessão guiada pelo Professor Atlas para avançar em ${sanitizeText(learning.topic, 120)}.`,
      context: `Esta lição pertence ao roadmap ativo de ${sanitizeText(learning.topic, 120)}.`,
      firstStep: `Abra a lição “${sanitizeText(learning.nextLesson, 120)}” e leia a entrega exigida antes de iniciar.`,
      expectedResult: "Uma evidência prática da lição, produzida sem recomeçar pelo básico.",
      doneWhen: "A entrega foi registrada e pode ser avaliada pelo Professor Atlas.",
      category: "estudos",
      priority: "media",
      estimatedMinutes: Math.max(5, Math.min(180, learning.estimatedMinutes)),
      xp: PRIORITY_XP.media,
      recurring: false,
      completed: false,
    });
  }

  if (activeToday && generated.length + carried.length < taskCount) {
    const primaryCategory: Category = commercialIntent
      ? "dinheiro"
      : synthesized.intent === "health"
        ? "saude"
        : synthesized.intent === "exam" || synthesized.intent === "learn_skill"
          ? "estudos"
          : "desenvolvimento";
    const primary = makeActionTask(profile.mainGoal, primaryCategory, profile.skillLevel);
    if (!used.has(taskKey(primary.title))) {
      used.add(taskKey(primary.title));
      generated.push({ id: createId("mission-task"), ...primary });
    }
  }

  for (let index = 0; generated.length + carried.length < taskCount && index < 24; index += 1) {
    const category = categories[(seed + index) % categories.length] ?? "pessoal";
    const templates = CATEGORY_TASKS[category];
    const template = templates[(seed + Math.floor(index / categories.length)) % templates.length];
    if (!template || used.has(taskKey(template.title))) continue;
    used.add(taskKey(template.title));
    const priority = index === 0 ? "alta" : index < 3 ? "media" : "baixa";
    generated.push({
      id: createId("task"),
      ...template,
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
      description: synthesized.description,
      firstStep: synthesized.nextAction,
      expectedResult: synthesized.result,
      doneWhen: "O resultado esperado existe, foi conferido e o próximo passo está registrado.",
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
          (error instanceof NexusApiError && error.code === "unreachable") ||
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
