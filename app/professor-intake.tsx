import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import {
  createProfessorIntake,
  PROFESSOR_CONSTRAINT_OPTIONS,
  PROFESSOR_METHOD_OPTIONS,
  PROFESSOR_RESOURCE_OPTIONS,
  suggestedTopicsFor,
} from "@/features/learning/intake";
import {
  meaningfulText,
  validateProfessorIntakeStep,
  type ProfessorIntakeErrors,
  type ProfessorIntakeField,
} from "@/features/learning/intake-validation";
import { useNexus } from "@/providers/NexusProvider";
import { professorIntakeSchema } from "@/schemas/expansion.schema";
import type { ProfessorIntake } from "@/types";

export { RouteErrorBoundary as ErrorBoundary };

const STEP_META = [
  ["Escolha o domínio", "O que você quer aprender de verdade?"],
  ["Ponto de partida", "Vamos descobrir o que você já sabe."],
  ["Destino comprovável", "Como saberemos que você dominou isso?"],
  ["Estratégia realista", "Monte um método que cabe na sua vida."],
  ["Integração Nexus", "Conecte o aprendizado ao seu dia."],
] as const;

export default function ProfessorIntakeScreen() {
  const { topic: topicParam } = useLocalSearchParams<{ topic?: string }>();
  const { data, colors, assistantBusy, createRoadmap } = useNexus();
  const profile = data.profile;
  const initialTopic =
    typeof topicParam === "string" ? topicParam : data.learning.pendingTopics[0] ?? "";
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ProfessorIntakeErrors>({});
  const [weekly, setWeekly] = useState(
    String(profile?.evolution?.weeklyLearningMinutes ?? 180),
  );
  const [intake, setIntake] = useState<ProfessorIntake>(() =>
    profile
      ? createProfessorIntake(profile, initialTopic)
      : createProfessorIntake(
          {
            name: "",
            nickname: "",
            timezone: "UTC",
            mainGoal: "",
            goalReason: "",
            availableMinutes: 60,
            activeDays: [1],
            schedule: "",
            focusPeriod: "flexivel",
            skillLevel: "iniciante",
            energyLevel: "media",
            priorities: ["pessoal"],
            maxDailyTasks: 4,
            intensity: "equilibrado",
            assistantTone: "parceiro",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          initialTopic,
        ),
  );
  const suggestions = useMemo(() => (profile ? suggestedTopicsFor(profile) : []), [profile]);

  if (!profile) return null;

  const clearError = (field?: ProfessorIntakeField) => {
    if (!field) {
      setErrors({});
      return;
    }
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const patch = <K extends keyof ProfessorIntake>(
    key: K,
    value: ProfessorIntake[K],
    field?: ProfessorIntakeField,
  ) => {
    setIntake((current) => ({ ...current, [key]: value }));
    clearError(field);
  };

  const toggleList = (
    key: "resources" | "constraints" | "preferredMethods",
    value: string,
  ) => {
    const current = intake[key];
    patch(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const next = async () => {
    const validation = validateProfessorIntakeStep(step, intake, weekly);
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }

    if (step < STEP_META.length - 1) {
      clearError();
      setStep((current) => current + 1);
      return;
    }

    const normalized = {
      ...intake,
      topic: meaningfulText(intake.topic, 160),
      knownConcepts: meaningfulText(intake.knownConcepts, 1_200),
      previousAttempts: meaningfulText(intake.previousAttempts, 1_200),
      desiredOutcome: meaningfulText(intake.desiredOutcome, 800),
      proofProject: meaningfulText(intake.proofProject, 800),
      motivation: meaningfulText(intake.motivation, 800),
      weeklyMinutes: Number(weekly),
    };
    const parsed = professorIntakeSchema.safeParse(normalized);
    if (!parsed.success) {
      const nextErrors: ProfessorIntakeErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "topic" ||
          field === "knownConcepts" ||
          field === "desiredOutcome" ||
          field === "deadline" ||
          field === "weeklyMinutes"
        ) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(
        Object.keys(nextErrors).length
          ? nextErrors
          : { desiredOutcome: "Revise as respostas destacadas antes de criar o roadmap." },
      );
      return;
    }

    await createRoadmap(parsed.data.topic, parsed.data);
    router.replace("/(tabs)/brain");
  };

  const meta = STEP_META[step] ?? STEP_META[0];
  const footer = (
    <View style={styles.footer}>
      <NexusButton
        label={step > 0 ? "Voltar" : "Agora não"}
        variant="ghost"
        onPress={() => {
          clearError();
          if (step > 0) setStep((current) => current - 1);
          else router.replace("/(tabs)/brain");
        }}
        style={styles.back}
      />
      <NexusButton
        label={step === STEP_META.length - 1 ? "Criar meu roadmap" : "Continuar"}
        loading={assistantBusy}
        disabled={assistantBusy}
        onPress={() => void next()}
        style={styles.next}
      />
    </View>
  );

  return (
    <Screen footer={footer} contentContainerStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.duo}>
          <PixelMascot size={42} />
          <CompanionMascot
            mascot="atlas"
            state={step === 4 ? "celebrating" : "thinking"}
            size={50}
          />
        </View>
        <View style={styles.flex}>
          <NexusText variant="mono" color={colors.primarySoft}>
            ENTREVISTA ATLAS • {step + 1}/{STEP_META.length}
          </NexusText>
          <NexusText variant="title">{meta[0]}</NexusText>
        </View>
      </View>
      <ProgressBar progress={(step + 1) / STEP_META.length} />
      <View style={styles.intro}>
        <NexusText variant="display">{meta[1]}</NexusText>
        <NexusText secondary>
          Não existe resposta bonita. Quanto mais real for o diagnóstico, mais útil será a trilha.
        </NexusText>
      </View>

      <View style={styles.form}>
        {step === 0 ? (
          <>
            <Group title="Sugestões para começar">
              <View style={styles.chips}>
                {suggestions.map((topic) => (
                  <ChoiceChip
                    key={topic}
                    label={topic}
                    selected={intake.topic === topic}
                    onPress={() => patch("topic", topic, "topic")}
                  />
                ))}
              </View>
            </Group>
            <Field
              label="Ou seja específico"
              value={intake.topic}
              onChangeText={(value) => patch("topic", value, "topic")}
              multiline
              maxLength={160}
              placeholder="Ex.: React Native para criar e publicar apps Android completos"
              hint="Você pode escrever qualquer assunto; não precisa escolher uma sugestão."
              error={errors.topic}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <ChoiceCards
              title="Quanto você já sabe sobre isso?"
              value={intake.knowledgeLevel}
              onChange={(value) => patch("knowledgeLevel", value, "knownConcepts")}
              options={[
                ["zero", "Nunca mexi", "Começar do zero, sem presumir fundamentos"],
                ["basico", "Sei o básico", "Já reconheço conceitos e fiz primeiros testes"],
                ["intermediario", "Consigo praticar", "Já faço coisas sozinho, mas tenho lacunas"],
                ["avancado", "Já sou avançado", "Quero refinamento, profundidade e desafios reais"],
              ]}
            />
            <Field
              label="O que você já sabe ou consegue fazer?"
              value={intake.knownConcepts}
              onChangeText={(value) => patch("knownConcepts", value, "knownConcepts")}
              multiline
              maxLength={1200}
              placeholder="Conceitos, ferramentas, projetos, resultados..."
              error={errors.knownConcepts}
              hint="Pode preencher este campo ou contar suas tentativas abaixo."
            />
            <Field
              label="O que já tentou antes?"
              value={intake.previousAttempts}
              onChangeText={(value) => patch("previousAttempts", value, "knownConcepts")}
              multiline
              maxLength={1200}
              placeholder="Cursos, vídeos, projetos abandonados e onde travou."
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field
              label="Resultado que você quer alcançar"
              value={intake.desiredOutcome}
              onChangeText={(value) => patch("desiredOutcome", value, "desiredOutcome")}
              multiline
              maxLength={800}
              placeholder="Ex.: construir e publicar um app completo sem depender de tutorial."
              error={errors.desiredOutcome}
            />
            <Field
              label="Projeto ou prova de domínio"
              value={intake.proofProject}
              onChangeText={(value) => patch("proofProject", value)}
              multiline
              maxLength={800}
              placeholder="Ex.: app publicado, prova, certificado, conversa fluente, primeira venda..."
            />
            <Field
              label="Por que aprender isso importa agora?"
              value={intake.motivation}
              onChangeText={(value) => patch("motivation", value)}
              multiline
              maxLength={800}
            />
            <Field
              label="Prazo opcional"
              value={intake.deadline ?? ""}
              onChangeText={(value) => patch("deadline", value || undefined, "deadline")}
              placeholder="2026-12-31"
              maxLength={10}
              error={errors.deadline}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field
              label="Minutos por semana"
              value={weekly}
              onChangeText={(value) => {
                setWeekly(value);
                clearError("weeklyMinutes");
              }}
              keyboardType="number-pad"
              maxLength={4}
              error={errors.weeklyMinutes}
            />
            <Group title="Tamanho das sessões">
              <View style={styles.chips}>
                {([15, 25, 45, 60, 90] as const).map((minutes) => (
                  <ChoiceChip
                    key={minutes}
                    label={`${minutes} min`}
                    selected={intake.sessionMinutes === minutes}
                    onPress={() => patch("sessionMinutes", minutes)}
                  />
                ))}
              </View>
            </Group>
            <MultiChoice
              title="Recursos disponíveis"
              options={PROFESSOR_RESOURCE_OPTIONS}
              values={intake.resources}
              onToggle={(value) => toggleList("resources", value)}
            />
            <MultiChoice
              title="Limitações reais"
              options={PROFESSOR_CONSTRAINT_OPTIONS}
              values={intake.constraints}
              onToggle={(value) => toggleList("constraints", value)}
            />
            <MultiChoice
              title="Métodos que quer combinar"
              options={PROFESSOR_METHOD_OPTIONS}
              values={intake.preferredMethods}
              onToggle={(value) => toggleList("preferredMethods", value)}
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Card
              style={[
                styles.summary,
                { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}0C` },
              ]}
            >
              <NexusText variant="mono" color={colors.primarySoft}>
                ROADMAP PRONTO PARA NASCER
              </NexusText>
              <NexusText variant="title">{meaningfulText(intake.topic, 160)}</NexusText>
              <NexusText secondary>{meaningfulText(intake.desiredOutcome, 800)}</NexusText>
              <NexusText variant="caption" secondary>
                {weekly} min/semana • sessões de {intake.sessionMinutes} min • nível {intake.knowledgeLevel}
              </NexusText>
            </Card>
            <Toggle
              label="Incluir próximas lições no plano diário"
              description="O Nexus poderá sugerir uma sessão de evolução nos seus dias ativos."
              value={intake.includeInDailyPlan}
              onChange={(value) => patch("includeInDailyPlan", value)}
            />
            <Toggle
              label="Mostrar aprendizado no widget"
              description="Exibe a próxima lição e o progresso do roadmap quando houver espaço."
              value={intake.showLearningInWidget}
              onChange={(value) => patch("showLearningInWidget", value)}
            />
            <Toggle
              label="Colocar o Professor Atlas no widget"
              description="Ele aparece ao lado da sua cobrinha Nexus. Você poderá desligar isso no Widget Studio."
              value={intake.showProfessorInWidget}
              onChange={(value) => patch("showProfessorInWidget", value)}
            />
            {intake.showProfessorInWidget ? (
              <Card style={styles.widgetDuo}>
                <PixelMascot
                  skin={data.preferences.mascot.skin}
                  accessory={data.preferences.mascot.equippedAccessory}
                  size={52}
                />
                <CompanionMascot mascot="atlas" state="idle" size={52} />
                <View style={styles.flex}>
                  <NexusText variant="subtitle">Dupla Nexus + Atlas</NexusText>
                  <NexusText variant="caption" secondary>
                    Seu mascote continua principal; Atlas acompanha o aprendizado.
                  </NexusText>
                </View>
              </Card>
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <NexusText variant="caption" secondary>{title}</NexusText>
      {children}
    </View>
  );
}

function MultiChoice({
  title,
  options,
  values,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Group title={title}>
      <View style={styles.chips}>
        {options.map((option) => (
          <ChoiceChip
            key={option}
            label={option}
            selected={values.includes(option)}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
    </Group>
  );
}

function ChoiceCards<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly (readonly [T, string, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useNexus();
  return (
    <Group title={title}>
      <View style={styles.cards}>
        {options.map(([option, label, description]) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: option === value }}
            onPress={() => onChange(option)}
            style={[
              styles.choice,
              {
                borderColor: option === value ? colors.primary : colors.border,
                backgroundColor: option === value ? `${colors.primary}16` : colors.surface,
              },
            ]}
          >
            <View style={styles.flex}>
              <NexusText variant="subtitle">{label}</NexusText>
              <NexusText variant="caption" secondary>{description}</NexusText>
            </View>
            <NexusText color={option === value ? colors.primarySoft : colors.textSecondary}>
              {option === value ? "●" : "○"}
            </NexusText>
          </Pressable>
        ))}
      </View>
    </Group>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useNexus();
  return (
    <View style={[styles.toggle, { borderColor: colors.border }]}>
      <View style={styles.flex}>
        <NexusText variant="subtitle">{label}</NexusText>
        <NexusText variant="caption" secondary>{description}</NexusText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  duo: { flexDirection: "row", alignItems: "flex-end" },
  flex: { flex: 1 },
  intro: { gap: 9, marginTop: 28, marginBottom: 24 },
  form: { gap: 18 },
  group: { gap: 9 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cards: { gap: 9 },
  choice: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summary: { gap: 9 },
  toggle: {
    minHeight: 76,
    borderRadius: 17,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  widgetDuo: { flexDirection: "row", alignItems: "center", gap: 10 },
  footer: { flexDirection: "row", gap: 10 },
  back: { flex: 0.8 },
  next: { flex: 1.6 },
});
