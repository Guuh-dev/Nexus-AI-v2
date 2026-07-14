import { describe, expect, it } from "vitest";
import {
  activateRoadmap,
  applyLessonEvidenceReview,
  archiveRoadmap,
  classifyRoadmapIntent,
  createStarterRoadmap,
  nextRoadmapLesson,
  removeRoadmap,
  renameRoadmap,
  replaceRoadmap,
  reviewLessonEvidence,
  roadmapProgress,
  submitLessonEvidence,
  validateRoadmapSemantics,
} from "@/features/learning/roadmap";
import { buildWeeklyEvidence, sanitizeAiWeeklyReview } from "@/features/progress/weekly-review";
import { generateLocalPlan } from "@/services/planning.service";
import { dailyPlanSchema, parseAiDailyPlan } from "@/schemas/daily-plan.schema";
import { addTask } from "@/features/tasks/task.logic";
import { learningStateSchema } from "@/schemas/expansion.schema";
import { makeAppData, makeProfile } from "@/tests/fixtures";
import type { DayHistory, LearningState, ProfessorIntake, WeeklyReview } from "@/types";

const SALES_TERMS = /prospec|oferta vendável|preço inicial|follow-up|fechar cliente|freelance/i;

function roadmapText(topic: string, profile = makeProfile({ mainGoal: "Ganhar dinheiro com freelance", priorities: ["dinheiro", "desenvolvimento"] })) {
  const roadmap = createStarterRoadmap(topic, profile);
  return {
    roadmap,
    text: roadmap.phases.flatMap((phase) => [phase.title, phase.objective, ...phase.lessons.flatMap((lesson) => [lesson.title, lesson.description])]).join(" | "),
  };
}

function commercialIntake(): ProfessorIntake {
  return {
    topic: "Landing Pages",
    knowledgeLevel: "intermediario",
    knownConcepts: "HTML, CSS e copy",
    previousAttempts: "Duas páginas de estudo",
    desiredOutcome: "Vender Landing Pages para clientes locais",
    proofProject: "Uma proposta enviada e uma página demonstrável",
    motivation: "Conseguir o primeiro cliente",
    weeklyMinutes: 180,
    sessionMinutes: 25,
    resources: ["Computador"],
    constraints: ["Pouco tempo"],
    preferredMethods: ["Prática"],
    includeInDailyPlan: true,
    showLearningInWidget: true,
    showProfessorInWidget: false,
    createdAt: "2026-07-13T12:00:00.000Z",
  };
}

describe("Nexus v3 product core", () => {
  it("keeps Programacao technical even when the global profile is financial", () => {
    const { roadmap, text } = roadmapText("Programação");
    expect(classifyRoadmapIntent("Programação")).toBe("technical");
    expect(roadmap.intent).toBe("technical");
    expect(text).toMatch(/Lógica|Fundamentos/);
    expect(text).toMatch(/APIs/);
    expect(text).toMatch(/Banco de dados/);
    expect(text).toMatch(/Debugging/);
    expect(text).toMatch(/Testes automatizados/);
    expect(text).toMatch(/Arquitetura/);
    expect(text).toMatch(/Deploy/);
    expect(text).not.toMatch(SALES_TERMS);
    expect(validateRoadmapSemantics(roadmap)).toEqual({ valid: true, issues: [] });
  });

  it("creates an applied technical path for Programacao com IA", () => {
    const { roadmap, text } = roadmapText("Programação com IA");
    expect(roadmap.intent).toBe("applied_technical");
    expect(text).toMatch(/Leitura de código gerado/);
    expect(text).toMatch(/Prompting técnico/);
    expect(text).toMatch(/Validação de saídas/);
    expect(text).toMatch(/Testes contra alucinações/);
    expect(text).toMatch(/Segurança e segredos/);
    expect(text).not.toMatch(SALES_TERMS);
  });

  it("allows sales only when the roadmap request is explicitly commercial", () => {
    const intake = commercialIntake();
    const roadmap = createStarterRoadmap("Vender Landing Pages", makeProfile({ mainGoal: "Aprender programação" }), intake);
    const text = roadmap.phases.flatMap((phase) => [phase.title, ...phase.lessons.map((lesson) => lesson.title)]).join(" | ");
    expect(roadmap.intent).toBe("commercial");
    expect(text).toMatch(/Oferta vendável/);
    expect(text).toMatch(/prospects/);
  });

  it("does not restart an advanced technical learner from zero", () => {
    const { roadmap } = roadmapText("Programação", makeProfile({ skillLevel: "avancado", mainGoal: "Aprofundar programação" }));
    expect(roadmap.currentLevel).toBe("avancado");
    expect(roadmap.phases[0]?.title).toBe("Qualidade e arquitetura");
    expect(roadmap.phases[0]?.title).not.toMatch(/zero|introdução/i);
  });

  it("performs roadmap rename, archive, activate and delete without orphaning the active id", () => {
    const first = createStarterRoadmap("Programação", makeProfile());
    const second = createStarterRoadmap("Inglês", makeProfile());
    let learning: LearningState = { professorEnabled: true, roadmaps: [first, second], pendingTopics: [], activeRoadmapId: first.id };
    learning = renameRoadmap(learning, first.id, "Programação moderna", "2026-07-13T12:00:00.000Z");
    expect(learning.roadmaps[0]?.topic).toBe("Programação moderna");
    learning = archiveRoadmap(learning, first.id, "2026-07-13T12:01:00.000Z");
    expect(learning.roadmaps[0]?.status).toBe("archived");
    expect(learning.activeRoadmapId).toBe(second.id);
    learning = activateRoadmap(learning, first.id, "2026-07-13T12:02:00.000Z");
    expect(learning.activeRoadmapId).toBe(first.id);
    expect(learning.roadmaps[0]?.status).toBe("active");
    learning = removeRoadmap(learning, first.id);
    expect(learning.roadmaps.map((roadmap) => roadmap.id)).toEqual([second.id]);
    expect(learning.activeRoadmapId).toBe(second.id);
    expect(learningStateSchema.parse(JSON.parse(JSON.stringify(learning)))).toEqual(learning);
  });

  it("persists the Atlas delivery, correction and adaptation cycle", () => {
    const roadmap = createStarterRoadmap("Programação", makeProfile());
    const lessonId = roadmap.phases[0]!.lessons[0]!.id;
    const submitted = submitLessonEvidence(roadmap, lessonId, "Implementei o exercício e anexei o teste.", "2026-07-13T12:00:00.000Z");
    expect(submitted.phases[0]?.lessons[0]?.evidence?.status).toBe("submitted");
    const adapted = reviewLessonEvidence(submitted, lessonId, { accepted: false, feedback: "O caso de borda ainda falha.", nextAdjustment: "Adicione o teste de entrada vazia." }, "2026-07-13T12:05:00.000Z");
    expect(adapted.phases[0]?.lessons[0]?.evidence).toMatchObject({ status: "needs_revision", nextAdjustment: "Adicione o teste de entrada vazia." });
    const accepted = reviewLessonEvidence(adapted, lessonId, { accepted: true, feedback: "Entrega corrigida e verificada." }, "2026-07-13T12:10:00.000Z");
    expect(accepted.phases[0]?.lessons[0]).toMatchObject({ completed: true, evidence: { status: "accepted" } });
  });

  it("keeps the prior Atlas guidance visible until a resubmission receives a valid review", () => {
    const roadmap = createStarterRoadmap("Programação", makeProfile());
    const lessonId = roadmap.phases[0]!.lessons[0]!.id;
    const submitted = submitLessonEvidence(
      roadmap,
      lessonId,
      "Implementei a primeira versão do exercício.",
      "2026-07-13T12:00:00.000Z",
    );
    const needsRevision = reviewLessonEvidence(submitted, lessonId, {
      accepted: false,
      feedback: "O caso de entrada vazia ainda não foi demonstrado.",
      nextAdjustment: "Inclua o caso vazio e mostre o teste passando.",
    }, "2026-07-13T12:05:00.000Z");
    const resubmitted = submitLessonEvidence(
      needsRevision,
      lessonId,
      "Adicionei o caso vazio e anexei o resultado do teste.",
      "2026-07-13T12:10:00.000Z",
    );
    const evidence = resubmitted.phases[0]!.lessons[0]!.evidence;

    expect(evidence).toEqual({
      submission: "Adicionei o caso vazio e anexei o resultado do teste.",
      status: "submitted",
      submittedAt: "2026-07-13T12:10:00.000Z",
      feedback: "O caso de entrada vazia ainda não foi demonstrado.",
      nextAdjustment: "Inclua o caso vazio e mostre o teste passando.",
      reviewedAt: "2026-07-13T12:05:00.000Z",
    });

    const accepted = reviewLessonEvidence(resubmitted, lessonId, {
      accepted: true,
      feedback: "O caso vazio e o teste agora comprovam a entrega.",
    }, "2026-07-13T12:15:00.000Z");
    expect(accepted.phases[0]!.lessons[0]!.evidence).toEqual({
      submission: "Adicionei o caso vazio e anexei o resultado do teste.",
      status: "accepted",
      submittedAt: "2026-07-13T12:10:00.000Z",
      feedback: "O caso vazio e o teste agora comprovam a entrega.",
      reviewedAt: "2026-07-13T12:15:00.000Z",
    });
  });

  it("reopens a regenerated completed roadmap and preserves only unambiguous matching evidence", () => {
    const base = createStarterRoadmap("Programação", makeProfile());
    const completedAt = "2026-07-13T11:00:00.000Z";
    const previous = {
      ...base,
      status: "completed" as const,
      phases: base.phases.map((phase) => ({
        ...phase,
        lessons: phase.lessons.map((lesson) => ({
          ...lesson,
          completed: true,
          completedAt,
          evidence: {
            submission: `Evidência validada para ${lesson.title}`,
            status: "accepted" as const,
            submittedAt: "2026-07-13T10:00:00.000Z",
            feedback: "Entrega verificada.",
            reviewedAt: completedAt,
          },
        })),
      })),
    };
    const generatedBase = createStarterRoadmap("Programação", makeProfile());
    const generatedFirst = generatedBase.phases[0]!.lessons[0]!;
    const generated = {
      ...generatedBase,
      status: "completed" as const,
      phases: generatedBase.phases.map((phase, phaseIndex) => ({
        ...phase,
        lessons: phase.lessons.map((lesson, lessonIndex) => phaseIndex === 0 && lessonIndex === 0
          ? {
              ...lesson,
              title: "Nova lição diagnóstica",
              completed: true,
              completedAt: "2026-07-13T12:00:00.000Z",
              evidence: {
                submission: "Progresso recebido da geração não é confiável.",
                status: "accepted" as const,
                submittedAt: "2026-07-13T12:00:00.000Z",
              },
            }
          : lesson),
      })),
    };
    const learning: LearningState = {
      professorEnabled: true,
      roadmaps: [previous],
      pendingTopics: [],
      activeRoadmapId: previous.id,
    };

    const replaced = replaceRoadmap(
      learning,
      previous.id,
      generated,
      "2026-07-13T13:00:00.000Z",
    ).roadmaps[0]!;
    const progress = roadmapProgress(replaced);
    const firstLesson = replaced.phases[0]!.lessons[0]!;
    const secondLesson = replaced.phases[0]!.lessons[1]!;

    expect(replaced.status).toBe("active");
    expect(progress.completed).toBe(progress.total - 1);
    expect(firstLesson).toMatchObject({
      id: generatedFirst.id,
      title: "Nova lição diagnóstica",
      completed: false,
    });
    expect(firstLesson.evidence).toBeUndefined();
    expect(firstLesson.completedAt).toBeUndefined();
    expect(nextRoadmapLesson(replaced)?.id).toBe(firstLesson.id);
    expect(secondLesson.id).not.toBe(previous.phases[0]!.lessons[1]!.id);
    expect(secondLesson.evidence).toEqual(previous.phases[0]!.lessons[1]!.evidence);
  });

  it("awards lesson XP once and cannot bypass or duplicate an accepted correction", () => {
    const data = makeAppData();
    const roadmap = createStarterRoadmap("Programação", data.profile!);
    const lessonId = roadmap.phases[0]!.lessons[0]!.id;
    const submitted = submitLessonEvidence(
      roadmap,
      lessonId,
      "Implementei o exercício e registrei o teste passando.",
      "2026-07-13T12:00:00.000Z",
    );
    data.learning = {
      ...data.learning,
      roadmaps: [submitted],
      activeRoadmapId: submitted.id,
    };
    const initialXp = data.progress.totalXp;
    const initialDiscipline = data.progress.attributes.disciplina;
    const accepted = applyLessonEvidenceReview(data, submitted.id, lessonId, {
      accepted: true,
      feedback: "Entrega e teste demonstrados.",
    }, "2026-07-13T12:05:00.000Z");
    const repeated = applyLessonEvidenceReview(accepted, submitted.id, lessonId, {
      accepted: true,
      feedback: "Entrega e teste demonstrados novamente.",
    }, "2026-07-13T12:10:00.000Z");
    const acceptedRoadmap = accepted.learning.roadmaps[0]!;
    const resubmitted = submitLessonEvidence(
      acceptedRoadmap,
      lessonId,
      "Tentativa de sobrescrever uma entrega já aceita.",
      "2026-07-13T12:15:00.000Z",
    );

    expect(accepted.progress.totalXp).toBe(initialXp + 20);
    expect(accepted.progress.attributes.disciplina).toBe(initialDiscipline + 1);
    expect(repeated.progress.totalXp).toBe(initialXp + 20);
    expect(resubmitted.phases[0]?.lessons[0]?.evidence?.submission).toBe(
      "Implementei o exercício e registrei o teste passando.",
    );
  });

  it("uses a real seven-day window and returns a nullable score when evidence is insufficient", () => {
    const data = makeAppData();
    const stalePlan = generateLocalPlan({ profile: data.profile!, date: "2026-01-01", requestId: "stale", clientId: data.installationId });
    data.history = [{ date: "2026-01-01", plan: stalePlan, completedTasks: 4, totalTasks: 4, completionPercentage: 100, xpEarned: 200, focusMinutes: 120, countedForStreak: true }];
    const evidence = buildWeeklyEvidence(data, new Date("2026-07-13T15:00:00.000Z"));
    expect(evidence.weekStart).toBe("2026-07-07");
    expect(evidence.plannedTasks).toBe(0);
    expect(evidence.score).toBeNull();
    expect(evidence.confidence).toBe("insufficient");
  });

  it("replaces invented AI claims with deterministic facts and labeled hypotheses", () => {
    const data = makeAppData();
    data.history = ["2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"].map((date, index): DayHistory => {
      const plan = generateLocalPlan({ profile: data.profile!, date, requestId: `review-${index}`, clientId: data.installationId });
      return { date, plan, completedTasks: 1, totalTasks: 2, completionPercentage: 50, xpEarned: 30, focusMinutes: 15, countedForStreak: true };
    });
    const ai: WeeklyReview = {
      id: "review-ai", weekStart: "2026-01-01", weekEnd: "2026-01-07", completionPercentage: 99, xpEarned: 999, focusMinutes: 999,
      consistencyScore: 99, highlights: ["Seu medo de falhar explica a semana"], patterns: ["Medo e perfeccionismo bloquearam você", "Hipótese: o volume de tarefas pode ter limitado a conclusão"],
      keep: [], cut: [], nextWeekFocus: "Reduzir volume", challenge: "Concluir duas", source: "ai", createdAt: "2026-07-13T12:00:00.000Z",
    };
    const review = sanitizeAiWeeklyReview(ai, data, new Date("2026-07-13T15:00:00.000Z"));
    expect(review.consistencyScore).not.toBe(99);
    expect(review.highlights.join(" ")).not.toMatch(/medo|perfeccionismo/i);
    expect(review.patterns).toEqual(["Hipótese: o volume de tarefas pode ter limitado a conclusão"]);
    expect(review.statements?.some((statement) => statement.kind === "fact")).toBe(true);
    expect(review.statements?.some((statement) => statement.kind === "hypothesis")).toBe(true);
  });

  it("replaces unsupported remote recommendations with auditable local actions", () => {
    const data = makeAppData();
    data.history = ["2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"].map((date, index): DayHistory => {
      const plan = generateLocalPlan({ profile: data.profile!, date, requestId: `grounded-${index}`, clientId: data.installationId });
      return { date, plan, completedTasks: 1, totalTasks: 2, completionPercentage: 50, xpEarned: 30, focusMinutes: 15, countedForStreak: true };
    });
    const ai: WeeklyReview = {
      id: "review-unsupported-recommendations",
      weekStart: "2026-01-01",
      weekEnd: "2026-01-07",
      completionPercentage: 99,
      xpEarned: 999,
      focusMinutes: 999,
      consistencyScore: 99,
      highlights: [],
      patterns: ["Hipótese: o volume de tarefas pode ter limitado a conclusão"],
      keep: ["Mantenha estudos pela manhã"],
      cut: ["Corte redes sociais à noite"],
      nextWeekFocus: "Estude sempre às 6h",
      challenge: "Acorde cedo durante sete dias",
      source: "ai",
      createdAt: "2026-07-13T12:00:00.000Z",
    };

    const review = sanitizeAiWeeklyReview(ai, data, new Date("2026-07-13T15:00:00.000Z"));

    expect(review.keep).toEqual(["Manter registros objetivos de conclusão, foco e adiamentos."]);
    expect(review.cut).toEqual(["Reduzir o volume aberto para caber no tempo registrado."]);
    expect(review.nextWeekFocus).not.toMatch(/6h|manhã|noite/i);
    expect(review.challenge).toBe("Escolher 3 ações menores e concluir pelo menos 2 com evidência registrada.");
    expect(`${review.keep.join(" ")} ${review.cut.join(" ")} ${review.nextWeekFocus} ${review.challenge}`).not.toMatch(/manhã|redes sociais|6h|acorde cedo/i);
  });

  it("generates structured offline tasks without commercial contamination", () => {
    const profile = makeProfile({ mainGoal: "Aprender programação e construir uma API testada", priorities: ["dinheiro", "desenvolvimento"], skillLevel: "intermediario" });
    const plan = generateLocalPlan({ profile, date: "2026-07-13", requestId: "structured", clientId: "install-v3" });
    expect(plan.source).toBe("offline");
    expect(plan.warning).toMatch(/offline/i);
    expect(plan.tasks.every((task) => task.context && task.firstStep && task.expectedResult && task.doneWhen)).toBe(true);
    expect(plan.tasks.some((task) => task.category === "dinheiro")).toBe(false);
    expect(plan.tasks.map((task) => `${task.title} ${task.description}`).join(" ")).not.toMatch(SALES_TERMS);
    expect(plan.mainMission.title).not.toContain(profile.mainGoal);
  });

  it("hydrates legacy AI tasks into the complete v3 task contract", () => {
    const parsed = parseAiDailyPlan(JSON.stringify({
      date: "2026-07-13",
      mainMission: { title: "Entregar função", description: "Implementar e testar uma função pequena.", estimatedMinutes: 30, priority: "alta" },
      tasks: [{ title: "Implementar parser", description: "Criar o parser de entrada.", category: "desenvolvimento", priority: "alta", estimatedMinutes: 25, xp: 50, recurring: false }],
      focusMessage: "Execute e valide.", avoidToday: [], totalEstimatedMinutes: 55,
    }));
    expect(parsed.tasks[0]).toMatchObject({
      title: "Implementar parser",
      context: "Criar o parser de entrada.",
    });
    expect(parsed.tasks[0]?.firstStep).toBeTruthy();
    expect(parsed.tasks[0]?.expectedResult).toBeTruthy();
    expect(parsed.tasks[0]?.doneWhen).toBeTruthy();
  });

  it("persists the complete contract for a manually created task", () => {
    const data = makeAppData(makeProfile({ maxDailyTasks: 2 }));
    data.activePlan = generateLocalPlan({ profile: data.profile!, date: "2026-07-13", requestId: "manual", clientId: data.installationId });
    const updated = addTask(data, {
      title: "Publicar endpoint de status",
      description: "Expor a saúde do serviço para validação.",
      firstStep: "Abra a rota de status e liste os campos obrigatórios.",
      expectedResult: "Endpoint respondendo configured, apiVersion e assistantAvailable.",
      doneWhen: "O teste HTTP retorna 200 com os três campos corretos.",
      category: "desenvolvimento",
      priority: "alta",
      estimatedMinutes: 30,
      recurring: false,
    });
    const task = updated.activePlan?.tasks.at(-1);
    expect(task).toMatchObject({
      title: "Publicar endpoint de status",
      firstStep: "Abra a rota de status e liste os campos obrigatórios.",
      expectedResult: "Endpoint respondendo configured, apiVersion e assistantAvailable.",
      doneWhen: "O teste HTTP retorna 200 com os três campos corretos.",
    });
    expect(dailyPlanSchema.parse(JSON.parse(JSON.stringify(updated.activePlan)))).toEqual(updated.activePlan);
  });
});
