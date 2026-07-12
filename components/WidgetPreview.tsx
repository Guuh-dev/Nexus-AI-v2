import { StyleSheet, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { CompanionMascot } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useNexus } from "@/providers/NexusProvider";
import {
  nextRoadmapLesson,
  roadmapProgress,
} from "@/features/learning/roadmap";
import { calculateLevel } from "@/utils/levels";
import { getWidgetStyleTokens } from "@/features/widgets/widget-style";

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
  const requestedAccent = prefs.accentColor ?? colors.primary;
  const styleTokens = getWidgetStyleTokens(
    prefs.style,
    colors,
    requestedAccent,
  );
  const accent = styleTokens.accent;
  const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const tiny = prefs.preferredSize === "1x1";
  const compact =
    tiny || prefs.preferredSize === "2x1" || prefs.preferredSize === "4x1";
  const large = prefs.preferredSize === "4x3" || prefs.preferredSize === "4x4";
  const centered = prefs.textAlign === "center";
  const level = calculateLevel(data.progress.totalXp).level;
  const activeRoadmap = data.learning.roadmaps.find(
    (roadmap) =>
      roadmap.id === data.learning.activeRoadmapId &&
      roadmap.status === "active",
  );
  const nextLesson = activeRoadmap
    ? nextRoadmapLesson(activeRoadmap)
    : undefined;
  const maxTasks = large
    ? prefs.taskCount
    : compact
      ? prefs.compactTasks && prefs.preferredSize !== "1x1"
        ? 1
        : 0
      : Math.min(3, prefs.taskCount);
  const fontVariant = prefs.fontScale === "grande" ? "title" : "subtitle";
  const focusMinutes = Math.floor(
    data.progress.focusSessions.reduce(
      (sum, session) => sum + session.elapsedSeconds,
      0,
    ) / 60,
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
            backgroundColor: styleTokens.backgroundColor,
            borderColor:
              prefs.borderStyle === "none"
                ? "transparent"
                : prefs.borderStyle === "subtle"
                  ? styleTokens.borderColor
                  : accent,
            borderWidth:
              prefs.borderStyle === "none"
                ? 0
                : Math.max(
                    styleTokens.borderWidth,
                    prefs.borderStyle === "pixel" ? 3 : 1,
                  ),
            borderRadius: styleTokens.radius ?? CORNERS[prefs.cornerStyle],
            opacity: prefs.opacity,
            shadowColor: prefs.style === "neon" ? "#F04CFF" : accent,
            shadowOpacity: prefs.glow
              ? Math.max(styleTokens.shadowOpacity, 0.18 + prefs.glow * 0.08)
              : styleTokens.shadowOpacity,
            shadowRadius: prefs.glow
              ? Math.max(styleTokens.shadowRadius, GLOW[prefs.glow])
              : styleTokens.shadowRadius,
            elevation:
              prefs.style === "minimal" || prefs.style === "amoled"
                ? 0
                : Math.max(1, prefs.glow * 2),
          },
        ]}
      >
        <WidgetDecoration kind={styleTokens.decoration} accent={accent} />
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
              <CompanionMascot
                mascot="atlas"
                size={tiny ? 34 : 28}
                state="idle"
              />
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
            <NexusText variant="caption" color={colors.warning}>
              ♨ {data.progress.currentStreak}
            </NexusText>
          ) : null}
        </View>

        {tiny ? (
          <NexusText variant="title" color={accent} style={styles.centerText}>
            {prefs.showStreak
              ? `♨ ${data.progress.currentStreak}`
              : `${total ? Math.round((completed / total) * 100) : 0}%`}
          </NexusText>
        ) : null}

        {smartPlanVisible ? (
          <View
            style={[
              styles.smartPlan,
              { borderColor: `${accent}45`, backgroundColor: `${accent}0D` },
            ]}
          >
            <NexusText variant="mono" color={accent}>
              ✦ PLANO INTELIGENTE
            </NexusText>
            <View style={styles.smartLine}>
              <NexusText variant="caption" color={colors.success}>
                ◆
              </NexusText>
              <NexusText variant="caption" secondary numberOfLines={1}>
                Prioridade: {topTask?.category ?? "missão principal"}
              </NexusText>
            </View>
            <View style={styles.smartLine}>
              <NexusText variant="caption" color={accent}>
                ◷
              </NexusText>
              <NexusText variant="caption" secondary>
                Bloco ideal: {topTask?.estimatedMinutes ?? 25} min
              </NexusText>
            </View>
          </View>
        ) : null}

        {quoteVisible ? (
          <NexusText variant="caption" color={accent} style={styles.centerText}>
            “Disciplina hoje, liberdade amanhã.”
          </NexusText>
        ) : null}

        {!tiny && prefs.showMission ? (
          <NexusText
            variant={fontVariant}
            numberOfLines={compact ? 1 : 2}
            style={centered && styles.centerText}
          >
            {prefs.privacyMode
              ? "Missão protegida"
              : (plan?.mainMission.title ?? "Seu plano aparecerá aqui")}
          </NexusText>
        ) : null}

        {prefs.showTasks && maxTasks > 0 ? (
          <View
            style={[styles.tasks, prefs.compactTasks && styles.tasksCompact]}
          >
            {(plan?.tasks ?? []).slice(0, maxTasks).map((task) => (
              <View
                key={task.id}
                style={[styles.taskRow, centered && styles.taskCentered]}
              >
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: task.completed ? colors.success : accent,
                      backgroundColor: task.completed
                        ? colors.success
                        : "transparent",
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
              <NexusText
                variant="caption"
                secondary
                style={centered && styles.centerText}
              >
                {nextLesson.estimatedMinutes} min •{" "}
                {roadmapProgress(activeRoadmap).percentage}%
              </NexusText>
            </View>
          </View>
        ) : null}

        {!tiny && (prefs.showXp || prefs.showLevel || prefs.showFocus) ? (
          <View style={[styles.metrics, centered && styles.metricsCentered]}>
            {prefs.showLevel ? <Metric value={`NV ${level}`} /> : null}
            {prefs.showXp ? (
              <Metric value={`${data.progress.totalXp} XP`} />
            ) : null}
            {prefs.showFocus ? (
              <Metric value={`${focusMinutes}m FOCO`} />
            ) : null}
          </View>
        ) : null}

        {!tiny && prefs.showProgress ? (
          prefs.progressStyle === "bar" ? (
            <ProgressBar
              progress={total ? completed / total : 0}
              height={5}
              color={accent}
            />
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
            <NexusText variant="caption" color={accent}>
              ＋ Capturar rápido
            </NexusText>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function WidgetDecoration({
  kind,
  accent,
}: {
  kind: ReturnType<typeof getWidgetStyleTokens>["decoration"];
  accent: string;
}) {
  if (kind === "none") return null;
  if (kind === "pixel")
    return (
      <View pointerEvents="none" style={styles.pixelDecoration}>
        <View style={[styles.pixelBlock, { backgroundColor: accent }]} />
        <View
          style={[
            styles.pixelBlock,
            styles.pixelBlockTwo,
            { backgroundColor: accent },
          ]}
        />
      </View>
    );
  if (kind === "hud")
    return (
      <View
        pointerEvents="none"
        style={[styles.hudDecoration, { borderColor: `${accent}55` }]}
      >
        <NexusText variant="mono" color={accent}>
          SYS // ACTIVE
        </NexusText>
      </View>
    );
  if (kind === "neon")
    return (
      <View pointerEvents="none" style={styles.neonDecoration}>
        <View style={[styles.neonLine, { backgroundColor: "#F04CFF" }]} />
        <View style={[styles.neonLine, { backgroundColor: accent }]} />
      </View>
    );
  if (kind === "privacy")
    return (
      <View pointerEvents="none" style={styles.privacyDecoration}>
        <NexusText variant="mono" color={accent}>
          LOCKED ◈
        </NexusText>
      </View>
    );
  if (kind === "mascot")
    return (
      <View
        pointerEvents="none"
        style={[styles.mascotGlow, { backgroundColor: `${accent}18` }]}
      />
    );
  return (
    <View
      pointerEvents="none"
      style={[styles.glassHighlight, { borderColor: `${accent}55` }]}
    />
  );
}

function Metric({ value }: { value: string }) {
  return (
    <View style={styles.metricPill}>
      <NexusText variant="mono" secondary>
        {value}
      </NexusText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  widget: {
    gap: 12,
    justifyContent: "space-between",
    maxWidth: "100%",
    position: "relative",
    overflow: "hidden",
  },
  centered: { alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerCentered: { justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandCentered: { justifyContent: "center" },
  centerText: { textAlign: "center" },
  brandCopyCentered: { alignItems: "center" },
  tasks: { gap: 7, width: "100%" },
  tasksCompact: { gap: 3 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskCentered: { justifyContent: "center" },
  learning: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    width: "100%",
  },
  learningCentered: { justifyContent: "center" },
  check: { width: 13, height: 13, borderRadius: 4, borderWidth: 1 },
  flex: { flex: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metricsCentered: { justifyContent: "center" },
  metricPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  capture: {
    minHeight: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  smartPlan: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 5,
  },
  smartLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  glassHighlight: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    height: 1,
    borderTopWidth: 1,
    opacity: 0.9,
  },
  pixelDecoration: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 34,
    height: 18,
  },
  pixelBlock: { position: "absolute", width: 8, height: 8, right: 0, top: 0 },
  pixelBlockTwo: { right: 10, top: 8, opacity: 0.45 },
  hudDecoration: {
    position: "absolute",
    top: 6,
    right: 8,
    borderTopWidth: 1,
    paddingTop: 3,
    opacity: 0.58,
  },
  neonDecoration: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    flexDirection: "row",
    gap: 3,
  },
  neonLine: { flex: 1, height: 2 },
  privacyDecoration: {
    position: "absolute",
    right: 10,
    bottom: 8,
    opacity: 0.55,
  },
  mascotGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -55,
    top: -65,
  },
});
