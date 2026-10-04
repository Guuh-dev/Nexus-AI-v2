import { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { scenePixels, type PixelPose } from "@/features/mascot/sprites";
import { PixelArt } from "@/components/PixelArt";
import { PixelCharacter } from "@/components/PixelMascot";
import { CompanionMascot } from "@/components/CompanionMascot";
import { NexusText } from "@/components/ui/NexusText";
import { createWidgetRenderSpec, type WidgetFamily, type WidgetRenderSpec } from "@/features/widget/render-spec";
import { ACTIVITY_WEEKS, activitySummary } from "@/features/widget/activity";
import { elapsedAt } from "@/features/focus/runtime";
import { peekFocusRuntime, type FocusRuntime } from "@/services/focus-runtime.service";
import { getCompanionLine } from "@/features/companion/companion";
import { useNexus } from "@/providers/NexusProvider";
import { localDateKey } from "@/utils/dates";

const Pose = createContext<PixelPose>("idle");
// Ink on the accent fill. Matches the native widget's on-accent color, not an app theme token.
const ON_ACCENT = "#120E26";
// Preview footprints follow the launcher cell ratio of each family.
const DIMENSIONS: Record<WidgetFamily, { width: number | "100%"; minHeight: number }> = {
  mini: { width: 104, minHeight: 104 },
  strip: { width: 236, minHeight: 92 },
  companion: { width: 220, minHeight: 220 },
  mission: { width: "100%", minHeight: 176 },
  command: { width: "100%", minHeight: 340 },
  timer: { width: 220, minHeight: 220 },
  capture: { width: 236, minHeight: 92 },
  streak: { width: "100%", minHeight: 176 },
};
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function WidgetPreview({ spec: requested, caption = true }: { spec?: WidgetRenderSpec; caption?: boolean }) {
  const { data, colors } = useNexus();
  const [runtime, setRuntime] = useState<FocusRuntime | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { let mounted = true; const refresh = () => { void peekFocusRuntime().then((r) => { if (mounted) setRuntime(r); }).catch(() => undefined); }; refresh(); const timer = setInterval(refresh, 5000); return () => { mounted = false; clearInterval(timer); }; }, []);
  const spec = requested ?? createWidgetRenderSpec(data.preferences.widget, colors);
  useEffect(() => {
    if (spec.family !== "timer" || runtime?.status !== "running") return undefined;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [runtime?.status, spec.family]);
  const plan = data.activePlan, completed = plan?.tasks.filter((t) => t.completed).length ?? 0, total = plan?.tasks.length ?? 0;
  const tasks = spec.privateMode ? [] : (plan?.tasks ?? []).slice(0, spec.taskLimit);
  const next = plan?.tasks.find((t) => !t.completed);
  const today = plan?.date ?? localDateKey(new Date(), data.profile?.timezone);
  const focusMinutes = Math.floor(data.progress.focusSessions.filter((s) => localDateKey(new Date(s.completedAt), data.profile?.timezone) === today).reduce((n, s) => n + s.elapsedSeconds, 0) / 60);
  const pose: PixelPose = spec.privateMode ? "idle" : runtime?.status === "paused" ? "sleeping" : runtime?.status === "running" ? "thinking" : total > 0 && completed >= total ? "celebrating" : "idle";
  const mission = spec.privateMode ? "Missão protegida" : plan?.mainMission.title ?? spec.emptyState.title;
  const companionLine = spec.privateMode || spec.mascot.speech === "silent" || !plan ? "Um passo por vez" : getCompanionLine(data, spec.mascot.personality, "widget");
  const progress = total > 0 ? completed / total : 0;
  const c = spec.colors;
  const transparent = spec.style === "transparent";

  return <Pose.Provider value={pose}><View style={styles.wrapper}><View accessibilityLabel={`Preview ${spec.family} ${spec.size}`} style={[styles.widget, DIMENSIONS[spec.family], { backgroundColor: c.background, borderColor: c.border, borderWidth: transparent ? 0 : spec.style === "pixel" ? 2 : 1, borderRadius: transparent ? 0 : spec.style === "pixel" ? 6 : 22 }]}>

    {spec.family === "mini" && <View style={styles.center}>
      <Mascot spec={spec} size={56} />
      {spec.fields.metric !== null && <NexusText variant="caption" color={c.text} style={styles.bold}>{spec.privateMode ? "NEXUS" : spec.fields.metric === "xp" ? `${data.progress.totalXp} XP` : `${data.progress.currentStreak} dias`}</NexusText>}
    </View>}

    {spec.family === "strip" && <View style={styles.row}>
      <Mascot spec={spec} size={40} />
      <View style={styles.column}>
        <Eyebrow color={c.accent}>{spec.privateMode ? "Privacidade" : spec.content === "progress" ? "Progresso de hoje" : "Próximo passo"}</Eyebrow>
        <NexusText variant="subtitle" color={c.text} numberOfLines={1}>{spec.privateMode ? "Próxima ação protegida" : spec.content === "progress" ? total > 0 ? `${Math.floor(progress * 100)}% concluído` : spec.emptyState.title : next?.firstStep?.trim() || next?.title || spec.emptyState.title}</NexusText>
        {!spec.privateMode && <Bar value={progress} accent={c.accent} />}
      </View>
    </View>}

    {spec.family === "companion" && <View style={styles.fill}>
      <View style={styles.stage}><Habitat spec={spec} /><Mascot spec={spec} size={96} /></View>
      <View style={[styles.speech, { borderTopColor: c.border }]}><NexusText variant="caption" color={c.text} numberOfLines={2}>{companionLine}</NexusText></View>
    </View>}

    {spec.family === "mission" && <View style={styles.stack}>
      <View style={styles.row}>
        <Mascot spec={spec} size={30} />
        <View style={styles.column}>
          <Eyebrow color={c.accent}>{spec.content === "tasks" ? "Tarefas de hoje" : `Missão de hoje${plan && !spec.privateMode ? ` · ${plan.mainMission.estimatedMinutes} min` : ""}`}</Eyebrow>
          {spec.fields.mission && <NexusText variant="subtitle" color={c.text} numberOfLines={2}>{mission}</NexusText>}
        </View>
        {!spec.privateMode && plan && <FocusPill accent={c.accent} />}
      </View>
      {!spec.privateMode && <Bar value={progress} accent={c.accent} />}
      <TaskRows tasks={tasks} spec={spec} />
      {!spec.privateMode && total === 0 && <NexusText variant="caption" color={c.secondaryText}>{spec.emptyState.actionLabel} →</NexusText>}
    </View>}

    {spec.family === "command" && <View style={styles.stack}>
      {spec.scene !== "none" && <View style={styles.commandStage}><Habitat spec={spec} /><Mascot spec={spec} size={72} /></View>}
      <View style={styles.row}>
        <View style={styles.column}>
          <Eyebrow color={c.accent}>{new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: data.profile?.timezone })} · Missão</Eyebrow>
          <NexusText variant="title" color={c.text} numberOfLines={2}>{mission}</NexusText>
        </View>
        {spec.scene === "none" && <Mascot spec={spec} size={44} />}
      </View>
      {!spec.privateMode && <><Bar value={progress} accent={c.accent} /><NexusText variant="caption" color={c.secondaryText}>{total > 0 ? `${completed} de ${total} passos` : spec.emptyState.actionLabel}</NexusText></>}
      <TaskRows tasks={tasks} spec={spec} />
      <View style={[styles.row, styles.footer]}>
        {spec.privateMode ? <NexusText variant="caption" color={c.secondaryText} style={styles.column}>Conteúdo protegido.</NexusText> : <View style={[styles.row, styles.column]}>
          <Metric value={runtime?.status === "running" ? `${Math.floor(runtime.elapsedBase / 60)}m` : `${focusMinutes}m`} label={runtime?.status === "running" ? "sessão" : "foco hoje"} color={c} />
          <Metric value={`${data.progress.currentStreak}d`} label="sequência" color={c} />
        </View>}
        <FocusPill accent={c.accent} label={spec.actions.tap === "focus" || runtime ? "Focar" : "Abrir"} />
      </View>
    </View>}

    {spec.family === "timer" && <TimerFace spec={spec} runtime={spec.privateMode ? null : runtime} now={now} nextTitle={spec.privateMode ? undefined : next?.title} />}

    {spec.family === "capture" && <View style={styles.row}>
      <View style={[styles.captureTile, { backgroundColor: c.accent }]}><NexusText variant="title" color={ON_ACCENT} style={styles.plus}>+</NexusText></View>
      <View style={styles.column}>
        <NexusText variant="subtitle" color={c.text}>Capturar</NexusText>
        <NexusText variant="caption" color={c.secondaryText}>ideia, tarefa ou lembrete</NexusText>
      </View>
    </View>}

    {spec.family === "streak" && <StreakFace spec={spec} />}

  </View>{caption && <NexusText variant="caption" secondary style={styles.caption}>{spec.size} · prévia de conteúdo e aparência</NexusText>}</View></Pose.Provider>;
}

function Eyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return <NexusText variant="eyebrow" color={color} numberOfLines={1} style={styles.eyebrow}>{children}</NexusText>;
}

function Bar({ value, accent }: { value: number; accent: string }) {
  return <View style={[styles.bar, { backgroundColor: `${accent}26` }]}><View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: accent }]} /></View>;
}

function FocusPill({ accent, label = "Focar" }: { accent: string; label?: string }) {
  return <View style={[styles.pill, { backgroundColor: accent }]}><NexusText variant="caption" color={ON_ACCENT} style={styles.bold}>▶ {label}</NexusText></View>;
}

function Metric({ value, label, color }: { value: string; label: string; color: WidgetRenderSpec["colors"] }) {
  return <View><NexusText variant="subtitle" color={color.text}>{value}</NexusText><NexusText variant="caption" color={color.secondaryText}>{label}</NexusText></View>;
}

function TaskRows({ tasks, spec }: { tasks: { id: string; title: string; completed: boolean; estimatedMinutes: number }[]; spec: WidgetRenderSpec }) {
  if (!tasks.length) return null;
  const c = spec.colors;
  return <View style={styles.tasks}>{tasks.map((task) => <View key={task.id} style={styles.task}>
    <View style={[styles.check, { borderColor: task.completed ? c.accent : c.secondaryText, backgroundColor: task.completed ? c.accent : "transparent" }]}>{task.completed && <NexusText variant="caption" color={ON_ACCENT} style={styles.checkMark}>✓</NexusText>}</View>
    <NexusText variant="caption" color={task.completed ? c.secondaryText : c.text} numberOfLines={1} style={[styles.column, task.completed && styles.done]}>{task.title}</NexusText>
    <NexusText variant="caption" color={c.secondaryText}>{task.estimatedMinutes} min</NexusText>
  </View>)}</View>;
}

function TimerFace({ spec, runtime, now, nextTitle }: { spec: WidgetRenderSpec; runtime: FocusRuntime | null; now: number; nextTitle?: string }) {
  const c = spec.colors;
  const elapsed = runtime ? elapsedAt(runtime, now) : 0;
  const target = (runtime?.duration ?? 25) * 60;
  const size = 104, radius = 46, circumference = 2 * Math.PI * radius;
  const ratio = runtime ? Math.min(1, elapsed / target) : 0;
  const label = spec.privateMode ? "Foco protegido" : runtime?.status === "running" ? "Em foco" : runtime?.status === "paused" ? "Pausado" : runtime?.status === "completed" ? "Revisar entrega" : "Pronto para focar";
  return <View style={[styles.fill, styles.timer]}>
    <View style={styles.rowBetween}><Eyebrow color={c.accent}>{label}</Eyebrow><Mascot spec={spec} size={26} /></View>
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={`${c.accent}26`} strokeWidth={6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.accent} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} rotation={-90} origin={`${size / 2},${size / 2}`} />
      </Svg>
      <NexusText variant="title" color={c.text} style={styles.clock}>{runtime ? clock(elapsed) : `${Math.round(target / 60)}:00`}</NexusText>
    </View>
    <NexusText variant="caption" color={c.secondaryText} numberOfLines={1} style={styles.centerText}>{spec.privateMode ? "Toque para abrir" : runtime?.taskTitle ?? nextTitle ?? spec.emptyState.body}</NexusText>
    <FocusPill accent={c.accent} label={runtime ? "Abrir foco" : "Iniciar"} />
  </View>;
}

function StreakFace({ spec }: { spec: WidgetRenderSpec }) {
  const { data } = useNexus();
  const c = spec.colors;
  const summary = activitySummary(data);
  const shades = [`${c.text}12`, `${c.accent}55`, `${c.accent}88`, `${c.accent}CC`, c.accent];
  return <View style={styles.stack}>
    <View style={styles.row}>
      <View style={styles.column}>
        <Eyebrow color={c.accent}>Últimas {ACTIVITY_WEEKS} semanas</Eyebrow>
        <NexusText variant="subtitle" color={c.text}>{spec.privateMode ? "Sequência protegida" : `${data.progress.currentStreak} dias seguidos`}</NexusText>
      </View>
      {!spec.privateMode && <View style={styles.alignEnd}><NexusText variant="subtitle" color={c.text}>{Math.round(summary.focusMinutes / 60)}h</NexusText><NexusText variant="caption" color={c.secondaryText}>de foco</NexusText></View>}
      <Mascot spec={spec} size={32} />
    </View>
    {spec.privateMode ? <NexusText variant="caption" color={c.secondaryText}>Conteúdo protegido.</NexusText> : <View style={styles.grid}>
      {Array.from({ length: ACTIVITY_WEEKS }, (_, week) => <View key={week} style={styles.gridColumn}>
        {Array.from({ length: 7 }, (_, day) => <View key={day} style={[styles.cell, { backgroundColor: shades[summary.levels[week * 7 + day] ?? 0] }]} />)}
      </View>)}
    </View>}
  </View>;
}

function Habitat({ spec }: { spec: WidgetRenderSpec }) {
  if (spec.scene === "none") return null;
  const rows = scenePixels(spec.scene);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}><PixelArt rows={rows} width="100%" height="100%" /></View>;
}

function Mascot({ spec, size }: { spec: WidgetRenderSpec; size: number }) {
  const pose = useContext(Pose);
  if (!spec.mascot.visible) return null;
  return spec.mascot.id === "nexus" || spec.mascot.id === "atlas" ? <PixelCharacter kind={spec.mascot.id} size={size} state={pose === "idle" && !spec.privateMode && spec.family === "companion" && spec.scene !== "none" ? "reading" : pose} fixedPalette accessory="none" mood={spec.mascot.personality} /> : <CompanionMascot mascot={spec.mascot.id} size={size} state={pose} />;
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", width: "100%" },
  widget: { maxWidth: "100%", overflow: "hidden", padding: 14, position: "relative", justifyContent: "center" },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  centerText: { textAlign: "center", alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" },
  column: { flex: 1, minWidth: 0, gap: 3 },
  stack: { flex: 1, gap: 10 },
  eyebrow: { fontSize: 10, lineHeight: 13 },
  bold: { fontWeight: "700" },
  bar: { height: 4, borderRadius: 2, overflow: "hidden", alignSelf: "stretch" },
  barFill: { height: 4, borderRadius: 2 },
  pill: { borderRadius: 15, paddingHorizontal: 11, height: 28, alignItems: "center", justifyContent: "center" },
  tasks: { gap: 8 },
  task: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 22 },
  check: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkMark: { fontSize: 10, lineHeight: 12, fontWeight: "800" },
  done: { textDecorationLine: "line-through" },
  stage: { flex: 1, minHeight: 120, alignItems: "flex-start", justifyContent: "flex-end", paddingLeft: 4 },
  commandStage: { height: 96, marginHorizontal: -14, marginTop: -14, alignItems: "flex-start", justifyContent: "flex-end", paddingLeft: 14, overflow: "hidden" },
  speech: { borderTopWidth: 1, marginHorizontal: -14, marginBottom: -14, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { marginTop: "auto" },
  timer: { alignItems: "center", justifyContent: "space-between", gap: 6 },
  clock: { fontSize: 22, lineHeight: 26, fontVariant: ["tabular-nums"] },
  captureTile: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  plus: { fontSize: 28, lineHeight: 32 },
  alignEnd: { alignItems: "flex-end" },
  grid: { flexDirection: "row", justifyContent: "space-between", gap: 3 },
  gridColumn: { gap: 3 },
  cell: { width: 12, height: 11, borderRadius: 3 },
  caption: { marginTop: 8 },
});
