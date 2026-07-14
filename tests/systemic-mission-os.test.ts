import { describe, expect, it, vi } from "vitest";
import { createStarterRoadmap } from "@/features/learning/roadmap";
import { buildWeeklyEvidence, createEvidenceBasedWeeklyReview, sanitizeAiWeeklyReview } from "@/features/progress/weekly-review";
import { synthesizeMission } from "@/features/context/synthesis";
import { createLocalWeeklyReview } from "@/services/assistant.service";
import { generateLocalPlan } from "@/services/planning.service";
import { createWidgetPayload } from "@/services/widget.service";
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
import { makeAppData, makeProfile } from "./fixtures";
import type { Category, ProfessorIntake, Profile, WeeklyReview } from "@/types";

const advancedGoal = "Conseguir meu primeiro freelance criando coisas envolvendo programação com IA, sei criar LPs, SaaS, Micro-SaaS, Apps e quero ganhar bem mais até o fim do ano";

function advancedProfile(): Profile {
  return { ...makeProfile(), mainGoal: advancedGoal, skillLevel: "avancado" as const, priorities: ["dinheiro", "desenvolvimento"] as Category[] };
}

const intake: ProfessorIntake = {
  topic: "Programação com IA",
  knowledgeLevel: "avancado",
  knownConcepts: "Landing Pages, SaaS, Micro-SaaS, Apps e automações com IA",
  previousAttempts: "Já construí projetos próprios e landing pages.",
  desiredOutcome: "Fechar o primeiro projeto pago e escalar para um MacBook.",
  proofProject: "Landing page ou micro-SaaS demonstrável para vender como serviço.",
  motivation: "Monetizar habilidades reais.",
  weeklyMinutes: 120,
  sessionMinutes: 25,
  resources: ["celular", "IA"],
  constraints: ["sem orçamento"],
  preferredMethods: ["prática"],
  includeInDailyPlan: true,
  showLearningInWidget: true,
  showProfessorInWidget: true,
  createdAt: "2026-07-13T00:00:00.000Z",
};

describe("systemic mission OS regressions", () => {
  it("synthesizes long goals instead of copying them as mission titles", () => {
    const synthesized = synthesizeMission(advancedGoal, { level: "avancado" });
    expect(synthesized.title).toBe("Fechar o primeiro projeto pago");
    expect(synthesized.title.length).toBeLessThanOrEqual(64);
    expect(synthesized.title).not.toContain("Conseguir meu primeiro freelance criando coisas");
    expect(synthesized.nextAction).toContain("Landing Page");
  });

  it("creates an advanced commercial roadmap rather than a beginner template", () => {
    const roadmap = createStarterRoadmap(intake.topic, advancedProfile(), intake);
    const allTitles = roadmap.phases.flatMap((phase) => [phase.title, ...phase.lessons.map((lesson) => lesson.title)]).join(" | ");
    expect(allTitles).toContain("Oferta vendável");
    expect(allTitles).toContain("Primeiro lote de prospects");
    expect(allTitles).not.toContain("Fundação sem lacunas");
    expect(allTitles).not.toContain("Liste de memória");
    expect(roadmap.phases[0]?.lessons[0]?.deliverable).toContain("preço inicial");
  });

  it("bases weekly review on observable data and marks insufficient evidence", () => {
    const data = makeAppData(advancedProfile());
    data.history = [];
    const evidence = buildWeeklyEvidence(data);
    const review = createEvidenceBasedWeeklyReview(data);
    expect(evidence.score).toBeNull();
    expect(review.patterns.join(" ")).toMatch(/dados insuficientes/i);
    expect(review.highlights.join(" ")).not.toMatch(/medo|perfeccionismo|mentor|rotina imprevisível/i);
  });

  it("sanitizes AI weekly review so invented score and facts cannot override deterministic evidence", () => {
    const data = makeAppData(advancedProfile());
    data.history = [];
    const ai: WeeklyReview = {
      id: "review-ai",
      weekStart: "2026-07-07",
      weekEnd: "2026-07-13",
      completionPercentage: 99,
      xpEarned: 999,
      focusMinutes: 999,
      consistencyScore: 95,
      highlights: ["Buscar mentores resolveu sua semana"],
      patterns: ["Medo de falhar limita ação", "Possível padrão: poucas tarefas registradas"],
      keep: [],
      cut: [],
      nextWeekFocus: "Foco",
      challenge: "Desafio",
      source: "ai",
      createdAt: "2026-07-13T00:00:00.000Z",
    };
    const sanitized = sanitizeAiWeeklyReview(ai, data);
    expect(sanitized.consistencyScore).toBeNull();
    expect(sanitized.focusMinutes).toBe(0);
    expect(sanitized.patterns.join(" ")).not.toContain("Medo de falhar");
  });

  it("uses observable evidence and a deterministic score in the local weekly-review fallback", () => {
    const data = makeAppData(advancedProfile());
    const plan = generateLocalPlan({ profile: advancedProfile(), date: "2026-07-10", requestId: "request-review", clientId: "install-systemic" });
    data.history = [
      { date: "2026-07-07", plan, completedTasks: 2, totalTasks: 2, completionPercentage: 100, xpEarned: 50, focusMinutes: 30, countedForStreak: true },
      { date: "2026-07-08", plan, completedTasks: 1, totalTasks: 2, completionPercentage: 50, xpEarned: 30, focusMinutes: 0, countedForStreak: true },
      { date: "2026-07-09", plan, completedTasks: 0, totalTasks: 2, completionPercentage: 0, xpEarned: 0, focusMinutes: 0, countedForStreak: false },
      { date: "2026-07-10", plan, completedTasks: 1, totalTasks: 2, completionPercentage: 50, xpEarned: 40, focusMinutes: 15, countedForStreak: true },
    ];

    const evidence = buildWeeklyEvidence(data);
    const review = createLocalWeeklyReview(data);

    expect(evidence).toMatchObject({ completionPercentage: 50, focusMinutes: 45, xpEarned: 120, activeDays: 3, score: 49 });
    expect(review).toMatchObject({ completionPercentage: 50, focusMinutes: 45, xpEarned: 120, consistencyScore: 49, source: "local" });
    expect(review.highlights.join(" ")).toContain("4 de 8 tarefas");
    expect(review.highlights.join(" ")).toContain("45 min de foco");
  });

  it("counts a civil date once when history and active plan overlap", () => {
    const data = makeAppData(advancedProfile());
    const date = "2026-07-13";
    const plan = generateLocalPlan({
      profile: advancedProfile(),
      date,
      requestId: "overlap-review",
      clientId: "install-overlap",
    });
    plan.tasks[0]!.completed = true;
    plan.mainMission.completed = true;
    data.activePlan = plan;
    data.history = [{
      date,
      plan,
      completedTasks: 1,
      totalTasks: plan.tasks.length,
      completionPercentage: Math.round(100 / plan.tasks.length),
      xpEarned: 125,
      focusMinutes: 30,
      countedForStreak: true,
    }];
    data.progress.focusSessions = [{
      id: "focus-overlap",
      taskId: plan.tasks[0]!.id,
      taskTitle: plan.tasks[0]!.title,
      plannedMinutes: 25,
      elapsedSeconds: 1500,
      status: "completed",
      startedAt: "2026-07-13T13:00:00.000Z",
      completedAt: "2026-07-13T13:25:00.000Z",
      xp: 15,
    }];

    const evidence = buildWeeklyEvidence(data, new Date("2026-07-13T15:00:00.000Z"));

    expect(evidence).toMatchObject({
      daysRecorded: 1,
      plannedTasks: plan.tasks.length,
      completedTasks: 1,
      missionsPlanned: 1,
      missionsCompleted: 1,
      focusMinutes: 30,
      xpEarned: 125,
    });
  });

  it("generates clear offline mission and revenue action for commercial goals", () => {
    const plan = generateLocalPlan({ profile: advancedProfile(), date: "2026-07-13", requestId: "request-systemic", clientId: "install-systemic" });
    expect(plan.mainMission.title).toBe("Fechar o primeiro projeto pago");
    expect(plan.mainMission.title).not.toContain("Avançar de verdade em");
    expect(plan.tasks.some((task) => task.title === "Enviar uma proposta de Landing Page" && task.expectedResult && task.doneWhen)).toBe(true);
  });

  it("widget payload has a useful empty state when no daily plan exists", () => {
    const data = makeAppData(advancedProfile());
    data.activePlan = undefined;
    const payload = createWidgetPayload(data);
    expect(payload).not.toBeNull();
    expect(payload?.mainMission).toBe("Fechar o primeiro projeto pago");
    expect(payload?.nextAction).toContain("Landing Page");
    expect(payload?.appearance?.preferredSize).toBeDefined();
  });
});
