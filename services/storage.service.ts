import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_APP_DATA,
  DEFAULT_EVOLUTION_PROFILE,
  DEFAULT_PREFERENCES,
  MIGRATION_BACKUP_KEY,
  STORAGE_KEY,
  STORAGE_VERSION,
  TEMP_STORAGE_KEYS,
} from "@/constants/defaults";
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
import { appDataSchema, historySchema, preferencesSchema, progressSchema } from "@/schemas/storage.schema";
import type { AppData } from "@/types";
import { createId } from "@/utils/ids";

export interface NexusRepository {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  clearTemporary(): Promise<void>;
  clearAll(): Promise<void>;
  exportJson(data: AppData): string;
  importJson(json: string): AppData;
  restorePreMigrationBackup(): Promise<AppData | null>;
}

function cloneDefaults(): AppData {
  return { ...(JSON.parse(JSON.stringify(DEFAULT_APP_DATA)) as AppData), installationId: createId("install") };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function migrate(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const version = typeof raw.storageVersion === "number" ? raw.storageVersion : 1;
  if (version >= STORAGE_VERSION) return raw;

  const oldPreferences = isRecord(raw.preferences) ? raw.preferences : {};
  const oldWidget = isRecord(oldPreferences.widget) ? oldPreferences.widget : {};
  const oldProgress = isRecord(raw.progress) ? raw.progress : {};
  const oldLearning = isRecord(raw.learning) ? raw.learning : {};
  const oldProfile = isRecord(raw.profile) ? raw.profile : undefined;
  const migratedProfile = oldProfile
    ? { ...oldProfile, evolution: isRecord(oldProfile.evolution) ? oldProfile.evolution : DEFAULT_EVOLUTION_PROFILE }
    : undefined;

  return {
    ...raw,
    storageVersion: STORAGE_VERSION,
    ...(migratedProfile ? { profile: migratedProfile } : {}),
    discoveryCompleted: Boolean(raw.discoveryCompleted),
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...oldPreferences,
      dashboard: isRecord(oldPreferences.dashboard) ? { ...DEFAULT_PREFERENCES.dashboard, ...oldPreferences.dashboard } : DEFAULT_PREFERENCES.dashboard,
      mascot: isRecord(oldPreferences.mascot) ? { ...DEFAULT_PREFERENCES.mascot, ...oldPreferences.mascot } : DEFAULT_PREFERENCES.mascot,
      widget: { ...DEFAULT_PREFERENCES.widget, ...oldWidget },
    },
    progress: {
      ...DEFAULT_APP_DATA.progress,
      ...oldProgress,
      attributes: isRecord(oldProgress.attributes) ? { ...DEFAULT_APP_DATA.progress.attributes, ...oldProgress.attributes } : DEFAULT_APP_DATA.progress.attributes,
      challenges: Array.isArray(oldProgress.challenges) ? oldProgress.challenges : [],
    },
    brain: isRecord(raw.brain) ? raw.brain : DEFAULT_APP_DATA.brain,
    learning: {
      ...DEFAULT_APP_DATA.learning,
      ...oldLearning,
      pendingTopics: Array.isArray(oldLearning.pendingTopics)
        ? oldLearning.pendingTopics
        : [],
    },
    weeklyReviews: Array.isArray(raw.weeklyReviews) ? raw.weeklyReviews : [],
    operations: Array.isArray(raw.operations) ? raw.operations : [],
    habits: Array.isArray(raw.habits) ? raw.habits : [],
    weeklyPlan: Array.isArray(raw.weeklyPlan) ? raw.weeklyPlan : [],
    finance: isRecord(raw.finance) ? { ...DEFAULT_APP_DATA.finance, ...raw.finance } : DEFAULT_APP_DATA.finance,
  };
}

function recoverAppData(raw: unknown): AppData {
  const defaults = cloneDefaults();
  if (!isRecord(raw)) {
    return { ...defaults, corruptionWarnings: ["Os dados locais estavam ilegíveis e foram recuperados com segurança."] };
  }
  const source = migrate(raw) as Record<string, unknown>;
  const warnings: string[] = [];
  const section = <T>(name: string, parser: { safeParse: (value: unknown) => { success: boolean; data?: T } }, fallback: T): T => {
    const result = parser.safeParse(source[name]);
    if (result.success && result.data !== undefined) return result.data;
    warnings.push(`A seção “${name}” estava corrompida e foi restaurada.`);
    return JSON.parse(JSON.stringify(fallback)) as T;
  };

  const profileResult = source.profile === undefined ? undefined : profileSchema.safeParse(source.profile);
  const activePlanResult = source.activePlan === undefined ? undefined : dailyPlanSchema.safeParse(source.activePlan);
  const draftResult = onboardingDraftSchema.safeParse(source.onboardingDraft ?? {});
  const lastGeneratedDate = typeof source.lastGeneratedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.lastGeneratedDate)
    ? source.lastGeneratedDate
    : undefined;
  const lastAiAttemptDate = typeof source.lastAiAttemptDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.lastAiAttemptDate)
    ? source.lastAiAttemptDate
    : undefined;

  if (profileResult && !profileResult.success) warnings.push("O perfil estava corrompido e foi preservado apenas onde era seguro.");
  if (activePlanResult && !activePlanResult.success) warnings.push("O plano ativo estava corrompido e foi recriado.");
  if (!draftResult.success) warnings.push("O rascunho do onboarding estava corrompido e foi limpo.");

  return {
    storageVersion: STORAGE_VERSION,
    installationId:
      typeof source.installationId === "string" && source.installationId.length >= 8
        ? source.installationId.slice(0, 120)
        : createId("install"),
    ...(profileResult?.success ? { profile: profileResult.data } : {}),
    onboardingCompleted: Boolean(source.onboardingCompleted && profileResult?.success),
    discoveryCompleted: Boolean(source.discoveryCompleted && profileResult?.success),
    onboardingDraft: draftResult.success ? draftResult.data : {},
    ...(activePlanResult?.success ? { activePlan: activePlanResult.data } : {}),
    history: section("history", { safeParse: (value) => historySchema.array().max(3660).safeParse(value) }, defaults.history),
    recurringTasks: section("recurringTasks", { safeParse: (value) => storedTaskSchema.array().max(100).safeParse(value) }, defaults.recurringTasks),
    preferences: section("preferences", { safeParse: (value) => preferencesSchema.safeParse(value) }, DEFAULT_PREFERENCES),
    progress: section("progress", { safeParse: (value) => progressSchema.safeParse(value) }, defaults.progress),
    brain: section("brain", { safeParse: (value) => brainStateSchema.safeParse(value) }, defaults.brain),
    learning: section("learning", { safeParse: (value) => learningStateSchema.safeParse(value) }, defaults.learning),
    weeklyReviews: section("weeklyReviews", { safeParse: (value) => weeklyReviewSchema.array().max(520).safeParse(value) }, defaults.weeklyReviews),
    operations: section("operations", { safeParse: (value) => operationSchema.array().max(100).safeParse(value) }, defaults.operations),
    habits: section("habits", { safeParse: (value) => habitSchema.array().max(200).safeParse(value) }, defaults.habits),
    weeklyPlan: section("weeklyPlan", { safeParse: (value) => weeklyPlanItemSchema.array().max(1000).safeParse(value) }, defaults.weeklyPlan),
    finance: (() => {
      const value = source.finance;
      if (!isRecord(value)) return defaults.finance;
      const candidate = { ...defaults.finance, ...value };
      const valid = typeof candidate.monthlyGoal === "number" && typeof candidate.monthlyRevenue === "number" && typeof candidate.prospectsToday === "number" && typeof candidate.followUpsPending === "number" && typeof candidate.activeClients === "number" && typeof candidate.closedDeals === "number" && typeof candidate.updatedAt === "string";
      if (!valid) { warnings.push("A seção “finance” estava corrompida e foi restaurada."); return defaults.finance; }
      return candidate;
    })(),
    ...(lastGeneratedDate ? { lastGeneratedDate } : {}),
    ...(lastAiAttemptDate ? { lastAiAttemptDate } : {}),
    corruptionWarnings: [
      ...(Array.isArray(source.corruptionWarnings)
        ? source.corruptionWarnings.filter((item): item is string => typeof item === "string").slice(-10)
        : []),
      ...warnings,
    ].slice(-20),
  };
}

class AsyncStorageRepository implements NexusRepository {
  private saveQueue: Promise<void> = Promise.resolve();

  async load(): Promise<AppData> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return cloneDefaults();
      const parsed = JSON.parse(json) as unknown;
      const version = isRecord(parsed) && typeof parsed.storageVersion === "number" ? parsed.storageVersion : 1;
      if (version < STORAGE_VERSION) {
        await AsyncStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: parsed }));
      }
      return recoverAppData(parsed);
    } catch {
      return { ...cloneDefaults(), corruptionWarnings: ["Não foi possível ler os dados locais. Uma base segura foi carregada."] };
    }
  }

  async save(data: AppData): Promise<void> {
    const candidate = { ...data, storageVersion: STORAGE_VERSION };
    const validation = appDataSchema.safeParse(candidate);
    if (!validation.success) {
      throw new Error("O estado local não passou pela validação de segurança.");
    }
    const json = JSON.stringify(candidate);
    this.saveQueue = this.saveQueue.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, json));
    return this.saveQueue;
  }

  async clearTemporary(): Promise<void> {
    await AsyncStorage.multiRemove(TEMP_STORAGE_KEYS);
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([STORAGE_KEY, MIGRATION_BACKUP_KEY, ...TEMP_STORAGE_KEYS]);
  }

  exportJson(data: AppData): string {
    return JSON.stringify({ app: "Nexus AI", version: "2", storageVersion: STORAGE_VERSION, exportedAt: new Date().toISOString(), data: { ...data, storageVersion: STORAGE_VERSION } }, null, 2);
  }

  importJson(json: string): AppData {
    if (json.length > 8_000_000) throw new Error("O backup ultrapassa o limite de 8 MB.");
    const parsed = JSON.parse(json) as unknown;
    const payload = isRecord(parsed) && "data" in parsed ? parsed.data : parsed;
    const recovered = recoverAppData(payload);
    if (!recovered.profile && recovered.onboardingCompleted) throw new Error("O backup não contém um perfil válido.");
    return recovered;
  }

  async restorePreMigrationBackup(): Promise<AppData | null> {
    const json = await AsyncStorage.getItem(MIGRATION_BACKUP_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    const payload = isRecord(parsed) && "data" in parsed ? parsed.data : parsed;
    return recoverAppData(payload);
  }
}

export const nexusRepository: NexusRepository = new AsyncStorageRepository();
export { recoverAppData };
