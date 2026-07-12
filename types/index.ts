export const CATEGORIES = [
  "desenvolvimento",
  "estudos",
  "dinheiro",
  "saude",
  "organizacao",
  "pessoal",
] as const;

export const EVOLUTION_AREAS = [
  "programacao",
  "inteligencia_artificial",
  "escola",
  "carreira",
  "freelance",
  "dinheiro",
  "empreendedorismo",
  "comunicacao",
  "ingles",
  "criatividade",
  "produtividade",
  "disciplina",
  "organizacao",
  "saude_mental",
  "saude_fisica",
  "futebol",
  "relacionamentos",
  "autoconhecimento",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type EvolutionArea = (typeof EVOLUTION_AREAS)[number];
export type Priority = "alta" | "media" | "baixa";
export type PlanSource = "ai" | "offline";
export type Intensity = "leve" | "equilibrado" | "intenso";
export type AssistantTone = "direto" | "parceiro" | "treinador";
export type FocusPeriod = "manha" | "tarde" | "noite" | "flexivel";
export type SkillLevel = "iniciante" | "intermediario" | "avancado";
export type EnergyLevel = "baixa" | "media" | "alta";
export type ThemeId =
  | "nexus"
  | "amoled"
  | "oneui"
  | "hud"
  | "aurora"
  | "ocean"
  | "ember"
  | "rose"
  | "monochrome"
  | "light"
  | "custom";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type LearningStyle = "visual" | "pratica" | "leitura" | "explicacao" | "mista";
export type AccountabilityStyle = "gentil" | "direta" | "competitiva" | "analitica";
export type ChallengeMode = "desativado" | "sutil" | "equilibrado" | "gamer" | "operacao" | "boss";
export type ProfessorScope = "especifico" | "variedade" | "depois";
export type ProfessorKnowledgeLevel = "zero" | "basico" | "intermediario" | "avancado";
export type ProfessorVariant = "classic" | "emerald" | "gold" | "ice" | "rose";
export type CompanionMood = "happy" | "playful" | "motivational" | "serious" | "strict" | "calm" | "quiet";
export type CompanionPresence = "quiet" | "balanced" | "active";
export type AtlasPersonality = "teacher" | "mentor" | "coach" | "strict" | "friendly";
export type AssistantVerbosity = "compact" | "balanced" | "detailed";
export type MascotId = "nexus" | "atlas" | "nova" | "byte" | "pulse" | "orbit" | "ember";
export type MascotSkin = "classic" | "shadow" | "galaxy" | "emerald" | "gold" | "ice" | "rose" | "professor";

export type EvolutionProfile = {
  primaryAreas: EvolutionArea[];
  secondaryAreas: EvolutionArea[];
  customAreas: string[];
  currentSituation: string;
  desiredIdentity: string;
  biggestObstacles: string[];
  procrastinationTriggers: string[];
  strengths: string[];
  learningStyle: LearningStyle;
  accountabilityStyle: AccountabilityStyle;
  sessionLength: 15 | 25 | 45 | 60 | 90;
  weeklyLearningMinutes: number;
  challengeMode: ChallengeMode;
  wantsBossChallenges: boolean;
  professorScope: ProfessorScope;
  professorTopics: string[];
  professorOutcome: string;
};

export type ProfessorIntake = {
  topic: string;
  knowledgeLevel: ProfessorKnowledgeLevel;
  knownConcepts: string;
  previousAttempts: string;
  desiredOutcome: string;
  proofProject: string;
  motivation: string;
  deadline?: string;
  weeklyMinutes: number;
  sessionMinutes: 15 | 25 | 45 | 60 | 90;
  resources: string[];
  constraints: string[];
  preferredMethods: string[];
  includeInDailyPlan: boolean;
  showLearningInWidget: boolean;
  showProfessorInWidget: boolean;
  createdAt: string;
};

export type Profile = {
  name: string;
  nickname: string;
  timezone: string;
  mainGoal: string;
  goalReason: string;
  deadline?: string;
  availableMinutes: number;
  activeDays: Weekday[];
  schedule: string;
  focusPeriod: FocusPeriod;
  skillLevel: SkillLevel;
  energyLevel: EnergyLevel;
  priorities: Category[];
  maxDailyTasks: number;
  intensity: Intensity;
  assistantTone: AssistantTone;
  evolution?: EvolutionProfile;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingDraft = Partial<Profile>;

export type MainMission = {
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  xp: number;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  category: Category;
  priority: Priority;
  estimatedMinutes: number;
  xp: number;
  recurring: boolean;
  completed: boolean;
  completedAt?: string;
  postponedFrom?: string;
  scheduledDate?: string;
  operationId?: string;
  habitId?: string;
};

export type DailyPlan = {
  date: string;
  mainMission: MainMission;
  tasks: Task[];
  focusMessage: string;
  avoidToday: string[];
  totalEstimatedMinutes: number;
  source: PlanSource;
  warning?: string;
  createdAt: string;
  requestId: string;
};

export type AiDailyPlan = {
  date: string;
  mainMission: Omit<MainMission, "completed" | "completedAt" | "xp">;
  tasks: Array<Omit<Task, "completed" | "completedAt" | "postponedFrom">>;
  focusMessage: string;
  avoidToday: string[];
  totalEstimatedMinutes: number;
};

export type FocusMode = "pomodoro" | "profundo" | "fluxo" | "sprint" | "personalizado";
export type AmbientSound = "nenhum" | "chuva" | "floresta" | "cafeteria" | "ruido_marrom" | "ruido_branco" | "espaco";

export type FocusSession = {
  id: string;
  taskId?: string;
  taskTitle: string;
  plannedMinutes: number;
  elapsedSeconds: number;
  xp: number;
  status: "completed" | "cancelled";
  startedAt: string;
  completedAt: string;
  mode?: FocusMode;
  intention?: string;
  reflection?: string;
  ambientSound?: AmbientSound;
  category?: Category;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
};

export type DayHistory = {
  date: string;
  plan: DailyPlan;
  completedTasks: number;
  totalTasks: number;
  completionPercentage: number;
  xpEarned: number;
  focusMinutes: number;
  countedForStreak: boolean;
};

export type WidgetSize = "1x1" | "2x1" | "2x2" | "3x2" | "4x1" | "4x2" | "4x3" | "4x4" | "5x2";
export type WidgetStyle = "nexus" | "amoled" | "transparent" | "glass" | "pixel" | "minimal" | "gamer" | "neon" | "mascot" | "privacy" | "light";
export type WidgetPreset =
  | "mission" | "balanced" | "tasks" | "focus" | "learning" | "minimal"
  | "companion" | "finance" | "quote" | "xp" | "streak" | "boss"
  | "next_action" | "habits" | "roadmap" | "freelance" | "custom";
export type WidgetContentMode = "mission" | "tasks" | "smart" | "focus" | "learning" | "companion" | "finance" | "quote" | "progress" | "habits" | "boss";
export type WidgetCornerStyle = "square" | "soft" | "round";
export type WidgetBorderStyle = "none" | "subtle" | "accent" | "pixel";
export type WidgetTextAlign = "left" | "center";
export type WidgetTapAction = "today" | "brain" | "focus" | "capture" | "progress" | "finance" | "habits" | "week";

export type WidgetPreferences = {
  preset: WidgetPreset;
  contentMode: WidgetContentMode;
  background: "solid" | "amoled" | "translucent";
  style: WidgetStyle;
  preferredSize: WidgetSize;
  showMascot: boolean;
  mascot: MascotId;
  companionMood: CompanionMood;
  companionSpeech: "contextual" | "motivational" | "fun" | "silent";
  showProfessor: boolean;
  showLearning: boolean;
  showMission: boolean;
  showTasks: boolean;
  showXp: boolean;
  showLevel: boolean;
  showStreak: boolean;
  showFocus: boolean;
  showProgress: boolean;
  showCapture: boolean;
  showFinance: boolean;
  showQuote: boolean;
  showNextAction: boolean;
  showHabits: boolean;
  showBoss: boolean;
  allowPageCycle: boolean;
  compactTasks: boolean;
  taskCount: 1 | 2 | 3 | 4 | 5;
  progressStyle: "bar" | "circle" | "text" | "number";
  privacyMode: boolean;
  fontScale: "pequena" | "normal" | "grande";
  opacity: number;
  cornerStyle: WidgetCornerStyle;
  borderStyle: WidgetBorderStyle;
  glow: 0 | 1 | 2 | 3;
  textAlign: WidgetTextAlign;
  tapAction: WidgetTapAction;
  customLabel?: string;
  accentColor?: string;
};

export type DashboardSection = "mission" | "tasks" | "smart" | "quick" | "progress" | "operation" | "habits" | "message";
export type DashboardPreferences = {
  preset: "original" | "minimal" | "productivity" | "gamer" | "focus_first" | "progress_first" | "compact" | "cinematic" | "custom";
  density: "compacta" | "confortavel" | "ampla";
  glow: "desligado" | "sutil" | "medio" | "intenso";
  backgroundEffect: "nenhum" | "grade" | "estrelas" | "aurora" | "scanlines";
  sections: DashboardSection[];
  hiddenSections: DashboardSection[];
};

export type MascotPreferences = {
  primary: "nexus";
  companion: Exclude<MascotId, "nexus">;
  showCompanion: boolean;
  speechEnabled: boolean;
  companionMood: CompanionMood;
  companionPresence: CompanionPresence;
  atlasPersonality: AtlasPersonality;
  assistantVerbosity: AssistantVerbosity;
  unlocked: MascotId[];
  skin: MascotSkin;
  unlockedSkins: MascotSkin[];
  accessories: string[];
  equippedAccessory?: string;
  professorVariant: ProfessorVariant;
};

export type Preferences = {
  theme: ThemeId;
  customAccent: string;
  haptics: boolean;
  sound: boolean;
  reducedMotion: boolean;
  notificationEnabled: boolean;
  notificationTime: string;
  gamificationMode: ChallengeMode;
  dashboard: DashboardPreferences;
  mascot: MascotPreferences;
  widget: WidgetPreferences;
};

export type ProgressAttributes = {
  foco: number;
  execucao: number;
  consistencia: number;
  disciplina: number;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "boss";
  target: number;
  progress: number;
  xpReward: number;
  completed: boolean;
  expiresAt: string;
};

export type ProgressState = {
  totalXp: number;
  currentStreak: number;
  bestStreak: number;
  focusSessions: FocusSession[];
  achievements: Achievement[];
  attributes: ProgressAttributes;
  challenges: Challenge[];
};

export type ChatRole = "user" | "assistant" | "system";
export type ChatKind = "brain" | "professor";
export type AssistantActionType = "replan" | "create_task" | "create_roadmap" | "update_goal" | "start_operation";

export type AssistantAction = {
  id: string;
  type: AssistantActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: "proposed" | "accepted" | "rejected";
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  actions?: AssistantAction[];
  failed?: boolean;
};

export type ChatThread = {
  id: string;
  kind: ChatKind;
  title: string;
  messages: ChatMessage[];
  summary: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export type MemoryKind = "goal" | "preference" | "decision" | "pattern" | "obstacle" | "learning" | "fact";
export type MemoryItem = {
  id: string;
  kind: MemoryKind;
  content: string;
  sourceThreadId?: string;
  confidence: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrainState = {
  threads: ChatThread[];
  memories: MemoryItem[];
  activeBrainThreadId?: string;
  activeProfessorThreadId?: string;
};

export type RoadmapLesson = {
  id: string;
  title: string;
  description: string;
  objective?: string;
  steps?: string[];
  deliverable?: string;
  successCriteria?: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string;
};

export type RoadmapPhase = {
  id: string;
  title: string;
  objective: string;
  order: number;
  lessons: RoadmapLesson[];
};

export type LearningRoadmap = {
  id: string;
  topic: string;
  outcome: string;
  currentLevel: SkillLevel;
  weeklyMinutes: number;
  intake?: ProfessorIntake;
  phases: RoadmapPhase[];
  status: "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
};

export type LearningState = {
  professorEnabled: boolean;
  roadmaps: LearningRoadmap[];
  pendingTopics: string[];
  activeRoadmapId?: string;
  lastCheckInAt?: string;
};

export type WeeklyReview = {
  id: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  xpEarned: number;
  focusMinutes: number;
  consistencyScore: number;
  highlights: string[];
  patterns: string[];
  keep: string[];
  cut: string[];
  nextWeekFocus: string;
  challenge: string;
  source: "ai" | "local";
  createdAt: string;
};

export type OperationPhase = {
  id: string;
  title: string;
  completed: boolean;
  milestone: string;
};

export type Operation = {
  id: string;
  title: string;
  objective: string;
  deadline: string;
  status: "active" | "paused" | "completed";
  phases: OperationPhase[];
  specialXp: number;
  createdAt: string;
  completedAt?: string;
};

export type Habit = {
  id: string;
  title: string;
  category: Category;
  activeDays: Weekday[];
  targetPerWeek: number;
  reminderTime?: string;
  currentStreak: number;
  bestStreak: number;
  completedDates: string[];
  pausedUntil?: string;
  createdAt: string;
};

export type WeeklyPlanItem = {
  id: string;
  date: string;
  title: string;
  category: Category;
  estimatedMinutes: number;
  priority: Priority;
  completed: boolean;
};

export type FinanceState = {
  monthlyGoal: number;
  monthlyRevenue: number;
  prospectsToday: number;
  followUpsPending: number;
  activeClients: number;
  closedDeals: number;
  updatedAt: string;
};

export type AppData = {
  storageVersion: number;
  installationId: string;
  profile?: Profile;
  onboardingCompleted: boolean;
  discoveryCompleted: boolean;
  onboardingDraft: OnboardingDraft;
  activePlan?: DailyPlan;
  history: DayHistory[];
  recurringTasks: Task[];
  preferences: Preferences;
  progress: ProgressState;
  brain: BrainState;
  learning: LearningState;
  weeklyReviews: WeeklyReview[];
  operations: Operation[];
  habits: Habit[];
  weeklyPlan: WeeklyPlanItem[];
  finance: FinanceState;
  lastGeneratedDate?: string;
  lastAiAttemptDate?: string;
  corruptionWarnings: string[];
};

export type WidgetPayload = {
  date: string;
  mainMission: string;
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  completedCount: number;
  totalCount: number;
  streak: number;
  totalXp: number;
  level: number;
  focusMinutes: number;
  nextAction?: string;
  quote?: string;
  companionLines?: Partial<Record<CompanionMood, string>>;
  finance?: FinanceState;
  habits?: { completed: number; total: number; next?: string };
  boss?: { title: string; progress: number; target: number };
  learning?: {
    topic: string;
    nextLesson: string;
    estimatedMinutes: number;
    progress: number;
  };
  appearance?: {
    contentMode: WidgetContentMode;
    background: WidgetPreferences["background"];
    style: WidgetStyle;
    preferredSize: WidgetSize;
    showMascot: boolean;
    mascot: MascotId;
    companionMood: CompanionMood;
    companionSpeech: WidgetPreferences["companionSpeech"];
    showProfessor: boolean;
    showLearning: boolean;
    professorVariant: ProfessorVariant;
    skin: MascotSkin;
    accessory?: string;
    showMission: boolean;
    showTasks: boolean;
    showXp: boolean;
    showLevel: boolean;
    showStreak: boolean;
    showFocus: boolean;
    showProgress: boolean;
    showCapture: boolean;
    showFinance: boolean;
    showQuote: boolean;
    showNextAction: boolean;
    showHabits: boolean;
    showBoss: boolean;
    allowPageCycle: boolean;
    compactTasks: boolean;
    progressStyle: WidgetPreferences["progressStyle"];
    fontScale: WidgetPreferences["fontScale"];
    opacity: number;
    cornerStyle: WidgetCornerStyle;
    borderStyle: WidgetBorderStyle;
    glow: 0 | 1 | 2 | 3;
    textAlign: WidgetTextAlign;
    tapAction: WidgetTapAction;
    customLabel?: string;
    accentColor: string;
  };
};

export type PlanRequest = {
  profile: Profile;
  date: string;
  requestId: string;
  clientId: string;
  carryOver?: Task[];
  context?: {
    reason?: string;
    minutesRemaining?: number;
    currentEnergy?: EnergyLevel;
    preserveTaskIds?: string[];
    learning?: {
      topic: string;
      nextLesson: string;
      estimatedMinutes: number;
    };
  };
};

export type PlanResponse = {
  plan: DailyPlan;
  warning?: string;
  meta?: {
    model: string;
    reasoningTokens?: number;
    repaired: boolean;
  };
};

export type AssistantStage = "idle" | "connecting" | "generating" | "finalizing" | "local";
export type AssistantSource = "remote" | "local";
export type AssistantMeta = {
  source: AssistantSource;
  model?: string;
  reasoningTokens?: number;
  latencyMs: number;
  attempts: number;
  endpoint?: string;
  errorCode?: string;
  requestId?: string;
};

export type AssistantRequest = {
  mode: "brain" | "professor" | "roadmap" | "capture" | "weekly_review";
  requestId: string;
  clientId: string;
  message: string;
  profile: Profile;
  context: Record<string, unknown>;
};

export type AssistantResponse = {
  message: string;
  title?: string;
  memories?: Array<Pick<MemoryItem, "kind" | "content" | "confidence">>;
  actions?: Array<Omit<AssistantAction, "id" | "status">>;
  roadmap?: LearningRoadmap;
  capture?: Omit<Task, "id" | "completed" | "completedAt"> & { scheduledDate?: string };
  weeklyReview?: WeeklyReview;
  warning?: string;
  meta?: AssistantMeta;
};
