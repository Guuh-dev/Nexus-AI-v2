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
  "1x1": { width: 110, minHeight: 110 }, "2x1": { width: 230, minHeight: 100 }, "2x2": { width: 230, minHeight: 210 },
  "3x2": { width: 330, minHeight: 210 }, "4x1": { width: "100%" as const, minHeight: 105 }, "4x2": { width: "100%" as const, minHeight: 210 },
  "4x3": { width: "100%" as const, minHeight: 290 }, "4x4": { width: "100%" as const, minHeight: 365 }, "5x2": { width: "100%" as const, minHeight: 210 },
};

export function WidgetPreview() {
  const { data, colors } = useNexus();
  const plan = data.activePlan;
  const prefs = data.preferences.widget;
  const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const tiny = prefs.preferredSize === "1x1";
  const compact = tiny || prefs.preferredSize === "2x1" || prefs.preferredSize === "4x1";
  const large = prefs.preferredSize === "4x3" || prefs.preferredSize === "4x4";
  const background = prefs.style === "amoled" ? "#000000" : prefs.style === "transparent" || prefs.style === "glass" ? `${colors.surfaceAlt}B8` : prefs.style === "minimal" ? colors.surface : colors.surfaceAlt;
  const level = calculateLevel(data.progress.totalXp).level;
  const activeRoadmap = data.learning.roadmaps.find((roadmap) => roadmap.id === data.learning.activeRoadmapId && roadmap.status === "active");
  const nextLesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
  const maxTasks = large ? prefs.taskCount : compact ? 0 : Math.min(3, prefs.taskCount);
  return (
    <View style={styles.wrapper}>
      <Card style={[styles.widget, SIZE_DIMENSIONS[prefs.preferredSize], { backgroundColor: background, borderColor: prefs.style === "gamer" || prefs.style === "pixel" ? prefs.accentColor ?? colors.primary : colors.border, borderRadius: prefs.style === "pixel" ? 7 : 22, opacity: prefs.opacity }]}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {prefs.showMascot ? prefs.mascot === "nexus" ? <PixelMascot skin={data.preferences.mascot.skin} accessory={data.preferences.mascot.equippedAccessory} size={tiny ? 38 : 30} state={plan?.source === "offline" ? "sleeping" : "idle"} /> : <CompanionMascot mascot={prefs.mascot} size={tiny ? 38 : 30} state={plan?.source === "offline" ? "sleeping" : "idle"} /> : null}
            {prefs.showProfessor && prefs.mascot !== "atlas" ? <CompanionMascot mascot="atlas" size={tiny ? 34 : 28} state="idle" /> : null}
            {!tiny ? <View><NexusText variant="mono" color={prefs.accentColor ?? colors.primarySoft}>NEXUS ONLINE</NexusText><NexusText variant="caption" secondary>MISSÃO DE HOJE</NexusText></View> : null}
          </View>
          {prefs.showStreak ? <NexusText variant="caption" color={colors.warning}>♨ {data.progress.currentStreak}</NexusText> : null}
        </View>
        {!tiny && prefs.showMission ? <NexusText variant={prefs.fontScale === "grande" ? "title" : "subtitle"} numberOfLines={compact ? 1 : 2}>{prefs.privacyMode ? "Missão protegida" : plan?.mainMission.title ?? "Seu plano aparecerá aqui"}</NexusText> : null}
        {prefs.showTasks && maxTasks > 0 ? <View style={styles.tasks}>{(plan?.tasks ?? []).slice(0, maxTasks).map((task) => <View key={task.id} style={styles.taskRow}><View style={[styles.check, { borderColor: task.completed ? colors.success : colors.borderStrong, backgroundColor: task.completed ? colors.success : "transparent" }]} /><NexusText variant="caption" secondary={!task.completed} numberOfLines={1} style={styles.flex}>{prefs.privacyMode ? "Tarefa privada" : task.title}</NexusText></View>)}</View> : null}
        {prefs.showLearning && !compact && activeRoadmap && nextLesson ? <View style={styles.learning}><CompanionMascot mascot="atlas" size={24} /><View style={styles.flex}><NexusText variant="caption" color={prefs.accentColor ?? colors.primarySoft} numberOfLines={1}>{prefs.privacyMode ? "Próxima evolução" : nextLesson.title}</NexusText><NexusText variant="caption" secondary>{nextLesson.estimatedMinutes} min • {roadmapProgress(activeRoadmap).percentage}%</NexusText></View></View> : null}
        {large && (prefs.showXp || prefs.showLevel) ? <NexusText variant="caption" secondary>{prefs.showLevel ? `Nível ${level}` : ""}{prefs.showLevel && prefs.showXp ? " • " : ""}{prefs.showXp ? `${data.progress.totalXp} XP` : ""}</NexusText> : null}
        {!tiny ? prefs.progressStyle === "bar" ? <ProgressBar progress={total ? completed / total : 0} height={5} /> : <NexusText variant={prefs.progressStyle === "number" ? "title" : "caption"} secondary>{prefs.progressStyle === "circle" ? "◉ " : ""}{completed}/{total} concluídas</NexusText> : <NexusText variant="title" color={colors.primarySoft}>{total ? `${Math.round((completed / total) * 100)}%` : "0%"}</NexusText>}
        {large ? <View style={[styles.capture, { borderColor: `${colors.primary}55` }]}><NexusText variant="caption" color={colors.primarySoft}>＋ Capturar rápido</NexusText></View> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({ wrapper: { alignItems: "center" }, widget: { gap: 12, justifyContent: "space-between", maxWidth: "100%" }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { flexDirection: "row", alignItems: "center", gap: 7 }, tasks: { gap: 7 }, taskRow: { flexDirection: "row", alignItems: "center", gap: 8 }, learning: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 7 }, check: { width: 13, height: 13, borderRadius: 4, borderWidth: 1 }, flex: { flex: 1 }, capture: { minHeight: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" } });
