import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_APP_DATA,
  DEFAULT_EVOLUTION_PROFILE,
  DEFAULT_PREFERENCES,
  BACKUP_MAX_BYTES,
  IMPORT_ROLLBACK_KEY,
  LEGACY_MIGRATION_BACKUP_KEYS,
  MIGRATION_BACKUP_KEY,
  STORAGE_KEY,
  STORAGE_VERSION,
  TEMP_STORAGE_KEYS,
} from "@/constants/defaults";
import { dailyPlanSchema, storedTaskSchema } from "@/schemas/daily-plan.schema";
import {
  brainStateSchema,
  evolutionProfileSchema,
  habitSchema,
  learningStateSchema,
  operationSchema,
  weeklyPlanItemSchema,
  weeklyReviewSchema,
} from "@/schemas/expansion.schema";
import { onboardingDraftSchema, profileSchema } from "@/schemas/profile.schema";
import {
  appDataSchema,
  historySchema,
  preferencesSchema,
  progressSchema,
} from "@/schemas/storage.schema";
import {
  familyFromWidgetSize,
  widgetConfigurationFromPreferences,
  widgetPreferencesPatchFromConfiguration,
  type WidgetFamily,
} from "@/features/widget/render-spec";
import { resolveThemeId } from "@/theme/theme";
import type {
  AppData,
  BrainState,
  LearningState,
  OnboardingDraft,
  Preferences,
  Profile,
  ProgressState,
  WidgetPreferences,
} from "@/types";
import { createId } from "@/utils/ids";
import { utf8ByteLength } from "@/utils/text";

export type BackupImportPreview = {
  storageVersion: number;
  exportedAt?: string;
  nickname: string;
  activeTasks: number;
  roadmaps: number;
  conversations: number;
  focusSessions: number;
};

export interface NexusRepository {
  load(): Promise<AppData>;
  readOnlyReason(): string | null;
  save(data: AppData): Promise<void>;
  clearTemporary(): Promise<void>;
  clearAll(): Promise<void>;
  exportJson(data: AppData): string;
  importJson(json: string): AppData;
  inspectImport(json: string): BackupImportPreview;
  saveImportRollback(data: AppData): Promise<void>;
  hasImportRollback(): Promise<boolean>;
  restoreImportRollback(): Promise<AppData | null>;
  clearImportRollback(): Promise<void>;
  hasPreMigrationBackup(): Promise<boolean>;
  restorePreMigrationBackup(): Promise<AppData | null>;
}

type SafeParser<T = unknown> = {
  safeParse(value: unknown): { success: boolean; data?: T };
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneDefaults(): AppData {
  return { ...clone(DEFAULT_APP_DATA), installationId: createId("install") };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/**
 * Backups externos e snapshots pré-migração precisam carregar uma identidade
 * utilizável, não apenas nomes de seções que o recover preencheria com defaults.
 * Estados parciais de onboarding não são importáveis porque tirariam o acesso
 * imediato ao Undo disponível na área de dados.
 */
function hasMaterialAppData(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const installationId = typeof value.installationId === "string"
    ? value.installationId.trim()
    : "";
  return installationId.length >= 8 &&
    value.onboardingCompleted === true &&
    profileSchema.safeParse(value.profile).success;
}

function parseStrictImportRollback(json: string): AppData | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isRecord(parsed) || parsed.storageVersion !== STORAGE_VERSION) return null;
    const validation = appDataSchema.safeParse(parsed);
    if (!validation.success || !hasMaterialAppData(validation.data)) return null;
    return validation.data;
  } catch {
    return null;
  }
}

function parseValue<T>(parser: SafeParser<T>, value: unknown): T | undefined {
  const result = parser.safeParse(value);
  return result.success ? result.data : undefined;
}

function addWarning(warnings: string[], message: string) {
  if (!warnings.includes(message)) warnings.push(message);
}

function recoverFields<T extends object>(
  sectionName: string,
  raw: unknown,
  fallback: T,
  shape: Record<string, SafeParser>,
  warnings: string[],
): T {
  if (!isRecord(raw)) {
    if (raw !== undefined) addWarning(warnings, `A seção “${sectionName}” estava corrompida e foi restaurada.`);
    return clone(fallback);
  }

  const recovered = { ...clone(fallback) } as Record<string, unknown>;
  let invalidFields = 0;
  for (const [key, parser] of Object.entries(shape)) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const parsed = parseValue(parser, raw[key]);
    if (parsed !== undefined) recovered[key] = parsed;
    else invalidFields += 1;
  }
  if (invalidFields > 0) {
    addWarning(
      warnings,
      `Alguns campos de “${sectionName}” estavam inválidos; os demais foram preservados.`,
    );
  }
  return recovered as T;
}

function recoverArray<T>(
  sectionName: string,
  raw: unknown,
  itemParser: SafeParser<T>,
  maxItems: number,
  warnings: string[],
  keep: "first" | "last" = "last",
): T[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) addWarning(warnings, `A seção “${sectionName}” estava corrompida e foi restaurada.`);
    return [];
  }
  const recovered: T[] = [];
  const bounded = keep === "first" ? raw.slice(0, maxItems) : raw.slice(-maxItems);
  let discarded = Math.max(0, raw.length - bounded.length);
  for (const item of bounded) {
    const parsed = parseValue(itemParser, item);
    if (parsed !== undefined) recovered.push(parsed);
    else discarded += 1;
  }
  if (discarded > 0) {
    addWarning(
      warnings,
      `${discarded} item(ns) inválido(s) de “${sectionName}” foram ignorados; os válidos continuam salvos.`,
    );
  }
  return recovered;
}

const V3_WIDGET_PRESET: Record<WidgetFamily, WidgetPreferences["preset"]> = {
  mini: "streak",
  strip: "next_action",
  companion: "companion",
  mission: "mission",
  command: "tasks",
};

function migrateWidgetPreferences(
  raw: Record<string, unknown>,
  fallbackAccent: string,
): Record<string, unknown> {
  const legacy = {
    ...clone(DEFAULT_PREFERENCES.widget),
    ...raw,
  } as WidgetPreferences;
  const configuration = widgetConfigurationFromPreferences(legacy, fallbackAccent);
  const family = familyFromWidgetSize(legacy.preferredSize);
  const tapAction = ["today", "brain", "focus", "progress"].includes(configuration.tapAction)
    ? configuration.tapAction
    : "today";
  const patch = widgetPreferencesPatchFromConfiguration({
    ...configuration,
    family,
    tapAction,
  });
  return {
    ...raw,
    ...patch,
    preset: V3_WIDGET_PRESET[family],
  };
}

function migrate(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const version = typeof raw.storageVersion === "number" ? raw.storageVersion : 1;
  if (version >= STORAGE_VERSION) return raw;

  const preferences = isRecord(raw.preferences) ? raw.preferences : {};
  const widget = isRecord(preferences.widget) ? preferences.widget : {};
  const profile = isRecord(raw.profile) ? raw.profile : undefined;

  return {
    ...raw,
    storageVersion: STORAGE_VERSION,
    ...(profile
      ? {
          profile: {
            ...profile,
            evolution: isRecord(profile.evolution)
              ? profile.evolution
              : DEFAULT_EVOLUTION_PROFILE,
          },
        }
      : {}),
    preferences: {
      ...preferences,
      theme: resolveThemeId(typeof preferences.theme === "string" ? preferences.theme : undefined),
      widget: migrateWidgetPreferences(
        widget,
        typeof preferences.customAccent === "string"
          ? preferences.customAccent
          : DEFAULT_PREFERENCES.customAccent,
      ),
    },
  };
}

function recoverPreferences(raw: unknown, warnings: string[]): Preferences {
  const source = isRecord(raw) ? { ...raw } : {};
  const originalTheme = typeof source.theme === "string" ? source.theme : undefined;
  const resolvedTheme = resolveThemeId(originalTheme);
  if (originalTheme && originalTheme !== resolvedTheme) {
    addWarning(warnings, `O tema antigo “${originalTheme}” foi convertido para “${resolvedTheme}”.`);
  }

  source.theme = resolvedTheme;
  source.dashboard = recoverFields(
    "preferências do painel legado",
    source.dashboard,
    DEFAULT_PREFERENCES.dashboard,
    preferencesSchema.shape.dashboard.shape,
    warnings,
  );
  source.mascot = recoverFields(
    "preferências do Companion",
    source.mascot,
    DEFAULT_PREFERENCES.mascot,
    preferencesSchema.shape.mascot.shape,
    warnings,
  );
  source.widget = recoverFields(
    "preferências do widget",
    source.widget,
    DEFAULT_PREFERENCES.widget,
    preferencesSchema.shape.widget.shape,
    warnings,
  );

  const recovered = recoverFields(
    "preferências",
    source,
    DEFAULT_PREFERENCES,
    preferencesSchema.shape,
    warnings,
  );
  return preferencesSchema.parse(recovered);
}

function recoverProgress(raw: unknown, warnings: string[]): ProgressState {
  const source = isRecord(raw) ? { ...raw } : {};
  source.attributes = recoverFields(
    "atributos de progresso",
    source.attributes,
    DEFAULT_APP_DATA.progress.attributes,
    progressSchema.shape.attributes.shape,
    warnings,
  );
  source.focusSessions = recoverArray(
    "sessões de foco",
    source.focusSessions,
    progressSchema.shape.focusSessions.element,
    10_000,
    warnings,
  );
  source.achievements = recoverArray(
    "conquistas",
    source.achievements,
    progressSchema.shape.achievements.element,
    1_000,
    warnings,
  );
  source.challenges = recoverArray(
    "desafios legados",
    source.challenges,
    progressSchema.shape.challenges.element,
    100,
    warnings,
  );
  source.challengeRewardLedger = recoverArray(
    "ledger de recompensas dos desafios",
    source.challengeRewardLedger,
    progressSchema.shape.challengeRewardLedger.element,
    20_000,
    warnings,
    "first",
  );
  // Versões anteriores usavam `completed` como a única prova do prêmio.
  // Promova essa evidência para o ledger antes de qualquer refresh diário.
  source.challengeRewardLedger = Array.from(new Set([
    ...(source.challengeRewardLedger as string[]),
    ...(source.challenges as ProgressState["challenges"])
      .filter((challenge) => challenge.completed)
      .map((challenge) => challenge.id),
  ])).slice(0, 20_000);
  const recovered = recoverFields(
    "progresso",
    source,
    DEFAULT_APP_DATA.progress,
    progressSchema.shape,
    warnings,
  );
  return progressSchema.parse(recovered);
}

function recoverBrain(raw: unknown, warnings: string[]): BrainState {
  const source = isRecord(raw) ? { ...raw } : {};
  const threads = recoverArray<BrainState["threads"][number]>(
    "conversas do Brain",
    source.threads,
    brainStateSchema.shape.threads.element,
    200,
    warnings,
    "first",
  );
  source.threads = threads;
  source.memories = recoverArray(
    "memórias do Brain",
    source.memories,
    brainStateSchema.shape.memories.element,
    1_000,
    warnings,
  );
  if (
    typeof source.activeBrainThreadId === "string" &&
    !threads.some((thread) => thread.id === source.activeBrainThreadId)
  ) delete source.activeBrainThreadId;
  if (
    typeof source.activeProfessorThreadId === "string" &&
    !threads.some((thread) => thread.id === source.activeProfessorThreadId)
  ) delete source.activeProfessorThreadId;
  const recovered = recoverFields(
    "Brain",
    source,
    DEFAULT_APP_DATA.brain,
    brainStateSchema.shape,
    warnings,
  );
  return brainStateSchema.parse(recovered);
}

function recoverLearning(raw: unknown, warnings: string[]): LearningState {
  const source = isRecord(raw) ? { ...raw } : {};
  const roadmaps = recoverArray<LearningState["roadmaps"][number]>(
    "roadmaps",
    source.roadmaps,
    learningStateSchema.shape.roadmaps.element,
    50,
    warnings,
  );
  source.roadmaps = roadmaps;
  source.pendingTopics = recoverArray(
    "tópicos pendentes",
    source.pendingTopics,
    learningStateSchema.shape.pendingTopics.element,
    24,
    warnings,
    "first",
  );
  const selectedRoadmap = typeof source.activeRoadmapId === "string"
    ? roadmaps.find((roadmap) => roadmap.id === source.activeRoadmapId)
    : undefined;
  if (!selectedRoadmap || selectedRoadmap.status === "archived") {
    source.activeRoadmapId = roadmaps.find((roadmap) => roadmap.status === "active")?.id
      ?? roadmaps.find((roadmap) => roadmap.status === "paused")?.id;
    if (!source.activeRoadmapId) delete source.activeRoadmapId;
  }
  const recovered = recoverFields(
    "aprendizado",
    source,
    DEFAULT_APP_DATA.learning,
    learningStateSchema.shape,
    warnings,
  );
  return learningStateSchema.parse(recovered);
}

function recoverProfileAndDraft(
  rawProfile: unknown,
  rawDraft: unknown,
  warnings: string[],
): { profile?: Profile; onboardingDraft: OnboardingDraft } {
  const profileSource = isRecord(rawProfile) ? { ...rawProfile } : undefined;
  if (profileSource && isRecord(profileSource.evolution)) {
    profileSource.evolution = recoverFields(
      "diagnóstico pessoal",
      profileSource.evolution,
      DEFAULT_EVOLUTION_PROFILE,
      evolutionProfileSchema.shape,
      warnings,
    );
  }
  const profileResult = profileSource ? profileSchema.safeParse(profileSource) : undefined;
  if (profileSource && !profileResult?.success) {
    addWarning(
      warnings,
      "O perfil precisa de revisão; os campos válidos foram mantidos no rascunho.",
    );
  }

  const draftSource = {
    ...(profileSource ?? {}),
    ...(isRecord(rawDraft) ? rawDraft : {}),
  };
  const recoveredDraft: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(profileSchema.shape)) {
    if (!Object.prototype.hasOwnProperty.call(draftSource, key)) continue;
    const parsed = parseValue<unknown>(parser as SafeParser, draftSource[key]);
    if (parsed !== undefined) recoveredDraft[key] = parsed;
  }
  const draftResult = onboardingDraftSchema.safeParse(recoveredDraft);

  return {
    ...(profileResult?.success ? { profile: profileResult.data } : {}),
    onboardingDraft: draftResult.success ? draftResult.data : {},
  };
}

function recoverAppData(raw: unknown): AppData {
  const defaults = cloneDefaults();
  if (!isRecord(raw)) {
    return {
      ...defaults,
      corruptionWarnings: ["Os dados locais estavam ilegíveis e foram recuperados com segurança."],
    };
  }
  const incomingVersion = typeof raw.storageVersion === "number" ? raw.storageVersion : 1;
  if (incomingVersion > STORAGE_VERSION) {
    throw new Error(
      `Este backup usa storage v${incomingVersion}; atualize o Nexus antes de importá-lo.`,
    );
  }

  const source = migrate(raw) as Record<string, unknown>;
  const warnings: string[] = [];
  const profileState = recoverProfileAndDraft(source.profile, source.onboardingDraft, warnings);
  const activePlan = parseValue(dailyPlanSchema, source.activePlan);
  if (source.activePlan !== undefined && !activePlan) {
    addWarning(warnings, "O plano ativo estava corrompido e foi descartado; o histórico válido foi mantido.");
  }
  const lastGeneratedDate =
    typeof source.lastGeneratedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.lastGeneratedDate)
      ? source.lastGeneratedDate
      : undefined;
  const lastAiAttemptDate =
    typeof source.lastAiAttemptDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.lastAiAttemptDate)
      ? source.lastAiAttemptDate
      : undefined;

  const recovered: AppData = {
    storageVersion: STORAGE_VERSION,
    installationId:
      typeof source.installationId === "string" && source.installationId.length >= 8
        ? source.installationId.slice(0, 120)
        : createId("install"),
    ...(profileState.profile ? { profile: profileState.profile } : {}),
    onboardingCompleted: Boolean(source.onboardingCompleted && profileState.profile),
    discoveryCompleted: Boolean(source.discoveryCompleted && profileState.profile),
    onboardingDraft: profileState.onboardingDraft,
    ...(activePlan ? { activePlan } : {}),
    history: recoverArray("histórico", source.history, historySchema, 3_660, warnings),
    recurringTasks: recoverArray(
      "tarefas recorrentes",
      source.recurringTasks,
      storedTaskSchema,
      100,
      warnings,
    ),
    preferences: recoverPreferences(source.preferences, warnings),
    progress: recoverProgress(source.progress, warnings),
    brain: recoverBrain(source.brain, warnings),
    learning: recoverLearning(source.learning, warnings),
    weeklyReviews: recoverArray(
      "revisões semanais",
      source.weeklyReviews,
      weeklyReviewSchema,
      520,
      warnings,
    ),
    operations: recoverArray(
      "operações legadas",
      source.operations,
      operationSchema,
      100,
      warnings,
    ),
    habits: recoverArray("hábitos legados", source.habits, habitSchema, 200, warnings),
    weeklyPlan: recoverArray(
      "planejamento semanal legado",
      source.weeklyPlan,
      weeklyPlanItemSchema,
      1_000,
      warnings,
    ),
    finance: recoverFields(
      "dados financeiros legados",
      source.finance,
      defaults.finance,
      appDataSchema.shape.finance.shape,
      warnings,
    ),
    ...(lastGeneratedDate ? { lastGeneratedDate } : {}),
    ...(lastAiAttemptDate ? { lastAiAttemptDate } : {}),
    corruptionWarnings: [
      ...(Array.isArray(source.corruptionWarnings)
        ? source.corruptionWarnings.filter((item): item is string => typeof item === "string").slice(-8)
        : []),
      ...warnings,
    ].slice(-20),
  };

  const validation = appDataSchema.safeParse(recovered);
  if (!validation.success) {
    throw new Error("A migração local não produziu um estado válido.");
  }
  return validation.data;
}

class AsyncStorageRepository implements NexusRepository {
  private saveQueue: Promise<void> = Promise.resolve();
  private writeLockReason: string | null = null;

  private enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const queued = this.saveQueue
      .catch(() => undefined)
      .then(operation);
    this.saveQueue = queued;
    return queued;
  }

  readOnlyReason(): string | null {
    return this.writeLockReason;
  }

  async load(): Promise<AppData> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      this.writeLockReason = "O armazenamento local não pôde ser lido. Reinicie o aplicativo antes de tentar qualquer alteração.";
      return {
        ...cloneDefaults(),
        corruptionWarnings: ["Não foi possível ler os dados locais; nenhuma escrita foi permitida."],
      };
    }

    if (!json) {
      this.writeLockReason = null;
      return cloneDefaults();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json) as unknown;
    } catch {
      this.writeLockReason = "Os dados locais não puderam ser interpretados. O arquivo original foi preservado sem sobrescrita.";
      return {
        ...cloneDefaults(),
        corruptionWarnings: ["Os dados locais estão ilegíveis; nenhuma escrita foi permitida."],
      };
    }

    const version = isRecord(parsed) && typeof parsed.storageVersion === "number"
      ? parsed.storageVersion
      : 1;
    if (version > STORAGE_VERSION) {
      this.writeLockReason = "Os dados locais foram criados por uma versão mais nova do Nexus. Atualize o aplicativo para acessá-los sem risco.";
      return {
        ...cloneDefaults(),
        corruptionWarnings: [
          `Os dados locais usam storage v${version}. Eles foram preservados sem alteração; atualize o app para acessá-los.`,
        ],
      };
    }

    let recovered: AppData;
    try {
      recovered = recoverAppData(parsed);
    } catch {
      this.writeLockReason = "A recuperação dos dados locais falhou. O estado original foi preservado para diagnóstico ou restauração.";
      return {
        ...cloneDefaults(),
        corruptionWarnings: ["A recuperação local falhou; nenhuma escrita foi permitida."],
      };
    }

    if (version < STORAGE_VERSION) {
      try {
        await AsyncStorage.setItem(
          MIGRATION_BACKUP_KEY,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            fromVersion: version,
            toVersion: STORAGE_VERSION,
            data: parsed,
          }),
        );
      } catch {
        this.writeLockReason = "Não foi possível criar a cópia de segurança anterior à migração. Os dados originais foram mantidos e esta instalação ficou somente leitura.";
        return {
          ...recovered,
          corruptionWarnings: [
            ...recovered.corruptionWarnings,
            "A migração foi interrompida porque o snapshot de segurança não pôde ser gravado.",
          ].slice(-20),
        };
      }
    }

    this.writeLockReason = null;
    return recovered;
  }

  async save(data: AppData): Promise<void> {
    if (this.writeLockReason) {
      throw new Error("O armazenamento está protegido contra escrita para preservar os dados existentes.");
    }
    const candidate = { ...data, storageVersion: STORAGE_VERSION };
    const validation = appDataSchema.safeParse(candidate);
    if (!validation.success) {
      throw new Error("O estado local não passou pela validação de segurança.");
    }
    const json = JSON.stringify(validation.data);
    return this.enqueueWrite(() => AsyncStorage.setItem(STORAGE_KEY, json));
  }

  async clearTemporary(): Promise<void> {
    await this.enqueueWrite(() => AsyncStorage.multiRemove(TEMP_STORAGE_KEYS));
  }

  async clearAll(): Promise<void> {
    await this.enqueueWrite(async () => {
      await AsyncStorage.multiRemove([
        STORAGE_KEY,
        MIGRATION_BACKUP_KEY,
        IMPORT_ROLLBACK_KEY,
        ...LEGACY_MIGRATION_BACKUP_KEYS,
        ...TEMP_STORAGE_KEYS,
      ]);
      this.writeLockReason = null;
    });
  }

  exportJson(data: AppData): string {
    const json = JSON.stringify(
      {
        app: "Nexus AI",
        version: "3",
        storageVersion: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        data: { ...data, storageVersion: STORAGE_VERSION },
      },
      null,
      2,
    );
    if (utf8ByteLength(json) > BACKUP_MAX_BYTES) {
      throw new Error("O backup ultrapassa o limite seguro de 8 MB.");
    }
    return json;
  }

  importJson(json: string): AppData {
    if (utf8ByteLength(json) > BACKUP_MAX_BYTES) throw new Error("O backup ultrapassa o limite de 8 MB.");
    const parsed = JSON.parse(json) as unknown;
    const payload = isRecord(parsed) && "data" in parsed ? parsed.data : parsed;
    if (
      isRecord(payload) &&
      typeof payload.storageVersion === "number" &&
      payload.storageVersion > STORAGE_VERSION
    ) {
      throw new Error(
        `Este backup usa storage v${payload.storageVersion}; atualize o Nexus antes de importá-lo.`,
      );
    }
    if (!hasMaterialAppData(payload)) {
      throw new Error("Este arquivo não contém uma identidade material e concluída do Nexus.");
    }
    const recovered = recoverAppData(payload);
    if (!recovered.profile || !recovered.onboardingCompleted) {
      throw new Error("O backup não contém um perfil concluído e válido.");
    }
    return recovered;
  }

  inspectImport(json: string): BackupImportPreview {
    const parsed = JSON.parse(json) as unknown;
    const imported = this.importJson(json);
    const exportedAt = isRecord(parsed) && typeof parsed.exportedAt === "string"
      ? parsed.exportedAt
      : undefined;
    return {
      storageVersion: imported.storageVersion,
      ...(exportedAt ? { exportedAt } : {}),
      nickname: imported.profile?.nickname ?? "Sem perfil",
      activeTasks: imported.activePlan?.tasks.length ?? 0,
      roadmaps: imported.learning.roadmaps.length,
      conversations: imported.brain.threads.length,
      focusSessions: imported.progress.focusSessions.length,
    };
  }

  async saveImportRollback(data: AppData): Promise<void> {
    const validation = appDataSchema.parse({ ...data, storageVersion: STORAGE_VERSION });
    await this.enqueueWrite(() => AsyncStorage.setItem(IMPORT_ROLLBACK_KEY, JSON.stringify(validation)));
  }

  async hasImportRollback(): Promise<boolean> {
    const json = await AsyncStorage.getItem(IMPORT_ROLLBACK_KEY);
    return Boolean(json && parseStrictImportRollback(json));
  }

  async restoreImportRollback(): Promise<AppData | null> {
    const json = await AsyncStorage.getItem(IMPORT_ROLLBACK_KEY);
    if (!json) return null;
    // Rollback interno é um snapshot exato. Nunca use o recover tolerante
    // aqui: corrupção deve manter a chave intacta para diagnóstico/retry.
    return parseStrictImportRollback(json);
  }

  async clearImportRollback(): Promise<void> {
    await this.enqueueWrite(() => AsyncStorage.removeItem(IMPORT_ROLLBACK_KEY));
  }

  async hasPreMigrationBackup(): Promise<boolean> {
    return Boolean(await this.restorePreMigrationBackup());
  }

  async restorePreMigrationBackup(): Promise<AppData | null> {
    const entries = await AsyncStorage.multiGet([
      MIGRATION_BACKUP_KEY,
      ...LEGACY_MIGRATION_BACKUP_KEYS,
    ]);
    for (const [, json] of entries) {
      if (!json) continue;
      try {
        const parsed = JSON.parse(json) as unknown;
        const payload = isRecord(parsed) && "data" in parsed ? parsed.data : parsed;
        if (!hasMaterialAppData(payload)) continue;
        const recovered = recoverAppData(payload);
        if (!recovered.profile || !recovered.onboardingCompleted) continue;
        return recovered;
      } catch {
        // A backup antigo pode estar corrompido enquanto o candidato seguinte
        // ainda é recuperável. Continue em vez de restaurar dados padrão.
      }
    }
    return null;
  }
}

export const nexusRepository: NexusRepository = new AsyncStorageRepository();
export { hasMaterialAppData, recoverAppData };
