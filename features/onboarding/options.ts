import type { AccountabilityStyle, ChallengeMode, EvolutionArea, LearningStyle } from "@/types";

export const EVOLUTION_OPTIONS: { value: EvolutionArea; label: string; group: string }[] = [
  { value: "programacao", label: "Programação", group: "Carreira e criação" },
  { value: "inteligencia_artificial", label: "Inteligência artificial", group: "Carreira e criação" },
  { value: "freelance", label: "Freelance", group: "Carreira e criação" },
  { value: "empreendedorismo", label: "Empreendedorismo", group: "Carreira e criação" },
  { value: "carreira", label: "Carreira", group: "Carreira e criação" },
  { value: "dinheiro", label: "Dinheiro", group: "Carreira e criação" },
  { value: "escola", label: "Escola e provas", group: "Aprendizado" },
  { value: "ingles", label: "Inglês", group: "Aprendizado" },
  { value: "comunicacao", label: "Comunicação", group: "Aprendizado" },
  { value: "criatividade", label: "Criatividade", group: "Aprendizado" },
  { value: "produtividade", label: "Produtividade", group: "Execução" },
  { value: "disciplina", label: "Disciplina", group: "Execução" },
  { value: "organizacao", label: "Organização", group: "Execução" },
  { value: "saude_mental", label: "Saúde mental", group: "Vida e corpo" },
  { value: "saude_fisica", label: "Saúde física", group: "Vida e corpo" },
  { value: "futebol", label: "Futebol", group: "Vida e corpo" },
  { value: "relacionamentos", label: "Relacionamentos", group: "Vida e corpo" },
  { value: "autoconhecimento", label: "Autoconhecimento", group: "Vida e corpo" },
];

export const OBSTACLE_OPTIONS = ["Falta de tempo", "Energia irregular", "Celular e distrações", "Procrastinação", "Medo de falhar", "Perfeccionismo", "Não saber o próximo passo", "Começar muitas coisas", "Rotina imprevisível", "Falta de apoio"];
export const TRIGGER_OPTIONS = ["Tarefa grande demais", "Não entender o que fazer", "Cansaço", "Notificações", "Redes sociais", "Resultado demorado", "Ambiente bagunçado", "Ansiedade", "Tédio", "Interrupções"];
export const STRENGTH_OPTIONS = ["Aprendo rápido", "Sou criativo", "Não desisto fácil", "Executo sob pressão", "Sou curioso", "Me comunico bem", "Tenho visão de longo prazo", "Sou competitivo", "Resolvo problemas", "Ajudo outras pessoas"];

export const LEARNING_STYLE_OPTIONS: { value: LearningStyle; label: string; description: string }[] = [
  { value: "visual", label: "Visual", description: "Mapas, exemplos e demonstrações" },
  { value: "pratica", label: "Na prática", description: "Projetos e exercícios desde cedo" },
  { value: "leitura", label: "Leitura", description: "Textos curtos e anotações" },
  { value: "explicacao", label: "Explicando", description: "Ensinar para testar o domínio" },
  { value: "mista", label: "Mista", description: "O Professor escolhe conforme o tema" },
];

export const ACCOUNTABILITY_OPTIONS: { value: AccountabilityStyle; label: string; description: string }[] = [
  { value: "gentil", label: "Gentil", description: "Apoio sem pressão excessiva" },
  { value: "direta", label: "Direta", description: "Clareza e chamada para ação" },
  { value: "competitiva", label: "Competitiva", description: "Desafios, metas e recordes" },
  { value: "analitica", label: "Analítica", description: "Dados, padrões e ajustes" },
];

export const CHALLENGE_OPTIONS: { value: ChallengeMode; label: string; description: string }[] = [
  { value: "desativado", label: "Sem gamificação", description: "Só execução e progresso" },
  { value: "sutil", label: "Sutil", description: "XP e pequenas conquistas" },
  { value: "equilibrado", label: "Equilibrado", description: "Desafios sem dominar o app" },
  { value: "gamer", label: "Gamer", description: "Ranks, recompensas e missões" },
  { value: "operacao", label: "Operação", description: "Campanhas com fases e prazo" },
  { value: "boss", label: "Boss Mode", description: "Chefes simbólicos e desafios fortes" },
];
