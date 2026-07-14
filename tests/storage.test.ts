import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  IMPORT_ROLLBACK_KEY,
  LEGACY_MIGRATION_BACKUP_KEYS,
  MIGRATION_BACKUP_KEY,
  STORAGE_KEY,
} from "@/constants/defaults";
import { nexusRepository, recoverAppData } from "@/services/storage.service";
import { makeProfile } from "@/tests/fixtures";

const storageState = vi.hoisted(() => ({
  values: new Map<string, string>(),
  failSetKey: null as string | null,
  blockedSetKey: null as string | null,
  releaseBlockedSet: null as (() => void) | null,
  onBlockedSetStarted: null as (() => void) | null,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storageState.values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      if (storageState.failSetKey === key) throw new Error("storage unavailable");
      if (storageState.blockedSetKey === key) {
        storageState.onBlockedSetStarted?.();
        await new Promise<void>((resolve) => {
          storageState.releaseBlockedSet = resolve;
        });
      }
      storageState.values.set(key, value);
    },
    removeItem: async (key: string) => { storageState.values.delete(key); },
    multiGet: async (keys: string[]) => keys.map((key) => [key, storageState.values.get(key) ?? null]),
    multiRemove: async (keys: string[]) => { keys.forEach((key) => storageState.values.delete(key)); },
  },
}));

describe("storage recovery", () => {
  beforeEach(async () => {
    storageState.values.clear();
    storageState.failSetKey = null;
    storageState.blockedSetKey = null;
    storageState.releaseBlockedSet = null;
    storageState.onBlockedSetStarted = null;
    await nexusRepository.clearAll();
  });

  it("recovers an unreadable root without losing app usability", () => {
    const recovered = recoverAppData("not-an-object");
    expect(recovered.onboardingCompleted).toBe(false);
    expect(recovered.installationId).toMatch(/^install-/);
    expect(recovered.corruptionWarnings.length).toBeGreaterThan(0);
  });

  it("preserves a valid profile while resetting only corrupted sections", () => {
    const recovered = recoverAppData({
      storageVersion: 1,
      installationId: "install-existing-123",
      profile: makeProfile(),
      onboardingCompleted: true,
      onboardingDraft: {},
      history: "broken",
      recurringTasks: [],
      preferences: { theme: "invented" },
      progress: { totalXp: -100 },
      corruptionWarnings: [],
    });
    expect(recovered.profile?.nickname).toBe("Gusta");
    expect(recovered.onboardingCompleted).toBe(true);
    expect(recovered.history).toEqual([]);
    expect(recovered.preferences.theme).toBe("nexus");
    expect(recovered.progress.totalXp).toBe(0);
    expect(recovered.corruptionWarnings.length).toBeGreaterThanOrEqual(2);
  });

  it("migrates v3 preferences to v6 without losing existing choices", () => {
    const base = recoverAppData({
      storageVersion: 3,
      installationId: "install-existing-456",
      profile: makeProfile(),
      onboardingCompleted: true,
      discoveryCompleted: true,
      onboardingDraft: {},
      history: [],
      recurringTasks: [],
      preferences: {
        theme: "amoled",
        customAccent: "#8B5CF6",
        haptics: true,
        sound: false,
        reducedMotion: false,
        notificationEnabled: false,
        notificationTime: "18:00",
        gamificationMode: "equilibrado",
        dashboard: { preset: "original", density: "confortavel", glow: "sutil", backgroundEffect: "grade", sections: ["mission", "tasks"], hiddenSections: [] },
        mascot: { primary: "nexus", companion: "atlas", showCompanion: true, speechEnabled: true, unlocked: ["nexus", "atlas"], skin: "classic", unlockedSkins: ["classic"], accessories: [], professorVariant: "classic" },
        widget: { background: "amoled", style: "amoled", preferredSize: "4x2", showMascot: true, mascot: "nexus", showProfessor: false, showLearning: false, showMission: true, showTasks: true, showXp: false, showLevel: false, taskCount: 2, showStreak: true, progressStyle: "bar", privacyMode: false, fontScale: "normal", opacity: 0.9 },
      },
      progress: { totalXp: 42, currentStreak: 2, bestStreak: 2, focusSessions: [], achievements: [], attributes: { foco: 1, execucao: 1, consistencia: 1, disciplina: 1 }, challenges: [] },
      brain: { threads: [], memories: [] },
      learning: { professorEnabled: false, roadmaps: [], pendingTopics: [] },
      weeklyReviews: [],
      operations: [],
      habits: [],
      weeklyPlan: [],
      corruptionWarnings: [],
    });
    expect(base.storageVersion).toBe(6);
    expect(base.preferences.theme).toBe("amoled");
    expect(base.preferences.widget.taskCount).toBe(2);
    expect(base.preferences.widget.preset).toBe("mission");
    expect(base.preferences.widget.tapAction).toBe("today");
    expect(base.preferences.widget.contentMode).toBe("mission");
    expect(base.preferences.mascot.companionMood).toBe("happy");
    expect(base.finance.monthlyGoal).toBe(3000);
    expect(base.progress.totalXp).toBe(42);
  });

  it("promotes completed legacy challenges into the immutable reward ledger", () => {
    const baseline = recoverAppData({});
    const recovered = recoverAppData({
      ...baseline,
      progress: {
        ...baseline.progress,
        challengeRewardLedger: undefined,
        challenges: [{
          id: "daily-tasks-2026-07-10",
          title: "Ritmo de execução",
          description: "Conclua duas tarefas hoje.",
          type: "daily",
          target: 2,
          progress: 2,
          xpReward: 30,
          completed: true,
          expiresAt: "2026-07-11T02:59:59.999Z",
        }],
      },
    });

    expect(recovered.progress.challengeRewardLedger).toEqual(["daily-tasks-2026-07-10"]);
  });

  it("maps retired themes and preserves every valid item beside corrupted entries", () => {
    const recovered = recoverAppData({
      storageVersion: 5,
      installationId: "install-existing-v5",
      profile: makeProfile(),
      onboardingCompleted: true,
      discoveryCompleted: true,
      onboardingDraft: {},
      history: [],
      recurringTasks: [
        {
          id: "task-kept",
          title: "Publicar a página de teste",
          category: "desenvolvimento",
          priority: "alta",
          estimatedMinutes: 45,
          xp: 50,
          recurring: false,
          completed: false,
        },
        { id: "task-broken", title: "" },
      ],
      preferences: {
        ...JSON.parse(JSON.stringify(recoverAppData({}).preferences)),
        theme: "oneui",
        widget: {
          ...JSON.parse(JSON.stringify(recoverAppData({}).preferences.widget)),
          preferredSize: "4x3",
          style: "gamer",
          tapAction: "finance",
        },
      },
      progress: recoverAppData({}).progress,
      brain: { threads: [], memories: [] },
      learning: { professorEnabled: false, roadmaps: [], pendingTopics: [] },
      weeklyReviews: [],
      operations: [],
      habits: [],
      weeklyPlan: [],
      finance: recoverAppData({}).finance,
      corruptionWarnings: [],
    });

    expect(recovered.preferences.theme).toBe("minimal");
    expect(recovered.preferences.widget).toMatchObject({
      preferredSize: "4x4",
      style: "pixel",
      tapAction: "today",
      preset: "tasks",
      taskCount: 4,
    });
    expect(recovered.recurringTasks.map((task) => task.id)).toEqual(["task-kept"]);
    expect(recovered.corruptionWarnings.join(" ")).toMatch(/convertido|inválido/i);
  });

  it("keeps valid profile fields in the draft when one required field needs repair", () => {
    const recovered = recoverAppData({
      storageVersion: 5,
      installationId: "install-profile-repair",
      profile: { ...makeProfile(), name: "" },
      onboardingCompleted: true,
      onboardingDraft: {},
    });

    expect(recovered.profile).toBeUndefined();
    expect(recovered.onboardingCompleted).toBe(false);
    expect(recovered.onboardingDraft.nickname).toBe("Gusta");
    expect(recovered.onboardingDraft.mainGoal).toContain("primeiro cliente");
  });

  it("keeps the newest entries when an append-only collection exceeds its limit", () => {
    const recurringTasks = Array.from({ length: 105 }, (_, index) => ({
      id: `task-${index}`,
      title: `Tarefa recorrente ${index}`,
      category: "estudos",
      priority: "media",
      estimatedMinutes: 25,
      xp: 30,
      recurring: true,
      completed: false,
    }));

    const recovered = recoverAppData({ storageVersion: 6, recurringTasks });

    expect(recovered.recurringTasks).toHaveLength(100);
    expect(recovered.recurringTasks[0]?.id).toBe("task-5");
    expect(recovered.recurringTasks.at(-1)?.id).toBe("task-104");
  });

  it("refuses to downgrade a backup created by a newer app", () => {
    expect(() =>
      nexusRepository.importJson(JSON.stringify({ storageVersion: 99 })),
    ).toThrow(/atualize o Nexus/i);
  });

  it("rejects semantically empty JSON instead of recovering it into defaults", () => {
    const emptyPayloads = [
      {},
      { data: {} },
      { hello: "world" },
      { profile: null },
      { data: { profile: null } },
      { history: [], weeklyReviews: [] },
      { profile: null, history: [] },
      { data: { profile: null, history: [] } },
    ];

    for (const payload of emptyPayloads) {
      expect(() => nexusRepository.importJson(JSON.stringify(payload))).toThrow(/identidade material/i);
    }
  });

  it("accepts an external backup only when installation and completed profile are material", () => {
    const data = recoverAppData({
      storageVersion: 6,
      installationId: "install-material-backup",
      profile: makeProfile({ nickname: "Material" }),
      onboardingCompleted: true,
    });

    const imported = nexusRepository.importJson(JSON.stringify({ data }));

    expect(imported.installationId).toBe("install-material-backup");
    expect(imported.profile?.nickname).toBe("Material");
  });

  it("strict-validates the internal v6 rollback and never turns corruption into defaults", async () => {
    for (const corrupted of [
      "{}",
      "{broken",
      JSON.stringify({
        storageVersion: 6,
        installationId: "install-incomplete-rollback",
        profile: makeProfile(),
        onboardingCompleted: true,
      }),
    ]) {
      storageState.values.set(IMPORT_ROLLBACK_KEY, corrupted);

      await expect(nexusRepository.restoreImportRollback()).resolves.toBeNull();
      await expect(nexusRepository.hasImportRollback()).resolves.toBe(false);
      expect(storageState.values.get(IMPORT_ROLLBACK_KEY)).toBe(corrupted);
    }
  });

  it("restores a strictly valid internal v6 rollback", async () => {
    const snapshot = recoverAppData({
      storageVersion: 6,
      installationId: "install-valid-rollback",
      profile: makeProfile({ nickname: "Undo" }),
      onboardingCompleted: true,
    });
    await nexusRepository.saveImportRollback(snapshot);

    const restored = await nexusRepository.restoreImportRollback();

    await expect(nexusRepository.hasImportRollback()).resolves.toBe(true);
    expect(restored?.installationId).toBe("install-valid-rollback");
    expect(restored?.profile?.nickname).toBe("Undo");
  });

  it("serializes reset behind an older slow save so cleared data cannot return", async () => {
    const data = recoverAppData({
      storageVersion: 6,
      installationId: "install-slow-save",
      profile: makeProfile(),
      onboardingCompleted: true,
    });
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    storageState.blockedSetKey = STORAGE_KEY;
    storageState.onBlockedSetStarted = () => markStarted?.();

    const saving = nexusRepository.save(data);
    await started;
    const clearing = nexusRepository.clearAll();
    storageState.releaseBlockedSet?.();

    await Promise.all([saving, clearing]);
    expect(storageState.values.has(STORAGE_KEY)).toBe(false);
  });

  it("locks writes when a pre-migration safety snapshot cannot be created", async () => {
    storageState.values.set(STORAGE_KEY, JSON.stringify({
      storageVersion: 5,
      installationId: "install-preserved",
      profile: makeProfile(),
      onboardingCompleted: true,
    }));
    storageState.failSetKey = MIGRATION_BACKUP_KEY;

    const loaded = await nexusRepository.load();

    expect(loaded.profile?.nickname).toBe("Gusta");
    expect(nexusRepository.readOnlyReason()).toMatch(/cópia de segurança/i);
    await expect(nexusRepository.save(loaded)).rejects.toThrow(/protegido contra escrita/i);
    expect(storageState.values.get(STORAGE_KEY)).toContain("install-preserved");
  });

  it("skips a corrupted migration snapshot and restores the next valid candidate", async () => {
    storageState.values.set(MIGRATION_BACKUP_KEY, "{broken");
    storageState.values.set(LEGACY_MIGRATION_BACKUP_KEYS[0], JSON.stringify({
      data: {
        storageVersion: 5,
        installationId: "install-legacy-backup",
        profile: makeProfile({ nickname: "Backup" }),
        onboardingCompleted: true,
      },
    }));

    const restored = await nexusRepository.restorePreMigrationBackup();

    expect(restored?.installationId).toBe("install-legacy-backup");
    expect(restored?.profile?.nickname).toBe("Backup");
    await expect(nexusRepository.hasPreMigrationBackup()).resolves.toBe(true);
  });

  it("skips semantically empty migration snapshots instead of restoring defaults", async () => {
    storageState.values.set(MIGRATION_BACKUP_KEY, JSON.stringify({
      data: { history: [], weeklyReviews: [] },
    }));
    storageState.values.set(LEGACY_MIGRATION_BACKUP_KEYS[0], JSON.stringify({
      data: { profile: null, history: [] },
    }));

    await expect(nexusRepository.restorePreMigrationBackup()).resolves.toBeNull();
    await expect(nexusRepository.hasPreMigrationBackup()).resolves.toBe(false);
    expect(storageState.values.has(MIGRATION_BACKUP_KEY)).toBe(true);
    expect(storageState.values.has(LEGACY_MIGRATION_BACKUP_KEYS[0])).toBe(true);
  });
});
