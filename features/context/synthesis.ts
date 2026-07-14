import type { Category, Profile, SkillLevel, Task } from "@/types";
import { sanitizeText } from "@/utils/text";

export type GoalIntent =
  | "sell_service"
  | "build_product"
  | "get_clients"
  | "financial_goal"
  | "learn_skill"
  | "deepen_skill"
  | "technical_skill"
  | "career"
  | "exam"
  | "health"
  | "general";

const CLIENT_RE = /\b(cliente|clientes|prospect|prospec[cç][aã]o|freela|freelance|contrato|proposta)\b/i;
const SELL_RE = /\b(vender|venda|oferta|monetizar|monetiza[cç][aã]o|neg[oó]cio|servi[cç]o pago)\b/i;
const PRODUCT_RE = /\b(micro[-\s]?saas|saas|mvp|produto|app|aplicativo|software|startup)\b|\b(criar|construir|lan[cç]ar)\b.{0,36}\b(produto|app|saas|software)\b/i;
const MONEY_RE = /\b(dinheiro|grana|receita|faturamento|faturar|renda|lucro|r\$|pago|pagamento|meta financeira)\b/i;
const TECHNICAL_RE = /programa[cç][aã]o|c[oó]digo|desenvolvimento|api\b|banco de dados|debug|testes?\b|arquitetura|intelig[eê]ncia artificial|\bia\b/i;
const LEARNING_RE = /aprend|estud|dominar|habilidade|curso|aprofund|praticar/i;
const CAREER_RE = /emprego|carreira|vaga|portfolio|portf[oó]lio|curr[ií]culo/i;
const EXAM_RE = /prova|enem|concurso|vestibular|certifica/i;
const HEALTH_RE = /sa[uú]de|treino|corpo|emagrec|condicionamento|futebol/i;

function words(input: string): string[] {
  return sanitizeText(input, 800)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function commercialDeliverable(input: string): string {
  if (/landing\s*pages?|\blps?\b/i.test(input)) return "Landing Page";
  if (/automa[cç][aã]o/i.test(input)) return "automação";
  if (/aplicativo|\bapp\b/i.test(input)) return "aplicativo";
  if (/site|web/i.test(input)) return "site";
  return "serviço definido";
}

export function classifyGoalIntent(input: string, level?: SkillLevel): GoalIntent {
  const text = sanitizeText(input, 1200);
  if (EXAM_RE.test(text)) return "exam";
  if (HEALTH_RE.test(text)) return "health";
  if (SELL_RE.test(text)) return "sell_service";
  if (CLIENT_RE.test(text)) return "get_clients";
  if (CAREER_RE.test(text)) return "career";
  if (MONEY_RE.test(text)) return "financial_goal";
  if (PRODUCT_RE.test(text)) return "build_product";
  if (TECHNICAL_RE.test(text) && level === "avancado") return "deepen_skill";
  if (TECHNICAL_RE.test(text)) return "technical_skill";
  if (LEARNING_RE.test(text) && level === "avancado") return "deepen_skill";
  if (LEARNING_RE.test(text)) return "learn_skill";
  return "general";
}

export function synthesizeMission(input: string, options: { level?: SkillLevel; maxTitle?: number } = {}): { title: string; description: string; nextAction: string; result: string; intent: GoalIntent } {
  const clean = sanitizeText(input, 600);
  const intent = classifyGoalIntent(clean, options.level);
  const titleMax = options.maxTitle ?? 64;
  const deliverable = commercialDeliverable(clean);
  const title = (() => {
    if (intent === "sell_service" || intent === "get_clients") return "Fechar o primeiro projeto pago";
    if (intent === "financial_goal") return "Criar uma oferta vendável";
    if (intent === "build_product") return "Validar um produto simples";
    if (intent === "deepen_skill") return "Refinar uma habilidade avançada";
    if (intent === "technical_skill") return "Construir uma base técnica aplicável";
    if (intent === "learn_skill") return "Aprender com uma entrega prática";
    if (intent === "career") return "Construir prova profissional";
    if (intent === "exam") return "Treinar para a próxima prova";
    if (intent === "health") return "Executar o treino de hoje";
    const key = words(clean).slice(0, 5).join(" ");
    return key ? `Avançar em ${key}` : "Avançar a missão principal";
  })();
  const description = (() => {
    if (intent === "sell_service" || intent === "get_clients") return "Transformar uma habilidade existente em oferta clara, abordar prospects compatíveis e registrar o próximo follow-up.";
    if (intent === "build_product") return "Escolher um problema específico, criar uma versão mínima e validar interesse com alguém real.";
    if (intent === "financial_goal") return "Conectar a meta financeira a uma oferta, um público e uma ação comercial mensurável.";
    if (intent === "deepen_skill") return "Usar uma entrega real para encontrar gargalos e melhorar com evidência, sem recomeçar pelo básico.";
    if (intent === "technical_skill") return "Aprender os fundamentos necessários e aplicá-los em uma pequena entrega que possa ser executada e testada.";
    return clean.length > 140 ? `${clean.slice(0, 137).trim()}...` : clean || "Definir uma entrega observável para hoje.";
  })();
  const nextAction = (() => {
    if (intent === "sell_service" || intent === "get_clients") return `Escolher um projeto de ${deliverable} e definir público, problema e escopo inicial.`;
    if (intent === "build_product") return "Definir um usuário específico e a menor promessa testável do MVP.";
    if (intent === "financial_goal") return "Escolher uma ação de receita que gere conversa, proposta ou venda hoje.";
    if (intent === "technical_skill" || intent === "deepen_skill") return "Escolher uma função pequena, implementá-la e testar o comportamento esperado.";
    if (intent === "exam") return "Resolver uma questão sem consulta e corrigir o raciocínio com o gabarito.";
    if (intent === "health") return "Preparar o ambiente e iniciar os primeiros cinco minutos do treino planejado.";
    return "Escolher uma entrega pequena e concluir em um bloco de foco.";
  })();
  const result = (() => {
    if (intent === "sell_service" || intent === "get_clients") return "Uma oferta pronta para enviar a cinco prospects e um follow-up registrado.";
    if (intent === "build_product") return "Um protótipo ou tela demonstrável com hipótese de validação.";
    if (intent === "financial_goal") return "Uma ação comercial concluída com evidência registrada.";
    if (intent === "technical_skill" || intent === "deepen_skill") return "Uma implementação pequena funcionando com pelo menos um teste ou verificação registrada.";
    if (intent === "exam") return "Uma questão resolvida, corrigida e acompanhada da regra que faltava.";
    if (intent === "health") return "O treino concluído ou adaptado com duração e resultado registrados.";
    return "Uma entrega observável concluída ou uma lacuna real identificada.";
  })();
  return {
    title: sanitizeText(title, titleMax),
    description: sanitizeText(description, 260),
    nextAction: sanitizeText(nextAction, 180),
    result: sanitizeText(result, 180),
    intent,
  };
}

export function makeActionTask(input: string, category: Category, level?: SkillLevel): Pick<Task, "title" | "description" | "context" | "firstStep" | "expectedResult" | "doneWhen" | "category" | "priority" | "estimatedMinutes" | "xp" | "recurring" | "completed"> {
  const synthesized = synthesizeMission(input, { level });
  const title = synthesized.intent === "sell_service" || synthesized.intent === "get_clients"
    ? `Enviar uma proposta de ${commercialDeliverable(input)}`
    : synthesized.intent === "technical_skill" || synthesized.intent === "deepen_skill"
      ? "Implementar e testar uma função pequena"
      : synthesized.intent === "exam"
        ? "Resolver e corrigir uma questão"
        : synthesized.intent === "health"
          ? "Concluir o treino planejado"
          : synthesized.nextAction;
  return {
    title: sanitizeText(title, 90),
    description: sanitizeText(synthesized.description, 300),
    context: sanitizeText(`Esta ação contribui para: ${synthesized.title}.`, 300),
    firstStep: sanitizeText(synthesized.nextAction, 240),
    expectedResult: sanitizeText(synthesized.result, 300),
    doneWhen: sanitizeText(`O resultado esperado existe, foi conferido e está registrado.`, 300),
    category,
    priority: "alta",
    estimatedMinutes: 30,
    xp: 50,
    recurring: false,
    completed: false,
  };
}

export function profileMission(profile: Profile): ReturnType<typeof synthesizeMission> {
  return synthesizeMission(profile.mainGoal, { level: profile.skillLevel });
}
