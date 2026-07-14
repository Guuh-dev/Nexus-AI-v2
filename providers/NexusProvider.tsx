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
import { DEFAULT_APP_DATA } from "@/constants/defaults";
import {
  activateRoadmap,
  applyLessonEvidenceReview,
  archiveRoadmap as archiveLearningRoadmap,
  classifyRoadmapIntent,
  EVOLUTION_AREA_LABELS,
  nextRoadmapLesson,
  removeRoadmap,
  renameRoadmap as renameLearningRoadmap,
  replaceRoadmap,
  submitLessonEvidence,
  validateRoadmapSemantics,
} from "@/features/learning/roadmap";
import { getLessonGuidance } from "@/features/learning/lesson-guidance";
import { refreshDailyChallengesAt } from "@/features/progress/challenges";
import { buildWeeklyEvidence, sanitizeAiWeeklyReview, weekFactsForAi } from "@/features/progress/weekly-review";
import { carryOverTasks, mergeSameDayPlanEvidence, rolloverIfNeeded } from "@/features/planning/rollover";
import { addTask, deleteTask, postponeTask, toggleMainMission, toggleTaskCompletion, updateTask } from "@/features/tasks/task.logic";
import { evolutionProfileSchema, roadmapSchema } from "@/schemas/expansion.schema";
import { profileSchema } from "@/schemas/profile.schema";
import { appDataSchema } from "@/schemas/storage.schema";
import { askNexus } from "@/services/assistant.service";
import { clearFocusRuntime } from "@/services/focus-runtime.service";
import { configureDailyReminder } from "@/services/notification.service";
import { generateLocalPlan, generatePlan } from "@/services/planning.service";
import {
  nexusRepository,
  type BackupImportPreview,
} from "@/services/storage.service";
import {
  acknowledgeAndroidWidgetActions,
  peekAndroidWidgetActions,
  updateAndroidWidget,
  type WidgetSyncResult,
} from "@/services/widget.service";
import { applyWidgetTaskActions, widgetTaskActionsSatisfied } from "@/features/widget/actions";
import { getColors, getVisuals, type NexusColors, type NexusVisuals } from "@/theme/theme";
import type {
  AppData,
  AssistantAction,
  AssistantMeta,
  AssistantResponse,
  AssistantStage,
  Category,
  ChatKind,
  ChatThread,
  EvolutionProfile,
  FocusSession,
  LearningRoadmap,
  MemoryKind,
  OnboardingDraft,
  Preferences,
  Priority,
  ProfessorIntake,
  Profile,
  WeeklyReview,
} from "@/types";
import { isValidDateKey, localDateKey } from "@/utils/dates";
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
  context?: string;
  firstStep?: string;
  expectedResult?: string;
  doneWhen?: string;
  category: Category;
  priority: Priority;
  estimatedMinutes: number;
  recurring: boolean;
};

type CaptureResult = NonNullable<AssistantResponse["capture"]>;
type EvidenceSubmissionResult = "not_saved" | "saved_pending" | "reviewed";
type ConfirmedCommitResult = { data: AppData; widget: WidgetSyncResult };

type NexusContextValue = {
  data: AppData;
  colors: NexusColors;
  visuals: NexusVisuals;
  ready: boolean;
  storageReadOnlyReason: string | null;
  planGenerating: boolean;
  planGenerationError: string | null;
  assistantBusy: boolean;
  assistantStage: AssistantStage;
  lastAssistantMeta: AssistantMeta | null;
  weeklyReviewError: string | null;
  loadingStage: string;
  toast: string | null;
  updateOnboardingDraft: (patch: OnboardingDraft) => void;
  completeOnboarding: (profile: Profile) => Promise<void>;
  completeDiscovery: (evolution: EvolutionProfile) => Promise<boolean>;
  cancelPlanGeneration: () => void;
  retryPlanGeneration: () => Promise<void>;
  recoverPlanLocally: () => Promise<void>;
  cancelAssistant: () => void;
  replanDay: (context?: { reason?: string; minutesRemaining?: number; currentEnergy?: Profile["energyLevel"]; preserveTaskIds?: string[] }) => Promise<boolean>;
  toggleTask: (taskId: string) => Promise<boolean>;
  toggleMission: () => Promise<boolean>;
  addTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (taskId: string, patch: Partial<TaskInput>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  postponeTask: (taskId: string) => Promise<boolean>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  updatePreferences: (patch: Omit<Partial<Preferences>, "widget" | "dashboard" | "mascot"> & { widget?: Partial<Preferences["widget"]>; dashboard?: Partial<Preferences["dashboard"]>; mascot?: Partial<Preferences["mascot"]> }) => Promise<WidgetSyncResult | null>;
  finishFocusSession: (session: FocusSession, markTaskComplete: boolean) => Promise<boolean>;
  createThread: (kind: ChatKind) => string;
  selectThread: (kind: ChatKind, threadId: string) => void;
  renameThread: (threadId: string, title: string) => Promise<boolean>;
  archiveThread: (threadId: string) => Promise<boolean>;
  deleteThread: (threadId: string) => Promise<boolean>;
  sendChatMessage: (threadId: string, content: string) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<boolean>;
  toggleMemoryPinned: (memoryId: string) => Promise<boolean>;
  applyAssistantAction: (threadId: string, actionId: string, accept: boolean) => Promise<void>;
  createRoadmap: (topic: string, intake?: ProfessorIntake) => Promise<boolean>;
  setActiveRoadmap: (roadmapId: string) => Promise<boolean>;
  renameRoadmap: (roadmapId: string, title: string) => Promise<boolean>;
  archiveRoadmap: (roadmapId: string) => Promise<boolean>;
  deleteRoadmap: (roadmapId: string) => Promise<boolean>;
  regenerateRoadmap: (roadmapId: string) => Promise<boolean>;
  submitRoadmapEvidence: (roadmapId: string, lessonId: string, submission: string) => Promise<EvidenceSubmissionResult>;
  quickCapture: (text: string) => Promise<CaptureResult | null>;
  saveCapture: (capture: CaptureResult) => Promise<boolean>;
  rescheduleCapture: (captureId: string, date: string) => Promise<boolean>;
  deleteScheduledCapture: (captureId: string) => Promise<boolean>;
  generateWeeklyReview: () => Promise<WeeklyReview | null>;
  resetToday: () => Promise<boolean>;
  resetAll: () => Promise<void>;
  clearTemporary: () => Promise<void>;
  inspectBackup: (json: string) => BackupImportPreview;
  importBackup: (json: string) => Promise<void>;
  restoreImportBackup: () => Promise<boolean>;
  hasImportRollback: boolean;
  restoreMigrationBackup: () => Promise<boolean>;
  hasMigrationBackup: boolean;
  exportBackup: () => string;
  dismissToast: () => void;
  dismissWarnings: () => void;
};

const NexusContext = createContext<NexusContextValue | null>(null);

function cloneDefaultData(): AppData {
  return { ...(JSON.parse(JSON.stringify(DEFAULT_APP_DATA)) as AppData), installationId: createId("install") };
}

async function reconcileDailyReminder(data: AppData): Promise<AppData> {
  const requested = data.preferences.notificationEnabled;
  const result = await configureDailyReminder(
    requested,
    data.preferences.notificationTime,
  );
  if (result.enabled === requested) return data;
  return {
    ...data,
    preferences: {
      ...data.preferences,
      notificationEnabled: result.enabled,
    },
  };
}

function unlockAchievements(data: AppData): AppData {
  let next = refreshDailyChallengesAt(data);
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

function setAssistantActionStatus(
  data: AppData,
  threadId: string,
  actionId: string,
  status: "accepted" | "rejected",
): AppData {
  return {
    ...data,
    brain: {
      ...data.brain,
      threads: data.brain.threads.map((thread) => thread.id === threadId
        ? {
            ...thread,
            messages: thread.messages.map((message) => ({
              ...message,
              actions: message.actions?.map((action) => action.id === actionId
                ? { ...action, status }
                : action),
            })),
          }
        : thread),
    },
  };
}

export function NexusProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(cloneDefaultData);
  const dataRef = useRef(data);
  const [ready, setReady] = useState(false);
  const [storageReadOnlyReason, setStorageReadOnlyReason] = useState<string | null>(null);
  const [hasImportRollback, setHasImportRollback] = useState(false);
  const [hasMigrationBackup, setHasMigrationBackup] = useState(false);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planGenerationError, setPlanGenerationError] = useState<string | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantStage, setAssistantStage] = useState<AssistantStage>("idle");
  const [lastAssistantMeta, setLastAssistantMeta] = useState<AssistantMeta | null>(null);
  const [weeklyReviewError, setWeeklyReviewError] = useState<string | null>(null);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [rolloverRevision, setRolloverRevision] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const activeSyncRef = useRef<Promise<void> | null>(null);
  const generationController = useRef<AbortController | null>(null);
  const generationPromise = useRef<Promise<boolean> | null>(null);
  const generationCancelReason = useRef<"user" | "watchdog" | "recovery" | "unmount" | null>(null);
  const assistantController = useRef<AbortController | null>(null);
  const assistantFlightRef = useRef<{
    controller: AbortController;
    settled: Promise<void>;
    settle: () => void;
  } | null>(null);
  const stateReplacementInProgressRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginAssistantFlight = useCallback((): AbortController => {
    const controller = new AbortController();
    if (stateReplacementInProgressRef.current) {
      controller.abort();
      return controller;
    }
    let settle: () => void = () => {};
    const settled = new Promise<void>((resolve) => { settle = resolve; });
    assistantController.current = controller;
    assistantFlightRef.current = { controller, settled, settle };
    return controller;
  }, []);

  const finishAssistantFlight = useCallback((controller: AbortController) => {
    const flight = assistantFlightRef.current;
    if (flight?.controller === controller) {
      flight.settle();
      assistantFlightRef.current = null;
    }
    if (assistantController.current === controller) assistantController.current = null;
  }, []);

  const beginStateReplacement = useCallback(async (): Promise<boolean> => {
    if (stateReplacementInProgressRef.current) return false;
    stateReplacementInProgressRef.current = true;
    generationCancelReason.current = "recovery";
    const generation = generationPromise.current;
    const assistant = assistantFlightRef.current;
    const activeSync = activeSyncRef.current;
    generationController.current?.abort();
    assistantController.current?.abort();
    await Promise.allSettled([
      generation ?? Promise.resolve(false),
      assistant?.settled ?? Promise.resolve(),
      activeSync ?? Promise.resolve(),
    ]);
    return true;
  }, []);

  const finishStateReplacement = useCallback(() => {
    stateReplacementInProgressRef.current = false;
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const persist = useCallback(async (next: AppData): Promise<WidgetSyncResult> => {
    await nexusRepository.save(next);
    return updateAndroidWidget(next);
  }, []);

  const prepareCommit = useCallback((update: (current: AppData) => AppData): AppData | null => {
    if (stateReplacementInProgressRef.current) return null;
    const next = unlockAchievements(update(dataRef.current));
    const validation = appDataSchema.safeParse(next);
    if (!validation.success) {
      showToast("Esta alteração produziria dados inválidos e não foi aplicada.");
      return null;
    }
    dataRef.current = validation.data;
    setData(validation.data);
    return validation.data;
  }, [showToast]);

  const commit = useCallback((update: (current: AppData) => AppData, message?: string) => {
    const next = prepareCommit(update);
    if (!next) return false;
    void persist(next)
      .then(() => { if (message) showToast(message); })
      .catch(() => showToast("Não foi possível salvar agora. Tentaremos novamente na próxima alteração."));
    return true;
  }, [persist, prepareCommit, showToast]);

  const commitConfirmed = useCallback(async (
    update: (current: AppData) => AppData,
    message?: string,
  ): Promise<ConfirmedCommitResult | null> => {
    const previous = dataRef.current;
    const next = prepareCommit(update);
    if (!next) return null;
    try {
      const widget = await persist(next);
      if (message) showToast(message);
      return { data: next, widget };
    } catch {
      const latest = dataRef.current;
      if (latest !== next) {
        try {
          const widget = await persist(latest);
          if (message) showToast(message);
          return { data: latest, widget };
        } catch {
          // Fall through to the protected failure state below.
        }
      } else {
        dataRef.current = previous;
        setData(previous);
      }
      showToast("Não foi possível confirmar a gravação desta alteração. Revise o estado antes de tentar novamente.");
      return null;
    }
  }, [persist, prepareCommit, showToast]);

  const syncWidgetActions = useCallback(async () => {
    if (stateReplacementInProgressRef.current || !hydratedRef.current || nexusRepository.readOnlyReason()) return;
    const batch = await peekAndroidWidgetActions();
    if (stateReplacementInProgressRef.current || !batch.actions.length) return;
    const confirmed = await commitConfirmed(
      (current) => applyWidgetTaskActions(current, batch.actions),
    );
    if (!confirmed || !widgetTaskActionsSatisfied(confirmed.data, batch.actions)) return;
    if (await acknowledgeAndroidWidgetActions(batch.receipt)) {
      showToast("Ações feitas no widget foram sincronizadas.");
    } else {
      showToast("As ações do widget foram salvas; a fila nativa tentará confirmar novamente.");
    }
  }, [commitConfirmed, showToast]);

  useEffect(() => {
    let mounted = true;
    const synchronizeActiveState = (): Promise<void> => {
      if (stateReplacementInProgressRef.current || !hydratedRef.current) return Promise.resolve();
      if (activeSyncRef.current) return activeSyncRef.current;
      const task = (async () => {
        if (nexusRepository.readOnlyReason()) return;
        const previous = dataRef.current;
        const rollover = rolloverIfNeeded(previous);
        const dailyState = refreshDailyChallengesAt(rollover.data);
        if (dailyState !== previous) {
          dataRef.current = dailyState;
          setData(dailyState);
          try {
            await persist(dailyState);
            if (!mounted) return;
            if (rollover.rolledOver) {
              setRolloverRevision((value) => value + 1);
              showToast("Novo dia detectado. Sua missão foi preparada sem duplicar tarefas.");
            }
          } catch {
            dataRef.current = previous;
            if (mounted) setData(previous);
            showToast("Não foi possível salvar a atualização diária. O estado anterior foi mantido para nova tentativa.");
            return;
          }
        }
        await syncWidgetActions();
      })().finally(() => {
        activeSyncRef.current = null;
      });
      activeSyncRef.current = task;
      return task;
    };

    void (async () => {
      const loaded = await nexusRepository.load();
      if (!mounted) return;
      const readOnlyReason = nexusRepository.readOnlyReason();
      const rollover = rolloverIfNeeded(loaded);
      const dailyState = readOnlyReason ? loaded : refreshDailyChallengesAt(rollover.data);
      let initial = dailyState;
      if (dailyState !== loaded && !readOnlyReason) {
        try {
          await persist(dailyState);
          if (rollover.rolledOver) {
            showToast("Novo dia detectado. Sua missão foi preparada sem duplicar tarefas.");
          }
        } catch {
          initial = loaded;
          showToast("Não foi possível salvar a atualização diária. O estado anterior foi mantido para nova tentativa.");
        }
      }
      if (!mounted) return;
      setStorageReadOnlyReason(readOnlyReason);
      dataRef.current = initial;
      setData(initial);
      hydratedRef.current = true;
      setReady(true);
      void nexusRepository.hasImportRollback().then((available) => {
        if (mounted) setHasImportRollback(available);
      });
      void nexusRepository.hasPreMigrationBackup().then((available) => {
        if (mounted) setHasMigrationBackup(available);
      });
      if (!readOnlyReason) await syncWidgetActions();
    })();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void synchronizeActiveState();
    });
    return () => {
      mounted = false;
      hydratedRef.current = false;
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

  const commitLocalPlan = useCallback(async (profile: Profile, message: string): Promise<boolean> => {
    const date = localDateKey(new Date(), profile.timezone);
    return Boolean(await commitConfirmed((current) => {
      const replacement = generateLocalPlan(
        { profile, date, requestId: createId("safe"), clientId: current.installationId },
        message,
      );
      return initializeProfessor({
        ...current,
        profile,
        onboardingCompleted: true,
        discoveryCompleted: Boolean(profile.evolution),
        onboardingDraft: {},
        activePlan: mergeSameDayPlanEvidence(current.activePlan, replacement),
        lastGeneratedDate: date,
        lastAiAttemptDate: date,
      }, profile);
    }, message));
  }, [commitConfirmed]);

  const runGeneration = useCallback((profile: Profile, mode: "onboarding" | "replan" | "rollover", context?: { reason?: string; minutesRemaining?: number; currentEnergy?: Profile["energyLevel"]; preserveTaskIds?: string[] }): Promise<boolean> => {
    if (stateReplacementInProgressRef.current) return Promise.resolve(false);
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

    const promise = (async (): Promise<boolean> => {
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
      await persist(base);
      const scheduledCarry = currentData.activePlan?.tasks.filter((task) =>
        !task.completed && task.scheduledDate === date,
      ) ?? [];
      const requestedCarry = mode === "replan" && context?.preserveTaskIds
        ? currentData.activePlan?.tasks.filter((task) =>
            !task.completed && context.preserveTaskIds?.includes(task.id),
          ) ?? []
        : mode === "replan" || mode === "rollover"
          ? carryOverTasks(currentData)
          : [];
      const seenCarry = new Set<string>();
      const requiredCarry = [...scheduledCarry, ...requestedCarry].filter((task) => {
        const key = `${task.id}:${task.title.toLocaleLowerCase("pt-BR").trim()}`;
        if (seenCarry.has(key)) return false;
        seenCarry.add(key);
        return true;
      }).slice(0, 6);
      const response = await generatePlan({
        profile, date, requestId, clientId: currentData.installationId,
        carryOver: requiredCarry,
        ...(Object.keys(requestContext).length ? { context: requestContext } : {}),
      }, { signal: controller.signal, timeoutMs: 45_000 });
      if (controller.signal.aborted) throw new Error("NEXUS_GENERATION_ABORTED");
      const latest = dataRef.current;
      if (mode === "rollover" && rolloverSnapshot !== JSON.stringify({ plan: latest.activePlan ?? null, profile: latest.profile ?? null })) {
        const preserved = { ...latest, lastAiAttemptDate: date };
        dataRef.current = preserved;
        setData(preserved);
        await persist(preserved);
        showToast("Mantivemos seu plano local porque você já começou a editar ou executar o dia.");
        return true;
      }
      const next = initializeProfessor({
        ...latest, profile, onboardingDraft: {}, onboardingCompleted: true, discoveryCompleted: Boolean(profile.evolution), activePlan: mergeSameDayPlanEvidence(latest.activePlan, response.plan),
        history: latest.history, lastGeneratedDate: date, lastAiAttemptDate: date,
      }, profile);
      dataRef.current = next;
      setData(next);
      await persist(next);
      if (response.warning) showToast(response.warning);
      return true;
    })().catch(async (): Promise<boolean> => {
      const reason = generationCancelReason.current;
      if (reason === "user") {
        setPlanGenerationError("A geração foi cancelada. Suas respostas continuam salvas.");
        return false;
      }
      if (reason === "recovery" || reason === "unmount") return false;
      const message = reason === "watchdog"
        ? "A IA ultrapassou o limite de 50 segundos. O Nexus ativou o plano local de segurança."
        : "A inteligência não respondeu. O Nexus ativou o plano local de segurança.";
      const recovered = await commitLocalPlan(profile, message);
      if (!recovered) {
        setPlanGenerationError("Não foi possível gravar o plano local. Suas respostas continuam salvas; tente novamente.");
      }
      return recovered;
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

  const recoverPlanLocally = useCallback(async () => {
    const profile = dataRef.current.profile;
    if (!profile) {
      setPlanGenerationError("Seu perfil ainda não está pronto. Volte ao diagnóstico.");
      return;
    }
    generationCancelReason.current = "recovery";
    generationController.current?.abort();
    if (await commitLocalPlan(profile, "Plano local criado manualmente para você continuar agora.")) {
      setPlanGenerationError(null);
    } else {
      setPlanGenerationError("Não foi possível gravar o plano local. Tente novamente.");
    }
  }, [commitLocalPlan]);

  useEffect(() => {
    if (!ready || planGenerating) return;
    const current = dataRef.current;
    if (!current.profile || !current.onboardingCompleted || !current.activePlan) return;
    const today = localDateKey(new Date(), current.profile.timezone);
    const fresh = current.activePlan.date === today && current.activePlan.source === "offline" && current.activePlan.requestId.startsWith("rollover-") && current.lastAiAttemptDate !== today;
    if (!fresh || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    void runGeneration(current.profile, "rollover");
  }, [planGenerating, ready, rolloverRevision, runGeneration]);

  const completeOnboarding = useCallback(async (profile: Profile) => {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) throw new Error("Perfil incompleto");
    await runGeneration(parsed.data, "onboarding");
  }, [runGeneration]);

  const completeDiscovery = useCallback(async (evolution: EvolutionProfile): Promise<boolean> => {
    const currentProfile = dataRef.current.profile;
    const parsed = evolutionProfileSchema.safeParse(evolution);
    if (!currentProfile || !parsed.success) return false;
    const profile = { ...currentProfile, evolution: parsed.data, updatedAt: new Date().toISOString() };
    const profileResult = profileSchema.safeParse(profile);
    if (!profileResult.success) return false;
    return Boolean(await commitConfirmed((current) => initializeProfessor({
      ...current,
      profile: profileResult.data,
      discoveryCompleted: true,
      preferences: { ...current.preferences, gamificationMode: parsed.data.challengeMode },
    }, profileResult.data), "Diagnóstico salvo. O Nexus agora entende melhor você."));
  }, [commitConfirmed]);

  const replanDay = useCallback(async (context?: { reason?: string; minutesRemaining?: number; currentEnergy?: Profile["energyLevel"]; preserveTaskIds?: string[] }) => {
    const profile = dataRef.current.profile;
    if (!profile) return false;
    return runGeneration(profile, "replan", context);
  }, [runGeneration]);

  const updateOnboardingDraft = useCallback((patch: OnboardingDraft) => commit((current) => ({ ...current, onboardingDraft: { ...current.onboardingDraft, ...patch } })), [commit]);

  const handleTaskToggle = useCallback(async (taskId: string): Promise<boolean> => {
    const task = dataRef.current.activePlan?.tasks.find((item) => item.id === taskId);
    if (!task) return false;
    const completed = !task.completed;
    const result = await commitConfirmed(
      (current) => toggleTaskCompletion(current, taskId),
      completed ? "Tarefa concluída. XP garantido." : "Tarefa reaberta e XP ajustado.",
    );
    if (!result) return false;
    if (result.data.preferences.haptics) {
      void Haptics.impactAsync(
        completed ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);
    }
    return true;
  }, [commitConfirmed]);

  const handleMissionToggle = useCallback(async (): Promise<boolean> => {
    if (!dataRef.current.activePlan) return false;
    const completed = !dataRef.current.activePlan.mainMission.completed;
    const result = await commitConfirmed(
      toggleMainMission,
      completed ? "Missão principal concluída. +75 XP." : "Missão principal reaberta.",
    );
    if (!result) return false;
    if (result.data.preferences.haptics) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    return true;
  }, [commitConfirmed]);

  const updateProfile = useCallback(async (patch: Partial<Profile>): Promise<boolean> => {
    const currentProfile = dataRef.current.profile;
    if (!currentProfile) return false;
    const parsed = profileSchema.safeParse({ ...currentProfile, ...patch, updatedAt: new Date().toISOString() });
    if (!parsed.success) return false;
    return Boolean(await commitConfirmed(
      (current) => ({ ...current, profile: parsed.data }),
      "Perfil atualizado.",
    ));
  }, [commitConfirmed]);

  const updatePreferences = useCallback(async (patch: Omit<Partial<Preferences>, "widget" | "dashboard" | "mascot"> & { widget?: Partial<Preferences["widget"]>; dashboard?: Partial<Preferences["dashboard"]>; mascot?: Partial<Preferences["mascot"]> }): Promise<WidgetSyncResult | null> => {
    const result = await commitConfirmed((current) => {
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
    return result?.widget ?? null;
  }, [commitConfirmed]);

  const finishFocusSession = useCallback(async (session: FocusSession, markTaskComplete: boolean): Promise<boolean> => {
    const result = await commitConfirmed((current) => {
      if (current.progress.focusSessions.some((item) => item.id === session.id)) return current;
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
    }, session.status === "cancelled" ? "Sessão cancelada registrada." : `Sessão salva. +${session.xp} XP de foco.`);
    return Boolean(result);
  }, [commitConfirmed]);

  const createThread = useCallback((kind: ChatKind): string => {
    const id = createId(`${kind}-chat`);
    const now = new Date().toISOString();
    const greeting = kind === "professor"
      ? "Professor Atlas aqui. O que você quer dominar — uma habilidade específica ou uma combinação de áreas?"
      : "Nexus Brain pronto. Pode falar como seu dia realmente está; quando você enviar, vou usar seu contexto sem fingir que tudo é simples.";
    const thread: ChatThread = { id, kind, title: kind === "professor" ? "Nova aula" : "Nova conversa", summary: "", createdAt: now, updatedAt: now, archived: false, messages: [{ id: createId("message"), role: "assistant", content: greeting, createdAt: now }] };
    commit((current) => ({ ...current, brain: { ...current.brain, threads: [thread, ...current.brain.threads], ...(kind === "brain" ? { activeBrainThreadId: id } : { activeProfessorThreadId: id }) } }));
    return id;
  }, [commit]);

  const selectThread = useCallback((kind: ChatKind, threadId: string) => commit((current) => ({ ...current, brain: { ...current.brain, ...(kind === "brain" ? { activeBrainThreadId: threadId } : { activeProfessorThreadId: threadId }) } })), [commit]);
  const renameThread = useCallback(async (threadId: string, title: string): Promise<boolean> => Boolean(await commitConfirmed((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.map((thread) => thread.id === threadId ? { ...thread, title: sanitizeText(title, 100) || thread.title, updatedAt: new Date().toISOString() } : thread) } }), "Conversa renomeada.")), [commitConfirmed]);
  const archiveThread = useCallback(async (threadId: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({
      ...current,
      brain: {
        ...current.brain,
        threads: current.brain.threads.map((thread) => thread.id === threadId
          ? { ...thread, archived: !thread.archived, updatedAt: new Date().toISOString() }
          : thread),
      },
    }),
  )), [commitConfirmed]);
  const deleteThread = useCallback(async (threadId: string): Promise<boolean> => Boolean(await commitConfirmed((current) => ({ ...current, brain: { ...current.brain, threads: current.brain.threads.filter((thread) => thread.id !== threadId), memories: current.brain.memories.map((memory) => memory.sourceThreadId === threadId ? { ...memory, sourceThreadId: undefined } : memory), activeBrainThreadId: current.brain.activeBrainThreadId === threadId ? undefined : current.brain.activeBrainThreadId, activeProfessorThreadId: current.brain.activeProfessorThreadId === threadId ? undefined : current.brain.activeProfessorThreadId } }), "Conversa excluída.")), [commitConfirmed]);

  const sendChatMessage = useCallback(async (threadId: string, content: string) => {
    const clean = sanitizeText(content, 4000);
    const thread = dataRef.current.brain.threads.find((item) => item.id === threadId);
    if (!clean || !thread || assistantBusy) return;
    const previousMessage = thread.messages.at(-1);
    const retryingPersistedMessage = previousMessage?.role === "user" && previousMessage.content === clean;
    const userMessage = retryingPersistedMessage
      ? { ...previousMessage, failed: false }
      : { id: createId("message"), role: "user" as const, content: clean, createdAt: new Date().toISOString() };
    const conversationMessages = thread.messages.filter(
      (message) => message.id !== userMessage.id,
    );
    const streamingMessageId = createId("stream");
    let streamedContent = "";
    let streamInserted = false;
    let lastPaintAt = 0;

    const userSaved = await commitConfirmed((current) => ({
      ...current,
      brain: {
        ...current.brain,
        threads: current.brain.threads.map((item) => item.id === threadId ? {
          ...item,
          title: item.messages.length <= 1 ? threadTitle(clean) : item.title,
          messages: retryingPersistedMessage
            ? item.messages.map((message) => message.id === userMessage.id ? userMessage : message)
            : [...item.messages, userMessage].slice(-1000),
          updatedAt: userMessage.createdAt,
        } : item),
      },
    }));
    if (!userSaved) throw new Error("A mensagem não pôde ser salva antes do envio.");

    const paintStream = (force = false) => {
      const now = Date.now();
      if (!force && now - lastPaintAt < 55) return;
      lastPaintAt = now;
      const contentValue = sanitizeText(streamedContent, 6000);
      if (!contentValue) return;
      const current = dataRef.current;
      const next: AppData = {
        ...current,
        brain: {
          ...current.brain,
          threads: current.brain.threads.map((item) => {
            if (item.id !== threadId) return item;
            const liveMessage = { id: streamingMessageId, role: "assistant" as const, content: contentValue, createdAt: new Date().toISOString() };
            return {
              ...item,
              messages: streamInserted
                ? item.messages.map((message) => message.id === streamingMessageId ? liveMessage : message)
                : [...item.messages, liveMessage].slice(-1000),
              updatedAt: liveMessage.createdAt,
            };
          }),
        },
      };
      streamInserted = true;
      dataRef.current = next;
      setData(next);
    };

    const controller = beginAssistantFlight();
    setLastAssistantMeta(null);
    setAssistantBusy(true);
    try {
      const latestThread = dataRef.current.brain.threads.find((item) => item.id === threadId);
      const response = await askNexus(
        { data: dataRef.current, mode: thread.kind, message: clean, context: { conversationSummary: latestThread?.summary ?? "" } },
        {
          signal: controller.signal,
          messages: conversationMessages,
          onStage: setAssistantStage,
          onDelta: (delta) => {
            streamedContent += delta;
            paintStream();
          },
        },
      );
      paintStream(true);
      setLastAssistantMeta(response.meta ?? null);
      const responseRoadmap = response.roadmap
        ? (() => {
            const intent = classifyRoadmapIntent(`${response.roadmap!.topic} ${clean}`, response.roadmap!.intake);
            const candidate: LearningRoadmap = { ...response.roadmap!, intent };
            return validateRoadmapSemantics(candidate, intent).valid ? candidate : undefined;
          })()
        : undefined;
      if (response.roadmap && !responseRoadmap) showToast("O roadmap sugerido não foi oferecido porque introduziu conteúdo fora da intenção pedida.");
      const now = new Date().toISOString();
      const responseSaved = await commitConfirmed((current) => {
        const actionRecords: AssistantAction[] = (response.actions ?? []).map((action) => ({
          ...action,
          id: createId("action"),
          status: "proposed",
        }));
        const roadmapAlreadyExists = responseRoadmap
          ? current.learning.roadmaps.some((roadmap) =>
              roadmap.id === responseRoadmap.id ||
              roadmap.topic.toLocaleLowerCase("pt-BR") === responseRoadmap.topic.toLocaleLowerCase("pt-BR")
            )
          : false;
        if (responseRoadmap && !roadmapAlreadyExists) {
          const existingProposalIndex = actionRecords.findIndex((action) => action.type === "create_roadmap");
          const proposal = existingProposalIndex >= 0
            ? actionRecords[existingProposalIndex]
            : undefined;
          if (proposal?.type === "create_roadmap") {
            actionRecords[existingProposalIndex] = {
              ...proposal,
              payload: { ...proposal.payload, roadmap: responseRoadmap },
            };
          } else {
            actionRecords.push({
              id: createId("action"),
              type: "create_roadmap",
              title: sanitizeText(`Criar roadmap: ${responseRoadmap.topic}`, 160),
              description: "Adicionar esta trilha validada somente após sua confirmação.",
              payload: { roadmap: responseRoadmap },
              status: "proposed",
            });
          }
        }
        const memoryKeys = new Set(current.brain.memories.map((memory) =>
          `${memory.kind}:${memory.content.toLocaleLowerCase("pt-BR")}`
        ));
        for (const memory of response.memories ?? []) {
          const key = `${memory.kind}:${memory.content.toLocaleLowerCase("pt-BR")}`;
          if (memoryKeys.has(key)) continue;
          memoryKeys.add(key);
          actionRecords.push({
            id: createId("action"),
            type: "save_memory",
            title: "Salvar como memória",
            description: memory.content,
            payload: {
              kind: memory.kind,
              content: memory.content,
              confidence: memory.confidence,
            },
            status: "proposed",
          });
        }
        const visibleActions = actionRecords.slice(0, 8);
        const assistantMessage = {
          id: streamingMessageId,
          role: "assistant" as const,
          content: sanitizeText(response.message, 6000),
          createdAt: now,
          ...(visibleActions.length ? { actions: visibleActions } : {}),
        };
        return {
          ...current,
          brain: {
            ...current.brain,
            threads: current.brain.threads.map((item) => {
              if (item.id !== threadId) return item;
              const withoutTransient = item.messages.filter((message) => message.id !== streamingMessageId);
              return {
                ...item,
                title: response.title ? threadTitle(response.title) : item.title,
                summary: compactThreadSummary(item, response.message),
                messages: [...withoutTransient, assistantMessage].slice(-1000),
                updatedAt: now,
              };
            }),
          },
          learning: {
            ...current.learning,
            professorEnabled: current.learning.professorEnabled || thread.kind === "professor",
          },
        };
      }, response.warning);
      if (!responseSaved) throw new Error("A resposta não pôde ser salva.");
    } catch (error) {
      const aborted = controller.signal.aborted;
      const markMessageForRetry = (current: AppData): AppData => ({
        ...current,
        brain: {
          ...current.brain,
          threads: current.brain.threads.map((item) => item.id === threadId
            ? {
                ...item,
                messages: item.messages
                  .filter((message) => message.id !== streamingMessageId)
                  .map((message) => message.id === userMessage.id ? { ...message, failed: true } : message),
              }
            : item),
        },
      });
      const cleanupSaved = await commitConfirmed(markMessageForRetry);
      if (!cleanupSaved) {
        // O trecho de streaming nunca foi uma resposta confirmada. Mesmo se o
        // armazenamento estiver sendo substituído ou falhar, ele não pode
        // continuar na interface com aparência de mensagem concluída.
        const safeState = appDataSchema.safeParse(markMessageForRetry(dataRef.current));
        if (safeState.success) {
          dataRef.current = safeState.data;
          setData(safeState.data);
        }
      }
      if (!aborted) {
        showToast("Não consegui concluir esta resposta. Sua mensagem continua salva para tentar novamente.");
      }
      throw error;
    } finally {
      finishAssistantFlight(controller);
      setAssistantBusy(false);
      setAssistantStage("idle");
    }
  }, [assistantBusy, beginAssistantFlight, commitConfirmed, finishAssistantFlight, showToast]);

  const deleteMemory = useCallback(async (memoryId: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({
      ...current,
      brain: {
        ...current.brain,
        memories: current.brain.memories.filter((memory) => memory.id !== memoryId),
      },
    }),
    "Memória removida.",
  )), [commitConfirmed]);
  const toggleMemoryPinned = useCallback(async (memoryId: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({
      ...current,
      brain: {
        ...current.brain,
        memories: current.brain.memories.map((memory) => memory.id === memoryId
          ? { ...memory, pinned: !memory.pinned, updatedAt: new Date().toISOString() }
          : memory),
      },
    }),
  )), [commitConfirmed]);

  const createRoadmap = useCallback(async (topic: string, intake?: ProfessorIntake): Promise<boolean> => {
    const clean = sanitizeText(topic, 160);
    if (!clean || !dataRef.current.profile || assistantBusy) return false;
    const duplicate = dataRef.current.learning.roadmaps.find((roadmap) => roadmap.topic.toLocaleLowerCase("pt-BR") === clean.toLocaleLowerCase("pt-BR"));
    if (duplicate) {
      return Boolean(await commitConfirmed(
        (current) => ({ ...current, learning: activateRoadmap(current.learning, duplicate.id) }),
        "Esse roadmap já existe. Mantivemos o progresso e o tornamos principal.",
      ));
    }
    setLastAssistantMeta(null);
    setAssistantBusy(true);
    const controller = beginAssistantFlight();
    try {
      const response = await askNexus({
        data: dataRef.current,
        mode: "roadmap",
        message: intake
          ? `Crie meu roadmap de ${clean} usando integralmente o diagnóstico específico enviado.`
          : clean,
        ...(intake ? { context: { professorIntake: intake } } : {}),
      }, { signal: controller.signal, onStage: setAssistantStage });
      setLastAssistantMeta(response.meta ?? null);
      if (response.meta?.source !== "remote" || !response.roadmap) throw new Error("A IA não devolveu um roadmap remoto válido.");
      const generated = response.roadmap;
      const intent = classifyRoadmapIntent(clean, intake);
      const roadmap: LearningRoadmap = intake ? {
        ...generated,
        topic: clean,
        intake,
        intent,
        currentLevel: intake.knowledgeLevel === "zero" || intake.knowledgeLevel === "basico" ? "iniciante" : intake.knowledgeLevel,
        weeklyMinutes: intake.weeklyMinutes,
      } : { ...generated, topic: clean, intent };
      const semantic = validateRoadmapSemantics(roadmap, intent);
      if (!semantic.valid) throw new Error(semantic.issues[0] ?? "O roadmap não passou pela validação semântica.");
      const saved = await commitConfirmed((current) => ({
        ...current,
        learning: {
          ...current.learning,
          professorEnabled: true,
          roadmaps: [...current.learning.roadmaps, roadmap],
          pendingTopics: current.learning.pendingTopics.filter((item) => item.toLocaleLowerCase("pt-BR") !== clean.toLocaleLowerCase("pt-BR")),
          activeRoadmapId: roadmap.id,
        },
      }), "Roadmap criado pelo Professor Atlas.");
      return Boolean(saved);
    } catch {
      showToast("A IA não conseguiu criar um roadmap confiável. Suas respostas foram preservadas para tentar novamente.");
      return false;
    } finally { finishAssistantFlight(controller); setAssistantBusy(false); setAssistantStage("idle"); }
  }, [assistantBusy, beginAssistantFlight, commitConfirmed, finishAssistantFlight, showToast]);

  const renameRoadmap = useCallback(async (roadmapId: string, title: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({ ...current, learning: renameLearningRoadmap(current.learning, roadmapId, title) }),
    "Roadmap renomeado.",
  )), [commitConfirmed]);

  const archiveRoadmap = useCallback(async (roadmapId: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({ ...current, learning: archiveLearningRoadmap(current.learning, roadmapId) }),
    "Roadmap arquivado. Seu histórico foi preservado.",
  )), [commitConfirmed]);

  const deleteRoadmap = useCallback(async (roadmapId: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({ ...current, learning: removeRoadmap(current.learning, roadmapId) }),
    "Roadmap excluído.",
  )), [commitConfirmed]);

  const regenerateRoadmap = useCallback(async (roadmapId: string): Promise<boolean> => {
    const current = dataRef.current;
    const existing = current.learning.roadmaps.find((roadmap) => roadmap.id === roadmapId);
    if (!existing || !current.profile || assistantBusy) return false;
    setLastAssistantMeta(null);
    setAssistantBusy(true);
    const controller = beginAssistantFlight();
    try {
      const response = await askNexus({
        data: current,
        mode: "roadmap",
        message: `Regenere o roadmap “${existing.topic}”. Preserve o nível e a intenção; substitua a trilha por uma versão mais coerente e verificável.`,
        ...(existing.intake ? { context: { professorIntake: existing.intake } } : {}),
      }, { signal: controller.signal, onStage: setAssistantStage });
      setLastAssistantMeta(response.meta ?? null);
      if (response.meta?.source !== "remote" || !response.roadmap) throw new Error("A IA não devolveu uma regeneração remota válida.");
      const intent = existing.intent ?? classifyRoadmapIntent(existing.topic, existing.intake);
      const generated: LearningRoadmap = {
        ...response.roadmap,
        topic: existing.topic,
        intent,
        ...(existing.intake ? { intake: existing.intake, weeklyMinutes: existing.intake.weeklyMinutes } : {}),
      };
      const semantic = validateRoadmapSemantics(generated, intent);
      if (!semantic.valid) throw new Error(semantic.issues[0] ?? "A nova trilha falhou na validação semântica.");
      return Boolean(await commitConfirmed(
        (latest) => ({ ...latest, learning: replaceRoadmap(latest.learning, roadmapId, generated) }),
        "Roadmap regenerado. A trilha anterior foi substituída com confirmação.",
      ));
    } catch {
      showToast("Não foi possível regenerar agora. O roadmap atual continua intacto.");
      return false;
    } finally {
      finishAssistantFlight(controller);
      setAssistantBusy(false);
      setAssistantStage("idle");
    }
  }, [assistantBusy, beginAssistantFlight, commitConfirmed, finishAssistantFlight, showToast]);

  const submitRoadmapEvidence = useCallback(async (
    roadmapId: string,
    lessonId: string,
    submission: string,
  ): Promise<EvidenceSubmissionResult> => {
    const clean = sanitizeText(submission, 4000);
    const snapshot = dataRef.current;
    const roadmap = snapshot.learning.roadmaps.find((item) => item.id === roadmapId);
    const phase = roadmap?.phases.find((item) =>
      item.lessons.some((lesson) => lesson.id === lessonId)
    );
    const lesson = phase?.lessons.find((item) => item.id === lessonId);
    if (!roadmap || !phase || !lesson || clean.length < 2 || assistantBusy) {
      if (assistantBusy) showToast("Aguarde a resposta atual antes de enviar outra entrega.");
      return "not_saved";
    }
    if (roadmap.status === "archived" || lesson.evidence?.status === "accepted") {
      showToast(lesson.evidence?.status === "accepted"
        ? "Esta entrega já foi validada."
        : "Reative o roadmap antes de enviar uma entrega.");
      return "not_saved";
    }

    const saved = await commitConfirmed((current) => ({
      ...current,
      learning: {
        ...current.learning,
        roadmaps: current.learning.roadmaps.map((item) =>
          item.id === roadmapId
            ? submitLessonEvidence(item, lessonId, clean)
            : item
        ),
      },
    }), "Entrega salva. Atlas está verificando os critérios.");
    if (!saved) return "not_saved";

    const submittedRoadmap = dataRef.current.learning.roadmaps.find(
      (item) => item.id === roadmapId,
    ) ?? roadmap;
    const submittedPhase = submittedRoadmap.phases.find((item) =>
      item.lessons.some((candidate) => candidate.id === lessonId)
    ) ?? phase;
    const submittedLesson = submittedPhase.lessons.find(
      (item) => item.id === lessonId,
    ) ?? lesson;
    const guidance = getLessonGuidance(
      submittedRoadmap,
      submittedPhase,
      submittedLesson,
    );
    const controller = beginAssistantFlight();
    setLastAssistantMeta(null);
    setAssistantBusy(true);
    try {
      const response = await askNexus({
        data: dataRef.current,
        mode: "evidence_review",
        message: "Avalie a entrega desta lição somente pelos critérios fornecidos.",
        context: {
          roadmapEvidenceReview: {
            roadmap: {
              topic: submittedRoadmap.topic,
              outcome: submittedRoadmap.outcome,
              currentLevel: submittedRoadmap.currentLevel,
              intent: submittedRoadmap.intent,
            },
            phase: {
              title: submittedPhase.title,
              objective: submittedPhase.objective,
            },
            lesson: {
              title: submittedLesson.title,
              objective: guidance.objective,
              steps: guidance.steps,
              deliverable: guidance.deliverable,
              successCriteria: guidance.successCriteria,
              estimatedMinutes: submittedLesson.estimatedMinutes,
            },
            submission: clean,
            priorFeedback: lesson.evidence?.feedback,
            priorAdjustment: lesson.evidence?.nextAdjustment,
          },
        },
      }, { signal: controller.signal, onStage: setAssistantStage });
      setLastAssistantMeta(response.meta ?? null);
      if (response.meta?.source !== "remote" || !response.lessonReview) {
        throw new Error("A correção remota não devolveu um resultado válido.");
      }
      const applied = await commitConfirmed(
        (current) => applyLessonEvidenceReview(
          current,
          roadmapId,
          lessonId,
          response.lessonReview!,
        ),
        response.lessonReview.accepted
          ? "Entrega validada pelo Atlas. +20 XP"
          : "Atlas registrou o ajuste para a próxima tentativa.",
      );
      return applied ? "reviewed" : "saved_pending";
    } catch {
      if (!controller.signal.aborted) {
        showToast("A entrega ficou salva, mas Atlas não conseguiu corrigi-la agora. Tente novamente.");
      }
      return "saved_pending";
    } finally {
      finishAssistantFlight(controller);
      setAssistantBusy(false);
      setAssistantStage("idle");
    }
  }, [assistantBusy, beginAssistantFlight, commitConfirmed, finishAssistantFlight, showToast]);

  const setActiveRoadmap = useCallback(async (roadmapId: string): Promise<boolean> => Boolean(await commitConfirmed(
    (current) => ({ ...current, learning: activateRoadmap(current.learning, roadmapId) }),
    "Roadmap principal atualizado.",
  )), [commitConfirmed]);

  const quickCapture = useCallback(async (text: string): Promise<CaptureResult | null> => {
    if (assistantBusy) return null;
    setLastAssistantMeta(null);
    setAssistantBusy(true);
    const controller = beginAssistantFlight();
    try {
      const response = await askNexus(
        { data: dataRef.current, mode: "capture", message: text },
        { signal: controller.signal, onStage: setAssistantStage },
      );
      setLastAssistantMeta(response.meta ?? null);
      return response.capture ?? null;
    } catch {
      if (!controller.signal.aborted) {
        showToast("Não consegui organizar esta captura agora. Seu texto continua no formulário.");
      }
      return null;
    } finally { finishAssistantFlight(controller); setAssistantBusy(false); setAssistantStage("idle"); }
  }, [assistantBusy, beginAssistantFlight, finishAssistantFlight, showToast]);

  const saveCapture = useCallback(async (capture: CaptureResult): Promise<boolean> => {
    const today = localDateKey(new Date(), dataRef.current.profile?.timezone);
    const title = sanitizeText(capture.title, 120);
    if (title.length < 2) {
      showToast("Dê um título válido à captura antes de salvar.");
      return false;
    }
    if (capture.scheduledDate && !isValidDateKey(capture.scheduledDate)) {
      showToast("Use uma data válida no formato AAAA-MM-DD.");
      return false;
    }
    if (capture.scheduledDate && capture.scheduledDate < today) {
      showToast("A data da captura já passou. Escolha hoje ou uma data futura.");
      return false;
    }
    const description = sanitizeText(capture.description, 300);
    const normalizedCapture = {
      ...capture,
      title,
      ...(description ? { description } : {}),
      context: sanitizeText(capture.context ?? description, 300)
        || "Tarefa criada a partir de uma captura revisada pelo usuário.",
      firstStep: sanitizeText(capture.firstStep, 240)
        || `Abra o recurso necessário e inicie “${title}”.`,
      expectedResult: sanitizeText(capture.expectedResult ?? description, 300)
        || `Uma entrega observável ligada a “${title}”.`,
      doneWhen: sanitizeText(capture.doneWhen, 300)
        || "O resultado esperado foi conferido e registrado.",
      estimatedMinutes: Math.max(5, Math.min(240, Math.round(capture.estimatedMinutes))),
    };
    if (capture.scheduledDate && capture.scheduledDate > today) {
      return Boolean(await commitConfirmed(
        (current) => ({
          ...current,
          weeklyPlan: [...current.weeklyPlan, {
            id: createId("scheduled-capture"),
            date: capture.scheduledDate!,
            title: normalizedCapture.title,
            ...(normalizedCapture.description ? { description: normalizedCapture.description } : {}),
            context: normalizedCapture.context,
            firstStep: normalizedCapture.firstStep,
            expectedResult: normalizedCapture.expectedResult,
            doneWhen: normalizedCapture.doneWhen,
            category: normalizedCapture.category,
            estimatedMinutes: normalizedCapture.estimatedMinutes,
            priority: normalizedCapture.priority,
            recurring: normalizedCapture.recurring,
            completed: false,
          }].slice(-1000),
        }),
        "Captura agendada para o dia escolhido.",
      ));
    }
    if (!dataRef.current.activePlan || dataRef.current.activePlan.tasks.length >= 5) {
      showToast("O plano de hoje já tem cinco tarefas. Remova uma ou agende esta captura para outra data.");
      return false;
    }
    return Boolean(await commitConfirmed(
      (current) => addTask(current, normalizedCapture),
      "Captura adicionada ao plano de hoje.",
    ));
  }, [commitConfirmed, showToast]);

  const rescheduleCapture = useCallback(async (captureId: string, date: string): Promise<boolean> => {
    const today = localDateKey(new Date(), dataRef.current.profile?.timezone);
    if (!isValidDateKey(date) || date <= today) {
      showToast("Escolha uma data futura válida no formato AAAA-MM-DD.");
      return false;
    }
    if (!dataRef.current.weeklyPlan.some((item) => item.id === captureId && !item.completed)) return false;
    return Boolean(await commitConfirmed(
      (current) => ({
        ...current,
        weeklyPlan: current.weeklyPlan.map((item) =>
          item.id === captureId ? { ...item, date } : item,
        ),
      }),
      "Data da captura atualizada.",
    ));
  }, [commitConfirmed, showToast]);

  const deleteScheduledCapture = useCallback(async (captureId: string): Promise<boolean> => {
    if (!dataRef.current.weeklyPlan.some((item) => item.id === captureId)) return false;
    return Boolean(await commitConfirmed(
      (current) => ({
        ...current,
        weeklyPlan: current.weeklyPlan.filter((item) => item.id !== captureId),
      }),
      "Captura agendada cancelada.",
    ));
  }, [commitConfirmed]);

  const generateWeeklyReview = useCallback(async (): Promise<WeeklyReview | null> => {
    if (assistantBusy) return null;
    setWeeklyReviewError(null);
    setLastAssistantMeta(null);
    setAssistantBusy(true);
    const controller = beginAssistantFlight();
    try {
      const snapshot = dataRef.current;
      const evidence = buildWeeklyEvidence(snapshot);
      const windowDays = snapshot.history.filter((day) => day.date >= evidence.weekStart && day.date <= evidence.weekEnd);
      const response = await askNexus(
        {
          data: snapshot,
          mode: "weekly_review",
          message: "Interprete somente as evidências desta janela. Separe fatos de hipóteses e não atribua traços psicológicos.",
          context: { weeklyEvidence: evidence, observableFacts: weekFactsForAi(windowDays) },
        },
        { signal: controller.signal, onStage: setAssistantStage },
      );
      setLastAssistantMeta(response.meta ?? null);
      if (response.meta?.source !== "remote" || !response.weeklyReview) throw new Error("A IA não devolveu uma revisão remota válida.");
      const review = sanitizeAiWeeklyReview(response.weeklyReview, snapshot);
      const saved = await commitConfirmed(
        (current) => ({ ...current, weeklyReviews: [...current.weeklyReviews.filter((item) => item.weekStart !== review.weekStart), review].slice(-520) }),
        "Revisão semanal pronta.",
      );
      if (!saved) {
        setWeeklyReviewError("A revisão foi gerada, mas não pôde ser persistida. Tente novamente antes de fechar o app.");
        return null;
      }
      return review;
    } catch {
      const message = "A IA está temporariamente indisponível. Seus dados continuam salvos; tente a revisão novamente.";
      setWeeklyReviewError(message);
      showToast(message);
      return null;
    } finally { finishAssistantFlight(controller); setAssistantBusy(false); setAssistantStage("idle"); }
  }, [assistantBusy, beginAssistantFlight, commitConfirmed, finishAssistantFlight, showToast]);

  const applyAssistantAction = useCallback(async (threadId: string, actionId: string, accept: boolean) => {
    const selected = dataRef.current.brain.threads
      .find((thread) => thread.id === threadId)
      ?.messages.flatMap((message) => message.actions ?? [])
      .find((action) => action.id === actionId && action.status === "proposed");
    if (!selected) return;

    if (!accept || selected.type === "start_operation") {
      await commitConfirmed((current) => setAssistantActionStatus(
        current,
        threadId,
        actionId,
        "rejected",
      ));
    }
    if (!accept) return;
    if (selected.type === "start_operation") {
      showToast("Esta ação pertence a um módulo legado e não está disponível no núcleo atual.");
      return;
    }

    if (selected.type === "replan") {
      const replanned = await replanDay({ reason: selected.description });
      if (!replanned) {
        showToast("O replanejamento não foi confirmado; a proposta continua pendente.");
        return;
      }
      const accepted = await commitConfirmed((current) => setAssistantActionStatus(current, threadId, actionId, "accepted"));
      if (!accepted) showToast("O novo plano foi salvo, mas a proposta continua pendente para conferência.");
      return;
    }
    if (selected.type === "create_task") {
      const beforePlan = dataRef.current.activePlan;
      if (!beforePlan) {
        showToast("Prepare o plano de hoje antes de aprovar esta tarefa.");
        return;
      }
      if (beforePlan.tasks.length >= 5) {
        showToast("O plano de hoje já tem cinco tarefas. Remova ou adie uma antes de aprovar.");
        return;
      }
      const payload = selected.payload;
      const category = typeof payload.category === "string" && ["desenvolvimento", "estudos", "dinheiro", "saude", "organizacao", "pessoal"].includes(payload.category) ? payload.category as Category : "pessoal";
      const priority = payload.priority === "alta" || payload.priority === "baixa" ? payload.priority : "media";
      const title = sanitizeText(
        typeof payload.title === "string" ? payload.title : selected.title,
        120,
      );
      if (title.length < 2) {
        showToast("A tarefa proposta não tem um título válido e não foi aplicada.");
        return;
      }
      const beforeCount = beforePlan.tasks.length;
      const applied = await commitConfirmed((current) => {
        const withTask = addTask(current, {
          title,
          category,
          priority,
          estimatedMinutes: typeof payload.estimatedMinutes === "number" && Number.isFinite(payload.estimatedMinutes)
            ? payload.estimatedMinutes
            : 25,
          recurring: false,
        });
        return withTask === current
          ? current
          : setAssistantActionStatus(withTask, threadId, actionId, "accepted");
      });
      if (!applied || (applied.data.activePlan?.tasks.length ?? 0) <= beforeCount) {
        showToast("A tarefa não foi adicionada; a proposta continua pendente para nova tentativa.");
        return;
      }
      showToast("Tarefa aprovada e adicionada.");
      return;
    }
    if (selected.type === "create_roadmap") {
      if (selected.payload.roadmap !== undefined) {
        const parsed = roadmapSchema.safeParse(selected.payload.roadmap);
        if (!parsed.success) {
          showToast("O roadmap proposto não passou pela validação e continua pendente.");
          return;
        }
        const intent = parsed.data.intent ?? classifyRoadmapIntent(parsed.data.topic, parsed.data.intake);
        const roadmap: LearningRoadmap = { ...parsed.data, intent };
        const semantic = validateRoadmapSemantics(roadmap, intent);
        if (!semantic.valid) {
          showToast("O roadmap proposto diverge da intenção pedida e não foi aplicado.");
          return;
        }
        const saved = await commitConfirmed((current) => {
          const existing = current.learning.roadmaps.find((item) =>
            item.id === roadmap.id ||
            item.topic.toLocaleLowerCase("pt-BR") === roadmap.topic.toLocaleLowerCase("pt-BR")
          );
          const withAction = setAssistantActionStatus(current, threadId, actionId, "accepted");
          return {
            ...withAction,
            learning: existing
              ? activateRoadmap(withAction.learning, existing.id)
              : {
                  ...withAction.learning,
                  professorEnabled: true,
                  roadmaps: [...withAction.learning.roadmaps, roadmap],
                  pendingTopics: withAction.learning.pendingTopics.filter((item) =>
                    item.toLocaleLowerCase("pt-BR") !== roadmap.topic.toLocaleLowerCase("pt-BR")
                  ),
                  activeRoadmapId: roadmap.id,
                },
          };
        }, "Roadmap adicionado após sua confirmação.");
        if (!saved) showToast("O roadmap continua pendente porque a gravação não foi confirmada.");
        return;
      }
      const created = await createRoadmap(selected.title);
      if (created) {
        await commitConfirmed((current) => setAssistantActionStatus(current, threadId, actionId, "accepted"));
      }
      return;
    }
    if (selected.type === "save_memory") {
      const kinds: readonly MemoryKind[] = ["goal", "preference", "decision", "pattern", "obstacle", "learning", "fact"];
      const kind = typeof selected.payload.kind === "string" && kinds.includes(selected.payload.kind as MemoryKind)
        ? selected.payload.kind as MemoryKind
        : null;
      const content = sanitizeText(
        typeof selected.payload.content === "string" ? selected.payload.content : selected.description,
        500,
      );
      const confidence = typeof selected.payload.confidence === "number" && Number.isFinite(selected.payload.confidence)
        ? Math.max(0, Math.min(1, selected.payload.confidence))
        : 0.5;
      if (!kind || content.length < 2) {
        showToast("A memória proposta não passou pela validação e continua pendente.");
        return;
      }
      const saved = await commitConfirmed((current) => {
        const withAction = setAssistantActionStatus(current, threadId, actionId, "accepted");
        const duplicate = withAction.brain.memories.some((memory) =>
          memory.kind === kind && memory.content.toLocaleLowerCase("pt-BR") === content.toLocaleLowerCase("pt-BR")
        );
        if (duplicate) return withAction;
        const now = new Date().toISOString();
        return {
          ...withAction,
          brain: {
            ...withAction.brain,
            memories: [...withAction.brain.memories, {
              id: createId("memory"),
              kind,
              content,
              sourceThreadId: threadId,
              confidence,
              pinned: false,
              createdAt: now,
              updatedAt: now,
            }].slice(-1000),
          },
        };
      }, "Memória salva após sua confirmação.");
      if (!saved) showToast("A memória continua pendente porque a gravação não foi confirmada.");
      return;
    }
    if (selected.type === "update_goal") {
      const rawPayload = selected.payload as Record<string, unknown>;
      const mainGoal = typeof rawPayload.mainGoal === "string"
        ? sanitizeText(rawPayload.mainGoal, 600)
        : "";
      if (mainGoal.length < 10) {
        showToast("A proposta de meta está inválida e continua pendente para você rejeitar.");
        return;
      }
      const profile = dataRef.current.profile;
      const parsed = profile
        ? profileSchema.safeParse({
            ...profile,
            mainGoal,
            updatedAt: new Date().toISOString(),
          })
        : null;
      if (!parsed?.success) {
        showToast("A meta proposta não passou pela validação e não foi aplicada.");
        return;
      }
      const saved = await commitConfirmed(
        (current) => ({
          ...setAssistantActionStatus(current, threadId, actionId, "accepted"),
          profile: parsed.data,
        }),
        "Meta atualizada após sua confirmação.",
      );
      if (!saved) showToast("A meta continua pendente porque a gravação não foi confirmada.");
      return;
    }
  }, [commitConfirmed, createRoadmap, replanDay, showToast]);

  const resetToday = useCallback(async (): Promise<boolean> => {
    const profile = dataRef.current.profile;
    if (!profile) return false;
    const date = localDateKey(new Date(), profile.timezone);
    return Boolean(await commitConfirmed((current) => {
      const replacement = generateLocalPlan(
        { profile, date, requestId: createId("reset"), clientId: current.installationId },
        "Plano de hoje recriado localmente.",
      );
      return {
        ...current,
        activePlan: mergeSameDayPlanEvidence(current.activePlan, replacement),
        lastGeneratedDate: date,
      };
    }, "Plano de hoje recriado sem apagar o que já foi concluído."));
  }, [commitConfirmed]);

  const resetAll = useCallback(async () => {
    if (!await beginStateReplacement()) return;
    try {
      await clearFocusRuntime();
      await configureDailyReminder(false, dataRef.current.preferences.notificationTime);
      await nexusRepository.clearAll();
      const next = cloneDefaultData();
      dataRef.current = next;
      setData(next);
      setStorageReadOnlyReason(null);
      setHasImportRollback(false);
      setHasMigrationBackup(false);
      setToast(null);
      await updateAndroidWidget(next);
    } finally {
      finishStateReplacement();
    }
  }, [beginStateReplacement, finishStateReplacement]);
  const clearTemporary = useCallback(async () => {
    await clearFocusRuntime();
    await nexusRepository.clearTemporary();
    showToast("Somente os dados temporários foram limpos.");
  }, [showToast]);

  const replaceAppState = useCallback(async (
    candidate: AppData,
    options: { createUndo: boolean; consumeUndo: boolean; message: string },
  ): Promise<boolean> => {
    if (!await beginStateReplacement()) {
      throw new Error("Outra substituição de dados já está em andamento.");
    }
    const previous = dataRef.current;
    try {
      if (options.createUndo) await nexusRepository.saveImportRollback(previous);
      const reconciled = await reconcileDailyReminder(candidate);
      await nexusRepository.save(reconciled);
      await clearFocusRuntime();
      await updateAndroidWidget(reconciled);
      dataRef.current = reconciled;
      setData(reconciled);
      setStorageReadOnlyReason(nexusRepository.readOnlyReason());
      setPlanGenerationError(null);
      setWeeklyReviewError(null);
      setLastAssistantMeta(null);

      if (options.consumeUndo) {
        try {
          await nexusRepository.clearImportRollback();
          setHasImportRollback(false);
        } catch {
          setHasImportRollback(true);
        }
      } else if (options.createUndo) {
        setHasImportRollback(true);
      }
      showToast(options.message);
      return true;
    } catch (error) {
      const restoredPrevious = await reconcileDailyReminder(previous).catch(() => previous);
      await nexusRepository.save(restoredPrevious).catch(() => undefined);
      dataRef.current = restoredPrevious;
      setData(restoredPrevious);
      await updateAndroidWidget(restoredPrevious).catch(() => undefined);
      throw error;
    } finally {
      finishStateReplacement();
    }
  }, [beginStateReplacement, finishStateReplacement, showToast]);

  const inspectBackup = useCallback((json: string) => nexusRepository.inspectImport(json), []);
  const importBackup = useCallback(async (json: string) => {
    const imported = nexusRepository.importJson(json);
    await replaceAppState(imported, {
      createUndo: true,
      consumeUndo: false,
      message: "Backup importado. Você pode desfazer na área Dados.",
    });
  }, [replaceAppState]);
  const restoreImportBackup = useCallback(async (): Promise<boolean> => {
    const restored = await nexusRepository.restoreImportRollback();
    if (!restored) return false;
    return replaceAppState(restored, {
      createUndo: false,
      consumeUndo: true,
      message: "A importação anterior foi desfeita.",
    });
  }, [replaceAppState]);
  const restoreMigrationBackup = useCallback(async (): Promise<boolean> => {
    const restored = await nexusRepository.restorePreMigrationBackup();
    if (!restored) return false;
    return replaceAppState(restored, {
      createUndo: true,
      consumeUndo: false,
      message: "Cópia anterior à migração restaurada. O estado atual pode ser recuperado em Desfazer.",
    });
  }, [replaceAppState]);

  const value = useMemo<NexusContextValue>(() => ({
    data, colors: getColors(data.preferences), visuals: getVisuals(data.preferences), ready, storageReadOnlyReason, planGenerating, planGenerationError, assistantBusy, assistantStage, lastAssistantMeta, weeklyReviewError, loadingStage: LOADING_STAGES[loadingStageIndex] ?? LOADING_STAGES[0], toast,
    updateOnboardingDraft, completeOnboarding, completeDiscovery,
    cancelPlanGeneration, retryPlanGeneration, recoverPlanLocally, cancelAssistant: () => assistantController.current?.abort(), replanDay,
    toggleTask: handleTaskToggle, toggleMission: handleMissionToggle,
    addTask: async (input) => Boolean(await commitConfirmed((current) => addTask(current, input), "Tarefa adicionada.")),
    updateTask: async (taskId, patch) => Boolean(await commitConfirmed((current) => updateTask(current, taskId, patch), "Tarefa atualizada.")),
    deleteTask: async (taskId) => Boolean(await commitConfirmed((current) => deleteTask(current, taskId), "Tarefa removida.")),
    postponeTask: async (taskId) => Boolean(await commitConfirmed((current) => postponeTask(current, taskId), "Tarefa movida para o próximo planejamento.")),
    updateProfile, updatePreferences, finishFocusSession,
    createThread, selectThread, renameThread, archiveThread, deleteThread, sendChatMessage, deleteMemory, toggleMemoryPinned, applyAssistantAction,
    createRoadmap, setActiveRoadmap, renameRoadmap, archiveRoadmap, deleteRoadmap, regenerateRoadmap, submitRoadmapEvidence, quickCapture, saveCapture, rescheduleCapture, deleteScheduledCapture, generateWeeklyReview,
    resetToday, resetAll, clearTemporary, inspectBackup, importBackup, restoreImportBackup, hasImportRollback, restoreMigrationBackup, hasMigrationBackup, exportBackup: () => nexusRepository.exportJson(data),
    dismissToast: () => setToast(null), dismissWarnings: () => commit((current) => ({ ...current, corruptionWarnings: [] })),
  }), [
    applyAssistantAction, archiveRoadmap, archiveThread, assistantBusy, assistantStage, lastAssistantMeta, weeklyReviewError, cancelPlanGeneration, clearTemporary, commit, commitConfirmed, completeDiscovery, completeOnboarding,
    createRoadmap, createThread, data, deleteMemory, deleteRoadmap, deleteScheduledCapture, deleteThread, finishFocusSession, generateWeeklyReview, handleMissionToggle, handleTaskToggle, hasImportRollback, importBackup, inspectBackup,
    hasMigrationBackup, loadingStageIndex, planGenerating, planGenerationError, quickCapture, ready, recoverPlanLocally, renameThread, replanDay, resetAll, resetToday, rescheduleCapture, retryPlanGeneration, saveCapture, selectThread,
    regenerateRoadmap, renameRoadmap, restoreImportBackup, restoreMigrationBackup, sendChatMessage, setActiveRoadmap, storageReadOnlyReason, submitRoadmapEvidence, toast, toggleMemoryPinned, updateOnboardingDraft, updatePreferences, updateProfile,
  ]);

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
}

export function useNexus(): NexusContextValue {
  const context = useContext(NexusContext);
  if (!context) throw new Error("useNexus deve ser usado dentro de NexusProvider");
  return context;
}
