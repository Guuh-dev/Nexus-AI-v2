# Nexus AI 2.2.0 Companion

## Resumo

A 2.2.0 transforma o Nexus de um sistema com mascotes e widgets em um sistema no qual esses elementos participam ativamente da execução. É uma atualização nativa porque altera o runtime, o módulo Android do widget e a versão do aplicativo.

## Principais entregas

### Companion

- personalidades `happy`, `playful`, `motivational`, `serious`, `strict`, `calm` e `quiet`;
- presença silenciosa, equilibrada ou ativa;
- fala contextual, motivacional, divertida ou desativada;
- reação a progresso, conclusão, estagnação e modo offline;
- configuração independente em cada widget.

### Assistente

- streaming por Server-Sent Events em Brain e Atlas;
- respostas curtas por padrão;
- renderer próprio para títulos, passos e parágrafos;
- controles de detalhamento e ações rápidas;
- personalidade do Atlas configurável;
- histórico/contexto compactados;
- fallback local preservado.

### Widget Studio 2.2

Presets:

1. Mission Card
2. Smart Plan
3. Daily Command
4. Do It Now
5. Focus Card
6. Atlas Lesson
7. Roadmap Pulse
8. Nexus Companion
9. Nexus Quote
10. Quiet Status
11. XP Core
12. Streak Flame
13. Boss Battle
14. Habit Grid
15. Money Mission
16. Freelance Radar

Novas capacidades nativas:

- conteúdo de Companion, finanças, hábitos, Boss Battle e próxima ação;
- humor, fala e acessório por instância;
- troca de página;
- ações para Finance, Habits e Week;
- estilo Light Clean;
- nonce também na troca de página.

### Money Mission

A tela `app/finance.tsx` permite registrar meta mensal, receita, prospects, follow-ups, clientes e fechamentos. O dado permanece local e alimenta os widgets financeiros.

### UI e temas

- tema claro completo;
- barra de status/navegação alinhada ao tema;
- personalização reorganizada;
- contraste claro corrigido no preview de widget;
- mascotes e acessórios mais legíveis;
- novos companheiros Orbit e Ember.

## Compatibilidade

- App version: `2.2.0`
- Runtime version: `2.2.0`
- Storage version: `5`
- Android package: `com.gustavoaraujo.nexusai`

A 2.2.0 requer APK novo. OTAs com runtime 2.1.1 não podem atualizar a camada nativa do widget 2.2.0.

## Migração

A migração preserva:

- perfil e onboarding;
- planos e histórico;
- tarefas recorrentes;
- XP, níveis e streak;
- chats e memórias;
- roadmaps;
- hábitos, operações e planejamento semanal;
- preferências já existentes.

Campos novos recebem defaults seguros e a migração cria backup anterior à gravação do storage v5.

## Checklist manual

1. Fazer backup JSON na versão instalada.
2. Instalar o APK 2.2.0 por cima.
3. Abrir o app e conferir dados antigos.
4. Testar streaming no Brain.
5. Testar Atlas em cada personalidade.
6. Trocar humor e presença do Companion.
7. Configurar duas instâncias de widget com humores diferentes.
8. Testar troca de página e conclusão de tarefa.
9. Testar Money Mission e o widget financeiro.
10. Remover e adicionar widgets antigos caso o launcher mantenha cache da 2.1.1.
