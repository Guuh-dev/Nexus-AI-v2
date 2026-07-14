import { z } from "zod";
import { CATEGORIES, EVOLUTION_AREAS } from "@/types";

const id = z.string().trim().min(1).max(120);
const shortText = z.string().trim().min(1).max(160);
const mediumText = z.string().trim().max(800);
const dateTime = z.string().datetime();

export const evolutionProfileSchema = z.object({
  primaryAreas: z.array(z.enum(EVOLUTION_AREAS)).min(1).max(EVOLUTION_AREAS.length),
  secondaryAreas: z.array(z.enum(EVOLUTION_AREAS)).max(EVOLUTION_AREAS.length),
  customAreas: z.array(z.string().trim().min(2).max(60)).max(8),
  currentSituation: mediumText,
  desiredIdentity: z.string().trim().max(500),
  biggestObstacles: z.array(z.string().trim().min(2).max(120)).max(10),
  procrastinationTriggers: z.array(z.string().trim().min(2).max(120)).max(10),
  strengths: z.array(z.string().trim().min(2).max(120)).max(10),
  learningStyle: z.enum(["visual", "pratica", "leitura", "explicacao", "mista"]),
  accountabilityStyle: z.enum(["gentil", "direta", "competitiva", "analitica"]),
  sessionLength: z.union([z.literal(15), z.literal(25), z.literal(45), z.literal(60), z.literal(90)]),
  weeklyLearningMinutes: z.number().int().min(30).max(3000),
  challengeMode: z.enum(["desativado", "sutil", "equilibrado", "gamer", "operacao", "boss"]),
  wantsBossChallenges: z.boolean(),
  professorScope: z.enum(["especifico", "variedade", "depois"]),
  professorTopics: z.array(z.string().trim().min(2).max(120)).max(12),
  professorOutcome: z.string().trim().max(600),
}).strict();

const assistantActionFields = {
  id,
  title: shortText,
  description: mediumText,
  status: z.enum(["proposed", "accepted", "rejected"]),
};

const assistantActionSchema = z.discriminatedUnion("type", [
  z.object({
    ...assistantActionFields,
    type: z.literal("update_goal"),
    payload: z.object({ mainGoal: z.string().trim().min(10).max(600) }).strict(),
  }).strict(),
  z.object({
    ...assistantActionFields,
    type: z.enum(["replan", "create_task", "create_roadmap", "save_memory", "start_operation"]),
    payload: z.record(z.string(), z.unknown()),
  }).strict(),
]);

const chatMessageSchema = z.object({
  id,
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1).max(12_000),
  createdAt: dateTime,
  actions: z.array(assistantActionSchema).max(8).optional(),
  failed: z.boolean().optional(),
}).strict();

const chatThreadSchema = z.object({
  id,
  kind: z.enum(["brain", "professor"]),
  title: z.string().trim().min(1).max(100),
  messages: z.array(chatMessageSchema).max(1000),
  summary: z.string().trim().max(6000),
  createdAt: dateTime,
  updatedAt: dateTime,
  archived: z.boolean(),
}).strict();

const memoryItemSchema = z.object({
  id,
  kind: z.enum(["goal", "preference", "decision", "pattern", "obstacle", "learning", "fact"]),
  content: z.string().trim().min(1).max(500),
  sourceThreadId: id.optional(),
  confidence: z.number().min(0).max(1),
  pinned: z.boolean(),
  createdAt: dateTime,
  updatedAt: dateTime,
}).strict();

export const brainStateSchema = z.object({
  threads: z.array(chatThreadSchema).max(200),
  memories: z.array(memoryItemSchema).max(1000),
  activeBrainThreadId: id.optional(),
  activeProfessorThreadId: id.optional(),
}).strict();

const roadmapLessonSchema = z.object({
  id,
  title: shortText,
  description: z.string().trim().max(700),
  objective: z.string().trim().max(400).optional(),
  steps: z.array(z.string().trim().min(2).max(240)).min(1).max(6).optional(),
  deliverable: z.string().trim().max(400).optional(),
  successCriteria: z.string().trim().max(400).optional(),
  estimatedMinutes: z.number().int().min(5).max(360),
  completed: z.boolean(),
  completedAt: dateTime.optional(),
  evidence: z.object({
    submission: z.string().trim().min(2).max(4000),
    status: z.enum(["submitted", "needs_revision", "accepted"]),
    submittedAt: dateTime,
    feedback: z.string().trim().min(2).max(2000).optional(),
    nextAdjustment: z.string().trim().min(2).max(1000).optional(),
    reviewedAt: dateTime.optional(),
  }).strict().optional(),
}).strict();

const roadmapPhaseSchema = z.object({
  id,
  title: shortText,
  objective: z.string().trim().max(500),
  order: z.number().int().min(0).max(100),
  lessons: z.array(roadmapLessonSchema).min(1).max(30),
}).strict();

export const professorIntakeSchema = z.object({
  topic: z.string().trim().min(2).max(160),
  knowledgeLevel: z.enum(["zero", "basico", "intermediario", "avancado"]),
  knownConcepts: z.string().trim().max(1200),
  previousAttempts: z.string().trim().max(1200),
  desiredOutcome: z.string().trim().min(2).max(800),
  proofProject: z.string().trim().max(800),
  motivation: z.string().trim().max(800),
  deadline: z.string().date().optional(),
  weeklyMinutes: z.number().int().min(30).max(3000),
  sessionMinutes: z.union([z.literal(15), z.literal(25), z.literal(45), z.literal(60), z.literal(90)]),
  resources: z.array(z.string().trim().min(2).max(120)).max(20),
  constraints: z.array(z.string().trim().min(2).max(160)).max(20),
  preferredMethods: z.array(z.string().trim().min(2).max(120)).max(20),
  includeInDailyPlan: z.boolean(),
  showLearningInWidget: z.boolean(),
  showProfessorInWidget: z.boolean(),
  createdAt: dateTime,
}).strict();

export const roadmapSchema = z.object({
  id,
  topic: z.string().trim().min(2).max(160),
  outcome: z.string().trim().max(600),
  currentLevel: z.enum(["iniciante", "intermediario", "avancado"]),
  weeklyMinutes: z.number().int().min(30).max(3000),
  intake: professorIntakeSchema.optional(),
  phases: z.array(roadmapPhaseSchema).min(1).max(12),
  intent: z.enum(["technical", "applied_technical", "learning", "product", "commercial", "clients", "financial", "career", "exam", "health", "general"]).optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  archivedAt: dateTime.optional(),
  createdAt: dateTime,
  updatedAt: dateTime,
}).strict();

export const learningStateSchema = z.object({
  professorEnabled: z.boolean(),
  roadmaps: z.array(roadmapSchema).max(50),
  pendingTopics: z.array(z.string().trim().min(2).max(160)).max(24),
  activeRoadmapId: id.optional(),
  lastCheckInAt: dateTime.optional(),
}).strict();

export const weeklyReviewSchema = z.object({
  id,
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  completionPercentage: z.number().min(0).max(100),
  xpEarned: z.number().int().min(0).max(1_000_000),
  focusMinutes: z.number().int().min(0).max(100_000),
  consistencyScore: z.number().min(0).max(100).nullable(),
  confidence: z.enum(["insufficient", "low", "medium", "high"]).optional(),
  statements: z.array(z.object({
    kind: z.enum(["fact", "hypothesis", "insufficient"]),
    text: z.string().trim().min(2).max(500),
    evidenceKeys: z.array(z.string().trim().min(1).max(80)).max(12),
  }).strict()).max(20).optional(),
  highlights: z.array(shortText).max(12),
  patterns: z.array(shortText).max(12),
  keep: z.array(shortText).max(12),
  cut: z.array(shortText).max(12),
  nextWeekFocus: z.string().trim().max(500),
  challenge: z.string().trim().max(500),
  source: z.enum(["ai", "local"]),
  createdAt: dateTime,
}).strict();

const operationPhaseSchema = z.object({ id, title: shortText, completed: z.boolean(), milestone: mediumText }).strict();
export const operationSchema = z.object({
  id,
  title: shortText,
  objective: mediumText,
  deadline: z.string().date(),
  status: z.enum(["active", "paused", "completed"]),
  phases: z.array(operationPhaseSchema).min(1).max(20),
  specialXp: z.number().int().min(0).max(10_000),
  createdAt: dateTime,
  completedAt: dateTime.optional(),
}).strict();

export const habitSchema = z.object({
  id,
  title: shortText,
  category: z.enum(CATEGORIES),
  activeDays: z.array(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)])).min(1).max(7),
  targetPerWeek: z.number().int().min(1).max(7),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  currentStreak: z.number().int().min(0).max(100_000),
  bestStreak: z.number().int().min(0).max(100_000),
  completedDates: z.array(z.string().date()).max(3660),
  pausedUntil: z.string().date().optional(),
  createdAt: dateTime,
}).strict();

export const weeklyPlanItemSchema = z.object({
  id,
  date: z.string().date(),
  title: shortText,
  description: z.string().trim().max(300).optional(),
  context: z.string().trim().max(300).optional(),
  firstStep: z.string().trim().max(240).optional(),
  expectedResult: z.string().trim().max(300).optional(),
  doneWhen: z.string().trim().max(300).optional(),
  category: z.enum(CATEGORIES),
  estimatedMinutes: z.number().int().min(5).max(720),
  priority: z.enum(["alta", "media", "baixa"]),
  recurring: z.boolean().optional(),
  completed: z.boolean(),
}).strict();
