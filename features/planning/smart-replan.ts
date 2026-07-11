import type { AppData, EnergyLevel, Task } from "@/types";

export type ReplanSignal = {
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  suggestedMinutes: number;
  candidates: Task[];
};

function minutesNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function detectReplanSignal(data: AppData, currentEnergy?: EnergyLevel): ReplanSignal | null {
  const plan = data.activePlan;
  if (!plan || plan.mainMission.completed) return null;
  const open = plan.tasks.filter((task) => !task.completed);
  if (open.length < 2) return null;
  const remaining = open.reduce((sum, task) => sum + task.estimatedMinutes, 0) + plan.mainMission.estimatedMinutes;
  const dayMinutesLeft = Math.max(0, 22 * 60 - minutesNow());
  const postponed = open.filter((task) => Boolean(task.postponedFrom)).length;
  const energy = currentEnergy ?? data.profile?.energyLevel ?? "media";

  if (energy === "baixa" && remaining > 60) {
    return {
      severity: "high",
      title: "Modo energia baixa",
      message: `Ainda existem ${remaining} minutos planejados. Posso condensar o dia em uma missão essencial sem tocar no XP já conquistado.`,
      suggestedMinutes: Math.min(50, Math.max(25, dayMinutesLeft)),
      candidates: [...open].sort((a, b) => (a.priority === "alta" ? -1 : b.priority === "alta" ? 1 : a.estimatedMinutes - b.estimatedMinutes)),
    };
  }
  if (dayMinutesLeft < remaining && dayMinutesLeft < 120) {
    return {
      severity: "high",
      title: "O tempo do dia apertou",
      message: `Restam cerca de ${dayMinutesLeft} minutos úteis até 22h, mas o plano ainda soma ${remaining}. Vamos torná-lo executável?`,
      suggestedMinutes: Math.max(20, dayMinutesLeft),
      candidates: open,
    };
  }
  if (postponed >= 2) {
    return {
      severity: "medium",
      title: "Pendências acumuladas",
      message: "Algumas tarefas já foram adiadas. O Nexus pode preservar a mais importante e simplificar o restante.",
      suggestedMinutes: Math.min(90, remaining),
      candidates: open,
    };
  }
  return null;
}
