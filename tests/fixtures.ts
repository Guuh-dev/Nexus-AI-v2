import type { AppData, Profile } from "@/types";
import { DEFAULT_APP_DATA } from "@/constants/defaults";

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const now = "2026-07-10T12:00:00.000Z";
  return {
    name: "Gustavo Araújo",
    nickname: "Gusta",
    timezone: "America/Sao_Paulo",
    mainGoal: "Conseguir o primeiro cliente freelance e construir uma carreira sólida.",
    goalReason: "Quero independência e equipamentos melhores para escalar.",
    availableMinutes: 120,
    activeDays: [1, 2, 3, 4, 5, 6],
    schedule: "Escola pela manhã",
    focusPeriod: "tarde",
    skillLevel: "intermediario",
    energyLevel: "media",
    priorities: ["dinheiro", "desenvolvimento", "estudos"],
    maxDailyTasks: 4,
    intensity: "equilibrado",
    assistantTone: "treinador",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeAppData(profile = makeProfile()): AppData {
  return {
    ...(JSON.parse(JSON.stringify(DEFAULT_APP_DATA)) as AppData),
    installationId: "install-test-123",
    profile,
    onboardingCompleted: true,
  };
}
