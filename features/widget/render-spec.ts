import type { NexusColors } from "@/theme/theme";
import type {
  CompanionMood,
  MascotId,
  WidgetPreferences,
  WidgetSize,
} from "@/types";
import {
  getWidgetStyleTokens,
  normalizeWidgetStyle,
  type WidgetVisualStyle,
} from "@/features/widgets/widget-style";

export const WIDGET_RENDER_SPEC_VERSION = 3 as const;

export type WidgetFamily = "mini" | "strip" | "companion" | "mission" | "command";
export type WidgetSupportedSize = "1x1" | "2x1" | "2x2" | "4x2" | "4x4";
export type WidgetSpeechMode = "contextual" | "silent";
export type WidgetCoreTapAction = "today" | "brain" | "focus" | "progress";
export type WidgetContent =
  | "streak"
  | "xp"
  | "nextAction"
  | "progress"
  | "companion"
  | "mission"
  | "tasks"
  | "command"
  | "focus";

export type WidgetInstanceConfiguration = {
  family: WidgetFamily;
  style: WidgetVisualStyle;
  accentColor: string;
  opacityPercent: number;
  content: WidgetContent;
  mascot: MascotId;
  personality: CompanionMood;
  speech: WidgetSpeechMode;
  tapAction: WidgetCoreTapAction;
  privateMode: boolean;
};

export type WidgetRenderSpec = {
  schemaVersion: typeof WIDGET_RENDER_SPEC_VERSION;
  family: WidgetFamily;
  size: WidgetSupportedSize;
  content: WidgetContent;
  fields: {
    mascot: boolean;
    metric: "streak" | "xp" | null;
    nextAction: boolean;
    mission: boolean;
    tasks: boolean;
    focus: boolean;
    progress: boolean;
    companion: boolean;
  };
  taskLimit: 0 | 2 | 4;
  style: WidgetVisualStyle;
  colors: {
    background: string;
    accent: string;
    text: string;
    secondaryText: string;
    border: string;
  };
  opacityPercent: number;
  privateMode: boolean;
  mascot: {
    visible: boolean;
    id: MascotId;
    personality: CompanionMood;
    speech: WidgetSpeechMode;
  };
  actions: {
    tap: WidgetCoreTapAction;
    taskToggle: boolean;
  };
  emptyState: {
    title: string;
    body: string;
    actionLabel: string;
  };
};

export const WIDGET_FAMILIES: readonly {
  family: WidgetFamily;
  size: WidgetSupportedSize;
  label: string;
  description: string;
  taskLimit: 0 | 2 | 4;
}[] = [
  { family: "mini", size: "1x1", label: "Mini", description: "Mascote e streak ou XP.", taskLimit: 0 },
  { family: "strip", size: "2x1", label: "Strip", description: "Próxima ação e progresso.", taskLimit: 0 },
  { family: "companion", size: "2x2", label: "Companion", description: "Mascote, humor e uma fala curta.", taskLimit: 0 },
  { family: "mission", size: "4x2", label: "Mission", description: "Missão, até duas tarefas e progresso.", taskLimit: 2 },
  { family: "command", size: "4x4", label: "Command", description: "Missão, tarefas, foco, progresso e Companion.", taskLimit: 4 },
];

export const CONTENT_BY_FAMILY: Record<WidgetFamily, readonly { value: WidgetContent; label: string }[]> = {
  mini: [
    { value: "streak", label: "Streak" },
    { value: "xp", label: "XP" },
  ],
  strip: [
    { value: "nextAction", label: "Próxima ação" },
    { value: "progress", label: "Progresso" },
  ],
  companion: [{ value: "companion", label: "Fala do Companion" }],
  mission: [
    { value: "mission", label: "Missão + progresso" },
    { value: "tasks", label: "Duas tarefas + progresso" },
  ],
  command: [
    { value: "command", label: "Command completo" },
    { value: "focus", label: "Foco em destaque" },
  ],
};

const SIZE_BY_FAMILY: Record<WidgetFamily, WidgetSupportedSize> = {
  mini: "1x1",
  strip: "2x1",
  companion: "2x2",
  mission: "4x2",
  command: "4x4",
};

export function familyFromWidgetSize(size: WidgetSize | string): WidgetFamily {
  switch (size) {
    case "1x1":
      return "mini";
    case "2x1":
    case "4x1":
      return "strip";
    case "2x2":
      return "companion";
    case "4x4":
    case "4x3":
      return "command";
    default:
      return "mission";
  }
}

export function sizeForWidgetFamily(family: WidgetFamily): WidgetSupportedSize {
  return SIZE_BY_FAMILY[family];
}

export function normalizeOpacityPercent(value: number): number {
  if (!Number.isFinite(value)) return 96;
  const percentage = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

export function normalizeWidgetSpeech(value: unknown): WidgetSpeechMode {
  return value === "silent" ? "silent" : "contextual";
}

export function normalizeWidgetTapAction(value: unknown): WidgetCoreTapAction {
  return value === "brain" || value === "focus" || value === "progress" ? value : "today";
}

export function defaultContentForFamily(
  family: WidgetFamily,
  preferences?: WidgetPreferences,
): WidgetContent {
  switch (family) {
    case "mini":
      return preferences?.showXp && !preferences.showStreak ? "xp" : "streak";
    case "strip":
      return preferences?.contentMode === "progress" ? "progress" : "nextAction";
    case "companion":
      return "companion";
    case "mission":
      return preferences?.contentMode === "tasks" ? "tasks" : "mission";
    case "command":
      return preferences?.contentMode === "focus" ? "focus" : "command";
  }
}

export function normalizeWidgetContent(family: WidgetFamily, value: string | undefined): WidgetContent {
  const candidate = value === "smart" || value === "full" ? "command" : value;
  const allowed = CONTENT_BY_FAMILY[family].map((item) => item.value);
  return allowed.includes(candidate as WidgetContent)
    ? candidate as WidgetContent
    : defaultContentForFamily(family);
}

export function widgetConfigurationFromPreferences(
  preferences: WidgetPreferences,
  fallbackAccent: string,
): WidgetInstanceConfiguration {
  const family = familyFromWidgetSize(preferences.preferredSize);
  const style = normalizeWidgetStyle(preferences.style);
  return {
    family,
    style,
    accentColor: preferences.accentColor ?? fallbackAccent,
    opacityPercent: style === "transparent" ? 0 : normalizeOpacityPercent(preferences.opacity),
    content: defaultContentForFamily(family, preferences),
    mascot: preferences.mascot,
    personality: preferences.companionMood,
    speech: normalizeWidgetSpeech(preferences.companionSpeech),
    tapAction: normalizeWidgetTapAction(preferences.tapAction),
    privateMode: preferences.privacyMode,
  };
}

export function createWidgetRenderSpec(
  preferences: WidgetPreferences,
  colors: NexusColors,
  override: Partial<WidgetInstanceConfiguration> = {},
): WidgetRenderSpec {
  const base = widgetConfigurationFromPreferences(preferences, colors.primary);
  const family = override.family ?? base.family;
  const style = normalizeWidgetStyle(override.style ?? base.style);
  const accentColor = override.accentColor ?? base.accentColor;
  const opacityPercent = style === "transparent"
    ? 0
    : normalizeOpacityPercent(override.opacityPercent ?? base.opacityPercent);
  const content = normalizeWidgetContent(family, override.content ?? base.content);
  const visual = getWidgetStyleTokens(style, colors, accentColor, opacityPercent);
  const taskLimit = family === "mission" ? 2 : family === "command" ? 4 : 0;
  const fields = fieldsForFamily(family, content);
  const mascotVisible = fields.mascot;

  return {
    schemaVersion: WIDGET_RENDER_SPEC_VERSION,
    family,
    size: SIZE_BY_FAMILY[family],
    content,
    fields,
    taskLimit,
    style,
    colors: {
      background: visual.backgroundColor,
      accent: visual.accent,
      text: visual.textColor,
      secondaryText: visual.secondaryTextColor,
      border: visual.borderColor,
    },
    opacityPercent,
    // The app-wide privacy setting is a floor. An instance may opt into more
    // privacy, never opt out of a globally protected payload.
    privateMode: base.privateMode || override.privateMode === true,
    mascot: {
      visible: mascotVisible,
      id: override.mascot ?? base.mascot,
      personality: override.personality ?? base.personality,
      speech: normalizeWidgetSpeech(override.speech ?? base.speech),
    },
    actions: {
      tap: normalizeWidgetTapAction(override.tapAction ?? base.tapAction),
      taskToggle: taskLimit > 0 && fields.tasks && !(base.privateMode || override.privateMode === true),
    },
    emptyState: emptyStateForFamily(family),
  };
}

export function widgetPreferencesPatchFromConfiguration(
  config: WidgetInstanceConfiguration,
): Partial<WidgetPreferences> {
  const family = config.family;
  const content = normalizeWidgetContent(family, config.content);
  return {
    preferredSize: SIZE_BY_FAMILY[family],
    style: config.style,
    background: config.style === "amoled" ? "amoled" : config.style === "transparent" ? "translucent" : "solid",
    // Storage v5 requires at least 0.2. Transparent remains truly 0% in the
    // serialized render spec and native drawable, while the legacy fallback
    // field stays schema-valid for rollback.
    opacity: Math.max(0.2, normalizeOpacityPercent(config.opacityPercent) / 100),
    accentColor: config.accentColor,
    mascot: config.mascot,
    companionMood: config.personality,
    companionSpeech: normalizeWidgetSpeech(config.speech),
    tapAction: normalizeWidgetTapAction(config.tapAction),
    privacyMode: config.privateMode,
    contentMode: family === "companion"
      ? "companion"
      : family === "strip" && content === "progress"
        ? "progress"
        : family === "command" && content === "focus"
          ? "focus"
          : family === "mission" && content === "tasks"
            ? "tasks"
            : "mission",
    showMascot: family === "mini" || family === "companion" || family === "command",
    showMission: family === "mission" || family === "command",
    showTasks: family === "mission" || family === "command",
    showProgress: family === "strip" || family === "mission" || family === "command",
    showFocus: family === "command",
    showStreak: family === "mini" && content === "streak",
    showXp: family === "mini" && content === "xp",
    showQuote: family === "companion" || family === "command",
    showNextAction: family === "strip",
    showCapture: false,
    // These legacy flags stay in storage for rollback/import compatibility,
    // but every v3 save disables the removed widget-only learning surface.
    showProfessor: false,
    showLearning: false,
    showFinance: false,
    showHabits: false,
    showBoss: false,
    allowPageCycle: false,
    taskCount: taskLimitForFamily(family),
    progressStyle: "bar",
    compactTasks: family === "mission",
    borderStyle: config.style === "transparent" ? "none" : config.style === "pixel" ? "pixel" : "subtle",
    glow: 0,
    textAlign: family === "mini" || family === "companion" ? "center" : "left",
  };
}

function taskLimitForFamily(family: WidgetFamily): WidgetPreferences["taskCount"] {
  if (family === "mission") return 2;
  if (family === "command") return 4;
  return 1;
}

function fieldsForFamily(family: WidgetFamily, content: WidgetContent): WidgetRenderSpec["fields"] {
  switch (family) {
    case "mini":
      return {
        mascot: true,
        metric: content === "xp" ? "xp" : "streak",
        nextAction: false,
        mission: false,
        tasks: false,
        focus: false,
        progress: false,
        companion: false,
      };
    case "strip":
      return {
        mascot: false,
        metric: null,
        nextAction: content !== "progress",
        mission: false,
        tasks: false,
        focus: false,
        progress: true,
        companion: false,
      };
    case "companion":
      return {
        mascot: true,
        metric: null,
        nextAction: false,
        mission: false,
        tasks: false,
        focus: false,
        progress: false,
        companion: true,
      };
    case "mission":
      return {
        mascot: false,
        metric: null,
        nextAction: false,
        mission: content !== "tasks",
        tasks: content === "tasks",
        focus: false,
        progress: true,
        companion: false,
      };
    case "command":
      return {
        mascot: true,
        metric: null,
        nextAction: false,
        mission: true,
        tasks: true,
        focus: true,
        progress: true,
        companion: true,
      };
  }
}

function emptyStateForFamily(family: WidgetFamily): WidgetRenderSpec["emptyState"] {
  switch (family) {
    case "mini":
      return { title: "Nexus pronto", body: "Abra o app para sincronizar seu ritmo.", actionLabel: "Abrir Nexus" };
    case "strip":
      return { title: "Defina a próxima ação", body: "Seu primeiro passo aparecerá aqui.", actionLabel: "Planejar hoje" };
    case "companion":
      return { title: "Nexus está aqui", body: "Abra o app para dar contexto ao Companion.", actionLabel: "Conversar" };
    case "mission":
      return { title: "Prepare sua missão", body: "Gere o plano de hoje para preencher este widget.", actionLabel: "Planejar hoje" };
    case "command":
      return { title: "Command pronto", body: "Gere o plano de hoje para ativar sua central.", actionLabel: "Abrir Hoje" };
  }
}
