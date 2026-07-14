import { describe, expect, it, vi } from "vitest";
import {
  buildAssistantContext,
  compactAssistantContext,
} from "@/services/assistant.service";
import { safeContext } from "@/services/assistant.server";
import { generateLocalPlan } from "@/services/planning.service";
import { createStarterRoadmap } from "@/features/learning/roadmap";
import { makeAppData } from "@/tests/fixtures";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

describe("assistant v3 context boundaries", () => {
  it("keeps bounded weekly evidence only in the weekly-review route", () => {
    const context = {
      weeklyEvidence: {
        weekStart: "2026-07-06",
        weekEnd: "2026-07-12",
        daysRecorded: 4,
        plannedTasks: 8,
        completedTasks: 5,
        completionPercentage: 63,
        missionsCompleted: 2,
        missionsPlanned: 4,
        focusMinutes: 170,
        xpEarned: 320,
        activeDays: 4,
        postponedOrCarryOver: 1,
        habitsScheduled: 5,
        habitsCompleted: 3,
        roadmapLessonsCompleted: 2,
        previousCompletionPercentage: 50,
        completionDelta: 13,
        categories: Array.from({ length: 20 }, (_, index) => `cat-${index}`),
        confidence: "medium",
        score: 68,
        facts: Array.from(
          { length: 20 },
          (_, index) => `Fato ${index} ${"x".repeat(400)}`,
        ),
        privateField: "não deve atravessar a fronteira",
      },
      observableFacts: Array.from(
        { length: 20 },
        (_, index) => `Observação ${index} ${"y".repeat(400)}`,
      ),
    };

    const weekly = compactAssistantContext(context, "weekly_review");
    const evidence = weekly.weeklyEvidence as Record<string, unknown>;

    expect(evidence).toMatchObject({
      weekStart: "2026-07-06",
      weekEnd: "2026-07-12",
      daysRecorded: 4,
      score: 68,
      confidence: "medium",
    });
    expect(evidence).not.toHaveProperty("privateField");
    expect(evidence).not.toHaveProperty("habitsScheduled");
    expect(evidence).not.toHaveProperty("habitsCompleted");
    expect(evidence.categories).toHaveLength(8);
    expect(evidence.facts).toHaveLength(8);
    expect((evidence.facts as string[])[0]?.length).toBeLessThanOrEqual(240);
    expect(weekly.observableFacts).toHaveLength(7);
    expect(
      ((weekly.observableFacts as string[])[0] ?? "").length,
    ).toBeLessThanOrEqual(240);

    const brain = compactAssistantContext(context, "brain");
    expect(brain).not.toHaveProperty("weeklyEvidence");
    expect(brain).not.toHaveProperty("observableFacts");
  });

  it("keeps the task execution contract in assistant context", () => {
    const data = makeAppData();
    data.activePlan = generateLocalPlan({
      profile: data.profile!,
      date: "2026-07-13",
      requestId: "context-contract-request",
      clientId: data.installationId,
    });
    const task = data.activePlan.tasks[0]!;
    task.context = `Por que existe ${"c".repeat(400)}`;
    task.firstStep = `Abra o arquivo ${"p".repeat(400)}`;
    task.expectedResult = `Entrega observável ${"r".repeat(400)}`;
    task.doneWhen = `Concluído quando ${"d".repeat(400)}`;

    const context = buildAssistantContext(data, "brain");
    const today = context.today as { tasks: Record<string, unknown>[] };
    const compactTask = today.tasks[0]!;

    expect(compactTask.context).toHaveLength(280);
    expect(compactTask.firstStep).toHaveLength(240);
    expect(compactTask.expectedResult).toHaveLength(280);
    expect(compactTask.doneWhen).toHaveLength(280);
  });

  it("does not send retired product modules back into the AI context", () => {
    const compact = compactAssistantContext({
      operations: [{ title: "legado" }],
      habits: [{ title: "legado" }],
    }, "brain");
    const built = buildAssistantContext(makeAppData(), "brain");

    expect(compact).not.toHaveProperty("operations");
    expect(compact).not.toHaveProperty("habits");
    expect(built).not.toHaveProperty("operations");
    expect(built).not.toHaveProperty("habits");
  });

  it("preserves experience preferences and prioritizes the selected roadmap", () => {
    const data = makeAppData();
    data.preferences.mascot.assistantVerbosity = "detailed";
    data.preferences.mascot.atlasPersonality = "strict";
    data.preferences.mascot.companionMood = "quiet";
    const first = createStarterRoadmap("Inglês", data.profile!);
    const selected = createStarterRoadmap("Programação", data.profile!);
    data.learning.roadmaps = [first, selected];
    data.learning.activeRoadmapId = selected.id;

    const built = buildAssistantContext(data, "professor");
    const compact = compactAssistantContext({
      ...built,
      experience: {
        assistantVerbosity: data.preferences.mascot.assistantVerbosity,
        atlasPersonality: data.preferences.mascot.atlasPersonality,
        companionMood: data.preferences.mascot.companionMood,
      },
    }, "professor");
    const roadmaps = compact.roadmaps as Record<string, unknown>[];

    expect(compact.experience).toEqual({
      assistantVerbosity: "detailed",
      atlasPersonality: "strict",
      companionMood: "quiet",
    });
    expect(roadmaps[0]).toMatchObject({
      id: selected.id,
      active: true,
      topic: "Programação",
    });
    expect(roadmaps[0]?.nextLesson).toBeTruthy();
  });

  it("keeps only bounded lesson evidence in the dedicated review route", () => {
    const evidence = {
      roadmap: { topic: "Programação", outcome: "Criar uma API" },
      phase: { title: "Fundamentos", objective: "Aplicar a base" },
      lesson: {
        title: "Testes",
        objective: "Proteger um comportamento",
        steps: Array.from({ length: 10 }, (_, index) => `Passo ${index}`),
        deliverable: "Um teste executável",
        successCriteria: "O teste falha sem a correção e passa com ela",
        estimatedMinutes: 30,
      },
      submission: `Teste executado: ${"x".repeat(5000)}`,
    };
    const dedicated = compactAssistantContext(
      { roadmapEvidenceReview: evidence },
      "evidence_review",
    );
    const review = dedicated.roadmapEvidenceReview as {
      submission: string;
      lesson: { steps: string[] };
    };

    expect(review.submission.length).toBeLessThanOrEqual(4000);
    expect(review.lesson.steps).toHaveLength(5);
    expect(compactAssistantContext(
      { roadmapEvidenceReview: evidence },
      "brain",
    )).not.toHaveProperty("roadmapEvidenceReview");
  });

  it("serializes oversized prompt context as valid bounded JSON", () => {
    const profile = makeAppData().profile!;
    const serialized = safeContext({
      mode: "brain",
      requestId: "oversized-context-request",
      clientId: "oversized-context-client",
      message: "Qual é o próximo passo?",
      profile,
      context: {
        huge: Array.from({ length: 300 }, (_, index) => ({
          index,
          text: "x".repeat(3000),
        })),
      },
    });

    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized.length).toBeLessThanOrEqual(18_000);
  });
});
