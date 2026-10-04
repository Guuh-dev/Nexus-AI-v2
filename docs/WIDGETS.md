# Widgets do Nexus AI 3.0 (famílias utilitárias em 3.1)

## Um contrato, duas renderizações

`features/widget/render-spec.ts` é a fonte de verdade do Studio e do Android. O `WidgetRenderSpec` v3 define família, conteúdo, campos visíveis, limite de tarefas, estilo, cores, opacidade, privacidade, Companion, ação principal e estado vazio.

O preview React Native reproduz os mesmos rótulos, limites, métricas, mensagens vazias e ocultações do `RemoteViews`. Os layouts XML também contêm uma amostra estática coerente, usada pelo seletor de widgets antes da primeira sincronização.

## Famílias suportadas

| Família | Células | Mínimo anunciado | Conteúdo |
| --- | --- | --- | --- |
| Mini | 1×1 | 40×40 dp | Mascote e streak ou XP. |
| Strip | 2×1 | 110×40 dp | Próxima ação ou progresso. |
| Companion | 2×2 | 110×110 dp | Mascote, personalidade e fala curta. |
| Mission | 4×2 | 250×110 dp | Missão, até duas tarefas e progresso. |
| Command | 4×4 | 250×250 dp | Missão, até quatro tarefas, foco, progresso e Companion. |
| Timer | 2×2 | 110×110 dp | Sessão de foco com tempo ao vivo (Chronometer) e anel do alvo. |
| Captura | 2×1 | 110×40 dp | Atalho de um toque para a captura rápida. |
| Sequência | 4×2 | 250×110 dp | Mapa de 12 semanas, sequência e horas de foco. |

As três últimas são utilitárias: usam layouts e ids próprios, renderizados por `NexusUtilityWidgets.kt`. O app só as mostra no Studio quando o APK instalado declara `utilityWidgetsSupported`.

- Timer: o payload leva `focusElapsedSeconds`, `focusRunStartedAt`, `focusTargetMinutes` e `focusTaskTitle`. O Chronometer conta no launcher a partir desses valores. Tocar abre o Foco; pausar e retomar continuam no app, que é a única fonte do runtime persistido. Se o alvo passar com o app fechado, o widget continua contando até o app reabrir e aplicar a pausa no alvo.
- Captura: abre `nexusai://today?capture=1`, o mesmo destino do atalho do launcher.
- Sequência: `features/widget/activity.ts` calcula 84 níveis (0 a 4) só com minutos de foco não cancelados e tarefas concluídas. O Kotlin desenha a grade em bitmap. Em modo privado o payload não leva `activity`.

O provider registrado no launcher define a família real. Uma configuração armazenada não pode trocar essa família; para isso, remova a instância e adicione outra.

O canal separado de Professor Atlas e próximas lições continua no Brain, no plano diário e nos roadmaps, não no widget. Atlas ainda pode ser escolhido como o único mascote de uma família compatível, pois essa opção é renderizada de verdade. Os controles antigos de “segundo Professor” e lição não tinham saída no renderer v3 e foram retirados da interface e do payload. Os dois campos legados continuam aceitos pelo storage para importar e restaurar backups antigos, mas são ignorados e desativados no próximo salvamento do Studio.

## Opções reais

Os estilos mantidos são Nexus, AMOLED, Transparente, Pixel e Minimal. Valores antigos são normalizados para um desses estilos. Opacidade zero sempre se torna Transparente.

A fala possui somente dois modos com comportamento distinto:

- `contextual`: usa a linha contextual do Companion;
- `silent`: exibe apenas “Nexus ativo.”.

A ação principal aceita somente Hoje, Brain, Foco ou Progresso. Rotas armazenadas por versões antigas são migradas para Hoje e nunca abrem telas removidas.

## Configuração por instância

O padrão do app alimenta widgets sem configuração própria. Cada `appWidgetId` pode sobrescrever conteúdo, estilo, cor, opacidade, mascote, personalidade, fala, privacidade e ação ao tocar.

A tela nativa de configuração valida se o ID pertence exatamente a um dos providers Nexus. As famílias utilitárias não declaram `android:configure`; são ajustadas pelo Studio. Ela começa com os valores do `WidgetRenderSpec` da família, sobrepõe uma configuração já salva e preserva cores personalizadas e privacidade. O Studio só confirma “atualizado” depois que a ponte nativa confirma persistência e redesenho.

## Privacidade

`privateMode` faz parte do contrato serializado, inclusive por instância. Quando ativo:

- missão, próxima ação e títulos de tarefas são substituídos;
- fala do Companion vira conteúdo protegido;
- streak, XP, foco, totais e barra de progresso são ocultados ou neutralizados;
- o preview do Studio segue exatamente as mesmas regras.

O payload nunca inclui chave de IA, prompt, perfil completo nem histórico de conversa.

## Interações

A raiz usa um `PendingIntent` para uma das quatro rotas permitidas. Mission e Command também têm a pílula Focar, que abre `nexusai://focus`. Tarefas visíveis em Mission e Command podem ser concluídas pelo widget. A ação carrega nonce, atualiza o payload compacto e entra em uma fila limitada; o app consome essa fila de forma idempotente.

## Validação nativa

Mudanças em Kotlin, XML, Manifest, plugin Expo ou metadados de provider exigem um APK novo. Antes de liberar:

```bash
pnpm exec expo prebuild --platform android --clean
bash scripts/verify-native-widget.sh
./android/gradlew :app:assembleDebug
```

Depois, instale em Android físico e valide as oito famílias, a configuração inicial, a reconfiguração, o modo privado, os estados vazios e a conclusão de tarefas.

Os testes estruturais comparam `minWidth`/`minHeight` de cada layout com seu `appwidget-provider` e protegem os orçamentos compactos de Mini, Strip, Companion, Mission e Command. Eles reduzem regressões óbvias de corte; a aceitação final de launcher, densidade e escala de fonte continua sendo feita em aparelho físico.

## Atualização de 2026-10-02

Mini, Strip e Companion passam de resizeMode none para horizontal|vertical;
Mission/Command já suportavam ambos. Mínimos/máximos permanecem declarados;
família e grade do launcher determinam limites. Não é resize arbitrário por pixel.
Sete personalidades, combinadas com as seis poses e cenários existentes, usam
grids compartilhados entre preview e vetores Kotlin. Escolha por instância: não
copie a personalidade global sobre uma configuração já salva. Quieto/Silencioso
não fabrica uma pausa observada. Cena mantém proporção ao redimensionar.
Novo APK obrigatório, payload continua v3; launcher físico ainda precisa de QA.
