import { Platform } from "react-native";
import type { AppData, WidgetPayload } from "@/types";
import {
  createWidgetRenderSpec,
  normalizeOpacityPercent,
  normalizeWidgetContent,
  normalizeWidgetSpeech,
  normalizeWidgetTapAction,
  WIDGET_FAMILIES,
  type WidgetFamily,
  type WidgetInstanceConfiguration,
  type WidgetRenderSpec,
} from "@/features/widget/render-spec";
import { normalizeWidgetStyle } from "@/features/widgets/widget-style";
import { getColors } from "@/theme/theme";
import { calculateLevel } from "@/utils/levels";
import { localDateKey } from "@/utils/dates";
import { companionLines, nexusQuote } from "@/features/companion/companion";
import { profileMission } from "@/features/context/synthesis";

export type WidgetPendingAction = {
  id?: string;
  type: "toggle_task";
  taskId: string;
  completed: boolean;
  createdAt: string;
};

export type WidgetPendingActionBatch = {
  actions: WidgetPendingAction[];
  receipt: string;
};

export type WidgetPayloadV3 = WidgetPayload & {
  schemaVersion: 3;
  planAvailable: boolean;
  renderSpec: WidgetRenderSpec;
  renderSpecs: Record<WidgetFamily, WidgetRenderSpec>;
};

export type AndroidWidgetInstance = {
  appWidgetId: number;
  family: WidgetFamily;
  configured: boolean;
  config?: Partial<WidgetInstanceConfiguration>;
};

export type WidgetSyncResult = {
  supported: boolean;
  updated: boolean;
  instanceCount: number;
  error?: string;
};

function createPayload(data: AppData): WidgetPayloadV3 {
  const preferences = data.preferences.widget;
  const renderSpec = createWidgetRenderSpec(preferences, getColors(data.preferences));
  const renderSpecs = createFamilyRenderSpecs(data);
  const missionFallback = data.profile ? profileMission(data.profile) : undefined;
  const privateWidget = preferences.privacyMode;

  if (!data.activePlan) {
    return {
      schemaVersion: 3,
      planAvailable: false,
      renderSpec,
      renderSpecs,
      date: localDateKey(new Date(), data.profile?.timezone),
      mainMission: privateWidget
        ? "Missão protegida"
        : missionFallback?.title ?? renderSpec.emptyState.title,
      tasks: [],
      completedCount: 0,
      totalCount: 0,
      streak: privateWidget ? 0 : data.progress.currentStreak,
      totalXp: privateWidget ? 0 : data.progress.totalXp,
      level: privateWidget ? 0 : calculateLevel(data.progress.totalXp).level,
      focusMinutes: 0,
      nextAction: privateWidget
        ? "Próxima ação protegida"
        : missionFallback?.nextAction ?? renderSpec.emptyState.body,
      quote: privateWidget ? "Direção protegida." : renderSpec.emptyState.body,
      companionLines: privateWidget ? { quiet: "Nexus ativo." } : companionLines(data),
      appearance: widgetAppearance(data),
    };
  }

  // One compact payload serves every installed family. Command is the largest
  // consumer, so four tasks are enough; each WidgetRenderSpec applies its own
  // stricter limit (Mission = 2, all compact families = 0).
  const visibleTasks = data.activePlan.tasks.slice(0, 4);
  const focusMinutes = Math.floor(data.progress.focusSessions
    .filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === data.activePlan?.date)
    .reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const nextTask = data.activePlan.tasks.find((task) => !task.completed);

  return {
    schemaVersion: 3,
    planAvailable: true,
    renderSpec,
    renderSpecs,
    date: data.activePlan.date,
    mainMission: privateWidget ? "Missão protegida" : data.activePlan.mainMission.title,
    tasks: privateWidget ? [] : visibleTasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
    })),
    completedCount: privateWidget ? 0 : data.activePlan.tasks.filter((task) => task.completed).length,
    totalCount: privateWidget ? 0 : data.activePlan.tasks.length,
    streak: privateWidget ? 0 : data.progress.currentStreak,
    totalXp: privateWidget ? 0 : data.progress.totalXp,
    level: privateWidget ? 0 : calculateLevel(data.progress.totalXp).level,
    focusMinutes: privateWidget ? 0 : focusMinutes,
    ...(nextTask ? { nextAction: privateWidget ? "Próxima ação protegida" : nextTask.title } : {}),
    quote: privateWidget ? "Direção protegida." : nexusQuote(data),
    companionLines: privateWidget ? { quiet: "Nexus ativo." } : companionLines(data),
    appearance: widgetAppearance(data),
  };
}

function widgetAppearance(data: AppData): NonNullable<WidgetPayload["appearance"]> {
  const preferences = data.preferences.widget;
  return {
    contentMode: preferences.contentMode,
    privacyMode: preferences.privacyMode,
    background: preferences.background,
    style: preferences.style,
    preferredSize: preferences.preferredSize,
    showMascot: preferences.showMascot,
    mascot: preferences.mascot,
    companionMood: preferences.companionMood,
    companionSpeech: preferences.companionSpeech,
    skin: data.preferences.mascot.skin,
    ...(data.preferences.mascot.equippedAccessory
      ? { accessory: data.preferences.mascot.equippedAccessory }
      : {}),
    showMission: preferences.showMission,
    showTasks: preferences.showTasks,
    showXp: preferences.showXp,
    showLevel: preferences.showLevel,
    showStreak: preferences.showStreak,
    showFocus: preferences.showFocus,
    showProgress: preferences.showProgress,
    showQuote: preferences.showQuote,
    showNextAction: preferences.showNextAction,
    progressStyle: "bar",
    fontScale: preferences.fontScale,
    opacity: preferences.opacity,
    cornerStyle: preferences.cornerStyle,
    borderStyle: preferences.borderStyle,
    glow: preferences.glow,
    textAlign: preferences.textAlign,
    tapAction: preferences.tapAction,
    ...(preferences.customLabel ? { customLabel: preferences.customLabel } : {}),
    accentColor: preferences.accentColor ?? getColors(data.preferences).primary,
  };
}

function createFamilyRenderSpecs(data: AppData): Record<WidgetFamily, WidgetRenderSpec> {
  const colors = getColors(data.preferences);
  const entries = WIDGET_FAMILIES.map(({ family }) => [
    family,
    createWidgetRenderSpec(data.preferences.widget, colors, {
      family,
      content: undefined,
    }),
  ] as const);
  return Object.fromEntries(entries) as Record<WidgetFamily, WidgetRenderSpec>;
}

export async function updateAndroidWidget(data: AppData): Promise<WidgetSyncResult> {
  if (Platform.OS !== "android") {
    return { supported: false, updated: false, instanceCount: 0 };
  }
  const payload = createPayload(data);
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    await nativeModule.default.updateWidget(JSON.stringify(payload));
    const instances = await listAndroidWidgetInstances();
    return { supported: true, updated: true, instanceCount: instances.length };
  } catch (error) {
    return {
      supported: true,
      updated: false,
      instanceCount: 0,
      error: error instanceof Error ? error.message : "Falha ao sincronizar widgets.",
    };
  }
}

export async function listAndroidWidgetInstances(): Promise<AndroidWidgetInstance[]> {
  if (Platform.OS !== "android") return [];
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    const raw = await nativeModule.default.listWidgetInstances();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const candidate = value as Record<string, unknown>;
      const appWidgetId = Number(candidate.appWidgetId);
      const family = candidate.family;
      if (!Number.isInteger(appWidgetId) || !isWidgetFamily(family)) return [];
      const config = normalizeInstanceConfig(candidate.config, family);
      return [{
        appWidgetId,
        family,
        configured: candidate.configured === true,
        ...(config ? { config } : {}),
      }];
    });
  } catch {
    return [];
  }
}

export async function saveAndroidWidgetInstance(
  appWidgetId: number,
  config: WidgetInstanceConfiguration,
): Promise<boolean> {
  if (Platform.OS !== "android" || !Number.isInteger(appWidgetId) || appWidgetId <= 0) return false;
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    await nativeModule.default.saveWidgetConfiguration(appWidgetId, JSON.stringify({
      schemaVersion: 3,
      ...config,
      style: normalizeWidgetStyle(config.style),
      opacityPercent: normalizeOpacityPercent(config.opacityPercent),
      content: normalizeWidgetContent(config.family, config.content),
      speech: normalizeWidgetSpeech(config.speech),
      tapAction: normalizeWidgetTapAction(config.tapAction),
      privateMode: config.privateMode === true,
    }));
    return true;
  } catch {
    return false;
  }
}

export async function peekAndroidWidgetActions(): Promise<WidgetPendingActionBatch> {
  if (Platform.OS !== "android") return { actions: [], receipt: "[]" };
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    const raw = await nativeModule.default.peekPendingActions();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { actions: [], receipt: "[]" };
    const actions = parsed.filter((item): item is WidgetPendingAction => Boolean(
      item && typeof item === "object" && (item as WidgetPendingAction).type === "toggle_task" &&
      typeof (item as WidgetPendingAction).taskId === "string" &&
      typeof (item as WidgetPendingAction).completed === "boolean",
    )).slice(-50);
    return { actions, receipt: JSON.stringify(actions) };
  } catch {
    return { actions: [], receipt: "[]" };
  }
}

export async function acknowledgeAndroidWidgetActions(receipt: string): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (receipt === "[]") return true;
  try {
    const nativeModule = await import("@/modules/nexus-widget/src/NexusWidgetModule");
    await nativeModule.default.acknowledgePendingActions(receipt);
    return true;
  } catch {
    return false;
  }
}

function isWidgetFamily(value: unknown): value is WidgetFamily {
  return value === "mini" || value === "strip" || value === "companion" || value === "mission" || value === "command";
}

function normalizeInstanceConfig(
  value: unknown,
  family: WidgetFamily,
): Partial<WidgetInstanceConfiguration> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const hasLegacyPrivateMode = raw.style === "privacy" || raw.content === "private";
  return {
    // The provider class is the source of truth. A stale stored family must
    // never make Studio save a configuration for a different widget class.
    family,
    ...(typeof raw.style === "string" ? { style: normalizeWidgetStyle(raw.style) } : {}),
    ...(typeof raw.accentColor === "string" ? { accentColor: raw.accentColor } : {}),
    ...(typeof raw.opacityPercent === "number"
      ? { opacityPercent: normalizeOpacityPercent(raw.opacityPercent) }
      : {}),
    ...(typeof raw.content === "string"
      ? { content: normalizeWidgetContent(family, raw.content) }
      : {}),
    ...(isMascotId(raw.mascot) ? { mascot: raw.mascot } : {}),
    ...(isCompanionPersonality(raw.personality)
      ? { personality: raw.personality }
      : isCompanionPersonality(raw.mood)
        ? { personality: raw.mood }
        : {}),
    ...(typeof raw.speech === "string"
      ? { speech: normalizeWidgetSpeech(raw.speech) }
      : {}),
    ...(typeof raw.tapAction === "string"
      ? { tapAction: normalizeWidgetTapAction(raw.tapAction) }
      : {}),
    ...(typeof raw.privateMode === "boolean" || hasLegacyPrivateMode
      ? { privateMode: raw.privateMode === true || hasLegacyPrivateMode }
      : {}),
  };
}

function isMascotId(value: unknown): value is WidgetInstanceConfiguration["mascot"] {
  return value === "nexus" || value === "atlas" || value === "nova" || value === "byte" ||
    value === "pulse" || value === "orbit" || value === "ember";
}

function isCompanionPersonality(value: unknown): value is WidgetInstanceConfiguration["personality"] {
  return value === "happy" || value === "playful" || value === "motivational" || value === "serious" ||
    value === "strict" || value === "calm" || value === "quiet";
}

export { createPayload as createWidgetPayload };
