import { z } from "zod";
import { dailyPlanSchema, storedTaskSchema } from "@/schemas/daily-plan.schema";
import {
  brainStateSchema,
  habitSchema,
  learningStateSchema,
  operationSchema,
  weeklyPlanItemSchema,
  weeklyReviewSchema,
} from "@/schemas/expansion.schema";
import { onboardingDraftSchema, profileSchema } from "@/schemas/profile.schema";

const widgetPreferencesSchema = z.object({
  background: z.enum(["solid", "amoled", "translucent"]),
  style: z.enum(["nexus", "amoled", "transparent", "glass", "pixel", "minimal", "gamer", "privacy"]),
  preferredSize: z.enum(["1x1", "2x1", "2x2", "3x2", "4x1", "4x2", "4x3", "4x4", "5x2"]),
  showMascot: z.boolean(),
  mascot: z.enum(["nexus", "atlas", "nova", "byte", "pulse"]),
  showProfessor: z.boolean(),
  showLearning: z.boolean(),
  showMission: z.boolean(),
  showTasks: z.boolean(),
  showXp: z.boolean(),
  showLevel: z.boolean(),
  taskCount: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  showStreak: z.boolean(),
  progressStyle: z.enum(["bar", "circle", "text", "number"]),
  privacyMode: z.boolean(),
  fontScale: z.enum(["pequena", "normal", "grande"]),
  opacity: z.number().min(0.2).max(1),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict();

const dashboardSection = z.enum(["mission", "tasks", "smart", "quick", "progress", "operation", "habits", "message"]);
const dashboardPreferencesSchema = z.object({
  preset: z.enum(["original", "minimal", "productivity", "gamer", "focus_first", "progress_first", "compact", "cinematic", "custom"]),
  density: z.enum(["compacta", "confortavel", "ampla"]),
  glow: z.enum(["desligado", "sutil", "medio", "intenso"]),
  backgroundEffect: z.enum(["nenhum", "grade", "estrelas", "aurora", "scanlines"]),
  sections: z.array(dashboardSection).min(1).max(8),
  hiddenSections: z.array(dashboardSection).max(8),
}).strict();

const mascotPreferencesSchema = z.object({
  primary: z.literal("nexus"),
  companion: z.enum(["atlas", "nova", "byte", "pulse"]),
  showCompanion: z.boolean(),
  speechEnabled: z.boolean(),
  unlocked: z.array(z.enum(["nexus", "atlas", "nova", "byte", "pulse"])).min(1).max(5),
  skin: z.enum(["classic", "shadow", "galaxy", "emerald", "gold", "ice", "rose", "professor"]),
  unlockedSkins: z.array(z.enum(["classic", "shadow", "galaxy", "emerald", "gold", "ice", "rose", "professor"])).min(1).max(8),
  accessories: z.array(z.string().trim().min(1).max(80)).max(50),
  equippedAccessory: z.string().trim().min(1).max(80).optional(),
  professorVariant: z.enum(["classic", "emerald", "gold", "ice", "rose"]),
}).strict();

export const preferencesSchema = z.object({
  theme: z.enum(["nexus", "amoled", "oneui", "hud", "aurora", "ocean", "ember", "rose", "monochrome", "custom"]),
  customAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  haptics: z.boolean(),
  sound: z.boolean(),
  reducedMotion: z.boolean(),
  notificationEnabled: z.boolean(),
  notificationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  gamificationMode: z.enum(["desativado", "sutil", "equilibrado", "gamer", "operacao", "boss"]),
  dashboard: dashboardPreferencesSchema,
  mascot: mascotPreferencesSchema,
  widget: widgetPreferencesSchema,
}).strict();

export const focusSessionSchema = z.object({
  id: z.string().min(1).max(120),
  taskId: z.string().min(1).max(120).optional(),
  taskTitle: z.string().min(1).max(120),
  plannedMinutes: z.number().int().min(1).max(360),
  elapsedSeconds: z.number().int().min(0).max(86_400),
  xp: z.number().int().min(0).max(500),
  status: z.enum(["completed", "cancelled"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  mode: z.enum(["pomodoro", "profundo", "fluxo", "sprint", "personalizado"]).optional(),
  intention: z.string().trim().max(300).optional(),
  reflection: z.string().trim().max(500).optional(),
  ambientSound: z.enum(["nenhum", "chuva", "floresta", "cafeteria", "ruido_marrom", "ruido_branco", "espaco"]).optional(),
  category: z.enum(["desenvolvimento", "estudos", "dinheiro", "saude", "organizacao", "pessoal"]).optional(),
}).strict();

const achievementSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(240),
  icon: z.string().min(1).max(20),
  unlockedAt: z.string().datetime(),
}).strict();

const challengeSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  description: z.string().max(500),
  type: z.enum(["daily", "weekly", "boss"]),
  target: z.number().int().min(1).max(100_000),
  progress: z.number().int().min(0).max(100_000),
  xpReward: z.number().int().min(0).max(10_000),
  completed: z.boolean(),
  expiresAt: z.string().datetime(),
}).strict();

export const historySchema = z.object({
  date: z.string().date(),
  plan: dailyPlanSchema,
  completedTasks: z.number().int().min(0).max(100),
  totalTasks: z.number().int().min(0).max(100),
  completionPercentage: z.number().min(0).max(100),
  xpEarned: z.number().int().min(0).max(100_000),
  focusMinutes: z.number().int().min(0).max(1440),
  countedForStreak: z.boolean(),
}).strict();

export const progressSchema = z.object({
  totalXp: z.number().int().min(0).max(1_000_000_000),
  currentStreak: z.number().int().min(0).max(100_000),
  bestStreak: z.number().int().min(0).max(100_000),
  focusSessions: z.array(focusSessionSchema).max(10_000),
  achievements: z.array(achievementSchema).max(1_000),
  attributes: z.object({
    foco: z.number().int().min(0).max(1_000_000),
    execucao: z.number().int().min(0).max(1_000_000),
    consistencia: z.number().int().min(0).max(1_000_000),
    disciplina: z.number().int().min(0).max(1_000_000),
  }).strict(),
  challenges: z.array(challengeSchema).max(100),
}).strict();

export const appDataSchema = z.object({
  storageVersion: z.number().int().min(1).max(100),
  installationId: z.string().min(8).max(120),
  profile: profileSchema.optional(),
  onboardingCompleted: z.boolean(),
  discoveryCompleted: z.boolean(),
  onboardingDraft: onboardingDraftSchema,
  activePlan: dailyPlanSchema.optional(),
  history: z.array(historySchema).max(3660),
  recurringTasks: z.array(storedTaskSchema).max(100),
  preferences: preferencesSchema,
  progress: progressSchema,
  brain: brainStateSchema,
  learning: learningStateSchema,
  weeklyReviews: z.array(weeklyReviewSchema).max(520),
  operations: z.array(operationSchema).max(100),
  habits: z.array(habitSchema).max(200),
  weeklyPlan: z.array(weeklyPlanItemSchema).max(1000),
  lastGeneratedDate: z.string().date().optional(),
  lastAiAttemptDate: z.string().date().optional(),
  corruptionWarnings: z.array(z.string().max(300)).max(20),
}).strict();
