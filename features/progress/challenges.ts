import type { AppData, Challenge } from "@/types";
import { endOfLocalDayIso, localDateKey } from "@/utils/dates";

const MAX_REWARD_LEDGER_ENTRIES = 20_000;

function generatedChallengeIds(today: string): Set<string> {
  return new Set([
    `daily-tasks-${today}`,
    `daily-focus-${today}`,
    `boss-${today}`,
  ]);
}

export function refreshDailyChallenges(
  data: AppData,
  today = localDateKey(new Date(), data.profile?.timezone),
): AppData {
  const todayCompleted = data.activePlan?.date === today
    ? data.activePlan.tasks.filter((task) => task.completed).length
    : 0;
  const todayFocus = Math.floor(data.progress.focusSessions
    .filter((session) =>
      localDateKey(new Date(session.completedAt), data.profile?.timezone) === today &&
      session.status === "completed",
    )
    .reduce((sum, session) => sum + session.elapsedSeconds, 0) / 60);
  const expiresAt = endOfLocalDayIso(today, data.profile?.timezone);
  const configured: Challenge[] = (
    !data.profile ||
    !data.onboardingCompleted ||
    data.preferences.gamificationMode === "desativado"
  )
    ? []
    : [
        { id: `daily-tasks-${today}`, title: "Ritmo de execução", description: "Conclua duas tarefas hoje.", type: "daily", target: 2, progress: todayCompleted, xpReward: 30, completed: todayCompleted >= 2, expiresAt },
        { id: `daily-focus-${today}`, title: "Bloco sem distrações", description: "Acumule 25 minutos de foco.", type: "daily", target: 25, progress: todayFocus, xpReward: 25, completed: todayFocus >= 25, expiresAt },
        ...(data.preferences.gamificationMode === "boss" || data.preferences.gamificationMode === "operacao"
          ? [{ id: `boss-${today}`, title: "BOSS: Resistência do dia", description: "Conclua a missão principal e três tarefas.", type: "boss" as const, target: 4, progress: todayCompleted + (data.activePlan?.mainMission.completed ? 1 : 0), xpReward: 100, completed: Boolean(data.activePlan?.mainMission.completed && todayCompleted >= 3), expiresAt }]
          : []),
      ];

  const previous = new Map(data.progress.challenges.map((challenge) => [challenge.id, challenge]));
  // Backups produzidos antes do ledger persistente ainda carregam a prova do
  // prêmio em `completed`. Promova-a sem conceder XP novamente.
  const rewardLedger = new Set([
    ...data.progress.challengeRewardLedger,
    ...data.progress.challenges
      .filter((challenge) => challenge.completed)
      .map((challenge) => challenge.id),
  ]);
  let challengeXp = 0;
  const updated = configured.flatMap((challenge) => {
    const old = previous.get(challenge.id);
    const rewarded = rewardLedger.has(challenge.id);

    // Se um desafio premiado sumiu da lista visível (por exemplo, quando a
    // gamificação foi desativada), o ledger continua como tombstone. Religá-la
    // no mesmo dia não reexibe nem concede novamente esse desafio.
    if (rewarded && !old) return [];

    if (challenge.completed && !rewarded && rewardLedger.size < MAX_REWARD_LEDGER_ENTRIES) {
      challengeXp += challenge.xpReward;
      rewardLedger.add(challenge.id);
    }
    const completed = rewardLedger.has(challenge.id);
    return [{
      ...challenge,
      // A reward is a ledger entry. Once claimed for this challenge ID it
      // cannot be undone and claimed again by reopening the underlying task.
      progress: completed ? Math.max(challenge.progress, challenge.target) : challenge.progress,
      completed,
    }];
  });
  const generatedTodayIds = generatedChallengeIds(today);
  const challenges = [
    ...data.progress.challenges.filter((challenge) => !generatedTodayIds.has(challenge.id)),
    ...updated,
  ].slice(-100);
  const challengeRewardLedger = Array.from(rewardLedger).slice(0, MAX_REWARD_LEDGER_ENTRIES);
  if (
    !challengeXp &&
    JSON.stringify(challenges) === JSON.stringify(data.progress.challenges) &&
    JSON.stringify(challengeRewardLedger) === JSON.stringify(data.progress.challengeRewardLedger)
  ) {
    return data;
  }
  return {
    ...data,
    progress: {
      ...data.progress,
      totalXp: data.progress.totalXp + challengeXp,
      challenges,
      challengeRewardLedger,
    },
  };
}

export function refreshDailyChallengesAt(data: AppData, now = new Date()): AppData {
  return refreshDailyChallenges(data, localDateKey(now, data.profile?.timezone));
}

export function activeChallenges(data: AppData, now = new Date()): Challenge[] {
  const nowTime = now.getTime();
  return data.progress.challenges.filter(
    (challenge) => new Date(challenge.expiresAt).getTime() >= nowTime,
  );
}
