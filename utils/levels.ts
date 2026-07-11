export type LevelInfo = {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
};

export function xpNeededForLevel(level: number): number {
  if (level <= 1) return 0;
  const completedLevels = level - 1;
  return completedLevels * 100 + (completedLevels * (completedLevels - 1) * 25) / 2;
}

export function levelTitle(level: number): string {
  if (level >= 50) return "Nexus";
  if (level >= 35) return "Elite";
  if (level >= 20) return "Arquiteto";
  if (level >= 10) return "Executor";
  if (level >= 5) return "Construtor";
  return "Iniciante";
}

export function calculateLevel(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < 99 && xpNeededForLevel(level + 1) <= safeXp) level += 1;

  const currentLevelXp = xpNeededForLevel(level);
  const nextLevelXp = xpNeededForLevel(level + 1);
  const range = Math.max(1, nextLevelXp - currentLevelXp);

  return {
    level,
    title: levelTitle(level),
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(1, Math.max(0, (safeXp - currentLevelXp) / range)),
  };
}

export function focusXpForSeconds(seconds: number): number {
  return Math.max(0, Math.min(50, Math.floor(seconds / 300) * 5));
}
