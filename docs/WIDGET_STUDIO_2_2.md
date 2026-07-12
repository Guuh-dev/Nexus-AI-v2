# Widget Studio 2.2

## Modelo

Cada widget Android possui preferências independentes salvas por `appWidgetId`. O aplicativo envia um payload compacto comum, enquanto o provider combina esse payload com a configuração da instância.

## Presets

| Preset | Conteúdo principal |
| --- | --- |
| Mission Card | Missão e progresso do dia. |
| Smart Plan | Prioridade, bloco ideal e próxima ação. |
| Daily Command | Missão, tarefas e métricas. |
| Do It Now | Uma única ação executável. |
| Focus Card | Tempo focado e início de bloco. |
| Atlas Lesson | Próxima lição e progresso. |
| Roadmap Pulse | Assunto e andamento do roadmap. |
| Nexus Companion | Mascote, humor e fala. |
| Nexus Quote | Frase curta contextual. |
| Quiet Status | Estado mínimo e discreto. |
| XP Core | XP e nível. |
| Streak Flame | Sequência atual. |
| Boss Battle | Desafio e progresso. |
| Habit Grid | Hábitos concluídos e próximo hábito. |
| Money Mission | Receita e meta mensal. |
| Freelance Radar | Prospects, follow-ups e clientes. |

## Conteúdo

Modos suportados:

- `mission`
- `tasks`
- `smart`
- `focus`
- `learning`
- `companion`
- `finance`
- `quote`
- `progress`
- `habits`
- `boss`

## Visual

- Nexus
- AMOLED
- Transparent
- Glass
- Pixel
- Minimal
- Gamer
- Neon
- Mascot
- Privacy
- Light Clean

A prévia do app usa os mesmos tokens conceituais do provider nativo, mas `RemoteViews` possui limitações diferentes do React Native. Blur real, fontes arbitrárias e animações contínuas não são garantidos no launcher.

## Ações

Destinos possíveis:

- Today
- Brain
- Focus
- Quick Capture
- Progress
- Finance
- Habits
- Week

A conclusão de tarefa e a troca de página usam nonce por instalação para reduzir a possibilidade de intents externas forjadas. A sincronização de XP continua idempotente quando o app consome a fila de ações.

## Páginas

Quando `allowPageCycle` está ativo, o botão de página alterna o conteúdo compatível da instância sem alterar outras instâncias. O estado da página fica no armazenamento privado do widget.

## Privacidade

`privacyMode` substitui missão, tarefas e outros campos sensíveis por rótulos neutros. O payload nunca contém a chave OpenRouter ou o perfil completo.

## Limite OTA

Alterações em presets e preview JS podem ser OTA quando o runtime é compatível. Mudanças no provider Kotlin, layouts XML, drawables, plugin do Expo ou manifest exigem novo APK.
