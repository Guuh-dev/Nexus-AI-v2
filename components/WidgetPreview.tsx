import { StyleSheet, View } from "react-native";
import { CompanionMascot } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { NexusText } from "@/components/ui/NexusText";
import { getCompanionLine } from "@/features/companion/companion";
import {
  createWidgetRenderSpec,
  type WidgetRenderSpec,
} from "@/features/widget/render-spec";
import { useNexus } from "@/providers/NexusProvider";
import { localDateKey } from "@/utils/dates";

const SIZE_DIMENSIONS = {
  mini: { width: 112, minHeight: 112 },
  strip: { width: 232, minHeight: 102 },
  companion: { width: 232, minHeight: 214 },
  mission: { width: "100%" as const, minHeight: 214 },
  command: { width: "100%" as const, minHeight: 368 },
};

export function WidgetPreview({ spec: requestedSpec }: { spec?: WidgetRenderSpec }) {
  const { data, colors } = useNexus();
  const spec = requestedSpec ?? createWidgetRenderSpec(data.preferences.widget, colors);
  const plan = data.activePlan;
  const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const completion = total > 0 ? completed / total : 0;
  const tasks = spec.privateMode ? [] : (plan?.tasks ?? []).slice(0, spec.taskLimit);
  const nextTask = plan?.tasks.find((task) => !task.completed);
  const today = plan?.date ?? localDateKey(new Date(), data.profile?.timezone);
  const focusMinutes = Math.floor(data.progress.focusSessions
    .filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === today)
    .reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const companionLine = spec.mascot.speech === "silent"
    ? "Nexus ativo."
    : getCompanionLine(data, spec.mascot.personality, "widget");
  const hasPlan = Boolean(plan);
  const mission = spec.privateMode
    ? "Missão protegida"
    : plan?.mainMission.title ?? spec.emptyState.title;

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityLabel={`Preview ${spec.family} ${spec.size}`}
        style={[
          styles.widget,
          SIZE_DIMENSIONS[spec.family],
          spec.family === "mini" || spec.family === "companion" ? styles.centered : null,
          {
            backgroundColor: spec.colors.background,
            borderColor: spec.colors.border,
            borderWidth: spec.style === "transparent" ? 0 : spec.style === "pixel" ? 2 : 1,
            borderRadius: spec.style === "transparent" ? 0 : spec.style === "pixel" ? 6 : 22,
          },
        ]}
      >
        {spec.family === "mini" ? (
          <MiniPreview
            spec={spec}
            streak={data.progress.currentStreak}
            xp={data.progress.totalXp}
          />
        ) : null}

        {spec.family === "strip" ? (
          <StripPreview
            spec={spec}
            nextAction={spec.privateMode
              ? "Próxima ação protegida"
              : nextTask?.title ?? spec.emptyState.title}
            completed={completed}
            total={total}
            progress={completion}
          />
        ) : null}

        {spec.family === "companion" ? (
          <CompanionPreview
            spec={spec}
            line={spec.privateMode
              ? "Conteúdo protegido."
              : hasPlan ? companionLine : spec.emptyState.body}
          />
        ) : null}

        {spec.family === "mission" ? (
          <MissionPreview
            spec={spec}
            mission={mission}
            tasks={tasks}
            completed={completed}
            total={total}
            progress={completion}
          />
        ) : null}

        {spec.family === "command" ? (
          <CommandPreview
            spec={spec}
            mission={mission}
            planAvailable={hasPlan}
            tasks={tasks}
            completed={completed}
            total={total}
            progress={completion}
            focusMinutes={focusMinutes}
            companionLine={companionLine}
          />
        ) : null}
      </View>
    </View>
  );
}

function MiniPreview({
  spec,
  streak,
  xp,
}: {
  spec: WidgetRenderSpec;
  streak: number;
  xp: number;
}) {
  return (
    <View style={styles.miniContent}>
      <Mascot spec={spec} size={58} />
      <NexusText variant="mono" color={spec.colors.accent} style={styles.centerText} numberOfLines={1}>
        {spec.privateMode ? "NEXUS" : spec.fields.metric === "xp" ? `⬡ ${xp} XP` : `♨ ${streak}`}
      </NexusText>
    </View>
  );
}

function StripPreview({
  spec,
  nextAction,
  completed,
  total,
  progress,
}: {
  spec: WidgetRenderSpec;
  nextAction: string;
  completed: number;
  total: number;
  progress: number;
}) {
  return (
    <View style={styles.fill}>
      <NexusText variant="mono" color={spec.colors.accent}>
        {spec.privateMode ? "PRIVACIDADE" : spec.fields.nextAction ? "→ PRÓXIMA AÇÃO" : "PROGRESSO DE HOJE"}
      </NexusText>
      <NexusText variant="subtitle" color={spec.colors.text} numberOfLines={1}>
        {spec.privateMode
          ? "Próxima ação protegida"
          : spec.fields.nextAction
            ? nextAction
            : total > 0 ? `${Math.floor(progress * 100)}% concluído` : spec.emptyState.title}
      </NexusText>
      {!spec.privateMode ? (
        <ProgressMeter
          progress={progress}
          completed={completed}
          total={total}
          spec={spec}
          showActionWhenEmpty={false}
        />
      ) : null}
    </View>
  );
}

function CompanionPreview({ spec, line }: { spec: WidgetRenderSpec; line: string }) {
  return (
    <View style={styles.companionContent}>
      <Mascot spec={spec} size={92} />
      <NexusText variant="mono" color={spec.colors.accent} style={styles.centerText}>
        NEXUS COMPANION
      </NexusText>
      <NexusText variant="mono" color={spec.colors.accent} style={styles.centerText}>
        {spec.mascot.personality.toUpperCase()}
      </NexusText>
      <NexusText variant="subtitle" color={spec.colors.text} style={styles.centerText} numberOfLines={3}>
        {line}
      </NexusText>
    </View>
  );
}

function MissionPreview({
  spec,
  mission,
  tasks,
  completed,
  total,
  progress,
}: {
  spec: WidgetRenderSpec;
  mission: string;
  tasks: { id: string; title: string; completed: boolean }[];
  completed: number;
  total: number;
  progress: number;
}) {
  return (
    <View style={styles.fill}>
      <NexusText variant="mono" color={spec.colors.accent}>
        {spec.content === "tasks" ? "TAREFAS DE HOJE" : "MISSÃO DE HOJE"}
      </NexusText>
      {spec.fields.mission ? (
        <NexusText variant="title" color={spec.colors.text} numberOfLines={2}>{mission}</NexusText>
      ) : null}
      {!spec.privateMode && spec.fields.tasks && tasks.length > 0 ? <TaskList tasks={tasks} spec={spec} /> : null}
      {!spec.privateMode ? (
        <ProgressMeter progress={progress} completed={completed} total={total} spec={spec} />
      ) : null}
    </View>
  );
}

function CommandPreview({
  spec,
  mission,
  planAvailable,
  tasks,
  completed,
  total,
  progress,
  focusMinutes,
  companionLine,
}: {
  spec: WidgetRenderSpec;
  mission: string;
  planAvailable: boolean;
  tasks: { id: string; title: string; completed: boolean }[];
  completed: number;
  total: number;
  progress: number;
  focusMinutes: number;
  companionLine: string;
}) {
  const featureTitle = spec.content === "focus"
    ? "FOCUS AGORA"
    : `COMPANION • ${spec.mascot.personality.toUpperCase()}`;
  const featureBody = spec.privateMode
    ? "Conteúdo protegido."
    : !planAvailable
      ? spec.emptyState.body
      : spec.content === "focus"
        ? `${focusMinutes} minutos focados hoje.`
        : companionLine;

  return (
    <View style={styles.commandContent}>
      <View style={styles.commandHeader}>
        <Mascot spec={spec} size={54} />
        <NexusText variant="mono" color={spec.colors.accent} style={styles.flex}>NEXUS COMMAND</NexusText>
      </View>
      <NexusText variant="title" color={spec.colors.text} numberOfLines={2}>{mission}</NexusText>
      <View style={styles.featureBlock}>
        <NexusText variant="mono" color={spec.colors.accent}>{featureTitle}</NexusText>
        <NexusText variant="caption" color={spec.colors.text} numberOfLines={2}>{featureBody}</NexusText>
      </View>
      {!spec.privateMode && tasks.length > 0 ? <TaskList tasks={tasks} spec={spec} /> : null}
      {!spec.privateMode ? (
        <NexusText variant="caption" color={spec.colors.secondaryText}>
          {`${focusMinutes}m foco • ${completed}/${total} tarefas`}
        </NexusText>
      ) : null}
      {!spec.privateMode ? (
        <ProgressMeter progress={progress} completed={completed} total={total} spec={spec} />
      ) : null}
    </View>
  );
}

function TaskList({
  tasks,
  spec,
}: {
  tasks: { id: string; title: string; completed: boolean }[];
  spec: WidgetRenderSpec;
}) {
  return (
    <View style={styles.tasks}>
      {tasks.map((task) => (
        <View key={task.id} style={styles.taskRow}>
          <NexusText variant="subtitle" color={task.completed ? spec.colors.accent : spec.colors.secondaryText}>
            {task.completed ? "✓" : "○"}
          </NexusText>
          <NexusText
            variant="caption"
            color={task.completed ? spec.colors.secondaryText : spec.colors.text}
            numberOfLines={1}
            style={styles.flex}
          >
            {spec.privateMode ? "Tarefa privada" : task.title}
          </NexusText>
        </View>
      ))}
    </View>
  );
}

function ProgressMeter({
  progress,
  completed,
  total,
  spec,
  showActionWhenEmpty = true,
}: {
  progress: number;
  completed: number;
  total: number;
  spec: WidgetRenderSpec;
  showActionWhenEmpty?: boolean;
}) {
  const percentage = Math.floor(Math.max(0, Math.min(1, progress)) * 100);
  const filled = Math.floor(percentage * 8 / 100);
  if (total === 0 && showActionWhenEmpty) {
    return <NexusText variant="mono" color={spec.colors.accent}>{spec.emptyState.actionLabel} →</NexusText>;
  }
  return (
    <NexusText variant="mono" color={spec.colors.accent} numberOfLines={1}>
      {`${"●".repeat(filled)}${"○".repeat(8 - filled)}  ${completed}/${total}`}
    </NexusText>
  );
}

function Mascot({ spec, size }: { spec: WidgetRenderSpec; size: number }) {
  const state = spec.mascot.personality === "strict"
    ? "warning"
    : spec.mascot.personality === "happy"
      ? "celebrating"
      : spec.mascot.personality === "quiet"
        ? "sleeping"
        : "idle";
  return spec.mascot.id === "nexus" ? (
    <PixelMascot size={size} state={state} />
  ) : (
    <CompanionMascot mascot={spec.mascot.id} size={size} state={state} />
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  widget: {
    maxWidth: "100%",
    overflow: "hidden",
    padding: 16,
    position: "relative",
  },
  centered: { alignItems: "center", justifyContent: "center" },
  fill: { flex: 1, gap: 11, justifyContent: "space-between", width: "100%" },
  flex: { flex: 1 },
  centerText: { textAlign: "center" },
  miniContent: { alignItems: "center", gap: 3, justifyContent: "center" },
  companionContent: { alignItems: "center", flex: 1, gap: 8, justifyContent: "center" },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  commandContent: { flex: 1, gap: 12, justifyContent: "space-between", width: "100%" },
  commandHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  tasks: { gap: 7, width: "100%" },
  taskRow: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 22 },
  featureBlock: { gap: 4 },
});
