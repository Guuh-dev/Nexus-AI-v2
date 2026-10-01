import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  IMPORT_ROLLBACK_KEY,
  LOCK_IN_BACKUP_KEY,
  LEGACY_MIGRATION_BACKUP_KEYS,
  MIGRATION_BACKUP_KEY,
  STORAGE_KEY,
  BACKUP_MAX_BYTES,
} from "@/constants/defaults";
import { nexusRepository, recoverAppData } from "@/services/storage.service";
import { makeAppData, makeProfile } from "@/tests/fixtures";
import { generateLocalPlan } from "@/services/planning.service";
import { utf8ByteLength } from "@/utils/text";

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
  it("refuses oversized snapshot growth without truncating saved data and round-trips near the byte limit", async () => {
    const data = makeAppData();
    const plan = generateLocalPlan({ profile: data.profile!, date: "2026-10-01", requestId: "budget-test", clientId: data.installationId });
    plan.tasks = Array.from({ length: 5 }, (_, i) => ({ ...plan.tasks[0]!, id: `budget-${i}`, description: "é".repeat(300), context: "é".repeat(300), firstStep: "é".repeat(240), expectedResult: "é".repeat(300), doneWhen: "é".repeat(300) }));
    await nexusRepository.save(data);
    const original = storageState.values.get(STORAGE_KEY);
    data.planSnapshots = Array.from({ length: 1000 }, () => structuredClone(plan));
    expect(utf8ByteLength(JSON.stringify(data, null, 2))).toBeGreaterThan(BACKUP_MAX_BYTES);
    await expect(nexusRepository.save(data)).rejects.toThrow(/Limite de dados/);
    expect(storageState.values.get(STORAGE_KEY)).toBe(original);
    const bytesPerPlan = utf8ByteLength(JSON.stringify(plan, null, 2)) + 600;
    data.planSnapshots = data.planSnapshots.slice(0, Math.floor((BACKUP_MAX_BYTES - 100_000) / bytesPerPlan));
    while (utf8ByteLength(JSON.stringify(data, null, 2)) > BACKUP_MAX_BYTES - 1000) data.planSnapshots.pop();
    expect(utf8ByteLength(JSON.stringify(data, null, 2))).toBeGreaterThan(BACKUP_MAX_BYTES * 0.9);
    await nexusRepository.save(data);
    const exported = nexusRepository.exportJson(data);
    expect(utf8ByteLength(exported)).toBeLessThanOrEqual(BACKUP_MAX_BYTES);
    expect(nexusRepository.importJson(exported).planSnapshots).toEqual(data.planSnapshots);
  });

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

  it("migrates v3 preferences to v7 without losing existing choices", () => {
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
    expect(base.storageVersion).toBe(7);
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

  it("restores a strictly valid current internal rollback", async () => {
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

  it("preserves a strict legacy v6 Undo across the v7 migration", async () => {
    const current = recoverAppData({ storageVersion: 6, installationId: "install-legacy-undo", profile: makeProfile(), onboardingCompleted: true });
    const { lockIn: _lockIn, planSnapshots: _snapshots, ...legacy } = current;
    const json = JSON.stringify({ ...legacy, storageVersion: 6 });
    storageState.values.set(IMPORT_ROLLBACK_KEY, json);
    const restored = await nexusRepository.restoreImportRollback();
    expect(restored?.storageVersion).toBe(7);
    expect(restored?.lockIn.goals[0]?.state).toBe("candidate");
    expect(storageState.values.get(IMPORT_ROLLBACK_KEY)).toBe(json);
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
  it("migrates v6 once with a dedicated backup, preserving legacy backup and candidate identity", async () => {
    const original = JSON.stringify({ storageVersion: 6, installationId: "install-v6-lock-in", profile: makeProfile(), onboardingCompleted: true });
    storageState.values.set(STORAGE_KEY, original);
    storageState.values.set(MIGRATION_BACKUP_KEY, "legacy-backup-kept");
    const first = await nexusRepository.load();
    expect(first.storageVersion).toBe(7);
    expect(first.lockIn.goals[0]?.state).toBe("candidate");
    expect(first.lockIn.execution).toBeUndefined();
    expect(storageState.values.get(MIGRATION_BACKUP_KEY)).toBe("legacy-backup-kept");
    expect(JSON.parse(storageState.values.get(LOCK_IN_BACKUP_KEY)!).data.storageVersion).toBe(6);
    expect(JSON.parse(storageState.values.get(STORAGE_KEY)!).storageVersion).toBe(7);
    const backup = storageState.values.get(LOCK_IN_BACKUP_KEY);
    expect((await nexusRepository.load()).lockIn).toEqual(first.lockIn);
    expect(storageState.values.get(LOCK_IN_BACKUP_KEY)).toBe(backup);
    expect(nexusRepository.importJson(nexusRepository.exportJson(first)).lockIn).toEqual(first.lockIn);
  });

  it("serializes reset behind the entire migration so a late migration cannot resurrect data", async () => {
    storageState.values.set(STORAGE_KEY, JSON.stringify({ storageVersion: 6, installationId: "install-migration-race", profile: makeProfile(), onboardingCompleted: true }));
    storageState.blockedSetKey = LOCK_IN_BACKUP_KEY;
    const started = new Promise<void>((resolve) => { storageState.onBlockedSetStarted = resolve; });
    const loading = nexusRepository.load();
    await started;
    const resetting = nexusRepository.clearAll();
    storageState.releaseBlockedSet?.();
    await loading;
    await resetting;
    expect(storageState.values.has(STORAGE_KEY)).toBe(false);
    expect(storageState.values.has(LOCK_IN_BACKUP_KEY)).toBe(false);
  });

  it("preserves the original v6 storage on backup or final migration write failure", async () => {
    for (const failingKey of [LOCK_IN_BACKUP_KEY, STORAGE_KEY]) {
      await nexusRepository.clearAll();
      const original = JSON.stringify({ storageVersion: 6, installationId: "install-migration-fail", profile: makeProfile(), onboardingCompleted: true });
      storageState.values.set(STORAGE_KEY, original);
      storageState.failSetKey = failingKey;
      await nexusRepository.load();
      expect(nexusRepository.readOnlyReason()).not.toBeNull();
      expect(storageState.values.get(STORAGE_KEY)).toBe(original);
      storageState.failSetKey = null;
    }
  });

  it("restores a partial onboarding section after restart and fails a draft write honestly", async () => {
    const data = await nexusRepository.load();
    const { draftFor } = await import("@/features/lock-in/planning");
    data.lockIn.draft = { ...draftFor(data), name: "Gustavo", result: "Construir o Nexus", step: 1 };
    await nexusRepository.save(data);
    expect((await nexusRepository.load()).lockIn.draft).toEqual(data.lockIn.draft);
    const original = storageState.values.get(STORAGE_KEY);
    storageState.failSetKey = STORAGE_KEY;
    await expect(nexusRepository.save({ ...data, lockIn: { ...data.lockIn, draft: { ...data.lockIn.draft, name: "Unsaved" } } })).rejects.toThrow();
    expect(storageState.values.get(STORAGE_KEY)).toBe(original);
  });

  it("preserves invalid v7 execution state rather than silently resetting consent or goals", async () => {
    const data = recoverAppData({ storageVersion: 6, installationId: "install-invalid-v7", profile: makeProfile(), onboardingCompleted: true });
    const original = JSON.stringify({ ...data, lockIn: { ...data.lockIn, goals: [{ nonsense: true }] } });
    storageState.values.set(STORAGE_KEY, original);
    await nexusRepository.load();
    expect(nexusRepository.readOnlyReason()).not.toBeNull();
    expect(storageState.values.get(STORAGE_KEY)).toBe(original);
    expect(() => nexusRepository.importJson(original)).toThrow();
  });

});
