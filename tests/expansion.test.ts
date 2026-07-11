import { describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
import { assistantClientResponseSchema } from "@/schemas/assistant.schema";
import { professorIntakeSchema } from "@/schemas/expansion.schema";
import { STORAGE_VERSION } from "@/constants/defaults";
import { createStarterRoadmap, roadmapProgress } from "@/features/learning/roadmap";
import { detectReplanSignal } from "@/features/planning/smart-replan";
import { toggleTaskCompletion } from "@/features/tasks/task.logic";
import { recoverAppData } from "@/services/storage.service";
import { createWidgetPayload } from "@/services/widget.service";
import { compactAssistantContext } from "@/services/assistant.service";
import { makeAppData, makeProfile } from "@/tests/fixtures";
import { generateLocalPlan } from "@/services/planning.service";

describe("Nexus 2 expansion", () => {
  it("migrates legacy data without losing profile or XP", () => {
    const legacy = makeAppData() as unknown as Record<string, unknown>;
    legacy.storageVersion = 1;
    legacy.progress = { totalXp: 345, currentStreak: 2, bestStreak: 4, focusSessions: [], achievements: [] };
    legacy.preferences = {
      theme: "nexus", customAccent: "#8B5CF6", haptics: true, sound: false, reducedMotion: false,
      notificationEnabled: false, notificationTime: "18:00",
      widget: { background: "solid", showMascot: true, showMission: true, taskCount: 3, showStreak: true, progressStyle: "bar", privacyMode: false },
    };
    delete legacy.brain; delete legacy.learning; delete legacy.operations; delete legacy.habits; delete legacy.weeklyPlan;
    const migrated = recoverAppData(legacy);
    expect(migrated.storageVersion).toBe(STORAGE_VERSION);
    expect(migrated.profile?.nickname).toBe("Gusta");
    expect(migrated.progress.totalXp).toBe(345);
    expect(migrated.brain.threads).toEqual([]);
    expect(migrated.preferences.mascot.primary).toBe("nexus");
    expect(migrated.preferences.widget.showProfessor).toBe(false);
    expect(migrated.learning.pendingTopics).toEqual([]);
    expect(migrated.discoveryCompleted).toBe(false);
  });

  it("creates a complete local learning roadmap", () => {
    const roadmap = createStarterRoadmap("React Native", makeProfile());
    expect(roadmap.topic).toBe("React Native");
    expect(roadmap.phases.length).toBeGreaterThanOrEqual(4);
    expect(roadmap.phases.every((phase) => phase.lessons.length >= 3)).toBe(true);
    expect(roadmapProgress(roadmap)).toEqual({ completed: 0, total: 12, percentage: 0 });
  });

  it("keeps the Professor diagnosis attached to the roadmap", () => {
    const intake = professorIntakeSchema.parse({
      topic: "React Native",
      knowledgeLevel: "basico",
      knownConcepts: "Componentes e props",
      previousAttempts: "Um tutorial curto",
      desiredOutcome: "Publicar um aplicativo completo",
      proofProject: "Aplicativo publicado",
      motivation: "Conseguir clientes",
      weeklyMinutes: 240,
      sessionMinutes: 45,
      resources: ["Computador"],
      constraints: ["Pouco tempo"],
      preferredMethods: ["Projetos práticos"],
      includeInDailyPlan: true,
      showLearningInWidget: true,
      showProfessorInWidget: true,
      createdAt: "2026-07-11T12:00:00.000Z",
    });
    const roadmap = createStarterRoadmap(intake.topic, makeProfile(), intake);
    expect(roadmap.intake).toEqual(intake);
    expect(roadmap.currentLevel).toBe("iniciante");
    expect(roadmap.weeklyMinutes).toBe(240);
    expect(roadmap.phases.flatMap((phase) => phase.lessons).some((lesson) => lesson.description.includes("Aplicativo publicado"))).toBe(true);
  });

  it("detects when a low-energy day needs simplification", () => {
    const data = makeAppData(makeProfile({ energyLevel: "baixa" }));
    data.activePlan = generateLocalPlan({ profile: data.profile!, date: "2026-07-11", requestId: "request-smart", clientId: data.installationId });
    const signal = detectReplanSignal(data, "baixa");
    expect(signal?.severity).toBe("high");
    expect(signal?.candidates.length).toBeGreaterThan(1);
  });

  it("builds an advanced widget payload without exposing hidden titles", () => {
    const data = makeAppData();
    data.activePlan = generateLocalPlan({ profile: data.profile!, date: "2026-07-11", requestId: "request-widget", clientId: data.installationId });
    data.preferences.widget.privacyMode = true;
    data.preferences.mascot.skin = "galaxy";
    const payload = createWidgetPayload(data);
    expect(payload?.mainMission).toBe("Missão protegida");
    expect(payload?.tasks[0]?.title).toBe("Tarefa privada");
    expect(payload?.appearance?.skin).toBe("galaxy");
    expect(payload?.appearance?.showProfessor).toBe(false);
    expect(payload?.level).toBe(1);
  });

  it("connects the next Professor lesson to the offline plan and widget", () => {
    const data = makeAppData();
    const intake = professorIntakeSchema.parse({
      topic: "Inglês para freelance", knowledgeLevel: "basico", knownConcepts: "Leitura básica", previousAttempts: "Aplicativos",
      desiredOutcome: "Conversar com clientes", proofProject: "Reunião em inglês", motivation: "Fechar contratos", weeklyMinutes: 180,
      sessionMinutes: 25, resources: ["Somente celular"], constraints: ["Pouco tempo"], preferredMethods: ["Projetos práticos"],
      includeInDailyPlan: true, showLearningInWidget: true, showProfessorInWidget: true, createdAt: "2026-07-11T12:00:00.000Z",
    });
    const roadmap = createStarterRoadmap(intake.topic, data.profile!, intake);
    const lesson = roadmap.phases[0]!.lessons[0]!;
    data.learning = { professorEnabled: true, roadmaps: [roadmap], pendingTopics: [], activeRoadmapId: roadmap.id };
    data.preferences.widget.showLearning = true;
    data.preferences.widget.showProfessor = true;
    data.activePlan = generateLocalPlan({
      profile: data.profile!, date: "2026-07-11", requestId: "request-learning", clientId: data.installationId,
      context: { learning: { topic: roadmap.topic, nextLesson: lesson.title, estimatedMinutes: lesson.estimatedMinutes } },
    });
    expect(data.activePlan.tasks.some((task) => task.title === lesson.title && task.description?.includes("Professor Atlas"))).toBe(true);
    const payload = createWidgetPayload(data);
    expect(payload?.learning?.nextLesson).toBe(lesson.title);
    expect(payload?.appearance?.showProfessor).toBe(true);
  });

  it("rejects malformed assistant responses on the client", () => {
    expect(assistantClientResponseSchema.safeParse({ message: "ok", capture: { title: ["invalid"] } }).success).toBe(false);
  });

  it("compacts long chats before they can exceed the API payload", () => {
    const context = {
      kind: "professor",
      conversationSummary: "s".repeat(6_000),
      conversation: Array.from({ length: 50 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: "c".repeat(4_000) })),
      memories: Array.from({ length: 100 }, (_, index) => ({ id: String(index), pinned: index < 20, content: "m".repeat(500) })),
      recentHistory: Array.from({ length: 21 }, (_, index) => ({ date: `2026-06-${String(index + 1).padStart(2, "0")}`, tasks: Array(5).fill({ title: "Tarefa" }) })),
      focus: Array(30).fill({ minutes: 25 }), roadmaps: [], operations: [], habits: [],
    };
    const compact = compactAssistantContext(context, "professor");
    expect(JSON.stringify(compact).length).toBeLessThan(30_000);
    expect((compact.conversation as unknown[]).length).toBe(8);
    expect((compact.memories as unknown[]).length).toBeLessThanOrEqual(28);
  });

  it("reverses task XP and execution attributes exactly once", () => {
    const data = makeAppData();
    data.activePlan = generateLocalPlan({ profile: data.profile!, date: "2026-07-11", requestId: "request-task", clientId: data.installationId });
    const task = data.activePlan.tasks[0]!;
    const completed = toggleTaskCompletion(data, task.id);
    const reopened = toggleTaskCompletion(completed, task.id);
    expect(reopened.progress.totalXp).toBe(0);
    expect(reopened.progress.attributes.execucao).toBe(0);
  });
});
