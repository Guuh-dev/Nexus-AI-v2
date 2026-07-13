import type {
  EvolutionArea,
  LearningRoadmap,
  ProfessorIntake,
  Profile,
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

function isLandingPageSalesTopic(topic: string): boolean {
  return /landing\s*pages?|lp\b|vender|venda|freela|freelance|cliente/i.test(topic);
}

function landingPageSalesGuidance(kind: string, topic: string, minutes: number, intake?: ProfessorIntake) {
  const outcome = sanitizeText(intake?.desiredOutcome, 220) || `vender uma landing page real ligada a ${topic}`;
  const niche = sanitizeText(intake?.proofProject, 260) || "uma oferta simples para um nicho específico";
  const base = {
    diagnostic: {
      objective: `Medir seu nível real criando uma oferta de landing page vendável, não só estudando ${topic}.`,
      steps: [
        "Escolha um nicho específico que você consiga contatar hoje.",
        "Escreva o problema caro que a landing page resolveria para esse nicho.",
        "Rascunhe promessa, público, prova e CTA em uma página simples.",
        "Marque o que travou: oferta, copy, design, preço ou prospecção.",
      ],
      deliverable: `Um diagnóstico com nicho, oferta, lacunas e primeiro rascunho de LP para ${outcome}.`,
      successCriteria: "Você sabe exatamente se o gargalo está em vender, escrever, montar ou prospectar.",
    },
    fundamentals: {
      objective: "Montar a ordem mínima dos fundamentos que realmente vendem uma landing page.",
      steps: [
        "Separe os fundamentos em: nicho, dor, oferta, copy, layout, prova, CTA, preço e prospecção.",
        "Dê nota de 0 a 2 para cada fundamento usando uma evidência real.",
        "Escolha o primeiro gargalo que impede uma conversa com cliente.",
        "Transforme esse gargalo em um treino de uma sessão.",
      ],
      deliverable: "Um mapa de vendas de LP com notas, dependências e prioridade comercial.",
      successCriteria: "A próxima aula vira uma ação de venda, não uma lista vaga de coisas para estudar.",
    },
    guided: {
      objective: `Construir uma primeira LP simples para ${niche} com foco em vender uma conversa.`,
      steps: [
        "Defina uma oferta única: resultado, prazo estimado e para quem serve.",
        "Escreva hero, benefícios, prova possível, processo e CTA.",
        "Monte uma versão mobile-first em ferramenta simples ou código básico.",
        "Revise se cada seção responde uma objeção de compra.",
      ],
      deliverable: "Uma LP mínima com link, print ou arquivo e CTA claro para contato.",
      successCriteria: "Alguém do nicho entende em 10 segundos o que você vende e como chamar você.",
    },
    precision: {
      objective: "Treinar a parte mais fraca da venda de LP com repetição curta.",
      steps: [
        "Escolha uma habilidade: headline, oferta, CTA, preço, layout ou abordagem.",
        "Crie 3 variações em vez de uma versão perfeita.",
        "Compare qual é mais específica, clara e vendável.",
        "Use a melhor variação na LP ou na mensagem de prospecção.",
      ],
      deliverable: "Três variações comparadas e uma versão escolhida para uso real.",
      successCriteria: "A versão final é mais específica e menos genérica que a primeira.",
    },
  } as const;
  return base[kind as keyof typeof base] ?? localLessonGuidance(kind, topic, minutes, intake);
}

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
  const intentText = `${topic} ${intake?.knownConcepts ?? ""} ${intake?.desiredOutcome ?? ""} ${intake?.proofProject ?? ""} ${profile.mainGoal}`;
  const intent = classifyGoalIntent(intentText, intake?.knowledgeLevel === "avancado" ? "avancado" : profile.skillLevel);
  const useCommercialAdvanced = Boolean(intake) && (intake?.knowledgeLevel === "avancado" || intent === "sell_service" || intent === "get_clients" || intent === "financial_goal" || intent === "build_product" || isLandingPageSalesTopic(topic));
  const phases: RoadmapPhase[] = useCommercialAdvanced
    ? commercialAdvancedPhases(topic, lessonMinutes, intake)
    : GENERIC_PHASES.map((phase, phaseIndex) => ({
    id: createId(`phase-${phaseIndex + 1}`),
    title: phase.title,
    objective: `${phase.objective} Tema: ${topic}.`,
    order: phaseIndex,
    lessons: phase.lessons.map((lesson) => {
      const guidance = isLandingPageSalesTopic(topic)
        ? landingPageSalesGuidance(lesson.kind, topic, lessonMinutes, intake)
        : localLessonGuidance(
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
