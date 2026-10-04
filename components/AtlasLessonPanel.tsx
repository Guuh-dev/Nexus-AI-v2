import { useState } from "react";
import { lessonMissionDraft } from "@/features/learning/mission";
import { router } from "expo-router";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusIcon } from "@/components/ui/NexusIcon";
import { CompanionMascot } from "@/components/CompanionMascot";
import { useNexus } from "@/providers/NexusProvider";
import { nextRoadmapLesson } from "@/features/learning/roadmap";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
export function AtlasLessonPanel({ onContinue }: { onContinue: () => void }) {
  const { data, colors, saveLockInDraft } = useNexus();
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");
  const roadmap = data.learning.roadmaps.find((r) => r.id === data.learning.activeRoadmapId && r.status !== "archived");
  const lesson = roadmap ? nextRoadmapLesson(roadmap) : undefined;
  const phase = roadmap?.phases.find((p) => p.lessons.some((l) => l.id === lesson?.id));
  const guidance = roadmap && lesson && phase ? getLessonGuidance(roadmap, phase, lesson) : undefined;
  return <View style={{ gap: 14, marginTop: 20 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 4 }}><CompanionMascot mascot="atlas" size={56} /><View style={{ flex: 1, gap: 4 }}><NexusText variant="display" style={{ fontSize: 26 }}>Professor Atlas</NexusText><NexusText secondary>Aprender para construir.</NexusText></View></View>
    {!roadmap ? <Card style={{ gap: 14, padding: 20 }}><NexusText variant="title">Sua próxima habilidade começa aqui.</NexusText><NexusText secondary>Conte seu ponto de partida e a entrega que quer construir. Salve o diagnóstico e retome quando precisar.</NexusText><NexusButton label={data.learning.intakeDraft ? "Retomar diagnóstico" : "Entender meu objetivo"} onPress={() => router.push("/professor-intake")} /></Card> : <>
      <Card style={{ gap: 13, padding: 16 }}><View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><View style={{ backgroundColor: `${colors.success}18`, borderRadius: 12, padding: 9 }}><NexusIcon name="book" color={colors.success} /></View><View style={{ flex: 1, gap: 4 }}><NexusText variant="mono" color={colors.success} style={{ fontSize: 10 }}>TRILHA ATIVA</NexusText><NexusText variant="title">{roadmap.topic}</NexusText><NexusText variant="caption" secondary>{roadmap.outcome}</NexusText></View></View><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{roadmap.phases.slice(0, 3).map((p, i) => <View key={p.id} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.id === phase?.id ? colors.success : p.lessons.every((l) => l.completed) ? colors.primary : colors.textSecondary }} /><NexusText variant="caption" color={p.id === phase?.id ? colors.success : colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>{p.title || `Etapa ${i + 1}`}</NexusText></View>)}</View></Card>
      {lesson && guidance ? <Card elevated style={{ gap: 14, padding: 20 }}><NexusText variant="mono" color={colors.primary} style={{ fontSize: 10 }}>▶ AGORA</NexusText><NexusText variant="title" style={{ fontSize: 23, lineHeight: 29 }}>{lesson.title}</NexusText><NexusText secondary>{guidance.objective}</NexusText><View style={{ gap: 10 }}>{guidance.steps.slice(0, 3).map((s, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.textSecondary }}><NexusText variant="caption" color={colors.background}>{i + 1}</NexusText></View><NexusText style={{ flex: 1 }}>{s}</NexusText></View>)}</View><Card style={{ flexDirection: "row", gap: 12, padding: 12 }}><NexusIcon name="book" color={colors.success} /><View style={{ flex: 1, gap: 4 }}><NexusText variant="mono" color={colors.success} style={{ fontSize: 10 }}>SUA ENTREGA</NexusText><NexusText>{guidance.deliverable}</NexusText><NexusText variant="caption" secondary>Concluído quando: {guidance.successCriteria}</NexusText></View></Card><NexusButton label="Continuar aula" onPress={onContinue} /><NexusButton label="Planejar no meu dia" variant="ghost" loading={planning} onPress={() => { if (planning) return; setPlanning(true); setError(""); void (async () => { try { const draft = lessonMissionDraft(data, roadmap.id, lesson.id); if (await saveLockInDraft(draft)) router.push("/(tabs)/plan"); else setError("Não foi possível guardar a proposta. Tente novamente."); } catch (e) { setError(e instanceof Error ? e.message : "Revise sua trilha."); } finally { setPlanning(false); } })(); }} /><NexusText variant="caption" secondary style={{ textAlign: "center" }}>{lesson.estimatedMinutes} min estimados · dentro das janelas do seu dia</NexusText></Card> : <Card><NexusText color={colors.success}>Lições concluídas. Revise suas evidências antes de escolher a próxima trilha.</NexusText></Card>}
    </>}
    {error && <NexusText color={colors.warning}>{error}</NexusText>}
  </View>;
}
