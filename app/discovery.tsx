import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CompanionMascot } from "@/components/CompanionMascot";
import { PixelMascot } from "@/components/PixelMascot";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { DEFAULT_EVOLUTION_PROFILE } from "@/constants/defaults";
import { OTA_RELEASE } from "@/constants/release";
import { ACCOUNTABILITY_OPTIONS, CHALLENGE_OPTIONS, EVOLUTION_OPTIONS, LEARNING_STYLE_OPTIONS, OBSTACLE_OPTIONS, STRENGTH_OPTIONS, TRIGGER_OPTIONS } from "@/features/onboarding/options";
import { useNexus } from "@/providers/NexusProvider";
import type { EvolutionArea, EvolutionProfile } from "@/types";

export { RouteErrorBoundary as ErrorBoundary };

const TITLES = ["Seu novo mapa", "O que trava você", "Como você aprende", "Seu modo de jogo", "Professor Atlas"] as const;

export default function DiscoveryScreen() {
  const { data, colors, completeDiscovery } = useNexus();
  const current = data.profile?.evolution ?? DEFAULT_EVOLUTION_PROFILE;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [evolution, setEvolution] = useState<EvolutionProfile>({ ...DEFAULT_EVOLUTION_PROFILE, ...current });
  const [topics, setTopics] = useState(current.professorTopics.join(", "));
  const [custom, setCustom] = useState(current.customAreas.join(", "));
  const [weekly, setWeekly] = useState(String(current.weeklyLearningMinutes));
  const [saving, setSaving] = useState(false);

  if (!data.profile) return null;
  const patch = <K extends keyof EvolutionProfile>(key: K, value: EvolutionProfile[K]) => { setEvolution((valueNow) => ({ ...valueNow, [key]: value })); setError(""); };
  const toggle = (key: "biggestObstacles" | "procrastinationTriggers" | "strengths", value: string) => patch(key, evolution[key].includes(value) ? evolution[key].filter((item) => item !== value) : [...evolution[key], value]);
  const toggleArea = (area: EvolutionArea) => patch("primaryAreas", evolution.primaryAreas.includes(area) ? evolution.primaryAreas.filter((item) => item !== area) : [...evolution.primaryAreas, area]);

  const next = async () => {
    if (step === 0 && !evolution.primaryAreas.length) return setError("Escolha ao menos uma área.");
    if (step === 1 && evolution.currentSituation.trim().length < 5) return setError("Conte um pouco sobre sua situação atual.");
    if (step === 2 && (Number(weekly) < 30 || Number(weekly) > 3000)) return setError("Use entre 30 e 3000 minutos por semana.");
    if (step === 4 && evolution.professorScope === "especifico" && topics.trim().length < 2) return setError("Diga o que deseja dominar primeiro.");
    if (step < 4) return setStep((value) => value + 1);
    const finalEvolution = {
      ...evolution,
      weeklyLearningMinutes: Number(weekly),
      customAreas: custom.split(",").map((item) => item.trim()).filter((item) => item.length >= 2).slice(0, 8),
      professorTopics: topics.split(/[,\n]/).map((item) => item.trim()).filter((item) => item.length >= 2).slice(0, 12),
    };
    setSaving(true);
    setError("");
    try {
      const saved = await completeDiscovery(finalEvolution);
      if (saved) router.replace(finalEvolution.professorScope === "depois" ? "/(tabs)/today" : "/professor-intake");
      else setError("Não foi possível confirmar o diagnóstico. Revise suas escolhas e tente novamente.");
    } catch {
      setError("Não foi possível salvar o diagnóstico agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        {step === 4 ? <View style={styles.duo}><PixelMascot size={44} /><CompanionMascot mascot="atlas" state="thinking" size={48} /></View> : <PixelMascot state={step === 3 ? "celebrating" : "idle"} size={52} />}
        <View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>NEXUS {OTA_RELEASE.label} • {step + 1}/5</NexusText><NexusText variant="title">{TITLES[step]}</NexusText></View>
      </View>
      <ProgressBar progress={(step + 1) / 5} />
      <View style={styles.intro}><NexusText variant="display">Vamos conhecer sua próxima versão.</NexusText><NexusText secondary>Seu plano, XP e histórico continuam intactos. Este diagnóstico só torna o Nexus mais inteligente.</NexusText></View>

      <View style={styles.form}>
        {step === 0 ? <>
          {["Carreira e criação", "Aprendizado", "Execução", "Vida e corpo"].map((group) => <Group key={group} title={group}><View style={styles.chips}>{EVOLUTION_OPTIONS.filter((item) => item.group === group).map((item) => <ChoiceChip key={item.value} label={item.label} selected={evolution.primaryAreas.includes(item.value)} onPress={() => toggleArea(item.value)} />)}</View></Group>)}
          <Field label="Outras áreas" value={custom} onChangeText={setCustom} maxLength={300} placeholder="Design, música, cybersecurity..." />
          <Field label="Quem quer se tornar?" value={evolution.desiredIdentity} onChangeText={(value) => patch("desiredIdentity", value)} multiline maxLength={500} />
        </> : null}
        {step === 1 ? <>
          <Field label="Como está sua situação hoje?" value={evolution.currentSituation} onChangeText={(value) => patch("currentSituation", value)} multiline maxLength={800} />
          <Multi title="Maiores obstáculos" values={evolution.biggestObstacles} options={OBSTACLE_OPTIONS} onToggle={(value) => toggle("biggestObstacles", value)} />
          <Multi title="Gatilhos de procrastinação" values={evolution.procrastinationTriggers} options={TRIGGER_OPTIONS} onToggle={(value) => toggle("procrastinationTriggers", value)} />
          <Multi title="Suas forças" values={evolution.strengths} options={STRENGTH_OPTIONS} onToggle={(value) => toggle("strengths", value)} />
        </> : null}
        {step === 2 ? <>
          <ChoiceCards title="Aprendizado" options={LEARNING_STYLE_OPTIONS} value={evolution.learningStyle} onChange={(value) => patch("learningStyle", value)} />
          <ChoiceCards title="Cobrança" options={ACCOUNTABILITY_OPTIONS} value={evolution.accountabilityStyle} onChange={(value) => patch("accountabilityStyle", value)} />
          <Group title="Sessão ideal"><View style={styles.chips}>{([15,25,45,60,90] as const).map((minutes) => <ChoiceChip key={minutes} label={`${minutes} min`} selected={evolution.sessionLength === minutes} onPress={() => patch("sessionLength", minutes)} />)}</View></Group>
          <Field label="Minutos de aprendizado por semana" value={weekly} onChangeText={setWeekly} keyboardType="number-pad" maxLength={4} />
        </> : null}
        {step === 3 ? <ChoiceCards title="Quanto de jogo deseja?" options={CHALLENGE_OPTIONS} value={evolution.challengeMode} onChange={(value) => { patch("challengeMode", value); patch("wantsBossChallenges", value === "boss"); }} /> : null}
        {step === 4 ? <>
          <Card style={[styles.professor, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}55` }]}><View style={styles.professorRow}><CompanionMascot mascot="atlas" state="thinking" size={76} /><View style={styles.flex}><NexusText variant="mono" color={colors.primarySoft}>PROFESSOR ATLAS</NexusText><NexusText variant="title">Aprender sem amnésia.</NexusText></View></View><NexusText secondary>Vou registrar conversas, acompanhar lições e adaptar seu roadmap pelo que você realmente consegue fazer.</NexusText></Card>
          <ChoiceCards title="Começar como?" options={[
            { value: "especifico" as const, label: "Algo específico", description: "Uma trilha profunda" },
            { value: "variedade" as const, label: "Várias áreas", description: "Trilhas coordenadas" },
            { value: "depois" as const, label: "Agora não", description: "Ativar depois no Brain" },
          ]} value={evolution.professorScope} onChange={(value) => patch("professorScope", value)} />
          {evolution.professorScope !== "depois" ? <><Field label="Assuntos" value={topics} onChangeText={setTopics} multiline maxLength={600} placeholder="Programação, inglês, vendas..." /><Field label="Resultado desejado" value={evolution.professorOutcome} onChangeText={(value) => patch("professorOutcome", value)} multiline maxLength={600} /></> : null}
        </> : null}
        {error ? <NexusText color={colors.danger} variant="caption">{error}</NexusText> : null}
      </View>
      <View style={styles.footer}>{step > 0 ? <NexusButton label="Voltar" variant="ghost" disabled={saving} onPress={() => setStep((value) => value - 1)} style={styles.back} /> : null}<NexusButton label={step === 4 ? "Salvar meu diagnóstico" : "Continuar"} loading={saving} onPress={() => { void next(); }} style={styles.next} /></View>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.group}><NexusText variant="caption" secondary>{title}</NexusText>{children}</View>; }
function Multi({ title, values, options, onToggle }: { title: string; values: string[]; options: string[]; onToggle: (value: string) => void }) { return <Group title={title}><View style={styles.chips}>{options.map((item) => <ChoiceChip key={item} label={item} selected={values.includes(item)} onPress={() => onToggle(item)} />)}</View></Group>; }
function ChoiceCards<T extends string>({ title, options, value, onChange }: { title: string; options: { value: T; label: string; description: string }[]; value: T; onChange: (value: T) => void }) { const { colors } = useNexus(); return <Group title={title}><View style={styles.cards}>{options.map((item) => <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.choice, { backgroundColor: value === item.value ? `${colors.primary}18` : colors.surface, borderColor: value === item.value ? colors.primary : colors.border }]}><View style={styles.flex}><NexusText variant="subtitle">{item.label}</NexusText><NexusText variant="caption" secondary>{item.description}</NexusText></View><NexusText color={value === item.value ? colors.primarySoft : colors.textSecondary}>{value === item.value ? "●" : "○"}</NexusText></Pressable>)}</View></Group>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 14 }, duo: { flexDirection: "row" }, intro: { marginTop: 28, marginBottom: 24, gap: 9 },
  form: { gap: 18 }, group: { gap: 9 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, cards: { gap: 9 }, choice: { minHeight: 70, padding: 13, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  professor: { gap: 13 }, professorRow: { flexDirection: "row", alignItems: "center", gap: 12 }, footer: { marginTop: 28, flexDirection: "row", gap: 10 }, back: { flex: 0.7 }, next: { flex: 1.5 },
});
