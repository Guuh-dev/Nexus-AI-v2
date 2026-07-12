import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import * as Haptics from "expo-haptics";
import { DEFAULT_APP_DATA, DEFAULT_EVOLUTION_PROFILE, PRIORITY_XP } from "@/constants/defaults";
import { createStarterRoadmap, EVOLUTION_AREA_LABELS, nextRoadmapLesson } from "@/features/learning/roadmap";
import { archivePlan, carryOverTasks, rolloverIfNeeded } from "@/features/planning/rollover";
import { addTask, deleteTask, postponeTask, toggleMainMission, toggleTaskCompletion, updateTask } from "@/features/tasks/task.logic";
import { evolutionProfileSchema } from "@/schemas/expansion.schema";
import { profileSchema } from "@/schemas/profile.schema";
import { askNexus, createLocalWeeklyReview } from "@/services/assistant.service";
import { generateLocalPlan, generatePlan } from "@/services/planning.service";
import { nexusRepository } from "@/services/storage.service";
import { consumeAndroidWidgetActions, updateAndroidWidget } from "@/services/widget.service";
import { applyWidgetTaskActions } from "@/features/widget/actions";
import { getColors, type NexusColors } from "@/theme/theme";
import type {
  AppData,
  AssistantAction,
  AssistantResponse,
  Category,
  ChatKind,
  ChatThread,
  EvolutionProfile,
  FocusSession,
  Habit,
  LearningRoadmap,
  OnboardingDraft,
  Operation,
  Preferences,
  Priority,
  ProfessorIntake,
  Profile,
  Task,
  WeeklyPlanItem,
  WeeklyReview,
} from "@/types";
import { localDateKey } from "@/utils/dates";
import { createId } from "@/utils/ids";
import { normalizeHexColor, sanitizeText } from "@/utils/text";

const LOADING_STAGES = [
  "Entendendo sua missão...",
  "Organizando suas prioridades...",
  "Montando um plano realista...",
  "Preparando seu painel...",
] as const;

type TaskInput = {
  title: string;
  description?: string;
  category: Category;
  priority: Priority;
  estimatedMinutes: number;
  recurring: boolean;
};

type CaptureResult = NonNullable<AssistantResponse["capture"]>;

type NexusContextValue = {
  data: AppData;
  colors: NexusColors;
  ready: boolean;
  planGenerating: boolean;
  planGenerationError: string | null;
  assistantBusy: boolean;
  loadingStage: string;
  toast: string | null;
  updateOnboardingDraft: (patch: OnboardingDraft) => void;
  completeOnboarding: (profile: Profile) => Promise<void>;
  completeDiscovery: (evolution: EvolutionProfile) => boolean;
  cancelPlanGeneration: () => void;
  retryPlanGeneration: () => Promise<void>;
  recoverPlanLocally: () => void;
  cancelAssistant: () => void;
  replanDay: (context?: { reason?: string; minutesRemaining?: number; currentEnergy?: Profile["energyLevel"]; preserveTaskIds?: string[] }) => Promise<void>;
  toggleTask: (taskId: string) => void;
  toggleMission: () => void;
  addTask: (input: TaskInput) => void;
  updateTask: (taskId: string, patch: Partial<TaskInput>) => void;
  deleteTask: (taskId: string) => void;
  postponeTask: (taskId: string) => void;
  updateProfile: (patch: Partial<Profile>) => boolean;
  updatePreferences: (patch: Omit<Partial<Preferences>, "widget" | "dashboard" | "mascot"> & { widget?: Partial<Preferences["widget"]>; dashboard?: Partial<Preferences["dashboard"]>; mascot?: Partial<Preferences["mascot"]> }) => void;
  finishFocusSession: (session: FocusSession, markTaskComplete: boolean) => void;
  createThread: (kind: ChatKind) => string;
  selectThread: (kind: ChatKind, threadId: string) => void;
  renameThread: (threadId: string, title: string) => void;
  archiveThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  sendChatMessage: (threadId: string, content: string) => Promise<void>;
  deleteMemory: (memoryId: string) => void;
  toggleMemoryPinned: (memoryId: string) => void;
  applyAssistantAction: (threadId: string, actionId: string, accept: boolean) => Promise<void>;
  createRoadmap: (topic: string, intake?: ProfessorIntake) => Promise<void>;
  toggleRoadmapLesson: (roadmapId: string, lessonId: string) => void;
  setActiveRoadmap: (roadmapId: string) => void;
  quickCapture: (text: string) => Promise<CaptureResult | null>;
  saveCapture: (capture: CaptureResult) => void;
  generateWeeklyReview: () => Promise<WeeklyReview>;
  createOperation: (input: Pick<Operation, "title" | "objective" | "deadline"> & { phaseTitles: string[] }) => void;
  toggleOperationPhase: (operationId: string, phaseId: string) => void;
  createHabit: (input: Pick<Habit, "title" | "category" | "activeDays" | "targetPerWeek"> & { reminderTime?: string }) => void;
  toggleHabitToday: (habitId: string) => void;
  addWeeklyPlanItem: (input: Omit<WeeklyPlanItem, "id" | "completed">) => void;
  moveWeeklyPlanItem: (itemId: string, date: string) => void;
  resetToday: () => void;
  resetAll: () => Promise<void>;
  clearTemporary: () => Promise<void>;
  importBackup: (json: string) => Promise<void>;
  exportBackup: () => string;
  dismissToast: () => void;
  dismissWarnings: () => void;
};

const NexusContext = createContext<NexusContextValue | null>(null);

function cloneDefaultData(): AppData {
  return { ...(JSON.parse(JSON.stringify(DEFAULT_APP_DATA)) as AppData), installationId: createId("install") };
}

function unlockAchievements(data: AppData): AppData {
  const today = localDateKey(new Date(), data.profile?.timezone);
  const todayCompleted = data.activePlan?.date === today ? data.activePlan.tasks.filter((task) => task.completed).length ?? 0 : 0;
  const todayFocus = Math.floor(data.progress.focusSessions.filter((session) => localDateKey(new Date(session.completedAt), data.profile?.timezone) === today && session.status === "completed").reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const expiresAt = new Date(`${today}T23:59:59.999Z`).toISOString();
  const configured = data.preferences.gamificationMode === "desativado" ? [] : [
    { id: `daily-tasks-${today}`, title: "Ritmo de execução", description: "Conclua duas tarefas hoje.", type: "daily" as const, target: 2, progress: todayCompleted, xpReward: 30, completed: todayCompleted >= 2, expiresAt },
    { id: `daily-focus-${today}`, title: "Bloco sem distrações", description: "Acumule 25 minutos de foco.", type: "daily" as const, target: 25, progress: todayFocus, xpReward: 25, completed: todayFocus >= 25, expiresAt },
    ...(data.preferences.gamificationMode === "boss" || data.preferences.gamificationMode === "operacao" ? [{ id: `boss-${today}`, title: "BOSS: Resistência do dia", description: "Conclua a missão principal e três tarefas.", type: "boss" as const, target: 4, progress: todayCompleted + (data.activePlan?.mainMission.completed ? 1 : 0), xpReward: 100, completed: Boolean(data.activePlan?.mainMission.completed && todayCompleted >= 3), expiresAt }] : []),
  ];
  const previous = new Map(data.progress.challenges.map((challenge) => [challenge.id, challenge]));
  let challengeXp = 0;
  const updatedConfigured = configured.map((challenge) => { const old = previous.get(challenge.id); if (challenge.completed && !old?.completed) challengeXp += challenge.xpReward; return challenge; });
  const configuredIds = new Set(updatedConfigured.map((challenge) => challenge.id));
  const challenges = [...data.progress.challenges.filter((challenge) => !configuredIds.has(challenge.id)), ...updatedConfigured].slice(-100);
  let next: AppData = challengeXp || JSON.stringify(challenges) !== JSON.stringify(data.progress.challenges)
    ? { ...data, progress: { ...data.progress, totalXp: data.progress.totalXp + challengeXp, challenges } }
    : data;
  const existing = new Set(next.progress.achievements.map((item) => item.id));
  const completedTasks = next.history.reduce((total, day) => total + day.completedTasks, 0) + (next.activePlan?.tasks.filter((task) => task.completed).length ?? 0);
  const focusMinutes = Math.floor(next.progress.focusSessions.reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const completedLessons = next.learning.roadmaps.flatMap((roadmap) => roadmap.phases).flatMap((phase) => phase.lessons).filter((lesson) => lesson.completed).length;
  const candidates = [
    completedTasks >= 1 ? { id: "first-task", title: "Primeiro movimento", description: "Concluiu a primeira tarefa.", icon: "◆" } : null,
    completedTasks >= 10 ? { id: "ten-tasks", title: "Executor em formação", description: "Concluiu 10 tarefas.", icon: "⚡" } : null,
    focusMinutes >= 25 ? { id: "focus-25", title: "Foco travado", description: "Completou 25 minutos de foco.", icon: "◉" } : null,
    focusMinutes >= 500 ? { id: "focus-500", title: "Mente de aço", description: "Acumulou 500 minutos de foco.", icon: "◎" } : null,
    next.progress.currentStreak >= 3 ? { id: "streak-3", title: "Sequência iniciada", description: "Manteve três dias produtivos.", icon: "♨" } : null,
    completedLessons >= 5 ? { id: "student-5", title: "Aprendiz deliberado", description: "Concluiu cinco lições do Professor Atlas.", icon: "◇" } : null,
    next.operations.some((operation) => operation.status === "completed") ? { id: "operation-1", title: "Operação concluída", description: "Levou uma operação até o fim.", icon: "★" } : null,
  ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const additions = candidates.filter((candidate) => !existing.has(candidate.id)).map((candidate) => ({ ...candidate, unlockedAt: new Date().toISOString() }));
  if (!additions.length) return next;
  next = { ...next, progress: { ...next.progress, achievements: [...next.progress.achievements, ...additions] } };
  return next;
}

function initializeProfessor(data: AppData, profile: Profile): AppData {
  const evolution = profile.evolution;
  if (!evolution || evolution.professorScope === "depois") return data;
  const areaTopics = evolution.primaryAreas.map((area) => EVOLUTION_AREA_LABELS[area]);
  const topics = (evolution.professorTopics.length ? evolution.professorTopics : areaTopics).slice(0, evolution.professorScope === "especifico" ? 1 : 4);
  const existing = new Set(data.learning.roadmaps.map((roadmap) => roadmap.topic.toLocaleLowerCase("pt-BR")));
  const pendingTopics = [...data.learning.pendingTopics, ...topics]
    .map((topic) => sanitizeText(topic, 160))
    .filter((topic) => topic.length >= 2 && !existing.has(topic.toLocaleLowerCase("pt-BR")))
    .filter((topic, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase("pt-BR") === topic.toLocaleLowerCase("pt-BR")) === index)
    .slice(0, 24);
  if (!pendingTopics.length && data.learning.professorEnabled) return data;
  const now = new Date().toISOString();
  const professorThread = data.brain.threads.find((thread) => thread.kind === "professor" && !thread.archived);
  const thread: ChatThread = professorThread ?? {
    id: createId("professor-chat"), kind: "professor", title: "Professor Atlas", summary: "", createdAt: now, updatedAt: now, archived: false,
    messages: [{ id: createId("message"), role: "assistant", content: `Eu sou o Professor Atlas, parceiro do Nexus. Antes de montar seu roadmap${topics.length ? ` de ${topics.join(", ")}` : ""}, vou descobrir o que você já sabe, o que tentou e qual resultado provará seu domínio. Depois ajustarei a trilha conforme você aprende — sem pular fundamentos.`, createdAt: now }],
  };
  return {
    ...data,
    brain: {
      ...data.brain,
      threads: professorThread ? data.brain.threads : [thread, ...data.brain.threads],
      activeProfessorThreadId: thread.id,
    },
    learning: { ...data.learning, professorEnabled: true, pendingTopics },
  };
}

function threadTitle(content: string): string {
  const cleaned = sanitizeText(content, 80);
  return cleaned.length > 42 ? `${cleaned.slice(0, 39)}...` : cleaned || "Nova conversa";
}

function compactThreadSummary(thread: ChatThread, nextContent: string): string {
  if (thread.messages.length < 36) return thread.summary;
  const older = thread.messages.slice(0, Math.max(0, thread.messages.length - 30));
  const additions = older.slice(-12).map((message) => `${message.role === "user" ? "Usuário" : "Nexus"}: ${sanitizeText(message.content, 240)}`).join("\n");
  return sanitizeText(`${thread.summary}\n${additions}\nÚltima continuidade: ${sanitizeText(nextContent, 240)}`, 6000);
}

export function NexusProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(cloneDefaultData);
  const dataRef = useRef(data);
  const [ready, setReady] = useState(false);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planGenerationError, setPlanGenerationError] = useState<string | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const generationController = useRef<AbortController | null>(null);
  const generationPromise = useRef<Promise<void> | null>(null);
  const generationCancelReason = useRef<"user" | "watchdog" | "recovery" | "unmount" | null>(null);
  const assistantController = useRef<AbortController | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const persist = useCallback((next: AppData) => {
    void nexusRepository.save(next).then(() => updateAndroidWidget(next)).catch(() => showToast("Não foi possível salvar agora. Tentaremos novamente na próxima alteração."));
  }, [showToast]);

  const commit = useCallback((update: (current: AppData) => AppData, message?: string) => {
    const next = unlockAchievements(update(dataRef.current));
    dataRef.current = next;
    setData(next);
    persist(next);
    if (message) showToast(message);
  }, [persist, showToast]);

  const syncWidgetActions = useCallback(async () => {
    const actions = await consumeAndroidWidgetActions();
    if (!actions.length) return;
    commit(
      (current) => applyWidgetTaskActions(current, actions),
      "Ações feitas no widget foram sincronizadas.",
    );
  }, [commit]);

  useEffect(() => {
    let mounted = true;
    void nexusRepository.load().then((loaded) => {
      if (!mounted) return;
      const rollover = rolloverIfNeeded(loaded);
      dataRef.current = rollover.data;
      setData(rollover.data);
      setReady(true);
      void syncWidgetActions();
      if (rollover.rolledOver) {
        persist(rollover.data);
        showToast("Novo dia detectado. Sua missão foi preparada sem duplicar tarefas.");
      }
    });
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void syncWidgetActions(); });
    return () => {
      mounted = false;
      subscription.remove();
      generationCancelReason.current = "unmount";
      generationController.current?.abort();
      assistantController.current?.abort();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [persist, showToast, syncWidgetActions]);

  useEffect(() => {
    if (!planGenerating) return;
    setLoadingStageIndex(0);
    const interval = setInterval(() => setLoadingStageIndex((current) => Math.min(3, current + 1)), 2300);
    return () => clearInterval(interval);
  }, [planGenerating]);

  const commitLocalPlan = useCallback((profile: Profile, message: string) => {
    const date = localDateKey(new Date(), profile.timezone);
    commit((current) => initializeProfessor({
      ...current,
      profile,
      onboardingCompleted: true,
      discoveryCompleted: Boolean(profile.evolution),
      onboardingDraft: {},
      activePlan: generateLocalPlan(
        { profile, date, requestId: createId("safe"), clientId: current.installationId },
        message,
      ),
      lastGeneratedDate: date,
      lastAiAttemptDate: date,
    }, profile), message);
  }, [commit]);

  const runGeneration = useCallback((profile: Profile, mode: "onboarding" | "replan" | "rollover", context?: { reason?: string; minutesRemaining?: number; currentEnergy?: Profile["energyLevel"]; preserveTaskIds?: string[] }): Promise<void> => {
    if (generationPromise.current) return generationPromise.current;
    const controller = new AbortController();
    generationController.current = controller;
    generationCancelReason.current = null;
    setPlanGenerationError(null);
    setPlanGenerating(true);

    const watchdog = setTimeout(() => {
      if (generationController.current !== controller || controller.signal.aborted) return;
      generationCancelReason.current = "watchdog";
      controller.abort();
    }, 50_000);

    const promise = (async () => {
      const date = localDateKey(new Date(), profile.timezone);
      const requestId = createId(mode);
      const currentData = dataRef.current;
      const activeRoadmap = currentData.learning.roadmaps.find((roadmap) => roadmap.id === currentData.learning.activeRoadmapId && roadmap.status === "active" && roadmap.intake?.includeInDailyPlan !== false);
      const learningLesson = activeRoadmap ? nextRoadmapLesson(activeRoadmap) : undefined;
      const requestContext = {
        ...(context ?? {}),
        ...(activeRoadmap && learningLesson ? { learning: { topic: activeRoadmap.topic, nextLesson: learningLesson.title, estimatedMinutes: learningLesson.estimatedMinutes } } : {}),
      };
      const rolloverSnapshot = mode === "rollover" ? JSON.stringify({ plan: currentData.activePlan ?? null, profile: currentData.profile ?? null }) : null;
      const base: AppData = {
        ...currentData,
        profile,
        onboardingDraft: profile,
        onboardingCompleted: mode === "onboarding" ? false : currentData.onboardingCompleted,
        discoveryCompleted: Boolean(profile.evolution),
        lastAiAttemptDate: date,
      };
      dataRef.current = base;
      setData(base);
      persist(base);
      const response = await generatePlan({
        profile, date, requestId, clientId: currentData.installationId,
        carryOver: mode === "replan" && context?.preserveTaskIds
          ? (currentData.activePlan?.tasks.filter((task) => context.preserveTaskIds?.includes(task.id) && !task.completed) ?? []).slice(0, 2)
          : mode === "replan" || mode === "rollover" ? carryOverTasks(currentData) : [],
        ...(Object.keys(requestContext).length ? { context: requestContext } : {}),
      }, { signal: controller.signal, timeoutMs: 45_000 });
      if (controller.signal.aborted) throw new Error("NEXUS_GENERATION_ABORTED");
      const latest = dataRef.current;
      if (mode === "rollover" && rolloverSnapshot !== JSON.stringify({ plan: latest.activePlan ?? null, profile: latest.profile ?? null })) {
        const preserved = { ...latest, lastAiAttemptDate: date };
        dataRef.current = preserved; setData(preserved); persist(preserved);
        showToast("Mantivemos seu plano local porque você já começou a editar ou executar o dia.");
        return;
      }
      const history = mode === "replan" && latest.activePlan ? [...latest.history, archivePlan(latest, latest.activePlan)].slice(-3660) : latest.history;
      const next = initializeProfessor({
        ...latest, profile, onboardingDraft: {}, onboardingCompleted: true, discoveryCompleted: Boolean(profile.evolution), activePlan: response.plan,
        history, lastGeneratedDate: date, lastAiAttemptDate: date,
      }, profile);
      dataRef.current = next; setData(next); persist(next);
      if (response.warning) showToast(response.warning);
    })().catch(() => {
      const reason = generationCancelReason.current;
      if (reason === "user") {
        setPlanGenerationError("A geração foi cancelada. Suas respostas continuam salvas.");
        return;
      }
      if (reason === "recovery" || reason === "unmount") return;
      const message = reason === "watchdog"
        ? "A IA ultrapassou o limite de 50 segundos. O Nexus ativou o plano local de segurança."
        : "A inteligência não respondeu. O Nexus ativou o plano local de segurança.";
      commitLocalPlan(profile, message);
    }).finally(() => {
      clearTimeout(watchdog);
      if (generationController.current === controller) generationController.current = null;
      generationPromise.current = null;
      generationCancelReason.current = null;
      setPlanGenerating(false);
    });
    generationPromise.current = promise;
    return promise;
  }, [commitLocalPlan, persist, showToast]);

  const cancelPlanGeneration = useCallback(() => {
    generationCancelReason.current = "user";
    generationController.current?.abort();
  }, []);

  const retryPlanGeneration = useCallback(async () => {
    const profile = dataRef.current.profile;
    if (!profile) {
      setPlanGenerationError("Seu perfil ainda não está pronto. Volte ao diagnóstico.");
      return;
    }
    await runGeneration(profile, dataRef.current.onboardingCompleted ? "replan" : "onboarding");
  }, [runGeneration]);

  const recoverPlanLocally = useCallback(() => {
    const profile = dataRef.current.profile;
    if (!profile) {
      setPlanGenerationError("Seu perfil ainda não está pronto. Volte ao diagnóstico.");
      return;
    }
    generationCancelReason.current = "recovery";
    generationController.current?.abort();
    commitLocalPlan(profile, "Plano local criado manualmente para você continuar agora.");
    setPlanGenerationError(null);
  }, [commitLocalPlan]);

  useEffect(() => {
    if (!ready || planGenerating) return;
    const current = dataRef.current;
    if (!current.profile || !current.onboardingCompleted || !current.activePlan) return;
    const today = localDateKey(new Date(), current.profile.timezone);
    const fresh = current.activePlan.date === today && current.activePlan.source === "offline" && current.activePlan.requestId.startsWith("rollover-") && current.lastAiAttemptDate !== today;
    if (!fresh || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    void runGeneration(current.profile, "rollover");
  }, [planGenerating, ready, runGeneration]);

  const completeOnboarding = useCallback(async (profile: Profile) => {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) throw new Error("Perfil incompleto");
    await runGeneration(parsed.data, "onboarding");
  }, [runGeneration]);

  const completeDiscovery = useCallback((evolution: EvolutionProfile): boolean => {
    const currentProfile = dataRef.current.profile;
    const parsed = evolutionProfileSchema.safeParse(evolution);
    if (!currentProfile || !parsed.success) return false;
    const profile = { ...currentProfile, evolution: parsed.data, updatedAt: new Date().toISOString() };
    const profileResult = profileSchema.safeParse(profile);
    if (!profileResult.success) return false;
    commit((current) => initializeProfessor({
      ...current,
      profile: profileResult.data,
      discoveryCompleted: true,
      preferences: { ...current.preferences, gamificationMode: parsed.data.challengeMode },
    }, profileResult.data), "Diagnóstico salvo. O Nexus agora entende melhor você.");
    return true;
  }, [commit]);

  const replanDay = useCallback(async (context?: { reason?: string; minutesRemaining?: number; currentEnergy?: Profile["energyLevel"]; preserveTaskIds?: string[] }) => {
    const profile = dataRef.current.profile;
    if (!profile) return;
    await runGeneration(profile, "replan", context);
  }, [runGeneration]);

  const updateOnboardingDraft = useCallback((patch: OnboardingDraft) => commit((current) => ({ ...current, onboardingDraft: { ...current.onboardingDraft, ...patch } })), [commit]);

  const handleTaskToggle = useCallback((taskId: string) => {
    const completed = !dataRef.current.activePlan?.tasks.find((task) => task.id === taskId)?.completed;
    commit((current) => toggleTaskCompletion(current, taskId), completed ? "Tarefa concluída. XP garantido." : "Tarefa reaberta e XP ajustado.");
    if (dataRef.current.preferences.haptics) void Haptics.impactAsync(completed ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [commit]);

  const handleMissionToggle = useCallback(() => {
    const completed = !dataRef.current.activePlan?.mainMission.completed;
    commit(toggleMainMission, completed ? "Missão principal concluída. +75 XP." : "Missão principal reaberta.");
    if (dataRef.current.preferences.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [commit]);

  const updateProfile = useCallback((patch: Partial<Profile>): boolean => {
    const currentProfile = dataRef.current.profile;
    if (!currentProfile) return false;
    const parsed = profileSchema.safeParse({ ...currentProfile, ...patch, updatedAt: new Date().toISOString() });
    if (!parsed.success) return false;
    commit((current) => ({ ...current, profile: parsed.data }), "Perfil atualizado.");
    return true;
  }, [commit]);

  const updatePreferences = useCallback((patch: Omit<Partial<Preferences>, "widget" | "dashboard" | "mascot"> & { widget?: Partial<Preferences["widget"]>; dashboard?: Partial<Preferences["dashboard"]>; mascot?: Partial<Preferences["mascot"]> }) => {
    commit((current) => {
      const notificationTime = patch.notificationTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(patch.notificationTime) ? patch.notificationTime : current.preferences.notificationTime;
      return {
        ...current,
        preferences: {
          ...current.preferences,
          ...patch,
          notificationTime,
          customAccent: patch.customAccent ? normalizeHexColor(patch.customAccent, current.preferences.customAccent) : current.preferences.customAccent,
          dashboard: { ...current.preferences.dashboard, ...(patch.dashboard ?? {}) },
          mascot: { ...current.preferences.mascot, ...(patch.mascot ?? {}) },
          widget: {
            ...current.preferences.widget,
            ...(patch.widget ?? {}),
            ...(patch.widget?.accentColor
              ? { accentColor: normalizeHexColor(patch.widget.accentColor, current.preferences.widget.accentColor ?? current.preferences.customAccent) }
              : {}),
            ...(patch.widget?.customLabel !== undefined
              ? { customLabel: sanitizeText(patch.widget.customLabel, 24) || undefined }
              : {}),
          },
        },
      };
    });
  }, [commit]);

  const finishFocusSession = useCallback((session: FocusSession, markTaskComplete: boolean) => {
    commit((current) => {
      let next: AppData = {
        ...current,
        progress: {
          ...current.progress,
          totalXp: current.progress.totalXp + session.xp,
          focusSessions: [...current.progress.focusSessions, session].slice(-10_000),
          attributes: { ...current.progress.attributes, foco: current.progress.attributes.foco + Math.floor(session.elapsedSeconds / 60) },
        },
      };
      const task = session.taskId ? next.activePlan?.tasks.find((item) => item.id === session.taskId) : undefined;
      if (markTaskComplete && task && !task.completed) next = toggleTaskCompletion(next, task.id);
      return next;
    }, `Sessão salva. +${session.xp} XP de foco.`);
  }, [commit]);

  const createThread = useCallback((kind: ChatKind): string => {
    const id = createId(`${kind}-chat`);
    const now = new Date().toISOString();
    const greeting = kind === "professor"
      ? "Professor Atlas aqui. O que você quer dominar — uma habilidade específica ou uma combinação de áreas?"
      : "Nexus Brain online. Pode falar como seu dia realmente está; vou usar seu contexto sem fingir que tudo é simples.";
    const thread: ChatThread = { id, kind, title: kind === "professor" ? "Nova aula" : "Nova conversa", summary: "", createdAt: now, updatedAt: now, archived: false, messages: [{ id: createId("message"), role: "assistant", content: greeting, createdAt: now }] };
    commit((current) => ({ ...current, brain: { ...current.brain, threads: [thread, ...current.brain.threads], ...(kind === "brain" ? { activeBrainThreadId: id } : { activeProfessorThreadId: id }) } }));
    return id;
  }, [commit]);

  const selectThread = useCallback((kind: ChatKind, threadId: string) => commit((current) => ({ ...current, brain: { ...current.brain, ...(kind === "brain" ? { activeBrainThreadId: threadId } : { activeProfessorThreadId: threadId }) } })), [commit]);
  const renameThread = useCallback((threadId: string, title: string) => commit((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.map((thread) => thread.id === threadId ? { ...thread, title: sanitizeText(title, 100) || thread.title, updatedAt: new Date().toISOString() } : thread) } })), [commit]);
  const archiveThread = useCallback((threadId: string) => commit((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.map((thread) => thread.id === threadId ? { ...thread, archived: !thread.archived, updatedAt: new Date().toISOString() } : thread) } })), [commit]);
  const deleteThread = useCallback((threadId: string) => commit((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.filter((thread) => thread.id !== threadId), memories: current.brain.memories.map((memory) => memory.sourceThreadId === threadId ? { ...memory, sourceThreadId: undefined } : memory), activeBrainThreadId: current.brain.activeBrainThreadId === threadId ? undefined : current.brain.activeBrainThreadId, activeProfessorThreadId: current.brain.activeProfessorThreadId === threadId ? undefined : current.brain.activeProfessorThreadId } })), [commit]);

  const sendChatMessage = useCallback(async (threadId: string, content: string) => {
    const clean = sanitizeText(content, 4000);
    const thread = dataRef.current.brain.threads.find((item) => item.id === threadId);
    if (!clean || !thread || assistantBusy) return;
    const userMessage = { id: createId("message"), role: "user" as const, content: clean, createdAt: new Date().toISOString() };
    commit((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.map((item) => item.id === threadId ? { ...item, title: item.messages.length <= 1 ? threadTitle(clean) : item.title, messages: [...item.messages, userMessage].slice(-1000), updatedAt: userMessage.createdAt } : item) } }));
    const controller = new AbortController();
    assistantController.current = controller;
    setAssistantBusy(true);
    try {
      const latestThread = dataRef.current.brain.threads.find((item) => item.id === threadId);
      const response = await askNexus({ data: dataRef.current, mode: thread.kind, message: clean, context: { conversationSummary: latestThread?.summary ?? "" } }, { signal: controller.signal, messages: latestThread?.messages });
      const now = new Date().toISOString();
      commit((current) => {
        const actionRecords: AssistantAction[] | undefined = response.actions?.map((action) => ({ ...action, id: createId("action"), status: "proposed" }));
        const assistantMessage = { id: createId("message"), role: "assistant" as const, content: sanitizeText(response.message, 6000), createdAt: now, ...(actionRecords?.length ? { actions: actionRecords } : {}) };
        const existingMemoryKeys = new Set(current.brain.memories.map((memory) => `${memory.kind}:${memory.content.toLocaleLowerCase("pt-BR")}`));
        const memories = (response.memories ?? []).filter((memory) => !existingMemoryKeys.has(`${memory.kind}:${memory.content.toLocaleLowerCase("pt-BR")}`)).map((memory) => ({ ...memory, id: createId("memory"), sourceThreadId: threadId, pinned: false, createdAt: now, updatedAt: now }));
        const roadmaps = response.roadmap && !current.learning.roadmaps.some((roadmap) => roadmap.topic.toLocaleLowerCase("pt-BR") === response.roadmap!.topic.toLocaleLowerCase("pt-BR")) ? [...current.learning.roadmaps, response.roadmap] : current.learning.roadmaps;
        return {
          ...current,
          brain: { ...current.brain, memories: [...current.brain.memories, ...memories].slice(-1000), threads: current.brain.threads.map((item) => item.id === threadId ? { ...item, title: response.title ? threadTitle(response.title) : item.title, summary: compactThreadSummary(item, response.message), messages: [...item.messages, assistantMessage].slice(-1000), updatedAt: now } : item) },
          learning: { ...current.learning, professorEnabled: current.learning.professorEnabled || thread.kind === "professor", roadmaps, activeRoadmapId: current.learning.activeRoadmapId ?? response.roadmap?.id },
        };
      }, response.warning);
    } catch {
      if (!controller.signal.aborted) showToast("Não consegui concluir esta resposta. Sua mensagem continua salva para tentar novamente.");
    } finally {
      assistantController.current = null;
      setAssistantBusy(false);
    }
  }, [assistantBusy, commit, showToast]);

  const deleteMemory = useCallback((memoryId: string) => commit((current) => ({ ...current, brain: { ...current.brain, memories: current.brain.memories.filter((memory) => memory.id !== memoryId) } }), "Memória removida."), [commit]);
  const toggleMemoryPinned = useCallback((memoryId: string) => commit((current) => ({ ...current, brain: { ...current.brain, memories: current.brain.memories.map((memory) => memory.id === memoryId ? { ...memory, pinned: !memory.pinned, updatedAt: new Date().toISOString() } : memory) } })), [commit]);

  const applyAssistantAction = useCallback(async (threadId: string, actionId: string, accept: boolean) => {
    let selected: AssistantAction | undefined;
    commit((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.map((thread) => thread.id === threadId ? { ...thread, messages: thread.messages.map((message) => ({ ...message, actions: message.actions?.map((action) => {
      if (action.id !== actionId || action.status !== "proposed") return action;
      selected = action;
      return { ...action, status: accept ? "accepted" : "rejected" };
    }) })) } : thread) } }));
    if (!accept || !selected) return;
    if (selected.type === "replan") return replanDay({ reason: selected.description });
    if (selected.type === "create_task") {
      const payload = selected.payload;
      const category = typeof payload.category === "string" && ["desenvolvimento", "estudos", "dinheiro", "saude", "organizacao", "pessoal"].includes(payload.category) ? payload.category as Category : "pessoal";
      const priority = payload.priority === "alta" || payload.priority === "baixa" ? payload.priority : "media";
      commit((current) => addTask(current, { title: typeof payload.title === "string" ? payload.title : selected!.title, category, priority, estimatedMinutes: typeof payload.estimatedMinutes === "number" ? payload.estimatedMinutes : 25, recurring: false }), "Tarefa aprovada e adicionada.");
    }
    if (selected.type === "create_roadmap") await createRoadmap(selected.title);
    if (selected.type === "update_goal" && typeof selected.payload.mainGoal === "string") updateProfile({ mainGoal: selected.payload.mainGoal });
    if (selected.type === "start_operation") createOperation({ title: selected.title, objective: selected.description, deadline: typeof selected.payload.deadline === "string" ? selected.payload.deadline : localDateKey(new Date(Date.now() + 14 * 86_400_000), dataRef.current.profile?.timezone), phaseTitles: ["Fundação", "Execução", "Entrega final"] });
  }, [commit, replanDay, updateProfile]);

  const createRoadmap = useCallback(async (topic: string, intake?: ProfessorIntake) => {
    const clean = sanitizeText(topic, 160);
    if (!clean || !dataRef.current.profile || assistantBusy) return;
    setAssistantBusy(true);
    const controller = new AbortController(); assistantController.current = controller;
    try {
      const response = await askNexus({
        data: dataRef.current,
        mode: "roadmap",
        message: intake
          ? `Crie meu roadmap de ${clean} usando integralmente o diagnóstico específico enviado.`
          : clean,
        ...(intake ? { context: { professorIntake: intake } } : {}),
      }, { signal: controller.signal });
      const generated = response.roadmap ?? createStarterRoadmap(clean, dataRef.current.profile, intake);
      const roadmap: LearningRoadmap = intake ? {
        ...generated,
        topic: clean,
        intake,
        currentLevel: intake.knowledgeLevel === "zero" || intake.knowledgeLevel === "basico" ? "iniciante" : intake.knowledgeLevel,
        weeklyMinutes: intake.weeklyMinutes,
      } : generated;
      commit((current) => ({
        ...current,
        preferences: intake ? {
          ...current.preferences,
          widget: {
            ...current.preferences.widget,
            showProfessor: intake.showProfessorInWidget,
            showLearning: intake.showLearningInWidget,
          },
        } : current.preferences,
        learning: {
          ...current.learning,
          professorEnabled: true,
          roadmaps: [...current.learning.roadmaps.filter((item) => item.topic.toLocaleLowerCase("pt-BR") !== roadmap.topic.toLocaleLowerCase("pt-BR")), roadmap],
          pendingTopics: current.learning.pendingTopics.filter((item) => item.toLocaleLowerCase("pt-BR") !== clean.toLocaleLowerCase("pt-BR")),
          activeRoadmapId: roadmap.id,
        },
      }), "Roadmap criado pelo Professor Atlas.");
    } finally { assistantController.current = null; setAssistantBusy(false); }
  }, [assistantBusy, commit]);

  const toggleRoadmapLesson = useCallback((roadmapId: string, lessonId: string) => commit((current) => {
    let completedNow = false;
    const roadmaps: LearningRoadmap[] = current.learning.roadmaps.map((roadmap) => {
      if (roadmap.id !== roadmapId) return roadmap;
      const phases = roadmap.phases.map((phase) => ({ ...phase, lessons: phase.lessons.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;
        completedNow = !lesson.completed;
        return { ...lesson, completed: completedNow, ...(completedNow ? { completedAt: new Date().toISOString() } : { completedAt: undefined }) };
      }) }));
      const allDone = phases.every((phase) => phase.lessons.every((lesson) => lesson.completed));
      return { ...roadmap, phases, status: allDone ? "completed" : "active", updatedAt: new Date().toISOString() };
    });
    return { ...current, learning: { ...current.learning, roadmaps }, progress: { ...current.progress, totalXp: Math.max(0, current.progress.totalXp + (completedNow ? 20 : -20)), attributes: { ...current.progress.attributes, disciplina: Math.max(0, current.progress.attributes.disciplina + (completedNow ? 1 : -1)) } } };
  }, "Roadmap atualizado."), [commit]);
  const setActiveRoadmap = useCallback((roadmapId: string) => commit((current) => ({ ...current, learning: { ...current.learning, activeRoadmapId: roadmapId } })), [commit]);

  const quickCapture = useCallback(async (text: string): Promise<CaptureResult | null> => {
    if (assistantBusy) return null;
    setAssistantBusy(true);
    const controller = new AbortController(); assistantController.current = controller;
    try { return (await askNexus({ data: dataRef.current, mode: "capture", message: text }, { signal: controller.signal })).capture ?? null; }
    finally { assistantController.current = null; setAssistantBusy(false); }
  }, [assistantBusy]);

  const saveCapture = useCallback((capture: CaptureResult) => {
    const today = localDateKey(new Date(), dataRef.current.profile?.timezone);
    if (capture.scheduledDate && capture.scheduledDate !== today) {
      commit((current) => ({ ...current, weeklyPlan: [...current.weeklyPlan, { id: createId("week-task"), date: capture.scheduledDate!, title: capture.title, category: capture.category, estimatedMinutes: capture.estimatedMinutes, priority: capture.priority, completed: false }].slice(-1000) }), "Captura salva no planejamento semanal.");
      return;
    }
    commit((current) => addTask(current, capture), "Captura adicionada ao plano de hoje.");
  }, [commit]);

  const generateWeeklyReview = useCallback(async (): Promise<WeeklyReview> => {
    if (assistantBusy) return dataRef.current.weeklyReviews.at(-1) ?? createLocalWeeklyReview(dataRef.current);
    setAssistantBusy(true);
    const controller = new AbortController(); assistantController.current = controller;
    try {
      const local = createLocalWeeklyReview(dataRef.current);
      const response = await askNexus({ data: dataRef.current, mode: "weekly_review", message: "Analise minha última semana e prepare a próxima.", context: { weekStart: local.weekStart, weekEnd: local.weekEnd, completionPercentage: local.completionPercentage, xpEarned: local.xpEarned, focusMinutes: local.focusMinutes } }, { signal: controller.signal });
      const review = response.weeklyReview ?? local;
      commit((current) => ({ ...current, weeklyReviews: [...current.weeklyReviews.filter((item) => item.weekStart !== review.weekStart), review].slice(-520) }), "Revisão semanal pronta.");
      return review;
    } finally { assistantController.current = null; setAssistantBusy(false); }
  }, [assistantBusy, commit]);

  const createOperation = useCallback((input: Pick<Operation, "title" | "objective" | "deadline"> & { phaseTitles: string[] }) => {
    const now = new Date().toISOString();
    const operation: Operation = { id: createId("operation"), title: sanitizeText(input.title, 160), objective: sanitizeText(input.objective, 800), deadline: input.deadline, status: "active", phases: input.phaseTitles.slice(0, 20).map((title) => ({ id: createId("op-phase"), title: sanitizeText(title, 160), completed: false, milestone: `Concluir: ${sanitizeText(title, 160)}` })), specialXp: 250, createdAt: now };
    if (!operation.title || !operation.phases.length) return;
    commit((current) => ({ ...current, operations: [...current.operations, operation].slice(-100) }), "Operação iniciada.");
  }, [commit]);

  const toggleOperationPhase = useCallback((operationId: string, phaseId: string) => commit((current) => {
    let xpDelta = 0;
    const operations = current.operations.map((operation) => {
      if (operation.id !== operationId) return operation;
      const wasComplete = operation.status === "completed";
      const phases = operation.phases.map((phase) => phase.id === phaseId ? { ...phase, completed: !phase.completed } : phase);
      const isComplete = phases.every((phase) => phase.completed);
      if (!wasComplete && isComplete) xpDelta = operation.specialXp;
      if (wasComplete && !isComplete) xpDelta = -operation.specialXp;
      return { ...operation, phases, status: isComplete ? "completed" as const : "active" as const, ...(isComplete ? { completedAt: new Date().toISOString() } : { completedAt: undefined }) };
    });
    return { ...current, operations, progress: { ...current.progress, totalXp: Math.max(0, current.progress.totalXp + xpDelta) } };
  }, "Operação atualizada."), [commit]);

  const createHabit = useCallback((input: Pick<Habit, "title" | "category" | "activeDays" | "targetPerWeek"> & { reminderTime?: string }) => {
    const habit: Habit = { id: createId("habit"), title: sanitizeText(input.title, 160), category: input.category, activeDays: input.activeDays, targetPerWeek: input.targetPerWeek, ...(input.reminderTime ? { reminderTime: input.reminderTime } : {}), currentStreak: 0, bestStreak: 0, completedDates: [], createdAt: new Date().toISOString() };
    if (!habit.title || !habit.activeDays.length) return;
    commit((current) => ({ ...current, habits: [...current.habits, habit].slice(-200) }), "Hábito inteligente criado.");
  }, [commit]);

  const toggleHabitToday = useCallback((habitId: string) => commit((current) => {
    const today = localDateKey(new Date(), current.profile?.timezone);
    let delta = 0;
    const habits = current.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      const completed = habit.completedDates.includes(today);
      delta = completed ? -10 : 10;
      const dates = completed ? habit.completedDates.filter((date) => date !== today) : [...habit.completedDates, today];
      const streak = completed ? Math.max(0, habit.currentStreak - 1) : habit.currentStreak + 1;
      return { ...habit, completedDates: dates.slice(-3660), currentStreak: streak, bestStreak: Math.max(habit.bestStreak, streak) };
    });
    return { ...current, habits, progress: { ...current.progress, totalXp: Math.max(0, current.progress.totalXp + delta), attributes: { ...current.progress.attributes, consistencia: Math.max(0, current.progress.attributes.consistencia + Math.sign(delta)) } } };
  }, "Hábito atualizado."), [commit]);

  const addWeeklyPlanItem = useCallback((input: Omit<WeeklyPlanItem, "id" | "completed">) => commit((current) => ({ ...current, weeklyPlan: [...current.weeklyPlan, { ...input, id: createId("week-task"), title: sanitizeText(input.title, 160), completed: false }].slice(-1000) }), "Item adicionado à semana."), [commit]);
  const moveWeeklyPlanItem = useCallback((itemId: string, date: string) => commit((current) => ({ ...current, weeklyPlan: current.weeklyPlan.map((item) => item.id === itemId ? { ...item, date } : item) }), "Tarefa movida."), [commit]);

  const resetToday = useCallback(() => {
    const profile = dataRef.current.profile;
    if (!profile) return;
    const date = localDateKey(new Date(), profile.timezone);
    commit((current) => ({ ...current, history: current.activePlan ? [...current.history, archivePlan(current, current.activePlan)].slice(-3660) : current.history, activePlan: generateLocalPlan({ profile, date, requestId: createId("reset"), clientId: current.installationId }, "Plano de hoje reiniciado localmente."), lastGeneratedDate: date }), "Plano de hoje reiniciado.");
  }, [commit]);

  const resetAll = useCallback(async () => {
    generationController.current?.abort(); assistantController.current?.abort();
    await nexusRepository.clearAll();
    const next = cloneDefaultData(); dataRef.current = next; setData(next); setToast(null); await updateAndroidWidget(next);
  }, []);
  const clearTemporary = useCallback(async () => { await nexusRepository.clearTemporary(); showToast("Somente os dados temporários foram limpos."); }, [showToast]);
  const importBackup = useCallback(async (json: string) => { const imported = nexusRepository.importJson(json); dataRef.current = imported; setData(imported); await nexusRepository.save(imported); await updateAndroidWidget(imported); showToast("Backup importado com sucesso."); }, [showToast]);

  const value = useMemo<NexusContextValue>(() => ({
    data, colors: getColors(data.preferences), ready, planGenerating, planGenerationError, assistantBusy, loadingStage: LOADING_STAGES[loadingStageIndex] ?? LOADING_STAGES[0], toast,
    updateOnboardingDraft, completeOnboarding, completeDiscovery,
    cancelPlanGeneration, retryPlanGeneration, recoverPlanLocally, cancelAssistant: () => assistantController.current?.abort(), replanDay,
    toggleTask: handleTaskToggle, toggleMission: handleMissionToggle,
    addTask: (input) => commit((current) => addTask(current, input), "Tarefa adicionada."),
    updateTask: (taskId, patch) => commit((current) => updateTask(current, taskId, patch), "Tarefa atualizada."),
    deleteTask: (taskId) => commit((current) => deleteTask(current, taskId), "Tarefa removida."),
    postponeTask: (taskId) => commit((current) => postponeTask(current, taskId), "Tarefa movida para o próximo planejamento."),
    updateProfile, updatePreferences, finishFocusSession,
    createThread, selectThread, renameThread, archiveThread, deleteThread, sendChatMessage, deleteMemory, toggleMemoryPinned, applyAssistantAction,
    createRoadmap, toggleRoadmapLesson, setActiveRoadmap, quickCapture, saveCapture, generateWeeklyReview,
    createOperation, toggleOperationPhase, createHabit, toggleHabitToday, addWeeklyPlanItem, moveWeeklyPlanItem,
    resetToday, resetAll, clearTemporary, importBackup, exportBackup: () => nexusRepository.exportJson(data),
    dismissToast: () => setToast(null), dismissWarnings: () => commit((current) => ({ ...current, corruptionWarnings: [] })),
  }), [
    addWeeklyPlanItem, applyAssistantAction, archiveThread, assistantBusy, cancelPlanGeneration, clearTemporary, commit, completeDiscovery, completeOnboarding, createHabit, createOperation,
    createRoadmap, createThread, data, deleteMemory, deleteThread, finishFocusSession, generateWeeklyReview, handleMissionToggle, handleTaskToggle, importBackup,
    loadingStageIndex, moveWeeklyPlanItem, planGenerating, planGenerationError, quickCapture, ready, recoverPlanLocally, renameThread, replanDay, resetAll, resetToday, retryPlanGeneration, saveCapture, selectThread,
    sendChatMessage, setActiveRoadmap, toast, toggleHabitToday, toggleMemoryPinned, toggleOperationPhase, toggleRoadmapLesson, updateOnboardingDraft, updatePreferences, updateProfile,
  ]);

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
}

export function useNexus(): NexusContextValue {
  const context = useContext(NexusContext);
  if (!context) throw new Error("useNexus deve ser usado dentro de NexusProvider");
  return context;
}
