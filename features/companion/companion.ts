import type { AppData, CompanionMood } from "@/types";

const LINES: Record<CompanionMood, { idle: string[]; progress: string[]; stalled: string[]; done: string[] }> = {
  happy: { idle: ["Um passo por vez.", "Sua próxima ação está aqui."], progress: ["Um passo registrado. Vamos ao próximo?"], stalled: ["Há pendências para revisar. Podemos começar pequeno."], done: ["Conclusões registradas. Hora de revisar a entrega."] },
  playful: { idle: ["Seu próximo passo abriu o lobby.", "Pequeno passo, pixels felizes."], progress: ["Mais um ✓ salvo no plano."], stalled: ["As pendências pediram uma nova janela."], done: ["Checklist registrado. Bora conferir a entrega?"] },
  motivational: { idle: ["Comece com o que você tem.", "O próximo passo pode ser pequeno."], progress: ["Avanço registrado. Preserve o que importa."], stalled: ["Reveja o essencial e escolha uma janela real."], done: ["Conclusões registradas. Você decide o próximo passo."] },
  serious: { idle: ["Uma prioridade. Uma próxima ação."], progress: ["Progresso registrado no plano."], stalled: ["Revise as pendências e a capacidade restante."], done: ["Tarefas concluídas no registro. Revise as evidências."] },
  strict: { idle: ["Prioridade primeiro. Comece pela próxima ação."], progress: ["Avanço salvo. Confira o que falta."], stalled: ["Decida o que cabe, o que muda e o que sai."], done: ["Conclusões registradas. Confira o resultado."] },
  calm: { idle: ["Um passo por vez.", "Escolha só uma coisa para começar."], progress: ["Um passo registrado. Siga no seu ritmo."], stalled: ["Retome pelo essencial, quando houver espaço."], done: ["Registros concluídos. Você pode revisar ou encerrar."] },
  quiet: { idle: ["Próxima ação.", "Nexus presente."], progress: ["Avanço salvo."], stalled: ["Pendências para revisar."], done: ["Conclusões registradas."] },
};

function deterministicPick(lines: string[], seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length] ?? lines[0] ?? "Nexus ativo.";
}

export function companionStatus(data: AppData): "idle" | "progress" | "stalled" | "done" {
  const plan = data.activePlan;
  if (!plan) return "idle";
  const total = plan.tasks.length + 1;
  const completed = plan.tasks.filter((task) => task.completed).length + Number(plan.mainMission.completed);
  if (completed >= total && total > 0) return "done";
  if (completed > 0) return "progress";
  const postponed = plan.tasks.filter((task) => !task.completed && Boolean(task.postponedFrom)).length;
  return postponed >= 2 ? "stalled" : "idle";
}

export function shouldShowCompanion(data: AppData): boolean {
  const mascot = data.preferences.mascot;
  if (!mascot.showCompanion || mascot.companionPresence === "quiet") return false;
  if (mascot.companionPresence === "active") return true;
  return companionStatus(data) !== "idle";
}

export function getCompanionLine(data: AppData, mood: CompanionMood, salt = "main"): string {
  const status = companionStatus(data);
  const day = data.activePlan?.date ?? new Date().toISOString().slice(0, 10);
  const completed = data.activePlan?.tasks.filter((task) => task.completed).length ?? 0;
  const focus = data.progress.focusSessions.length;
  const timeWindow = Math.floor(Date.now() / (4 * 60 * 60 * 1000));
  return deterministicPick(LINES[mood][status], `${day}:${salt}:${data.progress.totalXp}:${completed}:${focus}:${timeWindow}:${status}`);
}

export function companionLines(data: AppData): Partial<Record<CompanionMood, string>> {
  return {
    happy: getCompanionLine(data, "happy", "widget"),
    playful: getCompanionLine(data, "playful", "widget"),
    motivational: getCompanionLine(data, "motivational", "widget"),
    serious: getCompanionLine(data, "serious", "widget"),
    strict: getCompanionLine(data, "strict", "widget"),
    calm: getCompanionLine(data, "calm", "widget"),
    quiet: getCompanionLine(data, "quiet", "widget"),
  };
}

export function nexusQuote(data: AppData): string {
  const status = companionStatus(data);
  if (status === "done") return "Conclusões registradas. Revise o resultado.";
  if (status === "progress") return "Avanço registrado. Escolha o próximo passo.";
  if (status === "stalled") return "Revise as pendências dentro da capacidade real.";
  return "Seu espaço. Sua próxima ação.";
}
