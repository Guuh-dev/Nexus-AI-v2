import type { EvolutionArea, LearningRoadmap, ProfessorIntake, Profile, RoadmapPhase } from "@/types";
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
    objective: "Entender o essencial e descobrir exatamente onde estão as lacunas.",
    lessons: ["Diagnóstico prático", "Mapa dos fundamentos", "Primeira aplicação guiada"],
  },
  {
    title: "Prática deliberada",
    objective: "Treinar as habilidades centrais com feedback e dificuldade progressiva.",
    lessons: ["Exercício de precisão", "Projeto curto", "Revisão dos erros"],
  },
  {
    title: "Execução no mundo real",
    objective: "Transformar conhecimento em resultado demonstrável.",
    lessons: ["Desafio aplicado", "Entrega de portfólio", "Explicação sem consulta"],
  },
  {
    title: "Domínio e autonomia",
    objective: "Resolver situações novas, ensinar o assunto e manter evolução contínua.",
    lessons: ["Problema avançado", "Ensinar para o Professor", "Plano de próximos 30 dias"],
  },
] as const;

export function createStarterRoadmap(topicInput: string, profile: Profile, intake?: ProfessorIntake): LearningRoadmap {
  const topic = sanitizeText(topicInput, 160) || "Minha habilidade prioritária";
  const evolution = profile.evolution;
  const lessonMinutes = intake?.sessionMinutes ?? evolution?.sessionLength ?? 25;
  const now = new Date().toISOString();
  const phases: RoadmapPhase[] = GENERIC_PHASES.map((phase, phaseIndex) => ({
    id: createId(`phase-${phaseIndex + 1}`),
    title: phase.title,
    objective: `${phase.objective} Tema: ${topic}.`,
    order: phaseIndex,
    lessons: phase.lessons.map((lesson) => ({
      id: createId("lesson"),
      title: lesson,
      description: phaseIndex === 0 && lesson === "Diagnóstico prático" && intake
        ? `Valide seu nível ${intake.knowledgeLevel} em ${topic}. Compare o que já sabe (${intake.knownConcepts || "nenhum fundamento registrado"}) com uma tarefa prática curta.`
        : phaseIndex === 2 && lesson === "Entrega de portfólio" && intake?.proofProject
          ? `Construa a evidência combinada com o Professor: ${intake.proofProject}`
          : `Complete uma sessão de ${lessonMinutes} minutos focada em ${topic} e registre o que aprendeu, errou e fará depois.`,
      estimatedMinutes: lessonMinutes,
      completed: false,
    })),
  }));
  return {
    id: createId("roadmap"),
    topic,
    outcome: sanitizeText(intake?.desiredOutcome ?? evolution?.professorOutcome, 600) || `Construir domínio prático e comprovável em ${topic}.`,
    currentLevel: intake?.knowledgeLevel === "zero" || intake?.knowledgeLevel === "basico"
      ? "iniciante"
      : intake?.knowledgeLevel ?? profile.skillLevel,
    weeklyMinutes: intake?.weeklyMinutes ?? evolution?.weeklyLearningMinutes ?? 180,
    ...(intake ? { intake } : {}),
    phases,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function roadmapProgress(roadmap: LearningRoadmap): { completed: number; total: number; percentage: number } {
  const lessons = roadmap.phases.flatMap((phase) => phase.lessons);
  const completed = lessons.filter((lesson) => lesson.completed).length;
  return { completed, total: lessons.length, percentage: lessons.length ? Math.round((completed / lessons.length) * 100) : 0 };
}

export function nextRoadmapLesson(roadmap: LearningRoadmap) {
  return roadmap.phases.flatMap((phase) => phase.lessons).find((lesson) => !lesson.completed);
}
