import { StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { CompanionMascot } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useNexus } from "@/providers/NexusProvider";
import { nextRoadmapLesson, roadmapProgress } from "@/features/learning/roadmap";
import { calculateLevel } from "@/utils/levels";

const SIZE_DIMENSIONS = {
  "1x1": { width: 112, minHeight: 112 },
  "2x1": { width: 232, minHeight: 102 },
  "2x2": { width: 232, minHeight: 214 },
  "3x2": { width: 334, minHeight: 214 },
  "4x1": { width: "100%" as const, minHeight: 108 },
  "4x2": { width: "100%" as const, minHeight: 214 },
  "4x3": { width: "100%" as const, minHeight: 294 },
  "4x4": { width: "100%" as const, minHeight: 368 },
  "5x2": { width: "100%" as const, minHeight: 214 },
};

const CORNERS = { square: 4, soft: 14, round: 24 } as const;
const GLOW = { 0: 0, 1: 6, 2: 12, 3: 20 } as const;

export function WidgetPreview() {
  const { data, colors } = useNexus();
  const plan = data.activePlan;
  const prefs = data.preferences.widget;
  const accent = prefs.accentColor ?? colors.primary;
  const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const tiny = prefs.preferredSize === "1x1";
  const compact = tiny || prefs.preferredSize === "2x1" || prefs.preferredSize === "4x1";
  const large = prefs.preferredSize === "4x3" || prefs.preferredSize === "4x4";
  const centered = prefs.textAlign === "center";
  const background =
    prefs.style === "amoled"
      ? "#000000"
      : prefs.style === "transparent" || prefs.style === "glass"
        ? `${colors.surfaceAlt}B8`
        : prefs.style === "minimal"
          ? colors.surface
          : prefs.style === "neon"
            ? "#07060E"
            : colors.surfaceAlt;
  const borderColor =
    prefs.borderStyle === "none"
      ? "transparent"
      : prefs.borderStyle === "accent" || prefs.borderStyle === "pixel" || prefs.style === "gamer" || prefs.style === "neon"
        ? accent
        : colors.border;
  const level = calculateLevel(data.progress.totalXp).level;
  const activeRoadmap = data.learning.roadmaps.find(
    (roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active",
  );
  const nextLesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  const maxTasks = large
    ? prefs.taskCount
    : compact
      ? prefs.compactTasks && prefs.preferredSize !== "1x1"
        ? 1
        : 0
      : Math.min(3, prefs.taskCount);
  const fontVariant = prefs.fontScale === "grande" ? "title" : "subtitle";
  const focusMinutes = Math.floor(
    data.progress.focusSessions.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60,
  );
  const topTask = plan?.tasks.find((task) => !task.completed);
  const smartPlanVisible = prefs.preset === "balanced" && !compact;
  const quoteVisible = prefs.preset === "minimal" && compact;

  return (
    <View style={styles.wrapper}>
      <Card
        style={[
          styles.widget,
          SIZE_DIMENSIONS[prefs.preferredSize],
          centered && styles.centered,
          {
            backgroundColor: background,
            borderColor,
            borderWidth: prefs.borderStyle === "none" ? 0 : prefs.borderStyle === "pixel" ? 2 : 1,
            borderRadius: CORNERS[prefs.cornerStyle],
            opacity: prefs.opacity,
            shadowColor: accent,
            shadowOpacity: prefs.glow ? 0.18 + prefs.glow * 0.08 : 0,
            shadowRadius: GLOW[prefs.glow],
            elevation: prefs.glow * 2,
          },
        ]}
      >
        <View style={[styles.header, centered && styles.headerCentered]}>
          <View style={[styles.brand, centered && styles.brandCentered]}>
            {prefs.showMascot ? (
              prefs.mascot === "nexus" ? (
                <PixelMascot
                  skin={data.preferences.mascot.skin}
                  accessory={data.preferences.mascot.equippedAccessory}
                  size={tiny ? 42 : 30}
                  state={plan?.source === "offline" ? "sleeping" : "idle"}
                />
              ) : (
                <CompanionMascot
                  mascot={prefs.mascot}
                  size={tiny ? 42 : 30}
                  state={plan?.source === "offline" ? "sleeping" : "idle"}
                />
              )
            ) : null}
            {prefs.showProfessor && prefs.mascot !== "atlas" ? (
              <CompanionMascot mascot="atlas" size={tiny ? 34 : 28} state="idle" />
            ) : null}
            {!tiny ? (
              <View style={centered && styles.brandCopyCentered}>
                <NexusText variant="mono" color={accent}>
                  {prefs.customLabel?.trim() || "NEXUS ONLINE"}
                </NexusText>
                <NexusText variant="caption" secondary>
                  {prefs.showLearning ? "EVOLUÇÃO ATIVA" : "MISSÃO DE HOJE"}
                </NexusText>
              </View>
            ) : null}
          </View>
          {prefs.showStreak && !centered ? (
            <NexusText variant="caption" color={colors.warning}>♨ {data.progress.currentStreak}</NexusText>
          ) : null}
        </View>

        {tiny ? (
          <NexusText variant="title" color={accent} style={styles.centerText}>
            {prefs.showStreak ? `♨ ${data.progress.currentStreak}` : `${total ? Math.round((completed / total) * 100) : 0}%`}
          </NexusText>
        ) : null}

        {smartPlanVisible ? (
          <View style={[styles.smartPlan, { borderColor: `${accent}45`, backgroundColor: `${accent}0D` }]}>
            <NexusText variant="mono" color={accent}>✦ PLANO INTELIGENTE</NexusText>
            <View style={styles.smartLine}><NexusText variant="caption" color={colors.success}>◆</NexusText><NexusText variant="caption" secondary numberOfLines={1}>Prioridade: {topTask?.category ?? "missão principal"}</NexusText></View>
            <View style={styles.smartLine}><NexusText variant="caption" color={accent}>◷</NexusText><NexusText variant="caption" secondary>Bloco ideal: {topTask?.estimatedMinutes ?? 25} min</NexusText></View>
          </View>
        ) : null}

        {quoteVisible ? <NexusText variant="caption" color={accent} style={styles.centerText}>“Disciplina hoje, liberdade amanhã.”</NexusText> : null}

        {!tiny && prefs.showMission ? (
          <NexusText
            variant={fontVariant}
            numberOfLines={compact ? 1 : 2}
            style={centered && styles.centerText}
          >
            {prefs.privacyMode ? "Missão protegida" : plan?.mainMission.title ?? "Seu plano aparecerá aqui"}
          </NexusText>
        ) : null}

        {prefs.showTasks && maxTasks > 0 ? (
          <View style={[styles.tasks, prefs.compactTasks && styles.tasksCompact]}>
            {(plan?.tasks ?? []).slice(0, maxTasks).map((task) => (
              <View key={task.id} style={[styles.taskRow, centered && styles.taskCentered]}>
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: task.completed ? colors.success : accent,
                      backgroundColor: task.completed ? colors.success : "transparent",
                    },
                  ]}
                />
                <NexusText
                  variant="caption"
                  secondary={!task.completed}
                  numberOfLines={1}
                  style={[styles.flex, centered && styles.centerText]}
                >
                  {prefs.privacyMode ? "Tarefa privada" : task.title}
                </NexusText>
              </View>
            ))}
          </View>
        ) : null}

        {prefs.showLearning && !compact && activeRoadmap && nextLesson ? (
          <View style={[styles.learning, centered && styles.learningCentered]}>
            <CompanionMascot mascot="atlas" size={26} />
            <View style={styles.flex}>
              <NexusText
                variant="caption"
                color={accent}
                numberOfLines={1}
                style={centered && styles.centerText}
              >
                {prefs.privacyMode ? "Próxima evolução" : nextLesson.title}
              </NexusText>
              <NexusText variant="caption" secondary style={centered && styles.centerText}>
                {nextLesson.estimatedMinutes} min • {roadmapProgress(activeRoadmap).percentage}%
              </NexusText>
            </View>
          </View>
        ) : null}

        {!tiny && (prefs.showXp || prefs.showLevel || prefs.showFocus) ? (
          <View style={[styles.metrics, centered && styles.metricsCentered]}>
            {prefs.showLevel ? <Metric value={`NV ${level}`} /> : null}
            {prefs.showXp ? <Metric value={`${data.progress.totalXp} XP`} /> : null}
            {prefs.showFocus ? <Metric value={`${focusMinutes}m FOCO`} /> : null}
          </View>
        ) : null}

        {!tiny && prefs.showProgress ? (
          prefs.progressStyle === "bar" ? (
            <ProgressBar progress={total ? completed / total : 0} height={5} color={accent} />
          ) : (
            <NexusText
              variant={prefs.progressStyle === "number" ? "title" : "caption"}
              secondary={prefs.progressStyle !== "number"}
              color={prefs.progressStyle === "number" ? accent : undefined}
              style={centered && styles.centerText}
            >
              {prefs.progressStyle === "circle" ? "◉ " : ""}
              {prefs.progressStyle === "number"
                ? `${total ? Math.round((completed / total) * 100) : 0}%`
                : `${completed}/${total} concluídas`}
            </NexusText>
          )
        ) : null}

        {large && prefs.showCapture ? (
          <View style={[styles.capture, { borderColor: `${accent}66` }]}>
            <NexusText variant="caption" color={accent}>＋ Capturar rápido</NexusText>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function Metric({ value }: { value: string }) {
  return (
    <View style={styles.metricPill}>
      <NexusText variant="mono" secondary>{value}</NexusText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  widget: { gap: 12, justifyContent: "space-between", maxWidth: "100%" },
  centered: { alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  headerCentered: { justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandCentered: { justifyContent: "center" },
  centerText: { textAlign: "center" },
  brandCopyCentered: { alignItems: "center" },
  tasks: { gap: 7, width: "100%" },
  tasksCompact: { gap: 3 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskCentered: { justifyContent: "center" },
  learning: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 7, width: "100%" },
  learningCentered: { justifyContent: "center" },
  check: { width: 13, height: 13, borderRadius: 4, borderWidth: 1 },
  flex: { flex: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metricsCentered: { justifyContent: "center" },
  metricPill: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 8, paddingVertical: 4 },
  capture: { minHeight: 36, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", width: "100%" },
  smartPlan: { width: "100%", borderWidth: 1, borderRadius: 14, padding: 10, gap: 5 },
  smartLine: { flexDirection: "row", alignItems: "center", gap: 7 },
});
