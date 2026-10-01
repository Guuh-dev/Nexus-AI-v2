import { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { scenePixels, type PixelPose } from "@/features/mascot/sprites";
import { PixelArt } from "@/components/PixelArt";
import { PixelCharacter } from "@/components/PixelMascot";
import { CompanionMascot } from "@/components/CompanionMascot";
import { NexusText } from "@/components/ui/NexusText";
import { createWidgetRenderSpec, type WidgetRenderSpec } from "@/features/widget/render-spec";
import { peekFocusRuntime, type FocusRuntime } from "@/services/focus-runtime.service";
import { getCompanionLine } from "@/features/companion/companion";
import { useNexus } from "@/providers/NexusProvider";
import { localDateKey } from "@/utils/dates";
const Pose = createContext<PixelPose>("idle");
const DIMENSIONS = { mini: { width: 112, minHeight: 112 }, strip: { width: 248, minHeight: 86 }, companion: { width: 232, minHeight: 232 }, mission: { width: "100%" as const, minHeight: 184 }, command: { width: "100%" as const, minHeight: 368 } };
export function WidgetPreview({ spec: requested }: { spec?: WidgetRenderSpec }) {
  const { data, colors } = useNexus();
  const [runtime, setRuntime] = useState<FocusRuntime | null>(null);
  useEffect(() => { let mounted = true; const refresh = () => { void peekFocusRuntime().then((r) => { if (mounted) setRuntime(r); }).catch(() => undefined); }; refresh(); const timer = setInterval(refresh, 5000); return () => { mounted = false; clearInterval(timer); }; }, []);
  const spec = requested ?? createWidgetRenderSpec(data.preferences.widget, colors);
  const plan = data.activePlan, completed = plan?.tasks.filter((t) => t.completed).length ?? 0, total = plan?.tasks.length ?? 0;
  const tasks = spec.privateMode ? [] : (plan?.tasks ?? []).slice(0, spec.taskLimit);
  const next = plan?.tasks.find((t) => !t.completed);
  const today = plan?.date ?? localDateKey(new Date(), data.profile?.timezone);
  const focusMinutes = Math.floor(data.progress.focusSessions.filter((s) => localDateKey(new Date(s.completedAt), data.profile?.timezone) === today).reduce((n, s) => n + s.elapsedSeconds, 0) / 60);
  const pose: PixelPose = spec.privateMode ? "idle" : runtime?.status === "paused" ? "sleeping" : runtime?.status === "running" ? "thinking" : total > 0 && completed >= total ? "celebrating" : spec.mascot.personality === "quiet" || spec.mascot.speech === "silent" ? "sleeping" : spec.mascot.personality === "strict" ? "thinking" : "idle";
  const mission = spec.privateMode ? "Missão protegida" : plan?.mainMission.title ?? spec.emptyState.title;
  const companionLine = spec.privateMode || spec.mascot.speech === "silent" || !plan ? "Um passo por vez" : getCompanionLine(data, spec.mascot.personality, "widget");
  const focusLabel = spec.privateMode ? "Conteúdo protegido." : runtime?.status === "paused" ? `Ⅱ Sessão pausada · ${Math.floor(runtime.elapsedBase / 60)} min` : runtime?.status === "running" ? `▶ Sessão em andamento · ${Math.floor(runtime.elapsedBase / 60)} min confirmados` : runtime?.status === "completed" ? "Revisar entrega da sessão" : `${focusMinutes} min de foco registrado`;
  return <Pose.Provider value={pose}><View style={styles.wrapper}><View accessibilityLabel={`Preview ${spec.family} ${spec.size}`} style={[styles.widget, DIMENSIONS[spec.family], { backgroundColor: spec.colors.background, borderColor: spec.colors.border, borderWidth: spec.style === "transparent" ? 0 : spec.style === "pixel" ? 2 : 1, borderRadius: spec.style === "transparent" ? 0 : spec.style === "pixel" ? 6 : spec.style === "minimal" ? 24 : 22 }]}>
    {spec.family === "mini" && <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}><View pointerEvents="none" style={{ position: "absolute", right: 0, top: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: "#8CDEC1" }} /><Mascot spec={spec} size={72} />{spec.fields.metric !== null && <NexusText variant="caption" color={spec.colors.accent}>{spec.privateMode ? "NEXUS" : spec.fields.metric === "xp" ? `${data.progress.totalXp} XP` : `♨ ${data.progress.currentStreak}`}</NexusText>}</View>}
    {spec.family === "strip" && <View style={styles.header}><Mascot spec={spec} size={48} /><View style={styles.flex}><NexusText variant="caption" color={spec.colors.secondaryText}>{spec.privateMode ? "PRIVACIDADE" : spec.content === "progress" ? "PROGRESSO DE HOJE" : "Próxima ação"}</NexusText><NexusText variant="subtitle" color={spec.colors.text} numberOfLines={1}>{spec.privateMode ? "Próxima ação protegida" : spec.content === "progress" ? total > 0 ? `${Math.floor(completed / total * 100)}% concluído` : spec.emptyState.title : next?.firstStep?.trim() || next?.title || spec.emptyState.title}</NexusText></View><NexusText color={spec.colors.accent}>›</NexusText></View>}
    {spec.family === "companion" && <View style={{ flex: 1, gap: 8 }}><NexusText variant="subtitle" color={spec.colors.text} numberOfLines={2}>{companionLine}</NexusText><View style={{ flex: 1, minHeight: 154, alignItems: "center", justifyContent: "flex-end" }}><Habitat spec={spec} /><Mascot spec={spec} size={120} /></View><NexusText variant="caption" color={spec.colors.secondaryText} style={{ textAlign: "center" }}>Toque para abrir</NexusText></View>}
    {(spec.family === "mission" || spec.family === "command") && <View style={{ flex: 1, gap: 10 }}>
      {spec.family === "command" ? <><View style={{ height: 112, alignItems: "center", justifyContent: "center" }}><Habitat spec={spec} /><Mascot spec={spec} size={96} /></View><NexusText variant="caption" color={spec.colors.secondaryText}>Seu dia, com direção.</NexusText><NexusText variant="title" color={spec.colors.text} numberOfLines={2}>{mission}</NexusText></> : <View style={styles.header}><Mascot spec={spec} size={40} /><View style={styles.flex}><NexusText variant="mono" color={spec.colors.accent} style={{ fontSize: 10 }}>{spec.content === "tasks" ? "TAREFAS DE HOJE" : "MISSÃO DE HOJE"}</NexusText>{spec.fields.mission && <NexusText variant="subtitle" color={spec.colors.text} numberOfLines={2}>{mission}</NexusText>}</View></View>}
      {tasks.length > 0 && <View style={{ gap: 6 }}>{tasks.map((task) => <View key={task.id} style={[styles.task, { borderColor: `${spec.colors.accent}24`, backgroundColor: `${spec.colors.accent}08` }]}><View style={{ width: 19, height: 19, borderRadius: 6, borderWidth: 1, borderColor: task.completed ? spec.colors.accent : spec.colors.secondaryText, backgroundColor: task.completed ? spec.colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>{task.completed && <NexusText variant="caption" color="#171329">✓</NexusText>}</View><NexusText variant="caption" color={spec.colors.text} numberOfLines={1} style={styles.flex}>{task.title}</NexusText></View>)}</View>}
      {!spec.privateMode && <View style={[styles.header, { gap: 10 }]}><NexusText variant="caption" color={spec.colors.secondaryText}>{total > 0 ? `${completed} de ${total} tarefas` : spec.emptyState.actionLabel}</NexusText><View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: `${spec.colors.accent}18`, overflow: "hidden" }}><View style={{ width: `${total > 0 ? completed / total * 100 : 0}%`, height: 6, backgroundColor: spec.colors.accent, borderRadius: 3 }} /></View></View>}
      {spec.family === "command" && <><View style={{ paddingTop: 8, borderTopWidth: 1, borderColor: spec.colors.border }}><NexusText variant="caption" color={spec.colors.accent}>{focusLabel}</NexusText></View><View style={{ padding: 7, borderRadius: 14, borderWidth: 1, borderColor: spec.colors.border }}><NexusText variant="caption" color={spec.colors.text} style={{ textAlign: "center" }}>› {spec.actions.tap === "focus" ? "Abrir foco" : "Abrir Nexus"}</NexusText></View></>}
    </View>}
  </View><NexusText variant="caption" secondary style={{ marginTop: 8 }}>{spec.size} · preview de conteúdo e aparência</NexusText></View></Pose.Provider>;
}
function Habitat({ spec }: { spec: WidgetRenderSpec }) {
  if (spec.scene === "none") return null;
  const rows = scenePixels(spec.scene);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}><PixelArt rows={rows} width="100%" height="100%" /></View>;
}
function Mascot({ spec, size }: { spec: WidgetRenderSpec; size: number }) {
  const pose = useContext(Pose);
  if (!spec.mascot.visible) return null;
  return spec.mascot.id === "nexus" || spec.mascot.id === "atlas" ? <PixelCharacter kind={spec.mascot.id} size={size} state={pose === "idle" && spec.family === "companion" && spec.scene !== "none" ? "reading" : pose} fixedPalette accessory="none" /> : <CompanionMascot mascot={spec.mascot.id} size={size} state={pose} />;
}
const styles = StyleSheet.create({ wrapper: { alignItems: "center" }, widget: { maxWidth: "100%", overflow: "hidden", padding: 14, position: "relative" }, flex: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", gap: 10 }, task: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 } });
