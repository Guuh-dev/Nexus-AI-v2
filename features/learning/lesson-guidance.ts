import type { LearningRoadmap, RoadmapLesson, RoadmapPhase } from "@/types";
import { sanitizeText } from "@/utils/text";

export type LessonGuidance = {
  objective: string;
  steps: string[];
  deliverable: string;
  successCriteria: string;
};

function clean(value: string | undefined, max = 400): string {
  return sanitizeText(value, max);
}

function specificLegacyGuidance(
  roadmap: LearningRoadmap,
  phase: RoadmapPhase,
  lesson: RoadmapLesson,
): LessonGuidance {
  const topic = clean(roadmap.topic, 160) || "a habilidade escolhida";
  const title = lesson.title.toLocaleLowerCase("pt-BR");
  const proof = clean(roadmap.intake?.proofProject, 360);
  const known = clean(roadmap.intake?.knownConcepts, 300);

  if (title.includes("diagnóstico")) {
    return {
      objective: `Descobrir o seu nível real em ${topic}, sem depender da sensação de que “já sabe”.`,
      steps: [
        `Liste de memória entre 3 e 5 conceitos que você acredita dominar em ${topic}.`,
        `Faça uma tarefa prática curta usando esses conceitos, sem copiar uma solução pronta.`,
        "Marque cada ponto em: consigo sozinho, consigo com ajuda ou ainda não consigo.",
        "Escolha a maior lacuna como prioridade da próxima lição.",
      ],
      deliverable: `Uma lista curta com seus pontos fortes, suas lacunas e uma evidência prática em ${topic}.`,
      successCriteria: "Você consegue dizer exatamente o que sabe fazer sozinho e qual é o próximo fundamento a treinar.",
    };
  }

  if (title.includes("mapa dos fundamentos")) {
    return {
      objective: `Organizar os fundamentos de ${topic} em uma ordem que faça sentido para aprender e aplicar.`,
      steps: [
        "Separe o assunto em 5 a 8 fundamentos essenciais.",
        `Compare essa lista com o que você já registrou: ${known || "nenhum conceito registrado ainda"}.`,
        "Marque dependências: o que precisa vir antes de cada fundamento.",
        "Escolha os dois fundamentos que mais destravam prática real.",
      ],
      deliverable: "Um mapa simples com fundamentos, dependências e as duas prioridades da semana.",
      successCriteria: "Você consegue explicar a ordem do aprendizado sem usar palavras vagas como “estudar mais”.",
    };
  }

  if (title.includes("primeira aplicação")) {
    return {
      objective: `Transformar um fundamento de ${topic} em uma pequena entrega funcional.`,
      steps: [
        "Escolha apenas um fundamento do mapa anterior.",
        "Defina uma entrega que caiba nesta sessão e tenha começo, meio e fim.",
        "Construa a primeira versão sem buscar perfeição.",
        "Teste, registre um erro encontrado e faça uma correção.",
      ],
      deliverable: `Uma primeira aplicação pequena e demonstrável de ${topic}.`,
      successCriteria: "Existe algo funcionando que você consegue mostrar e explicar em menos de dois minutos.",
    };
  }

  if (title.includes("exercício de precisão")) {
    return {
      objective: `Treinar uma habilidade específica de ${topic} sem dispersar para assuntos vizinhos.`,
      steps: [
        "Escolha uma única habilidade mensurável.",
        "Faça de 3 a 5 repetições curtas da mesma habilidade.",
        "Compare as tentativas e identifique o erro que mais se repete.",
        "Refaça uma última vez corrigindo apenas esse erro.",
      ],
      deliverable: "As tentativas registradas e uma frase explicando o principal erro corrigido.",
      successCriteria: "A última tentativa é visivelmente melhor que a primeira por um critério objetivo.",
    };
  }

  if (title.includes("projeto curto")) {
    return {
      objective: `Consolidar ${topic} em um projeto pequeno que possa ser concluído, não apenas iniciado.`,
      steps: [
        "Defina uma função principal e elimine recursos extras.",
        "Divida em três partes: entrada, processamento e resultado.",
        "Construa a versão mínima até funcionar.",
        "Anote uma melhoria para depois, sem ampliar o escopo agora.",
      ],
      deliverable: proof || `Um projeto curto, funcional e demonstrável ligado a ${topic}.`,
      successCriteria: "A função principal funciona do início ao fim e você consegue demonstrá-la sem editar nada na hora.",
    };
  }

  if (title.includes("revisão dos erros")) {
    return {
      objective: "Converter erros recentes em regras práticas para não repeti-los automaticamente.",
      steps: [
        "Escolha os três erros mais importantes das últimas práticas.",
        "Para cada erro, escreva a causa provável e o sinal que permite percebê-lo cedo.",
        "Corrija um exemplo real de cada erro.",
        "Crie uma checklist curta para a próxima execução.",
      ],
      deliverable: "Uma checklist de prevenção com três erros, causas e correções.",
      successCriteria: "Você consegue detectar cada erro antes de finalizar uma nova tarefa.",
    };
  }

  if (title.includes("desafio aplicado")) {
    return {
      objective: `Usar ${topic} para resolver um problema que não seja uma cópia direta de tutorial.`,
      steps: [
        "Escolha um problema real ou uma variação nova do que já praticou.",
        "Defina o resultado esperado antes de começar.",
        "Resolva sem consultar uma solução completa.",
        "Compare o resultado com o esperado e registre a diferença.",
      ],
      deliverable: `Uma solução aplicada de ${topic}, acompanhada de uma breve explicação das decisões.`,
      successCriteria: "A solução atende ao resultado definido e você consegue justificar as principais escolhas.",
    };
  }

  if (title.includes("portfólio")) {
    return {
      objective: `Transformar sua prática em uma prova pública ou apresentável de domínio em ${topic}.`,
      steps: [
        "Escolha a melhor entrega construída até agora.",
        "Melhore apresentação, instruções e exemplo de uso.",
        "Escreva o problema, a solução e o que você aprendeu.",
        "Publique ou prepare um link/arquivo que outra pessoa consiga abrir.",
      ],
      deliverable: proof || `Uma peça de portfólio acessível e explicada sobre ${topic}.`,
      successCriteria: "Uma pessoa externa consegue entender o problema, testar a entrega e perceber sua contribuição.",
    };
  }

  if (title.includes("explicação sem consulta") || title.includes("ensinar")) {
    return {
      objective: `Provar compreensão de ${topic} explicando sem copiar definições.`,
      steps: [
        "Escolha um conceito central.",
        "Explique em linguagem simples, sem consultar material.",
        "Dê um exemplo correto e um contraexemplo.",
        "Confira depois e corrija qualquer imprecisão.",
      ],
      deliverable: "Uma explicação curta em texto ou áudio com exemplo e correção final.",
      successCriteria: "A explicação é correta, simples e suficiente para alguém iniciante reproduzir o raciocínio.",
    };
  }

  if (title.includes("problema avançado")) {
    return {
      objective: `Resolver uma situação nova em ${topic} combinando vários fundamentos sem roteiro pronto.`,
      steps: [
        "Defina o problema e as restrições.",
        "Quebre em partes e escolha uma estratégia antes de executar.",
        "Implemente ou resolva por etapas, testando cada parte.",
        "Faça uma revisão final e registre o que mudaria numa segunda tentativa.",
      ],
      deliverable: "A solução completa, os testes realizados e uma análise curta das decisões.",
      successCriteria: "A solução funciona sob as restrições e você consegue defender a estratégia utilizada.",
    };
  }

  if (title.includes("30 dias")) {
    return {
      objective: `Transformar o progresso em ${topic} em um plano sustentável para o próximo mês.`,
      steps: [
        "Escolha um resultado mensurável para 30 dias.",
        "Divida em quatro marcos semanais.",
        "Defina sessões, entregas e uma revisão semanal.",
        "Liste riscos previsíveis e uma resposta para cada um.",
      ],
      deliverable: "Um plano de 30 dias com quatro marcos, agenda de prática e critérios de revisão.",
      successCriteria: "Cada semana termina com uma entrega verificável, não apenas horas estudadas.",
    };
  }

  return {
    objective: clean(lesson.objective, 400) || `Avançar de forma prática na fase “${phase.title}” de ${topic}.`,
    steps: [
      `Escolha uma ação concreta ligada a “${lesson.title}”.`,
      `Trabalhe por ${lesson.estimatedMinutes} minutos sem mudar de assunto.`,
      "Registre o que produziu, o principal erro e o próximo passo.",
    ],
    deliverable: `Uma evidência verificável da lição “${lesson.title}”.`,
    successCriteria: "Você terminou com um resultado observável e sabe explicar o que mudou depois da sessão.",
  };
}

export function getLessonGuidance(
  roadmap: LearningRoadmap,
  phase: RoadmapPhase,
  lesson: RoadmapLesson,
): LessonGuidance {
  const fallback = specificLegacyGuidance(roadmap, phase, lesson);
  const steps = (lesson.steps ?? []).map((step) => clean(step, 240)).filter(Boolean).slice(0, 6);
  return {
    objective: clean(lesson.objective, 400) || fallback.objective,
    steps: steps.length ? steps : fallback.steps,
    deliverable: clean(lesson.deliverable, 400) || fallback.deliverable,
    successCriteria: clean(lesson.successCriteria, 400) || fallback.successCriteria,
  };
}
