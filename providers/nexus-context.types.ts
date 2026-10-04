import type { BackupImportPreview } from "@/services/storage.service";
import type { WidgetSyncResult } from "@/services/widget.service";
import type { DayReview, Evidence, LockInDraft } from "@/schemas/lock-in.schema";
import type { NexusColors, NexusVisuals } from "@/theme/theme";
import type {
  AppData,
  AssistantMeta,
  AssistantResponse,
  AssistantStage,
  Category,
  ChatKind,
  EvolutionProfile,
  FocusSession,
  OnboardingDraft,
  Preferences,
  Priority,
  ProfessorIntake,
  Profile,
  WeeklyReview,
} from "@/types";

/** Public surface of NexusProvider. Mutations resolve only after persistence is confirmed. */
export type TaskInput = {
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

export type CaptureResult = NonNullable<AssistantResponse["capture"]>;
export type EvidenceSubmissionResult = "not_saved" | "saved_pending" | "reviewed";
export type ConfirmedCommitResult = { data: AppData; widget: WidgetSyncResult };

export type NexusContextValue = {
  data: AppData;
  saveJournalManifest: (id: string, remove: boolean) => Promise<boolean>;
  saveEvidence: (input: Evidence) => Promise<boolean>;
  deleteEvidence: (id: string) => Promise<boolean>;
  saveDayReview: (input: Pick<DayReview, "outcome" | "reason" | "nextAction">, baseRevision: number) => Promise<boolean>;
  prepareTomorrow: () => Promise<boolean>;
  saveLockInDraft: (draft: LockInDraft) => Promise<boolean>;
  confirmLockIn: (draft: LockInDraft, baseRevision: number) => Promise<boolean>;
  colors: NexusColors;
  visuals: NexusVisuals;
  ready: boolean;
  storageReadOnlyReason: string | null;
  planGenerating: boolean;
  planGenerationError: string | null;
  assistantBusy: boolean;
  assistantStage: AssistantStage;
  lastAssistantMeta: AssistantMeta | null;
  roadmapFailure: string;
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
  createThread: (kind: ChatKind, continueLesson?: boolean) => Promise<string | undefined>;
  selectThread: (kind: ChatKind, threadId: string) => void;
  renameThread: (threadId: string, title: string) => Promise<boolean>;
  archiveThread: (threadId: string) => Promise<boolean>;
  deleteThread: (threadId: string) => Promise<boolean>;
  decideChatProposal: (threadId: string, revision: number, approve: boolean) => Promise<boolean>;
  sendChatMessage: (threadId: string, content: string) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<boolean>;
  toggleMemoryPinned: (memoryId: string) => Promise<boolean>;
  applyAssistantAction: (threadId: string, actionId: string, accept: boolean) => Promise<void>;
  saveProfessorDraft: (intake: ProfessorIntake, step: number, weekly: string) => Promise<boolean>;
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
