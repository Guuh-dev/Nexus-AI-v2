import type {
  AppData,
  EvolutionArea,
  LearningState,
  LearningRoadmap,
  ProfessorIntake,
  Profile,
  RoadmapIntent,
  RoadmapLesson,
  RoadmapPhase,
} from "@/types";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";
import { classifyGoalIntent } from "@/features/context/synthesis";

export const EVOLUTION_AREA_LABELS: Record<EvolutionArea, string> = {
  programacao: "Programação",
  inteligencia_artificial: "Inteligência artificial",
  escola: "Escola e provas",
  carreira: "Carreira",
  freelance: "Freelance",
  dinheiro: "Dinheiro",
  empreendedorismo: "Empreendedorismo",
  comunicacao: "Comunicação",
  ingles: "Inglês",
  criatividade: "Criatividade",
  produtividade: "Produtividade",
  disciplina: "Disciplina",
  organizacao: "Organização",
  saude_mental: "Saúde mental",
  saude_fisica: "Saúde física",
  futebol: "Futebol",
  relacionamentos: "Relacionamentos",
  autoconhecimento: "Autoconhecimento",
};

const GENERIC_PHASES = [
  {
    title: "Fundação sem lacunas",
    objective:
      "Entender o essencial e descobrir exatamente onde estão as lacunas.",
    lessons: [
      { title: "Diagnóstico prático", kind: "diagnostic" },
      { title: "Mapa dos fundamentos", kind: "fundamentals" },
      { title: "Primeira aplicação guiada", kind: "guided" },
    ],
  },
  {
    title: "Prática deliberada",
    objective:
      "Treinar as habilidades centrais com feedback e dificuldade progressiva.",
    lessons: [
      { title: "Exercício de precisão", kind: "precision" },
      { title: "Projeto curto", kind: "project" },
      { title: "Revisão dos erros", kind: "review" },
    ],
  },
  {
    title: "Execução no mundo real",
    objective: "Transformar conhecimento em resultado demonstrável.",
    lessons: [
      { title: "Desafio aplicado", kind: "challenge" },
      { title: "Entrega de portfólio", kind: "portfolio" },
      { title: "Explicação sem consulta", kind: "explain" },
    ],
  },
  {
    title: "Domínio e autonomia",
    objective:
      "Resolver situações novas, ensinar o assunto e manter evolução contínua.",
    lessons: [
      { title: "Problema avançado", kind: "advanced" },
      { title: "Ensinar para o Professor", kind: "teach" },
      { title: "Plano de próximos 30 dias", kind: "plan" },
    ],
  },
] as const;

const TECHNICAL_TOPIC_RE = /programa[cç][aã]o|c[oó]digo|desenvolvimento|javascript|typescript|python|java\b|kotlin|react|api\b|banco de dados|software/i;
const AI_TOPIC_RE = /intelig[eê]ncia artificial|programa[cç][aã]o com ia|c[oó]digo com ia|\bia\b|llm|prompt/i;
const COMMERCIAL_CONTENT_RE = /prospec[cç][aã]o|prospects?|oferta vend[aá]vel|fechar (?:o )?(?:primeiro )?cliente|pre[cç]o inicial|follow[- ]?up|venda de|vender como servi[cç]o|freelance/i;

export function classifyRoadmapIntent(topicInput: string, intake?: ProfessorIntake): RoadmapIntent {
  const topic = sanitizeText(topicInput, 160);
  const explicitContext = sanitizeText([
    topic,
    intake?.desiredOutcome,
    intake?.proofProject,
    intake?.motivation,
  ].filter(Boolean).join(" "), 2200);
  const level = intake?.knowledgeLevel === "avancado" ? "avancado" : undefined;
  const goalIntent = classifyGoalIntent(explicitContext, level);

  if (goalIntent === "sell_service") return "commercial";
  if (goalIntent === "get_clients") return "clients";
  if (goalIntent === "financial_goal") return "financial";
  if (goalIntent === "career") return "career";
  if (goalIntent === "exam") return "exam";
  if (goalIntent === "health") return "health";
  if (goalIntent === "build_product") return "product";
  if (AI_TOPIC_RE.test(topic)) return "applied_technical";
  if (TECHNICAL_TOPIC_RE.test(topic)) return "technical";
  if (goalIntent === "learn_skill" || goalIntent === "deepen_skill" || goalIntent === "technical_skill") return "learning";
  return "general";
}

type CurriculumLesson = {
  title: string;
  objective: string;
  kind: string;
};

type CurriculumPhase = {
  title: string;
  objective: string;
  lessons: CurriculumLesson[];
};

const PROGRAMMING_CURRICULUM: CurriculumPhase[] = [
  {
    title: "Lógica e fundamentos",
    objective: "Raciocinar sobre problemas e dominar a base da linguagem sem depender de copiar soluções.",
    lessons: [
      { title: "Lógica e decomposição", objective: "Quebrar um problema em entradas, regras e saídas antes de escrever código.", kind: "diagnostic" },
      { title: "Fundamentos da linguagem", objective: "Aplicar tipos, condições, repetições e funções em um exercício executável.", kind: "fundamentals" },
      { title: "Leitura e execução de código", objective: "Explicar o fluxo de um programa pequeno e prever seu resultado antes de executá-lo.", kind: "explain" },
    ],
  },
  {
    title: "Projeto, APIs e dados",
    objective: "Conectar fundamentos em uma aplicação pequena que recebe, processa e persiste dados.",
    lessons: [
      { title: "Projeto funcional pequeno", objective: "Construir uma função principal do início ao fim com escopo controlado.", kind: "project" },
      { title: "Integração com APIs", objective: "Consumir ou criar uma API, tratar erros e validar a resposta.", kind: "challenge" },
      { title: "Banco de dados", objective: "Modelar e persistir os dados essenciais do projeto com consultas verificáveis.", kind: "guided" },
    ],
  },
  {
    title: "Qualidade e arquitetura",
    objective: "Tornar o projeto compreensível, testável e resistente a erros reais.",
    lessons: [
      { title: "Debugging sistemático", objective: "Reproduzir um erro, localizar sua causa e comprovar a correção.", kind: "review" },
      { title: "Testes automatizados", objective: "Cobrir o comportamento principal e pelo menos um caso de falha.", kind: "precision" },
      { title: "Arquitetura e limites", objective: "Separar responsabilidades e justificar dependências importantes do projeto.", kind: "advanced" },
    ],
  },
  {
    title: "Entrega e autonomia",
    objective: "Publicar uma versão segura, documentada e reproduzível do projeto.",
    lessons: [
      { title: "Segurança básica", objective: "Revisar entradas, segredos, permissões e dependências antes da entrega.", kind: "review" },
      { title: "Deploy reproduzível", objective: "Publicar o projeto e registrar os passos necessários para repetir o deploy.", kind: "portfolio" },
      { title: "Documentação e próxima evolução", objective: "Explicar como usar, testar e evoluir a entrega sem ampliar o escopo atual.", kind: "plan" },
    ],
  },
];

const AI_PROGRAMMING_CURRICULUM: CurriculumPhase[] = [
  {
    title: "Base para programar com IA",
    objective: "Dominar fundamentos suficientes para avaliar o que a IA produz em vez de aceitar código por aparência.",
    lessons: [
      { title: "Fundamentos suficientes", objective: "Reconhecer fluxo, dados, funções e dependências usados no projeto real.", kind: "fundamentals" },
      { title: "Leitura de código gerado", objective: "Explicar entrada, processamento, saída e riscos de um trecho gerado por IA.", kind: "explain" },
      { title: "Prompting técnico", objective: "Pedir uma alteração com contexto, restrições, contrato e critério de aceite.", kind: "precision" },
    ],
  },
  {
    title: "Arquitetura e projeto real",
    objective: "Usar IA dentro de limites arquiteturais claros e manter decisões sob controle humano.",
    lessons: [
      { title: "Arquitetura antes do prompt", objective: "Definir componentes, contratos e fronteiras antes de solicitar implementação.", kind: "advanced" },
      { title: "Implementação incremental", objective: "Construir uma função por vez e verificar cada mudança no projeto.", kind: "guided" },
      { title: "Projeto aplicado com IA", objective: "Entregar uma pequena funcionalidade cuja lógica você consegue explicar e modificar.", kind: "project" },
    ],
  },
  {
    title: "Validação, testes e debugging",
    objective: "Tratar toda saída gerada como hipótese até haver evidência executável.",
    lessons: [
      { title: "Validação de saídas", objective: "Comparar a implementação com requisitos e casos observáveis.", kind: "diagnostic" },
      { title: "Testes contra alucinações", objective: "Criar testes para comportamento esperado, bordas e falhas prováveis.", kind: "precision" },
      { title: "Debugging assistido", objective: "Usar logs e reprodução mínima para corrigir a causa, não apenas o sintoma sugerido.", kind: "review" },
    ],
  },
  {
    title: "Segurança e entrega",
    objective: "Revisar riscos, publicar e documentar um projeto que continue compreensível sem a conversa com a IA.",
    lessons: [
      { title: "Segurança e segredos", objective: "Auditar dados sensíveis, permissões, dependências e instruções não confiáveis.", kind: "advanced" },
      { title: "Deploy verificado", objective: "Publicar a versão testada e executar uma verificação pós-deploy.", kind: "portfolio" },
      { title: "Explicação sem a IA", objective: "Documentar arquitetura, decisões e limites com suas próprias palavras.", kind: "teach" },
    ],
  },
];

function localLessonGuidance(
  kind: string,
  topic: string,
  minutes: number,
  intake?: ProfessorIntake,
) {
  const proof = sanitizeText(intake?.proofProject, 360);
  const known = sanitizeText(intake?.knownConcepts, 280);
  const base = {
    diagnostic: {
      objective: `Descobrir o seu nível real em ${topic} com uma tentativa prática, não por sensação.`,
      steps: [
        `Liste de memória o que você já sabe sobre ${topic}.`,
        `Faça uma tarefa curta de ${Math.min(minutes, 25)} minutos sem copiar uma solução.`,
        "Classifique cada parte em: sozinho, com ajuda ou ainda não consigo.",
        "Escolha a maior lacuna como prioridade da próxima lição.",
      ],
      deliverable: `Uma lista de forças, lacunas e uma evidência prática em ${topic}.`,
      successCriteria:
        "Você consegue dizer exatamente o que sabe fazer sozinho e o que precisa aprender depois.",
    },
    fundamentals: {
      objective: `Organizar os fundamentos essenciais de ${topic} em uma ordem útil para praticar.`,
      steps: [
        "Separe o tema em 5 a 8 fundamentos.",
        `Marque quais você já conhece: ${known || "nenhum fundamento registrado"}.`,
        "Ligue cada fundamento ao que precisa vir antes.",
        "Escolha os dois fundamentos que mais destravam prática real.",
      ],
      deliverable:
        "Um mapa simples com fundamentos, dependências e duas prioridades.",
      successCriteria:
        "Você consegue explicar a ordem de aprendizado sem usar a frase vaga “estudar mais”.",
    },
    guided: {
      objective: `Transformar um fundamento de ${topic} em uma primeira entrega funcional.`,
      steps: [
        "Escolha apenas um fundamento do mapa anterior.",
        "Defina uma entrega que caiba nesta sessão.",
        "Construa a versão mínima até funcionar.",
        "Teste, registre um erro e faça uma correção.",
      ],
      deliverable: `Uma primeira aplicação pequena e demonstrável de ${topic}.`,
      successCriteria:
        "Existe algo funcionando que você consegue mostrar e explicar em menos de dois minutos.",
    },
    precision: {
      objective: `Treinar uma habilidade específica de ${topic} com repetição e comparação.`,
      steps: [
        "Escolha uma habilidade mensurável.",
        "Faça de 3 a 5 tentativas curtas.",
        "Identifique o erro que mais se repete.",
        "Refaça uma última vez corrigindo apenas esse erro.",
      ],
      deliverable:
        "As tentativas registradas e uma frase sobre o erro corrigido.",
      successCriteria:
        "A última tentativa é objetivamente melhor que a primeira.",
    },
    project: {
      objective: `Consolidar ${topic} em um projeto pequeno que possa ser concluído.`,
      steps: [
        "Defina uma única função principal.",
        "Divida em entrada, processamento e resultado.",
        "Construa a versão mínima até funcionar.",
        "Registre uma melhoria para depois sem aumentar o escopo agora.",
      ],
      deliverable:
        proof ||
        `Um projeto curto, funcional e demonstrável ligado a ${topic}.`,
      successCriteria:
        "A função principal funciona do início ao fim e pode ser demonstrada sem ajustes na hora.",
    },
    review: {
      objective:
        "Converter erros recentes em regras práticas para não repeti-los.",
      steps: [
        "Escolha os três erros mais importantes.",
        "Anote causa provável e sinal de alerta de cada um.",
        "Corrija um exemplo real de cada erro.",
        "Crie uma checklist curta para a próxima sessão.",
      ],
      deliverable: "Uma checklist com três erros, causas e correções.",
      successCriteria:
        "Você consegue detectar os erros antes de finalizar uma nova tarefa.",
    },
    challenge: {
      objective: `Usar ${topic} para resolver um problema que não seja uma cópia direta de tutorial.`,
      steps: [
        "Escolha um problema real ou uma variação nova.",
        "Defina o resultado esperado antes de começar.",
        "Resolva sem consultar uma solução completa.",
        "Compare o resultado com o esperado e registre a diferença.",
      ],
      deliverable: `Uma solução aplicada de ${topic} com uma breve explicação das decisões.`,
      successCriteria:
        "A solução atende ao resultado definido e você consegue justificar as escolhas principais.",
    },
    portfolio: {
      objective: `Transformar sua prática em uma prova apresentável de domínio em ${topic}.`,
      steps: [
        "Escolha a melhor entrega construída até agora.",
        "Melhore apresentação, instruções e exemplo de uso.",
        "Escreva problema, solução e o que aprendeu.",
        "Prepare um link ou arquivo que outra pessoa consiga abrir.",
      ],
      deliverable:
        proof || `Uma peça de portfólio acessível e explicada sobre ${topic}.`,
      successCriteria:
        "Outra pessoa consegue entender o problema, testar a entrega e perceber sua contribuição.",
    },
    explain: {
      objective: `Provar compreensão de ${topic} explicando sem copiar definições.`,
      steps: [
        "Escolha um conceito central.",
        "Explique em linguagem simples sem consultar material.",
        "Dê um exemplo correto e um contraexemplo.",
        "Confira depois e corrija imprecisões.",
      ],
      deliverable:
        "Uma explicação curta em texto ou áudio com exemplo e correção final.",
      successCriteria:
        "A explicação é correta e permite que alguém iniciante reproduza o raciocínio.",
    },
    advanced: {
      objective: `Resolver uma situação nova em ${topic} combinando vários fundamentos sem roteiro pronto.`,
      steps: [
        "Defina o problema e as restrições.",
        "Quebre em partes e escolha uma estratégia.",
        "Resolva por etapas, testando cada parte.",
        "Revise e registre o que mudaria numa segunda tentativa.",
      ],
      deliverable:
        "A solução completa, os testes e uma análise curta das decisões.",
      successCriteria:
        "A solução funciona sob as restrições e você consegue defender a estratégia.",
    },
    teach: {
      objective: `Consolidar ${topic} ensinando de forma simples, precisa e prática.`,
      steps: [
        "Escolha um conceito que já praticou.",
        "Explique como se estivesse ensinando a um iniciante.",
        "Inclua um exemplo e um erro comum.",
        "Responda a uma pergunta de verificação sem consultar material.",
      ],
      deliverable:
        "Uma mini aula com explicação, exemplo e pergunta de verificação.",
      successCriteria:
        "A explicação permanece correta mesmo quando você muda o exemplo.",
    },
    plan: {
      objective: `Transformar o progresso em ${topic} em um plano sustentável para o próximo mês.`,
      steps: [
        "Escolha um resultado mensurável para 30 dias.",
        "Divida em quatro marcos semanais.",
        "Defina sessões, entregas e uma revisão semanal.",
        "Liste riscos previsíveis e uma resposta para cada um.",
      ],
      deliverable:
        "Um plano de 30 dias com quatro marcos e entregas verificáveis.",
      successCriteria:
        "Cada semana termina com uma entrega, não apenas horas estudadas.",
    },
  } as const;
  return base[kind as keyof typeof base] ?? base.guided;
}

function curriculumPhases(
  curriculum: CurriculumPhase[],
  topic: string,
  lessonMinutes: number,
  intake?: ProfessorIntake,
): RoadmapPhase[] {
  return curriculum.map((phase, phaseIndex) => ({
    id: createId(`phase-${phaseIndex + 1}`),
    title: phase.title,
    objective: phase.objective,
    order: phaseIndex,
    lessons: phase.lessons.map((lesson) => {
      const guidance = localLessonGuidance(lesson.kind, topic, lessonMinutes, intake);
      const deliverable = lesson.kind === "project" && sanitizeText(intake?.proofProject, 400)
        ? sanitizeText(intake?.proofProject, 400)
        : guidance.deliverable;
      return {
        id: createId("lesson"),
        title: lesson.title,
        description: sanitizeText(`${lesson.objective} Entrega: ${deliverable}`, 700),
        objective: lesson.objective,
        steps: [...guidance.steps],
        deliverable,
        successCriteria: guidance.successCriteria,
        estimatedMinutes: lessonMinutes,
        completed: false,
      };
    }),
  }));
}

function technicalCurriculum(intent: RoadmapIntent, advanced: boolean): CurriculumPhase[] {
  const base = intent === "applied_technical" ? AI_PROGRAMMING_CURRICULUM : PROGRAMMING_CURRICULUM;
  if (!advanced) return base;
  // Um aluno avançado começa por arquitetura, qualidade e lacunas observadas;
  // fundamentos só reaparecem se uma evidência real demonstrar necessidade.
  return [base[2], base[1], base[3]].filter((phase): phase is CurriculumPhase => Boolean(phase));
}

export function validateRoadmapSemantics(
  roadmap: LearningRoadmap,
  expectedIntent: RoadmapIntent = roadmap.intent ?? classifyRoadmapIntent(roadmap.topic, roadmap.intake),
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const commercialAllowed = expectedIntent === "commercial" || expectedIntent === "clients" || expectedIntent === "financial";
  const searchable = roadmap.phases.flatMap((phase) => [
    phase.title,
    phase.objective,
    ...phase.lessons.flatMap((lesson) => [lesson.title, lesson.description, lesson.objective ?? "", lesson.deliverable ?? ""]),
  ]).join(" ");
  if (!commercialAllowed && COMMERCIAL_CONTENT_RE.test(searchable)) {
    issues.push("O roadmap introduz venda, prospecção ou clientes sem intenção comercial explícita.");
  }
  if ((expectedIntent === "technical" || expectedIntent === "applied_technical") && roadmap.phases.length < 3) {
    issues.push("O roadmap técnico precisa cobrir construção, qualidade e entrega.");
  }
  if (!roadmap.phases.every((phase) => phase.lessons.length > 0)) {
    issues.push("Toda fase precisa conter pelo menos uma lição executável.");
  }
  return { valid: issues.length === 0, issues };
}

function commercialAdvancedPhases(topic: string, lessonMinutes: number, intake?: ProfessorIntake): RoadmapPhase[] {
  const now = new Date().toISOString();
  void now;
  const proof = sanitizeText(intake?.proofProject, 260) || "uma entrega real para vender";
  const outcome = sanitizeText(intake?.desiredOutcome, 260) || "fechar o primeiro projeto pago";
  const phaseData = [
    {
      title: "Oferta vendável e posicionamento",
      objective: `Transformar ${topic} em uma oferta comprável ligada a ${outcome}.`,
      lessons: [
        ["Escolher oferta de entrada", "Definir um serviço específico com escopo, prazo e preço inicial.", ["Escolha um nicho acessível hoje.", "Liste uma dor que custa tempo ou dinheiro para esse nicho.", "Defina uma oferta de LP/app/automação com início, fim e preço inicial.", "Escreva uma promessa que não dependa de hype de IA."], "Oferta com nicho, dor, escopo, prazo e preço inicial.", "Você consegue enviar a oferta sem explicar sua vida inteira."],
        ["Prova rápida de portfólio", `Usar ${proof} como evidência comercial, não como estudo genérico.`, ["Escolha uma entrega já feita ou faça uma versão demonstrável.", "Escreva problema, solução, antes/depois e resultado esperado.", "Prepare um print, link ou vídeo curto.", "Anote a objeção que essa prova ainda não responde."], "Uma prova de portfólio pronta para ser enviada a prospects.", "Um prospect entende o valor em menos de 30 segundos."],
        ["Mensagem de abordagem", "Criar uma abordagem curta baseada em problema real observado.", ["Selecione 5 prospects compatíveis com a oferta.", "Para cada um, observe um problema específico.", "Escreva uma mensagem com contexto, problema, proposta e CTA simples.", "Defina quando fará follow-up."], "5 mensagens personalizadas e datas de follow-up.", "Cada mensagem parece escrita para aquele prospect, não para todo mundo."],
      ],
    },
    {
      title: "Aquisição e fechamento",
      objective: "Sair da preparação e gerar conversas comerciais mensuráveis.",
      lessons: [
        ["Primeiro lote de prospects", "Enviar abordagens reais e medir resposta.", ["Envie as 5 mensagens preparadas.", "Registre canal, data e resposta.", "Classifique objeções por preço, confiança, timing ou clareza.", "Escolha uma melhoria para o próximo lote."], "5 abordagens enviadas e registradas.", "Existe evidência enviada, não apenas intenção."],
        ["Follow-up sem improviso", "Transformar silêncio ou objeção em próxima conversa.", ["Revise quem não respondeu.", "Envie follow-up com uma observação útil.", "Para objeções, responda com prova ou redução de escopo.", "Marque o próximo contato."], "Follow-ups enviados e próximos passos registrados.", "Nenhum prospect fica sem próximo estado claro."],
        ["Fechamento simples", "Converter uma conversa em proposta objetiva.", ["Resuma problema, entrega, prazo e preço.", "Defina o que está fora do escopo.", "Peça confirmação explícita do próximo passo.", "Registre aprendizado se não fechar."], "Uma proposta simples enviada ou revisada.", "A proposta deixa claro o que será entregue e como começa."],
      ],
    },
    {
      title: "Entrega, depoimento e escala",
      objective: "Usar entregas reais para melhorar técnica e aumentar confiança comercial.",
      lessons: [
        ["Entrega controlada", "Executar o projeto sem aumentar escopo no meio.", ["Quebre a entrega em marco 1, revisão e finalização.", "Mostre progresso cedo ao cliente/prospect.", "Registre dúvidas e decisões.", "Feche com checklist de aceite."], "Entrega com checklist e evidência final.", "O cliente ou avaliador consegue validar o resultado."],
        ["Depoimento e case", "Transformar a entrega em ativo de venda.", ["Peça feedback específico.", "Escreva o case com problema, solução e resultado.", "Adicione prints ou link.", "Atualize a abordagem com essa prova."], "Mini-case pronto para portfólio e prospecção.", "A próxima venda usa uma prova melhor que a anterior."],
        ["Sistema de repetição", "Criar rotina semanal de oferta, entrega e follow-up.", ["Defina meta de prospects por semana.", "Crie um quadro simples de status.", "Liste melhorias técnicas que surgiram de projetos reais.", "Escolha a próxima oferta a testar."], "Sistema semanal de aquisição e melhoria técnica.", "Você sabe exatamente quem abordar, o que vender e o que melhorar."],
      ],
    },
  ];
  return phaseData.map((phase, phaseIndex) => ({
    id: createId(`phase-${phaseIndex + 1}`),
    title: phase.title,
    objective: phase.objective,
    order: phaseIndex,
    lessons: phase.lessons.map(([title, objective, steps, deliverable, successCriteria]) => ({
      id: createId("lesson"),
      title: sanitizeText(String(title), 160),
      description: sanitizeText(`${objective} Entrega: ${deliverable}`, 700),
      objective: String(objective),
      steps: steps as string[],
      deliverable: String(deliverable),
      successCriteria: String(successCriteria),
      estimatedMinutes: lessonMinutes,
      completed: false,
    })),
  }));
}

export function createStarterRoadmap(
  topicInput: string,
  profile: Profile,
  intake?: ProfessorIntake,
): LearningRoadmap {
  const topic = sanitizeText(topicInput, 160) || "Minha habilidade prioritária";
  const evolution = profile.evolution;
  const lessonMinutes =
    intake?.sessionMinutes ?? evolution?.sessionLength ?? 25;
  const now = new Date().toISOString();
  // A meta global do perfil não participa desta classificação. Somente o
  // pedido do roadmap e o diagnóstico específico podem ativar conteúdo comercial.
  const intent = classifyRoadmapIntent(topic, intake);
  const advanced = (intake?.knowledgeLevel ?? profile.skillLevel) === "avancado";
  const commercial = intent === "commercial" || intent === "clients" || intent === "financial";
  const technical = intent === "technical" || intent === "applied_technical" || (intent === "product" && (TECHNICAL_TOPIC_RE.test(topic) || AI_TOPIC_RE.test(topic)));
  const phases: RoadmapPhase[] = commercial
    ? commercialAdvancedPhases(topic, lessonMinutes, intake)
    : technical
      ? curriculumPhases(technicalCurriculum(AI_TOPIC_RE.test(topic) ? "applied_technical" : "technical", advanced), topic, lessonMinutes, intake)
      : GENERIC_PHASES.map((phase, phaseIndex) => ({
    id: createId(`phase-${phaseIndex + 1}`),
    title: phase.title,
    objective: `${phase.objective} Tema: ${topic}.`,
    order: phaseIndex,
    lessons: phase.lessons.map((lesson) => {
      const guidance = localLessonGuidance(
        lesson.kind,
        topic,
        lessonMinutes,
        intake,
      );
      return {
        id: createId("lesson"),
        title: lesson.title,
        description: sanitizeText(
          `${guidance.objective} Entrega: ${guidance.deliverable}`,
          700,
        ),
        objective: guidance.objective,
        steps: [...guidance.steps],
        deliverable: guidance.deliverable,
        successCriteria: guidance.successCriteria,
        estimatedMinutes: lessonMinutes,
        completed: false,
      };
    }),
  }));
  return {
    id: createId("roadmap"),
    topic,
    outcome:
      sanitizeText(
        intake?.desiredOutcome ?? evolution?.professorOutcome,
        600,
      ) || `Construir domínio prático e comprovável em ${topic}.`,
    currentLevel:
      intake?.knowledgeLevel === "zero" || intake?.knowledgeLevel === "basico"
        ? "iniciante"
        : (intake?.knowledgeLevel ?? profile.skillLevel),
    weeklyMinutes:
      intake?.weeklyMinutes ?? evolution?.weeklyLearningMinutes ?? 180,
    ...(intake ? { intake } : {}),
    intent,
    phases,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function roadmapProgress(roadmap: LearningRoadmap): {
  completed: number;
  total: number;
  percentage: number;
} {
  const lessons = roadmap.phases.flatMap((phase) => phase.lessons);
  const completed = lessons.filter((lesson) => lesson.completed).length;
  return {
    completed,
    total: lessons.length,
    percentage: lessons.length
      ? Math.round((completed / lessons.length) * 100)
      : 0,
  };
}

export function nextRoadmapLesson(roadmap: LearningRoadmap) {
  return roadmap.phases
    .flatMap((phase) => phase.lessons)
    .find((lesson) => !lesson.completed);
}

function fallbackActiveRoadmapId(roadmaps: LearningRoadmap[]): string | undefined {
  return roadmaps.find((roadmap) => roadmap.status === "active")?.id
    ?? roadmaps.find((roadmap) => roadmap.status === "paused")?.id;
}

export function removeRoadmap(learning: LearningState, roadmapId: string): LearningState {
  if (!learning.roadmaps.some((roadmap) => roadmap.id === roadmapId)) return learning;
  const roadmaps = learning.roadmaps.filter((roadmap) => roadmap.id !== roadmapId);
  const activeRoadmapId = learning.activeRoadmapId === roadmapId
    ? fallbackActiveRoadmapId(roadmaps)
    : learning.activeRoadmapId && roadmaps.some((roadmap) => roadmap.id === learning.activeRoadmapId)
      ? learning.activeRoadmapId
      : fallbackActiveRoadmapId(roadmaps);
  return { ...learning, roadmaps, ...(activeRoadmapId ? { activeRoadmapId } : { activeRoadmapId: undefined }) };
}

export function archiveRoadmap(learning: LearningState, roadmapId: string, now = new Date().toISOString()): LearningState {
  if (!learning.roadmaps.some((roadmap) => roadmap.id === roadmapId)) return learning;
  const roadmaps = learning.roadmaps.map((roadmap) => roadmap.id === roadmapId
    ? { ...roadmap, status: "archived" as const, archivedAt: now, updatedAt: now }
    : roadmap);
  const activeRoadmapId = learning.activeRoadmapId === roadmapId
    ? fallbackActiveRoadmapId(roadmaps)
    : learning.activeRoadmapId;
  return { ...learning, roadmaps, ...(activeRoadmapId ? { activeRoadmapId } : { activeRoadmapId: undefined }) };
}

export function activateRoadmap(learning: LearningState, roadmapId: string, now = new Date().toISOString()): LearningState {
  if (!learning.roadmaps.some((roadmap) => roadmap.id === roadmapId)) return learning;
  return {
    ...learning,
    activeRoadmapId: roadmapId,
    roadmaps: learning.roadmaps.map((roadmap) => roadmap.id === roadmapId
      ? { ...roadmap, status: "active" as const, archivedAt: undefined, updatedAt: now }
      : roadmap),
  };
}

export function renameRoadmap(learning: LearningState, roadmapId: string, title: string, now = new Date().toISOString()): LearningState {
  const topic = sanitizeText(title, 160);
  if (topic.length < 2) return learning;
  return {
    ...learning,
    roadmaps: learning.roadmaps.map((roadmap) => roadmap.id === roadmapId
      ? { ...roadmap, topic, updatedAt: now }
      : roadmap),
  };
}

function lessonEvidenceIdentity(lesson: RoadmapLesson): string {
  const normalize = (value: string | undefined) => (value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
  return JSON.stringify([
    normalize(lesson.title),
    normalize(lesson.description),
    normalize(lesson.objective),
    ...(lesson.steps ?? []).map(normalize),
    normalize(lesson.deliverable),
    normalize(lesson.successCriteria),
  ]);
}

function preserveMatchingRoadmapEvidence(
  previous: LearningRoadmap,
  generated: LearningRoadmap,
): RoadmapPhase[] {
  const previousByIdentity = new Map<string, RoadmapLesson[]>();
  for (const lesson of previous.phases.flatMap((phase) => phase.lessons)) {
    const identity = lessonEvidenceIdentity(lesson);
    previousByIdentity.set(identity, [
      ...(previousByIdentity.get(identity) ?? []),
      lesson,
    ]);
  }

  const generatedIdentityCounts = new Map<string, number>();
  for (const lesson of generated.phases.flatMap((phase) => phase.lessons)) {
    const identity = lessonEvidenceIdentity(lesson);
    generatedIdentityCounts.set(
      identity,
      (generatedIdentityCounts.get(identity) ?? 0) + 1,
    );
  }

  return generated.phases.map((phase) => ({
    ...phase,
    lessons: phase.lessons.map((lesson) => {
      const identity = lessonEvidenceIdentity(lesson);
      const candidates = previousByIdentity.get(identity) ?? [];
      const previousLesson = candidates.length === 1 && generatedIdentityCounts.get(identity) === 1
        ? candidates[0]
        : undefined;
      const previousEvidence = previousLesson?.evidence;
      const evidenceIsCoherent = previousEvidence
        ? previousLesson.completed === (previousEvidence.status === "accepted")
        : false;
      const evidence = evidenceIsCoherent ? previousEvidence : undefined;
      const completed = evidence?.status === "accepted";
      return {
        ...lesson,
        completed,
        completedAt: completed ? previousLesson?.completedAt : undefined,
        evidence: evidence ? { ...evidence } : undefined,
      };
    }),
  }));
}

export function replaceRoadmap(
  learning: LearningState,
  roadmapId: string,
  generated: LearningRoadmap,
  now = new Date().toISOString(),
): LearningState {
  const previous = learning.roadmaps.find((roadmap) => roadmap.id === roadmapId);
  if (!previous) return learning;
  const phases = preserveMatchingRoadmapEvidence(previous, generated);
  const lessons = phases.flatMap((phase) => phase.lessons);
  const allDone = lessons.length > 0 && lessons.every((lesson) => lesson.completed);
  const status = previous.status === "archived"
    ? "archived"
    : allDone
      ? "completed"
      : previous.status === "paused"
        ? "paused"
        : "active";
  const replacement: LearningRoadmap = {
    ...generated,
    id: previous.id,
    topic: previous.topic,
    phases,
    createdAt: previous.createdAt,
    updatedAt: now,
    status,
    archivedAt: status === "archived" ? previous.archivedAt : undefined,
  };
  return {
    ...learning,
    roadmaps: learning.roadmaps.map((roadmap) => roadmap.id === roadmapId ? replacement : roadmap),
  };
}

function updateLesson(
  roadmap: LearningRoadmap,
  lessonId: string,
  update: (lesson: RoadmapLesson) => RoadmapLesson,
  updatedAt = new Date().toISOString(),
): LearningRoadmap {
  return {
    ...roadmap,
    updatedAt,
    phases: roadmap.phases.map((phase) => ({
      ...phase,
      lessons: phase.lessons.map((lesson) => lesson.id === lessonId ? update(lesson) : lesson),
    })),
  };
}

export function submitLessonEvidence(
  roadmap: LearningRoadmap,
  lessonId: string,
  submission: string,
  now = new Date().toISOString(),
): LearningRoadmap {
  const clean = sanitizeText(submission, 4000);
  if (clean.length < 2) return roadmap;
  return updateLesson(roadmap, lessonId, (lesson) => {
    if (lesson.evidence?.status === "accepted") return lesson;
    return {
      ...lesson,
      evidence: {
        ...lesson.evidence,
        submission: clean,
        status: "submitted",
        submittedAt: now,
      },
    };
  }, now);
}

export function reviewLessonEvidence(
  roadmap: LearningRoadmap,
  lessonId: string,
  review: { accepted: boolean; feedback: string; nextAdjustment?: string },
  now = new Date().toISOString(),
): LearningRoadmap {
  const feedback = sanitizeText(review.feedback, 2000);
  const nextAdjustment = sanitizeText(review.nextAdjustment, 1000);
  if (!review.accepted && nextAdjustment.length < 2) return roadmap;
  const reviewed = updateLesson(roadmap, lessonId, (lesson) => {
    if (!lesson.evidence || feedback.length < 2) return lesson;
    return {
      ...lesson,
      completed: review.accepted,
      ...(review.accepted ? { completedAt: now } : { completedAt: undefined }),
      evidence: {
        submission: lesson.evidence.submission,
        submittedAt: lesson.evidence.submittedAt,
        status: review.accepted ? "accepted" : "needs_revision",
        feedback,
        ...(nextAdjustment ? { nextAdjustment } : {}),
        reviewedAt: now,
      },
    };
  }, now);
  const allDone = reviewed.phases.every((phase) =>
    phase.lessons.every((lesson) => lesson.completed)
  );
  const status = reviewed.status === "archived"
    ? "archived"
    : allDone
      ? "completed"
      : reviewed.status === "paused"
        ? "paused"
        : "active";
  return { ...reviewed, status };
}

export function applyLessonEvidenceReview(
  data: AppData,
  roadmapId: string,
  lessonId: string,
  review: { accepted: boolean; feedback: string; nextAdjustment?: string },
  now = new Date().toISOString(),
): AppData {
  const roadmap = data.learning.roadmaps.find((item) => item.id === roadmapId);
  const lesson = roadmap?.phases
    .flatMap((phase) => phase.lessons)
    .find((item) => item.id === lessonId);
  if (!roadmap || !lesson?.evidence) return data;

  const reviewed = reviewLessonEvidence(roadmap, lessonId, review, now);
  const reviewedLesson = reviewed.phases
    .flatMap((phase) => phase.lessons)
    .find((item) => item.id === lessonId);
  const newlyAccepted = lesson.evidence.status !== "accepted" &&
    reviewedLesson?.evidence?.status === "accepted";

  return {
    ...data,
    learning: {
      ...data.learning,
      roadmaps: data.learning.roadmaps.map((item) =>
        item.id === roadmapId ? reviewed : item
      ),
    },
    ...(newlyAccepted
      ? {
          progress: {
            ...data.progress,
            totalXp: data.progress.totalXp + 20,
            attributes: {
              ...data.progress.attributes,
              disciplina: data.progress.attributes.disciplina + 1,
            },
          },
        }
      : {}),
  };
}
