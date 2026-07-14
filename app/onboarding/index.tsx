import { useMemo, useState } from "react";
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
import {
  DEFAULT_EVOLUTION_PROFILE,
  createProfileDefaults,
} from "@/constants/defaults";
import {
  ACCOUNTABILITY_OPTIONS,
  CHALLENGE_OPTIONS,
  EVOLUTION_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  OBSTACLE_OPTIONS,
  STRENGTH_OPTIONS,
  TRIGGER_OPTIONS,
} from "@/features/onboarding/options";
import { useNexus } from "@/providers/NexusProvider";
import { profileSchema } from "@/schemas/profile.schema";
import {
  CATEGORIES,
  type Category,
  type EvolutionArea,
  type EvolutionProfile,
  type Profile,
  type Weekday,
} from "@/types";

export { RouteErrorBoundary as ErrorBoundary };

const TOTAL_STEPS = 8;
const DAY_LABELS: { value: Weekday; label: string }[] = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];
const CATEGORY_LABELS: Record<Category, string> = {
  desenvolvimento: "Desenvolvimento",
  estudos: "Estudos",
  dinheiro: "Dinheiro",
  saude: "Saúde",
  organizacao: "Organização",
  pessoal: "Pessoal",
};
const STEP_META = [
  [
    "Sua identidade",
    "Quem está no comando?",
    "Esses dados ficam no seu dispositivo e personalizam toda a experiência.",
  ],
  [
    "Grande missão",
    "O que vai mudar seu jogo?",
    "Uma missão concreta ajuda o Nexus a distinguir movimento de distração.",
  ],
  [
    "Sua realidade",
    "Como seu dia funciona de verdade?",
    "Sem rotina perfeita: o plano precisa caber na vida real.",
  ],
  [
    "Mapa de evolução",
    "Quem você quer se tornar?",
    "Escolha várias áreas. Depois marque as que merecem prioridade agora.",
  ],
  [
    "Padrões e obstáculos",
    "O que costuma travar você?",
    "Não é julgamento. O Nexus usa esses sinais para criar planos que sobrevivem aos dias difíceis.",
  ],
  [
    "Como você aprende",
    "Configure sua velocidade de evolução.",
    "O Professor Atlas combinará prática, revisão e projetos conforme seu jeito.",
  ],
  [
    "Sistema de execução",
    "Escolha o clima da jornada.",
    "Defina intensidade, tom, quantidade de tarefas e quanto de jogo você quer.",
  ],
  [
    "Professor Atlas",
    "Quer dominar alguma coisa?",
    "Ele memoriza sua escolha e constrói roadmaps progressivos sem abandonar sua missão principal.",
  ],
] as const;

type FormState = {
  name: string;
  nickname: string;
  timezone: string;
  mainGoal: string;
  goalReason: string;
  deadline: string;
  availableMinutes: string;
  activeDays: Weekday[];
  schedule: string;
  focusPeriod: Profile["focusPeriod"];
  skillLevel: Profile["skillLevel"];
  energyLevel: Profile["energyLevel"];
  priorities: Category[];
  maxDailyTasks: number;
  intensity: Profile["intensity"];
  assistantTone: Profile["assistantTone"];
  evolution: EvolutionProfile;
  customAreasText: string;
  weeklyLearningMinutes: string;
  professorTopicsText: string;
};

export default function Onboarding() {
  const {
    data,
    colors,
    updateOnboardingDraft,
    completeOnboarding,
    planGenerating,
  } = useNexus();
  const defaults = useMemo(() => createProfileDefaults(), []);
  const draft = data.onboardingDraft;
  const startingEvolution =
    draft.evolution ?? defaults.evolution ?? DEFAULT_EVOLUTION_PROFILE;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    name: draft.name ?? "",
    nickname: draft.nickname ?? "",
    timezone: draft.timezone ?? defaults.timezone ?? "America/Sao_Paulo",
    mainGoal: draft.mainGoal ?? "",
    goalReason: draft.goalReason ?? "",
    deadline: draft.deadline ?? "",
    availableMinutes: String(
      draft.availableMinutes ?? defaults.availableMinutes ?? 120,
    ),
    activeDays: draft.activeDays ?? defaults.activeDays ?? [1, 2, 3, 4, 5, 6],
    schedule: draft.schedule ?? "",
    focusPeriod: draft.focusPeriod ?? defaults.focusPeriod ?? "tarde",
    skillLevel: draft.skillLevel ?? defaults.skillLevel ?? "iniciante",
    energyLevel: draft.energyLevel ?? defaults.energyLevel ?? "media",
    priorities: draft.priorities ??
      defaults.priorities ?? ["dinheiro", "desenvolvimento", "estudos"],
    maxDailyTasks: draft.maxDailyTasks ?? defaults.maxDailyTasks ?? 4,
    intensity: draft.intensity ?? defaults.intensity ?? "equilibrado",
    assistantTone: draft.assistantTone ?? defaults.assistantTone ?? "treinador",
    evolution: { ...DEFAULT_EVOLUTION_PROFILE, ...startingEvolution },
    customAreasText: startingEvolution.customAreas.join(", "),
    weeklyLearningMinutes: String(startingEvolution.weeklyLearningMinutes),
    professorTopicsText: startingEvolution.professorTopics.join(", "),
  });

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (
      key !== "customAreasText" &&
      key !== "weeklyLearningMinutes" &&
      key !== "professorTopicsText" &&
      key !== "evolution"
    ) {
      updateOnboardingDraft({
        [key]: key === "availableMinutes" ? Number(value) || undefined : value,
      } as Partial<Profile>);
    }
    setError("");
  };
  const patchEvolution = <K extends keyof EvolutionProfile>(
    key: K,
    value: EvolutionProfile[K],
  ) => {
    setForm((current) => {
      const evolution = { ...current.evolution, [key]: value };
      updateOnboardingDraft({ evolution });
      return { ...current, evolution };
    });
    setError("");
  };
  const toggleString = (
    key: "biggestObstacles" | "procrastinationTriggers" | "strengths",
    value: string,
  ) => {
    const current = form.evolution[key];
    patchEvolution(
      key,
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };
  const toggleArea = (area: EvolutionArea, primary: boolean) => {
    const key = primary ? "primaryAreas" : "secondaryAreas";
    const current = form.evolution[key];
    const next = current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area];
    patchEvolution(key, next);
    if (
      primary &&
      next.includes(area) &&
      form.evolution.secondaryAreas.includes(area)
    )
      patchEvolution(
        "secondaryAreas",
        form.evolution.secondaryAreas.filter((item) => item !== area),
      );
  };

  const syncTextLists = (): EvolutionProfile => {
    const customAreas = form.customAreasText
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, 8);
    const professorTopics = form.professorTopicsText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, 12);
    return {
      ...form.evolution,
      customAreas,
      professorTopics,
      weeklyLearningMinutes: Math.max(
        30,
        Math.min(3000, Number(form.weeklyLearningMinutes) || 180),
      ),
    };
  };

  const validateStep = (): boolean => {
    if (
      step === 0 &&
      (form.name.trim().length < 2 || form.nickname.trim().length < 1)
    )
      return fail("Preencha seu nome e como o Nexus deve chamar você.");
    if (
      step === 1 &&
      (form.mainGoal.trim().length < 10 || form.goalReason.trim().length < 3)
    )
      return fail(
        "Explique sua missão com pelo menos 10 caracteres e diga por que ela importa.",
      );
    if (
      step === 1 &&
      form.deadline &&
      !/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)
    )
      return fail("Use a data no formato AAAA-MM-DD.");
    const minutes = Number(form.availableMinutes);
    if (
      step === 2 &&
      (!Number.isFinite(minutes) ||
        minutes < 15 ||
        minutes > 720 ||
        !form.activeDays.length)
    )
      return fail(
        "Informe entre 15 e 720 minutos e selecione ao menos um dia.",
      );
    if (step === 3 && !form.evolution.primaryAreas.length)
      return fail("Escolha ao menos uma área principal de evolução.");
    if (step === 4 && form.evolution.currentSituation.trim().length < 5)
      return fail("Conte rapidamente como está sua situação atual.");
    if (
      step === 5 &&
      (Number(form.weeklyLearningMinutes) < 30 ||
        Number(form.weeklyLearningMinutes) > 3000)
    )
      return fail("Informe entre 30 e 3000 minutos de aprendizado por semana.");
    if (step === 6 && !form.priorities.length)
      return fail("Escolha pelo menos uma prioridade de execução.");
    if (
      step === 7 &&
      form.evolution.professorScope === "especifico" &&
      form.professorTopicsText.trim().length < 2
    )
      return fail("Diga o primeiro assunto que você quer dominar.");
    return true;
  };
  const fail = (message: string) => {
    setError(message);
    return false;
  };

  const buildProfile = (): Profile | null => {
    const now = new Date().toISOString();
    const evolution = syncTextLists();
    const candidate = {
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      timezone: form.timezone,
      mainGoal: form.mainGoal.trim(),
      goalReason: form.goalReason.trim(),
      ...(form.deadline ? { deadline: form.deadline } : {}),
      availableMinutes: Number(form.availableMinutes),
      activeDays: form.activeDays,
      schedule: form.schedule.trim(),
      focusPeriod: form.focusPeriod,
      skillLevel: form.skillLevel,
      energyLevel: form.energyLevel,
      priorities: form.priorities,
      maxDailyTasks: form.maxDailyTasks,
      intensity: form.intensity,
      assistantTone: form.assistantTone,
      evolution,
      createdAt: data.profile?.createdAt ?? now,
      updatedAt: now,
    };
    const parsed = profileSchema.safeParse(candidate);
    if (!parsed.success) {
      setError("Revise as respostas antes de gerar seu plano.");
      return null;
    }
    return parsed.data;
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
      return;
    }
    const profile = buildProfile();
    if (!profile || planGenerating) return;
    router.push("/loading-plan");
    void completeOnboarding(profile);
  };
  const meta = STEP_META[step] ?? STEP_META[0];

  const footer = (
    <View style={styles.footer}>
      {step > 0 ? (
        <NexusButton
          label="Voltar"
          variant="ghost"
          onPress={() => {
            setError("");
            setStep((current) => current - 1);
          }}
          style={styles.secondaryButton}
        />
      ) : null}
      <NexusButton
        label={step === TOTAL_STEPS - 1 ? "Ativar meu Nexus" : "Continuar"}
        onPress={next}
        loading={planGenerating}
        style={styles.primaryButton}
      />
    </View>
  );

  return (
    <Screen footer={footer} contentContainerStyle={styles.screenContent}>
      <View style={styles.header}>
        {step === 7 ? (
          <View style={styles.duo}>
            <PixelMascot state="idle" size={46} />
            <CompanionMascot mascot="atlas" state="thinking" size={48} />
          </View>
        ) : (
          <PixelMascot state={step === 6 ? "celebrating" : "idle"} size={54} />
        )}
        <View style={styles.headerText}>
          <NexusText variant="mono" color={colors.primarySoft}>
            DIAGNÓSTICO {step + 1}/{TOTAL_STEPS}
          </NexusText>
          <NexusText variant="title">{meta[0]}</NexusText>
        </View>
      </View>
      <ProgressBar progress={(step + 1) / TOTAL_STEPS} />
      <View style={styles.intro}>
        <NexusText variant="display">{meta[1]}</NexusText>
        <NexusText secondary>{meta[2]}</NexusText>
      </View>

      <View style={styles.form}>
        {step === 0 ? (
          <>
            <Field
              label="Nome"
              value={form.name}
              onChangeText={(value) => patch("name", value)}
              placeholder="Gustavo Araújo"
              maxLength={80}
              autoComplete="name"
            />
            <Field
              label="Como quer ser chamado?"
              value={form.nickname}
              onChangeText={(value) => patch("nickname", value)}
              placeholder="Gusta"
              maxLength={40}
            />
            <Field
              label="Fuso horário detectado"
              value={form.timezone}
              onChangeText={(value) => patch("timezone", value)}
              editable={false}
              hint="Usado para trocar o plano no momento certo."
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field
              label="Grande missão"
              value={form.mainGoal}
              onChangeText={(value) => patch("mainGoal", value)}
              multiline
              maxLength={600}
              placeholder="Conseguir meu primeiro freelance, evoluir e escalar..."
            />
            <Field
              label="Por que isso importa?"
              value={form.goalReason}
              onChangeText={(value) => patch("goalReason", value)}
              multiline
              maxLength={600}
              placeholder="O que muda quando você conseguir?"
            />
            <Field
              label="Prazo opcional"
              value={form.deadline}
              onChangeText={(value) => patch("deadline", value)}
              placeholder="2026-12-31"
              maxLength={10}
              hint="Formato: AAAA-MM-DD"
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field
              label="Minutos realmente disponíveis por dia"
              value={form.availableMinutes}
              onChangeText={(value) => patch("availableMinutes", value)}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Group title="Dias ativos">
              <View style={styles.dayRow}>
                {DAY_LABELS.map((day) => {
                  const selected = form.activeDays.includes(day.value);
                  return (
                    <Pressable
                      key={day.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() =>
                        patch(
                          "activeDays",
                          selected
                            ? form.activeDays.filter(
                                (item) => item !== day.value,
                              )
                            : [...form.activeDays, day.value].sort(),
                        )
                      }
                      style={[
                        styles.day,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <NexusText
                        variant="caption"
                        color={selected ? colors.onPrimary : colors.text}
                      >
                        {day.label}
                      </NexusText>
                    </Pressable>
                  );
                })}
              </View>
            </Group>
            <Field
              label="Escola, trabalho e compromissos"
              value={form.schedule}
              onChangeText={(value) => patch("schedule", value)}
              multiline
              maxLength={600}
              placeholder="Estudo de manhã, curso quinta, treino sábado..."
            />
            <ChoiceGroup
              title="Melhor período"
              options={[
                ["manha", "Manhã"],
                ["tarde", "Tarde"],
                ["noite", "Noite"],
                ["flexivel", "Flexível"],
              ]}
              value={form.focusPeriod}
              onChange={(value) =>
                patch("focusPeriod", value as Profile["focusPeriod"])
              }
            />
            <ChoiceGroup
              title="Energia mais comum"
              options={[
                ["baixa", "Baixa"],
                ["media", "Média"],
                ["alta", "Alta"],
              ]}
              value={form.energyLevel}
              onChange={(value) =>
                patch("energyLevel", value as Profile["energyLevel"])
              }
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            {[
              "Carreira e criação",
              "Aprendizado",
              "Execução",
              "Vida e corpo",
            ].map((group) => (
              <Group key={group} title={group}>
                <View style={styles.chips}>
                  {EVOLUTION_OPTIONS.filter(
                    (option) => option.group === group,
                  ).map((option) => (
                    <ChoiceChip
                      key={option.value}
                      label={option.label}
                      selected={form.evolution.primaryAreas.includes(
                        option.value,
                      )}
                      onPress={() => toggleArea(option.value, true)}
                    />
                  ))}
                </View>
              </Group>
            ))}
            <Card
              style={[styles.tipCard, { borderColor: `${colors.primary}55` }]}
            >
              <NexusText variant="subtitle">Prioridade agora</NexusText>
              <NexusText variant="caption" secondary>
                Os itens marcados acima formarão seu mapa principal. Use o campo
                abaixo para algo que não apareceu.
              </NexusText>
            </Card>
            <Field
              label="Outras áreas, separadas por vírgula"
              value={form.customAreasText}
              onChangeText={(value) => patch("customAreasText", value)}
              maxLength={300}
              placeholder="Design, música, cybersecurity..."
            />
            <Field
              label="Quem você quer se tornar?"
              value={form.evolution.desiredIdentity}
              onChangeText={(value) => patchEvolution("desiredIdentity", value)}
              multiline
              maxLength={500}
              placeholder="Quero ser alguém disciplinado, excelente em..."
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Field
              label="Como está sua situação hoje?"
              value={form.evolution.currentSituation}
              onChangeText={(value) =>
                patchEvolution("currentSituation", value)
              }
              multiline
              maxLength={800}
              placeholder="Seja honesto: nível atual, limitações e o que já tentou."
            />
            <MultiChoice
              title="Maiores obstáculos"
              values={form.evolution.biggestObstacles}
              options={OBSTACLE_OPTIONS}
              onToggle={(value) => toggleString("biggestObstacles", value)}
            />
            <MultiChoice
              title="Quando a procrastinação aparece"
              values={form.evolution.procrastinationTriggers}
              options={TRIGGER_OPTIONS}
              onToggle={(value) =>
                toggleString("procrastinationTriggers", value)
              }
            />
            <MultiChoice
              title="Forças que já possui"
              values={form.evolution.strengths}
              options={STRENGTH_OPTIONS}
              onToggle={(value) => toggleString("strengths", value)}
            />
          </>
        ) : null}

        {step === 5 ? (
          <>
            <ChoiceCards
              title="Como aprende melhor"
              options={LEARNING_STYLE_OPTIONS}
              value={form.evolution.learningStyle}
              onChange={(value) => patchEvolution("learningStyle", value)}
            />
            <ChoiceCards
              title="Como quer ser cobrado"
              options={ACCOUNTABILITY_OPTIONS}
              value={form.evolution.accountabilityStyle}
              onChange={(value) => patchEvolution("accountabilityStyle", value)}
            />
            <ChoiceGroup
              title="Tamanho ideal de uma sessão"
              options={[
                [15, "15 min"],
                [25, "25 min"],
                [45, "45 min"],
                [60, "60 min"],
                [90, "90 min"],
              ]}
              value={form.evolution.sessionLength}
              onChange={(value) =>
                patchEvolution(
                  "sessionLength",
                  Number(value) as EvolutionProfile["sessionLength"],
                )
              }
            />
            <Field
              label="Minutos de aprendizado por semana"
              value={form.weeklyLearningMinutes}
              onChangeText={(value) => patch("weeklyLearningMinutes", value)}
              keyboardType="number-pad"
              maxLength={4}
              hint="O Professor distribui esse tempo sem lotar seus dias."
            />
            <ChoiceGroup
              title="Seu nível geral agora"
              options={[
                ["iniciante", "Iniciante"],
                ["intermediario", "Intermediário"],
                ["avancado", "Avançado"],
              ]}
              value={form.skillLevel}
              onChange={(value) =>
                patch("skillLevel", value as Profile["skillLevel"])
              }
            />
          </>
        ) : null}

        {step === 6 ? (
          <>
            <Group title="Áreas que entram nas missões diárias">
              <View style={styles.chips}>
                {CATEGORIES.map((category) => {
                  const selected = form.priorities.includes(category);
                  return (
                    <ChoiceChip
                      key={category}
                      label={CATEGORY_LABELS[category]}
                      selected={selected}
                      onPress={() =>
                        patch(
                          "priorities",
                          selected
                            ? form.priorities.filter(
                                (item) => item !== category,
                              )
                            : [...form.priorities, category],
                        )
                      }
                    />
                  );
                })}
              </View>
            </Group>
            <ChoiceGroup
              title="Máximo de tarefas"
              options={[
                [2, "2"],
                [3, "3"],
                [4, "4"],
                [5, "5"],
              ]}
              value={form.maxDailyTasks}
              onChange={(value) => patch("maxDailyTasks", Number(value))}
            />
            <ChoiceGroup
              title="Intensidade"
              options={[
                ["leve", "Leve"],
                ["equilibrado", "Equilibrado"],
                ["intenso", "Intenso"],
              ]}
              value={form.intensity}
              onChange={(value) =>
                patch("intensity", value as Profile["intensity"])
              }
            />
            <ChoiceGroup
              title="Tom do Nexus"
              options={[
                ["direto", "Direto"],
                ["parceiro", "Parceiro"],
                ["treinador", "Treinador"],
              ]}
              value={form.assistantTone}
              onChange={(value) =>
                patch("assistantTone", value as Profile["assistantTone"])
              }
            />
            <ChoiceCards
              title="Gamificação"
              options={CHALLENGE_OPTIONS}
              value={form.evolution.challengeMode}
              onChange={(value) => {
                patchEvolution("challengeMode", value);
                patchEvolution("wantsBossChallenges", value === "boss");
              }}
            />
          </>
        ) : null}

        {step === 7 ? (
          <>
            <Card
              style={[
                styles.professorCard,
                {
                  backgroundColor: `${colors.primary}10`,
                  borderColor: `${colors.primary}55`,
                },
              ]}
            >
              <View style={styles.professorRow}>
                <CompanionMascot mascot="atlas" state="thinking" size={76} />
                <View style={styles.flex}>
                  <NexusText variant="mono" color={colors.primarySoft}>
                    PROFESSOR ATLAS
                  </NexusText>
                  <NexusText variant="title">Seu mentor adaptativo</NexusText>
                </View>
              </View>
              <NexusText secondary>
                “Posso construir uma trilha específica, combinar várias áreas ou
                esperar. Quando você voltar, lembrarei do ponto exato em que
                paramos.”
              </NexusText>
            </Card>
            <ChoiceCards
              title="O que deseja agora?"
              options={[
                {
                  value: "especifico" as const,
                  label: "Dominar algo específico",
                  description: "Um roadmap profundo e direto ao resultado",
                },
                {
                  value: "variedade" as const,
                  label: "Evoluir em várias áreas",
                  description:
                    "Trilhas coordenadas sem sobrecarregar sua rotina",
                },
                {
                  value: "depois" as const,
                  label: "Agora não",
                  description:
                    "O Professor continuará disponível no Nexus Brain",
                },
              ]}
              value={form.evolution.professorScope}
              onChange={(value) => patchEvolution("professorScope", value)}
            />
            {form.evolution.professorScope !== "depois" ? (
              <>
                <Field
                  label={
                    form.evolution.professorScope === "especifico"
                      ? "O que quer dominar primeiro?"
                      : "Quais assuntos quer evoluir?"
                  }
                  value={form.professorTopicsText}
                  onChangeText={(value) => patch("professorTopicsText", value)}
                  multiline
                  maxLength={600}
                  placeholder="Ex.: programação com IA, inglês, vendas..."
                  hint="Separe assuntos por vírgula."
                />
                <Field
                  label="Qual resultado provaria que você evoluiu?"
                  value={form.evolution.professorOutcome}
                  onChangeText={(value) =>
                    patchEvolution("professorOutcome", value)
                  }
                  multiline
                  maxLength={600}
                  placeholder="Ex.: conseguir criar e vender um app completo sozinho."
                />
              </>
            ) : (
              <Card>
                <NexusText variant="subtitle">Sem pressão.</NexusText>
                <NexusText variant="caption" secondary>
                  Abra a aba Brain e toque em Professor quando quiser começar. O
                  diagnóstico de hoje continuará salvo.
                </NexusText>
              </Card>
            )}
          </>
        ) : null}

        {error ? (
          <NexusText color={colors.danger} variant="caption">
            {error}
          </NexusText>
        ) : null}
      </View>
    </Screen>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <NexusText variant="caption" secondary>
        {title}
      </NexusText>
      {children}
    </View>
  );
}
function ChoiceGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: (readonly [string | number, string])[];
  value: string | number;
  onChange: (value: string | number) => void;
}) {
  return (
    <Group title={title}>
      <View style={styles.chips}>
        {options.map(([optionValue, label]) => (
          <ChoiceChip
            key={String(optionValue)}
            label={label}
            selected={value === optionValue}
            onPress={() => onChange(optionValue)}
          />
        ))}
      </View>
    </Group>
  );
}
function MultiChoice({
  title,
  values,
  options,
  onToggle,
}: {
  title: string;
  values: string[];
  options: string[];
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
  options: { value: T; label: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useNexus();
  return (
    <Group title={title}>
      <View style={styles.cardChoices}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.choiceCard,
                {
                  backgroundColor: selected
                    ? `${colors.primary}18`
                    : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.choiceDot,
                  {
                    borderColor: selected
                      ? colors.primary
                      : colors.borderStrong,
                  },
                ]}
              >
                {selected ? (
                  <View
                    style={[
                      styles.choiceDotFill,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.flex}>
                <NexusText variant="subtitle">{option.label}</NexusText>
                <NexusText variant="caption" secondary>
                  {option.description}
                </NexusText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Group>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { paddingBottom: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 14,
  },
  headerText: { flex: 1, gap: 2 },
  duo: { flexDirection: "row", alignItems: "flex-end", marginRight: 2 },
  intro: { gap: 10, marginTop: 28, marginBottom: 24 },
  form: { gap: 18 },
  group: { gap: 9 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  day: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { flexDirection: "row", gap: 10, marginTop: 30 },
  secondaryButton: { flex: 0.7 },
  primaryButton: { flex: 1.5 },
  tipCard: { gap: 6 },
  cardChoices: { gap: 9 },
  choiceCard: {
    minHeight: 72,
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  choiceDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceDotFill: { width: 10, height: 10, borderRadius: 5 },
  professorCard: { gap: 14, padding: 18 },
  professorRow: { flexDirection: "row", alignItems: "center", gap: 14 },
});
