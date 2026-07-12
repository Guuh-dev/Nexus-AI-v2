import type { MainMission, Task } from "@/types";
import { sanitizeText } from "@/utils/text";

export type ActionGuidance = {
  steps: string[];
  deliverable: string;
};

function taskSpecificSteps(task: Task): ActionGuidance {
  const title = task.title.toLocaleLowerCase("pt-BR");
  const description = sanitizeText(task.description, 300);

  if (/diagnóstico|mapear|mapeamento/.test(title)) {
    return {
      steps: [
        "Defina exatamente o que será avaliado.",
        "Faça uma tentativa prática curta sem consultar uma resposta pronta.",
        "Separe o resultado em: consigo sozinho, preciso de ajuda e ainda não consigo.",
      ],
      deliverable: "Uma lista objetiva de forças, lacunas e a próxima habilidade a treinar.",
    };
  }
  if (/desmontar|analisar código|código com ia/.test(title)) {
    return {
      steps: [
        "Escolha um arquivo pequeno e funcional do projeto.",
        "Peça à IA para explicar o fluxo em blocos, não apenas linha por linha.",
        "Sem olhar a resposta, resuma entrada, processamento e saída com suas palavras.",
        "Altere uma parte pequena e teste o efeito.",
      ],
      deliverable: "Um resumo do fluxo do arquivo e uma alteração testada por você.",
    };
  }
  if (/termos técnicos|fundamentos/.test(title)) {
    return {
      steps: [
        "Escolha no máximo cinco termos usados no seu projeto atual.",
        "Defina cada termo em uma frase simples.",
        "Encontre um exemplo real de cada termo no código ou ferramenta.",
      ],
      deliverable: "Um mini glossário com definições próprias e exemplos reais.",
    };
  }
  if (/portfólio|github|publicar/.test(title)) {
    return {
      steps: [
        "Escolha uma entrega que já funciona.",
        "Mostre problema, solução, tecnologias e como testar.",
        "Revise o README e publique um link acessível.",
      ],
      deliverable: "Um projeto apresentável que outra pessoa consegue abrir e entender.",
    };
  }
  if (/receita|cliente|proposta|prospect/.test(title)) {
    return {
      steps: [
        "Escolha um público ou cliente específico.",
        "Prepare uma abordagem curta baseada em um problema real observado.",
        "Envie ou conclua uma ação comercial mensurável.",
        "Registre resposta, objeção ou próximo follow-up.",
      ],
      deliverable: "Uma conversa, proposta ou follow-up real registrado.",
    };
  }
  if (/registrar progresso|resumo/.test(title)) {
    return {
      steps: [
        "Anote o que foi concluído de forma concreta.",
        "Registre o maior bloqueio encontrado.",
        "Defina uma única próxima ação com duração e resultado esperado.",
      ],
      deliverable: "Um registro de três linhas: avanço, bloqueio e próximo passo.",
    };
  }
  if (/praticar|exercício|habilidade/.test(title)) {
    return {
      steps: [
        "Escolha uma habilidade específica, não o assunto inteiro.",
        "Faça de três a cinco repetições curtas.",
        "Compare a primeira e a última tentativa e corrija um erro.",
      ],
      deliverable: "Uma evidência da prática e uma frase sobre o erro corrigido.",
    };
  }

  return {
    steps: [
      description || `Defina o resultado concreto de “${task.title}”.`,
      `Execute a menor primeira ação por ${Math.min(task.estimatedMinutes, 15)} minutos.`,
      "Finalize registrando o que ficou pronto e o próximo movimento.",
    ],
    deliverable: `Um resultado observável ligado a “${task.title}”, não apenas tempo gasto.`,
  };
}

export function getTaskGuidance(task: Task): ActionGuidance {
  return taskSpecificSteps(task);
}

export function getMissionGuidance(mission: MainMission): ActionGuidance {
  return {
    steps: [
      "Defina uma entrega que prove avanço na missão hoje.",
      `Reserve um bloco de ${Math.min(mission.estimatedMinutes, 45)} minutos para a parte mais importante.`,
      "Conclua uma versão demonstrável e registre a próxima ação.",
    ],
    deliverable: sanitizeText(mission.description, 360) || `Uma entrega concreta relacionada a “${mission.title}”.`,
  };
}
