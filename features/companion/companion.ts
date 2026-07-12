import type { AppData, CompanionMood } from "@/types";

const LINES: Record<CompanionMood, { idle: string[]; progress: string[]; stalled: string[]; done: string[] }> = {
  happy: {
    idle: ["Bora deixar hoje um pouco melhor?", "Uma ação pequena já muda o placar.", "Tô online. Escolhe a primeira peça do dominó."],
    progress: ["Boa! O dia já saiu do zero.", "Isso aí. Continua que tá encaixando.", "Progresso confirmado. A cobrinha aprovou."],
    stalled: ["Tá parado, mas não perdido. Faz só 10 minutos.", "Vamos destravar com uma tarefa ridiculamente pequena.", "Sem drama: abre, faz o primeiro passo e volta."],
    done: ["Missão cumprida. Hoje foi seu.", "GG. O Nexus está oficialmente orgulhoso.", "Dia fechado com chave roxa."],
  },
  playful: {
    idle: ["O botão não vai apertar sozinho, chefe 😭", "Seu futuro mandou mensagem: começa logo.", "A procrastinação abriu lobby. Bora sair dele."],
    progress: ["Olha ele executando 👀", "XP pingando. Continua.", "Um task a menos, um monstro a mais."],
    stalled: ["Você e essa tarefa estão num relacionamento complicado.", "Prometo não julgar... muito. Faz 10 min.", "A missão está te encarando faz tempo, viu?"],
    done: ["GG EZ. Próximo boss.", "Terminou mesmo? Cinema absoluto.", "O dia tentou. Você venceu."],
  },
  motivational: {
    idle: ["O próximo passo não precisa ser perfeito, só real.", "Disciplina pequena, resultado grande.", "Comece com o que você tem, daqui mesmo."],
    progress: ["Você está construindo evidência de que consegue.", "Cada conclusão fortalece sua identidade.", "Continue. A consistência já apareceu."],
    stalled: ["Reduza a meta, não abandone a missão.", "Volte ao básico: uma ação, um resultado.", "Você não precisa de motivação para começar."],
    done: ["Você fez o que disse que faria.", "Mais um dia alinhado com quem você quer ser.", "Conclusão registrada. Evolução real."],
  },
  serious: {
    idle: ["Defina a prioridade e execute.", "Seu próximo passo está disponível.", "Menos planejamento. Mais evidência."],
    progress: ["Progresso registrado.", "Execução consistente.", "Mantenha o ritmo atual."],
    stalled: ["Atraso detectado. Inicie um bloco de 15 minutos.", "Remova distrações e execute a primeira etapa.", "Escolha uma entrega verificável."],
    done: ["Objetivo diário concluído.", "Execução encerrada com sucesso.", "Missão finalizada."],
  },
  strict: {
    idle: ["Chega de negociar. Comece.", "A meta não se move sem você.", "Faça a tarefa antes de procurar outra ideia."],
    progress: ["Melhor. Não quebre o ritmo.", "Continue até existir uma entrega.", "Bom começo. Termine."],
    stalled: ["Você está evitando. Abra a tarefa agora.", "Sem outra aba. Sem outro plano. Execute.", "Quinze minutos. Agora."],
    done: ["Concluído. Era isso que precisava acontecer.", "Resultado entregue.", "Missão cumprida. Pode descansar."],
  },
  calm: {
    idle: ["Respira. Escolhe só uma coisa.", "Vamos no seu ritmo, sem abandonar o caminho.", "Um bloco tranquilo já é suficiente para começar."],
    progress: ["Boa. Mantém esse ritmo leve.", "Você está avançando sem se atropelar.", "Passo concluído. Continua com calma."],
    stalled: ["Tudo bem reduzir. Escolhe a menor etapa.", "Volta quando puder e faz apenas o essencial.", "Sem culpa. Recomeça pequeno."],
    done: ["Pronto. Agora descansa de verdade.", "Dia concluído com equilíbrio.", "Você fez o suficiente por hoje."],
  },
  quiet: {
    idle: ["Próxima ação pronta.", "Nexus ativo.", "Missão disponível."],
    progress: ["Progresso salvo.", "Em andamento.", "Continue."],
    stalled: ["Comece por 10 min.", "Retome a missão.", "Ação pendente."],
    done: ["Concluído.", "Missão cumprida.", "Tudo certo."],
  },
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
  const ageMinutes = Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / 60_000);
  return ageMinutes > 180 ? "stalled" : "idle";
}

export function getCompanionLine(data: AppData, mood: CompanionMood, salt = "main"): string {
  const status = companionStatus(data);
  const day = data.activePlan?.date ?? new Date().toISOString().slice(0, 10);
  return deterministicPick(LINES[mood][status], `${day}:${salt}:${data.progress.totalXp}:${status}`);
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
  if (status === "done") return "Você fez o que prometeu para si mesmo.";
  if (status === "progress") return "Não interrompa uma sequência que acabou de nascer.";
  if (status === "stalled") return "Reduza o tamanho da ação, não o tamanho do sonho.";
  return "Disciplina hoje. Liberdade amanhã.";
}
