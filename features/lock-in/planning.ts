import { createProfileDefaults } from "@/constants/defaults";
import { dailyPlanSchema } from "@/schemas/daily-plan.schema";
import { executionProfileSchema, lockInDraftSchema, goalSchema, type ExecutionProfile, type LockInDraft, type LockInState } from "@/schemas/lock-in.schema";
import type { AppData, DailyPlan, Task } from "@/types";
import { localDateKey } from "@/utils/dates";

type Span = { start: number; end: number };
const minute = 60_000;
function union(spans: Span[]): Span[] {
  const result: Span[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    if (span.end <= span.start) continue;
    const last = result[result.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else result.push({ ...span });
  }
  return result;
}
export function capacity(profile: ExecutionProfile, now = new Date()) {
  executionProfileSchema.parse(profile);
  const windows = profile.windows.map((s) => ({ start: Math.max(Date.parse(s.start), now.getTime()), end: Date.parse(s.end) }));
  for (const span of profile.windows) {
    if (localDateKey(new Date(span.start), profile.timezone) !== profile.date || localDateKey(new Date(Date.parse(span.end) - 1), profile.timezone) !== profile.date)
      throw new Error("Cada janela deve pertencer à data escolhida no fuso confirmado.");
  }
  const excluded = union(profile.reservations.map((s) => ({ start: Date.parse(s.start), end: Date.parse(s.end) })));
  let free = union(windows);
  for (const cut of excluded) free = free.flatMap((s) => {
    if (cut.end <= s.start || cut.start >= s.end) return [s];
    return [{ start: s.start, end: Math.min(cut.start, s.end) }, { start: Math.max(cut.end, s.start), end: s.end }].filter((p) => p.end > p.start);
  });
  const grossMinutes = Math.floor(free.reduce((sum, s) => sum + s.end - s.start, 0) / minute);
  // Buffer is removed from the latest available intervals, never added to capacity.
  let reserve = (profile.bufferMinutes + profile.maintenanceMinutes) * minute;
  for (let i = free.length - 1; i >= 0 && reserve > 0; i--) {
    const span = free[i]!;
    const used = Math.min(reserve, span.end - span.start);
    span.end -= used; reserve -= used;
  }
  free = free.filter((s) => s.end > s.start);
  return { free, grossMinutes, minutes: Math.max(0, grossMinutes - profile.bufferMinutes - profile.maintenanceMinutes), bufferMinutes: Math.min(grossMinutes, profile.bufferMinutes) };
}
export function orderTasks(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  if (byId.size !== tasks.length) throw new Error("As tarefas precisam de IDs únicos.");
  const ordered: Task[] = [], visiting = new Set<string>(), visited = new Set<string>();
  const visit = (task: Task) => {
    if (visiting.has(task.id)) throw new Error("As dependências formam um ciclo.");
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const id of task.dependsOn ?? []) {
      const dep = byId.get(id);
      if (!dep) throw new Error("Uma dependência não está no plano.");
      visit(dep);
    }
    visiting.delete(task.id); visited.add(task.id); ordered.push(task);
  };
  tasks.forEach(visit); return ordered;
}
export function allocate(tasks: Task[], profile: ExecutionProfile, now = new Date()) {
  const available = capacity(profile, now);
  const free = available.free.map((s) => ({ ...s }));
  const blocks: NonNullable<DailyPlan["execution"]>["blocks"] = [];
  for (const task of orderTasks(tasks).filter((t) => !t.completed)) {
    const duration = task.estimatedMinutes * minute;
    const previousEnd = Math.max(now.getTime(), ...blocks.map((b) => Date.parse(b.end)));
    const span = free.find((s) => s.end - Math.max(s.start, previousEnd) >= duration);
    if (!span) throw new Error(`“${task.title}” precisa de ${task.estimatedMinutes} min contínuos. Restam ${available.minutes} min disponíveis no total. Reduza o escopo ou ajuste as janelas antes de confirmar.`);
    const start = Math.max(span.start, previousEnd), end = start + duration;
    blocks.push({ taskId: task.id, start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    span.start = end;
  }
  return { ...available, blocks };
}
export function reconcileExecution(data: AppData, planningNow?: Date): AppData {
  const plan = data.activePlan;
  if (!plan?.execution) return data;
  const taskIds = plan.mainMission.taskIds ?? [];
  if (!taskIds.length || new Set(taskIds).size !== taskIds.length) throw new Error("A missão precisa de tarefas vinculadas únicas.");
  if (taskIds.some((id) => !plan.tasks.some((t) => t.id === id))) throw new Error("Revisar a missão no Plano antes de retirar uma tarefa vinculada.");
  orderTasks(plan.tasks);
  const linked = plan.tasks.filter((t) => taskIds.includes(t.id));
  const goal = data.lockIn.goals.find((g) => g.id === plan.execution?.goalId && g.state === "primary");
  if (!goal) throw new Error("A missão precisa estar vinculada à meta principal confirmada.");
  const completed = linked.length > 0 && linked.every((t) => t.completed);
  // Preserve confirmation snapshot; passing time alone must not reject unrelated writes.
  const execution = data.lockIn.execution;
  if (!execution || execution.date !== plan.date) throw new Error("O plano perdeu suas janelas autorizadas.");
  const allocation = allocate(plan.tasks, execution, planningNow ?? new Date(plan.execution.confirmedAt));
  const normalized = dailyPlanSchema.parse({ ...plan,
    totalEstimatedMinutes: plan.tasks.reduce((s, t) => s + t.estimatedMinutes, 0),
    mainMission: { ...plan.mainMission, estimatedMinutes: Math.max(5, linked.reduce((s, t) => s + t.estimatedMinutes, 0)), completed,
      completedAt: completed ? linked.map((t) => t.completedAt).filter(Boolean).sort().at(-1) : undefined },
    execution: { ...plan.execution, blocks: allocation.blocks, ...(planningNow ? { confirmedAt: planningNow.toISOString(), capacityMinutes: allocation.minutes, bufferMinutes: allocation.bufferMinutes } : {}) },
  });
  return { ...data, activePlan: normalized };
}
export function projectGoalProfile(data: AppData): AppData {
  const primary = data.lockIn.goals.find((g) => g.state === "primary");
  if (!primary || !data.profile) return data;
  return { ...data, profile: { ...data.profile, mainGoal: primary.result, goalReason: primary.why, deadline: primary.deadline } };
}
export function seedLockIn(installationId: string, profile?: AppData["profile"]): LockInState {
  return { revision: 0, goals: profile ? [{ id: `${installationId}:primary`, result: profile.mainGoal, why: profile.goalReason,
    doneWhen: "", state: "candidate", deadlineType: "unknown", ...(profile.deadline ? { deadline: profile.deadline } : {}) }] : [] };
}
export function draftFor(data: AppData, now = new Date()): LockInDraft {
  if (data.lockIn.draft) return data.lockIn.draft;
  const profile = { ...data.onboardingDraft, ...data.profile };
  const goal = data.lockIn.goals.find((g) => g.state === "primary" || g.state === "candidate");
  return { goalKind: "primary", maintenanceBudget: "15", name: profile.name ?? "", result: goal?.result ?? profile.mainGoal ?? "", why: goal?.why ?? profile.goalReason ?? "",
    doneWhen: goal?.doneWhen ?? "", deadline: goal?.deadline ?? "", deadlineType: goal?.deadlineType ?? "unknown",
    timezone: profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    date: localDateKey(now, profile.timezone), windows: "", reservations: "", buffer: "15",
    mission: "", firstAction: "", acceptance: "", estimate: "25", step: 0 };
}
function wallStamp(date: string, clock: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) throw new Error("Use data AAAA-MM-DD e horários HH:MM.");
  const target = `${date}T${clock}`;
  const format = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const show = (ms: number) => format.format(new Date(ms)).replace(" ", "T");
  const naive = Date.parse(`${target}:00Z`);
  if (!Number.isFinite(naive)) throw new Error("Data inválida.");
  let guess = naive;
  for (let i = 0; i < 3; i++) guess += naive - Date.parse(`${show(guess)}:00Z`);
  const matches = [guess - 2 * 3600_000, guess - 3600_000, guess, guess + 3600_000, guess + 2 * 3600_000].filter((ms) => show(ms) === target);
  if (matches.length !== 1) throw new Error("Esse horário é inexistente ou ambíguo no fuso escolhido. Escolha outra janela.");
  return new Date(matches[0]!).toISOString();
}
export function executionFromDraft(draft: LockInDraft): ExecutionProfile {
  const spans = (raw: string) => raw.split(/[\n,]+/).filter((s) => s.trim()).map((line) => {
    const match = line.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
    if (!match) throw new Error("Use uma janela HH:MM-HH:MM por linha.");
    return { start: wallStamp(draft.date, match[1]!, draft.timezone), end: wallStamp(draft.date, match[2]!, draft.timezone) };
  });
  return executionProfileSchema.parse({ date: draft.date, timezone: draft.timezone, windows: spans(draft.windows),
    reservations: spans(draft.reservations).map((s) => ({ ...s, kind: "commitment" })), bufferMinutes: Number(draft.buffer) });
}
function previousCategory(data: AppData): Task["category"] { return data.profile?.priorities[0] ?? "pessoal"; }
export function confirmExecution(data: AppData, input: LockInDraft, baseRevision: number, now = new Date()): AppData {
  const draft = lockInDraftSchema.parse(input);
  if (data.lockIn.revision !== baseRevision) throw new Error("O plano mudou desde a revisão. Reabra o resumo antes de confirmar.");
  if (draft.result.trim().length < 10 || draft.why.trim().length < 3 || draft.doneWhen.trim().length < 3 || draft.name.trim().length < 2)
    throw new Error("Informe seu nome, objetivo, motivo e critério verificável.");
  if (draft.mission.trim().length < 2 || draft.firstAction.trim().length < 2 || draft.acceptance.trim().length < 2)
    throw new Error("Informe resultado de hoje, primeira ação e aceite da missão.");
  const execution = { ...executionFromDraft(draft), maintenanceMinutes: data.lockIn.goals.filter((g) => g.state === "maintenance").reduce((s, g) => s + (g.budgetMinutes ?? 0), 0) };
  if (localDateKey(now, execution.timezone) !== execution.date) throw new Error("Confirme uma janela para hoje. Dias futuros serão planejados em uma próxima fatia.");
  const oldGoal = data.lockIn.goals.find((g) => g.state === "primary" || g.state === "candidate");
  const prefix = data.installationId.slice(0, 80);
  const id = oldGoal && oldGoal.result === draft.result.trim() ? oldGoal.id : `${prefix}:goal:${data.lockIn.revision + 1}`;
  const goal = { id, result: draft.result.trim(), why: draft.why.trim(), doneWhen: draft.doneWhen.trim(), state: "primary" as const,
    deadlineType: draft.deadline ? draft.deadlineType : "unknown" as const, ...(draft.deadline ? { deadline: draft.deadline } : {}) };
  const goals = data.lockIn.goals.filter((g) => g.id !== id).map((g) => g.state === "primary" || g.state === "candidate" ? { ...g, state: "archived" as const } : g);
  if (goals.length >= 100) throw new Error("Limite de metas atingido. Exporte e revise seu histórico antes de continuar.");
  const completed = data.activePlan?.date === execution.date ? data.activePlan.tasks.filter((t) => t.completed) : [];
  if (completed.length >= 5) throw new Error("O dia já possui cinco entregas registradas. Preserve-as e confirme a próxima missão em outro dia.");
  const task: Task = { id: `${prefix}:task:${data.lockIn.revision + 1}`, title: draft.mission.trim(),
    context: goal.result.slice(0, 300), firstStep: draft.firstAction.trim(), expectedResult: draft.mission.trim(), doneWhen: draft.acceptance.trim(),
    category: previousCategory(data), priority: "alta", estimatedMinutes: Number(draft.estimate), xp: 50, recurring: false, completed: false };
  const allocation = allocate([...completed, task], execution, now);
  const previous = data.profile;
  const profile = { ...createProfileDefaults(), ...previous, name: draft.name.trim(), nickname: previous?.nickname ?? draft.name.trim(),
    timezone: execution.timezone, mainGoal: goal.result, goalReason: goal.why, deadline: goal.deadline,
    availableMinutes: Math.max(15, Math.min(720, allocation.minutes)), createdAt: previous?.createdAt ?? now.toISOString(), updatedAt: now.toISOString() } as NonNullable<AppData["profile"]>;
  const pending = data.activePlan?.date === execution.date ? data.activePlan.tasks.filter((t) => !t.completed) : [];
  const recurringTasks = [...data.recurringTasks, ...pending.filter((t) => !data.recurringTasks.some((r) => r.id === t.id))];
  if (recurringTasks.length > 100) throw new Error("Limite de pendências atingido. Revise-as antes de mudar a missão.");
  if (data.activePlan && data.planSnapshots.length >= 1000) throw new Error("Limite de revisões atingido. Exporte e revise seu histórico.");
  const planSnapshots = data.activePlan ? [...data.planSnapshots, data.activePlan] : data.planSnapshots;
  const revision = baseRevision + 1;
  const activePlan: DailyPlan = dailyPlanSchema.parse({ date: execution.date,
    mainMission: { title: task.title, description: goal.result.slice(0, 360), firstStep: task.firstStep, expectedResult: task.expectedResult,
      doneWhen: task.doneWhen, estimatedMinutes: task.estimatedMinutes, priority: "alta", completed: false, xp: 0, taskIds: [task.id] },
    tasks: [...completed, task], totalEstimatedMinutes: completed.reduce((s, t) => s + t.estimatedMinutes, task.estimatedMinutes),
    focusMessage: "Execute a próxima ação dentro da janela confirmada.", avoidToday: [], source: "offline",
    warning: "Plano determinístico confirmado por você. A missão agrega as tarefas; o tempo é contado uma vez.",
    createdAt: data.activePlan?.date === execution.date ? data.activePlan.createdAt : now.toISOString(), requestId: `lock-in-${revision}`,
    execution: { goalId: id, revision, status: "confirmed", capacityMinutes: allocation.minutes, bufferMinutes: allocation.bufferMinutes,
      blocks: allocation.blocks, confirmedAt: now.toISOString() } });
  return { ...data, profile, onboardingCompleted: true, discoveryCompleted: true, onboardingDraft: {},
    activePlan, recurringTasks, planSnapshots, lockIn: { goals: [...goals, goal], execution, revision }, lastGeneratedDate: execution.date };
}

export function confirmSecondaryGoal(data: AppData, draft: LockInDraft, baseRevision: number, now = new Date()): AppData {
  if (draft.goalKind === "primary") return confirmExecution(data, draft, baseRevision, now);
  if (!data.profile || !data.onboardingCompleted) throw new Error("Confirme primeiro a meta principal.");
  if (draft.doneWhen.trim().length < 3) throw new Error("Informe o critério verificável da meta.");
  if (data.lockIn.revision !== baseRevision) throw new Error("A revisão mudou. Reabra o resumo.");
  if (data.lockIn.goals.length >= 100) throw new Error("Limite de metas atingido.");
  if (data.lockIn.goals.some((g) => g.state !== "archived" && g.result === draft.result.trim())) throw new Error("Essa meta já está registrada.");
  const goal = goalSchema.parse({ id: `${data.installationId.slice(0, 80)}:goal:${baseRevision + 1}`, result: draft.result.trim(), why: draft.why.trim(), doneWhen: draft.doneWhen.trim(),
    state: draft.goalKind, deadlineType: draft.deadlineType, ...(draft.deadline ? { deadline: draft.deadline } : {}),
    ...(draft.goalKind === "maintenance" ? { budgetMinutes: Number(draft.maintenanceBudget) } : {}) });
  const execution = data.lockIn.execution ? { ...data.lockIn.execution, maintenanceMinutes: data.lockIn.execution.maintenanceMinutes + (goal.budgetMinutes ?? 0) } : undefined;
  const next = { ...data, lockIn: { ...data.lockIn, goals: [...data.lockIn.goals, goal], execution, draft: undefined, revision: baseRevision + 1 } };
  if (draft.goalKind === "maintenance" && !execution) throw new Error("Confirme janelas antes de reservar manutenção.");
  if (draft.goalKind === "maintenance" && execution && data.activePlan?.execution) {
    if (execution.maintenanceMinutes + execution.bufferMinutes > capacity(execution, now).grossMinutes) throw new Error("O orçamento de manutenção não cabe nas janelas restantes.");
    const allocation = allocate(data.activePlan.tasks, execution, now);
    return reconcileExecution({ ...next, activePlan: { ...data.activePlan, execution: { ...data.activePlan.execution, revision: baseRevision + 1, capacityMinutes: allocation.minutes, blocks: allocation.blocks, confirmedAt: now.toISOString() } } });
  }
  return next;
}
