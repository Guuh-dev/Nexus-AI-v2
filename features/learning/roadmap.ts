import type {
  EvolutionArea,
  LearningRoadmap,
  ProfessorIntake,
  Profile,
  RoadmapPhase,
} from "@/types";
import { createId } from "@/utils/ids";
import { sanitizeText } from "@/utils/text";

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
  const phases: RoadmapPhase[] = GENERIC_PHASES.map((phase, phaseIndex) => ({
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
