import { EVOLUTION_AREA_LABELS } from "@/features/learning/roadmap";
import type { ProfessorIntake, Profile } from "@/types";

export const PROFESSOR_TOPIC_SUGGESTIONS = [
  "Programação com IA",
  "React Native",
  "Inglês para carreira",
  "Freelance e vendas",
  "Design de interfaces",
  "Finanças pessoais",
  "Comunicação e oratória",
  "Matemática",
  "Escrita persuasiva",
  "Empreendedorismo",
  "Produtividade",
  "Cybersecurity",
  "Criação de conteúdo",
  "Condicionamento físico",
] as const;

export const PROFESSOR_RESOURCE_OPTIONS = [
  "Somente celular",
  "Computador",
  "Internet estável",
  "Livros",
  "Curso já comprado",
  "Mentor ou comunidade",
  "Projetos reais",
] as const;

export const PROFESSOR_CONSTRAINT_OPTIONS = [
  "Pouco tempo",
  "Orçamento zero",
  "Internet limitada",
  "Só tenho celular",
  "Dificuldade de manter constância",
  "Ansiedade ou pressão",
  "Base incompleta",
  "Não sei por onde começar",
] as const;

export const PROFESSOR_METHOD_OPTIONS = [
  "Projetos práticos",
  "Exercícios curtos",
  "Explicações visuais",
  "Leitura guiada",
  "Repetição espaçada",
  "Testes sem consulta",
  "Ensinar o conteúdo",
  "Desafios e Boss Battles",
] as const;

export function suggestedTopicsFor(profile: Profile): string[] {
  const evolutionTopics = profile.evolution?.primaryAreas.map((area) => EVOLUTION_AREA_LABELS[area]) ?? [];
  const selectedTopics = profile.evolution?.professorTopics ?? [];
  return [...selectedTopics, ...evolutionTopics, ...PROFESSOR_TOPIC_SUGGESTIONS]
    .filter((topic, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase("pt-BR") === topic.toLocaleLowerCase("pt-BR")) === index)
    .slice(0, 18);
}

export function createProfessorIntake(profile: Profile, topic = ""): ProfessorIntake {
  const evolution = profile.evolution;
  return {
    topic,
    knowledgeLevel: profile.skillLevel === "iniciante" ? "basico" : profile.skillLevel,
    knownConcepts: "",
    previousAttempts: "",
    desiredOutcome: evolution?.professorOutcome ?? "",
    proofProject: "",
    motivation: profile.goalReason,
    weeklyMinutes: evolution?.weeklyLearningMinutes ?? 180,
    sessionMinutes: evolution?.sessionLength ?? 25,
    resources: [],
    constraints: evolution?.biggestObstacles.slice(0, 5) ?? [],
    preferredMethods: evolution?.learningStyle === "pratica"
      ? ["Projetos práticos", "Exercícios curtos"]
      : evolution?.learningStyle === "visual"
        ? ["Explicações visuais", "Projetos práticos"]
        : ["Projetos práticos", "Repetição espaçada"],
    includeInDailyPlan: true,
    showLearningInWidget: false,
    showProfessorInWidget: false,
    createdAt: new Date().toISOString(),
  };
}
