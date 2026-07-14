# Relatório de implementação — Nexus AI 3.0 Core Reborn

Atualizado em 13 de julho de 2026. Este documento registra a reconstrução executada na branch `release/v3.0.0-core-reborn`, as decisões que não podem ser inferidas apenas pelo diff e o estado necessário para outra sessão continuar sem depender do histórico de conversa.

O contrato operacional vigente continua em [`AGENTS.md`](../AGENTS.md). Leia também [`AI_SYSTEM.md`](AI_SYSTEM.md), [`WIDGETS.md`](WIDGETS.md), [`RELEASE_3_0.md`](RELEASE_3_0.md) e [`ANDROID_QA.md`](ANDROID_QA.md) antes de alterar IA, storage, widgets ou release.

## Objetivo e resultado de produto

A v3 reduz o Nexus ao ciclo que possui começo, execução e evidência:

1. entender perfil e objetivo;
2. sintetizar uma missão diária;
3. executar tarefas e foco;
4. aprender com Brain e Professor Atlas;
5. comprovar lições e corrigir a próxima etapa;
6. revisar a semana com dados locais;
7. mostrar a próxima ação no app e no widget.

A navegação principal possui somente Hoje, Brain, Foco, Progresso e Perfil. Professor Atlas e roadmaps vivem no Brain; aparência e Widget Studio partem do Perfil.

## Mantido, removido e preservado

### Mantido e reconstruído

- onboarding, perfil e diagnóstico pessoal;
- missão, plano diário, tarefas, rollover e captura;
- Brain, chats, memórias controladas e retry;
- Professor Atlas, intake, roadmaps e evidência por lição;
- Focus OS, XP, streak, conquistas e histórico;
- revisão semanal remota baseada em métricas locais;
- Companion com sete personalidades funcionais;
- seis temas completos;
- backup, importação, migração e recuperação;
- Widget Studio e cinco famílias Android;
- status, deploy, CI, segurança, APK e controles OTA.

### Removido da superfície de produto

- operações;
- hábitos;
- planejamento semanal paralelo;
- placar financeiro;
- Command Center e dashboards configuráveis;
- rotas antigas correspondentes;
- tamanhos, skins, presets e opções de widget sem paridade nativa;
- ação nova de IA que iniciava um módulo oculto.

As seções legadas continuam no schema do storage v6. Isso é intencional: uma atualização não apaga o histórico de uma instalação 2.x. O Provider da v3 não deve voltar a expor mutações dessas áreas sem uma decisão explícita de produto.

## Arquitetura de IA reconstruída

### Comportamento anterior

O caminho padrão usava `openrouter/free`, que seleciona aleatoriamente um modelo gratuito disponível. O modelo `deepseek/deepseek-v4-flash` existia apenas como fallback pago opcional, controlado por variável de ambiente. Na prática, a resposta podia vir de um modelo com finalidade incompatível, e desligar o fallback pago deixava o app dependente de uma rota variável.

### Comportamento final

A produção usa uma allowlist de dois IDs, nesta ordem:

1. `deepseek/deepseek-v4-flash`;
2. `qwen/qwen3-30b-a3b-instruct-2507`.

O primeiro prioriza qualidade geral, raciocínio, código, redundância de provedores e contexto amplo. O segundo adiciona diversidade de família, instrução multilíngue, structured output e uma alternativa leve em modo não-thinking.

O backend:

- declara capacidades por modo;
- rejeita IDs desconhecidos ou com sinais de classifier, moderation, guard, embedding, reranker, image-only ou vision-only;
- valida o ID solicitado e o ID resolvido pelo provedor;
- exige `dataCollection: deny` e `zdr: true`;
- permite failover entre endpoints do mesmo ID;
- prioriza throughput;
- limita preço a US$ 0,15 por milhão de tokens de entrada e US$ 0,55 por milhão de saída;
- registra somente metadados sanitizados de tentativa;
- inclui schema e validação semântica dentro do loop de fallback;
- compartilha um prazo total entre tentativas para preservar tempo ao alternativo;
- nunca usa uma resposta local genérica para fingir Brain, Atlas, roadmap ou revisão remota.

### Decisões de modelo auditadas

Preços abaixo são um retrato de 13 de julho de 2026 e podem mudar.

| Papel anterior ou candidato | Decisão final | Motivo objetivo |
| --- | --- | --- |
| `openrouter/free` como rota padrão | removido | seleção aleatória, capacidade e política variáveis, limites menores e latência de pico; inadequado para uma experiência previsível. |
| `deepseek/deepseek-v4-flash` como fallback opcional | mantido e promovido a primário | não foi uma troca por preferência: o modelo já existia no projeto e apresentou o melhor conjunto de qualidade, preço baixo, contexto e redundância. |
| `qwen/qwen-2.5-72b-instruct:free` como candidato | rejeitado antes da publicação | o ID não possuía endpoint ativo na auditoria, apesar de sua ficha continuar acessível. |
| `openai/gpt-oss-20b:free` como candidato | rejeitado antes da publicação | havia somente um endpoint gratuito e a variante não atendia a política de disponibilidade/privacidade exigida. |
| ausência de alternativo fixo confiável | Qwen3 30B A3B Instruct | adiciona um segundo modelo conhecido, multilíngue, estruturado e econômico sem criar alias entre variantes pagas e gratuitas. |

Na auditoria, a vitrine do DeepSeek exibia US$ 0,09/US$ 0,18 por milhão de tokens de entrada/saída e contexto anunciado de 1M. Seus 12 endpoints ZDR observados custavam US$ 0,09–0,15/US$ 0,18–0,28; a janela anunciada por endpoint variava de 65.536 a cerca de 1M. A vitrine do Qwen exibia desconto de US$ 0,04815/US$ 0,1931 e 131K, mas esse endpoint promocional não constava na lista ZDR; os quatro endpoints Qwen elegíveis custavam US$ 0,09–0,15/US$ 0,30–0,55 e anunciavam 262K. O Nexus considera o limite de modelo de 131K como referência segura para o Qwen. Os caps atuais aceitam essas faixas, embora status e suporte a parâmetros ainda possam reduzir o conjunto em runtime. O roteador gratuito permanece nominalmente mais barato, mas custo zero isolado não compensava respostas incompatíveis, rate limits e indisponibilidade. A policy combina teto explícito com ordenação por throughput para proteger custo e tempo percebido; ela não prova que o alternativo seja mais rápido, então latência deve ser medida em produção.

O provedor publica `deepseek/deepseek-v4-flash-20260423` como slug canônico do primário. A allowlist aceita exatamente esse slug apenas ao validar o modelo resolvido retornado pela API, enquanto as requisições continuam usando `deepseek/deepseek-v4-flash`; slugs parecidos e wildcards seguem bloqueados.

## Brain e Professor Atlas

O Brain foi reconstruído para manter conversa persistente, rascunho e thread corretos durante falhas ou troca de tela. Ele mostra conexão/geração reais, publica somente texto validado, oferece retry e não reutiliza metadado de uma resposta anterior.

O contexto remoto é compacto e inclui:

- perfil e preferências de experiência relevantes;
- missão e tarefas atuais;
- foco e histórico recente;
- memórias controladas;
- roadmap ativo priorizado;
- próxima lição, entrega, critério e evidência atual.

O Professor Atlas ganhou ciclo fechado por lição:

1. o usuário envia uma entrega;
2. ela é persistida como submetida;
3. o backend recebe o critério da lição e a evidência;
4. a resposta estruturada aceita ou pede revisão;
5. feedback e próximo ajuste ficam visíveis;
6. XP e conclusão mudam somente quando a evidência é aceita;
7. reenvio usa a correção anterior como contexto.

O checkbox que permitia concluir uma lição sem evidência não faz parte do fluxo v3.

## Roadmaps, tarefas e revisão

O classificador de intenção separa habilidade técnica, técnica aplicada, aprendizagem geral, produto, comercial, carreira, prova, saúde e outros objetivos. Termos financeiros do perfil global não transformam um tópico técnico em vendas. Conteúdo comercial exige intenção explícita no intake.

Roadmaps suportam ativar, renomear, arquivar, excluir e regenerar. Remover ou arquivar o ativo escolhe outro candidato válido ou limpa o ID. A criação e regeneração passam por schema, normalização e validação semântica antes de persistir.

Missões e tarefas possuem título curto, contexto, primeiro passo, resultado esperado, critério de conclusão, tempo, prioridade e XP. O card recolhido mostra informação suficiente para começar. O editor preserva descrição e contexto como campos distintos.

A revisão semanal calcula localmente janela, tarefas, conclusão, foco, XP, dias ativos, adiamentos e roadmaps. Score pode ser nulo quando faltam dados. A resposta remota pode acrescentar hipóteses explicitamente marcadas; métricas e recomendações permanecem derivadas de evidências auditáveis.

## Estado local, foco e backups

O storage v6 preserva perfil, plano, tarefas, progresso, histórico, chats, roadmaps, preferências e seções legadas. Migrações gravam backup antes da conversão. Coleções são recuperadas item a item, preservando entradas recentes em coleções append-only e entradas prioritárias nas listas ordenadas por relevância.

Um storage de versão futura, ilegível ou sem snapshot de migração seguro abre uma tela somente leitura e nunca um onboarding falso. Imports usam limite único de 8 MB, exigem identidade material (`installationId`, onboarding concluído e perfil válido), oferecem preview, confirmação e snapshot reversível. Undo aceita apenas snapshot interno v6 estrito; uma chave corrompida é preservada para diagnóstico, mas não aparece como restauração disponível. O formulário de perfil sincroniza depois da importação. A área Dados detecta a cópia pré-migração, restaura de forma transacional, salva o estado atual como rollback e tenta candidatos antigos quando o snapshot mais recente está corrompido.

Mutações comuns continuam otimistas na memória, mas a mensagem de sucesso só aparece depois que a fila serializada confirma a gravação. Fluxos que fecham tela, navegam ou acionam IA — captura, perfil, mensagens, criação/regeneração de roadmap, evidência do Atlas e revisão semanal — aguardam persistência confirmada. Em falha sem concorrência, o estado otimista é revertido para impedir captura duplicada ou confirmação falsa.

O Focus OS persiste estados running, paused e completed. Ao terminar, o rascunho concluído continua salvo até o usuário registrar ou descartar a sessão. Escritas são serializadas para impedir que uma atualização antiga sobrescreva a mais nova.

### Correções finais de integridade

A revisão integrada encontrou corridas e confirmações falsas que não apareciam nos fluxos felizes. O snapshot final passou a obedecer aos seguintes contratos:

- hidratação primeiro: ações pendentes do widget só são consumidas depois que o Provider carregou o storage;
- retomada ordenada: ao voltar para `active`, o rollover devido é persistido antes de qualquer ação de widget; falha restaura o plano anterior;
- evidência imutável no dia: replan, reset e fallback local preservam tarefas concluídas, missão concluída e o `createdAt` original;
- geração idempotente: fingerprint igual reutiliza a operação segura, enquanto a mesma chave com payload divergente é rejeitada como conflito;
- carry-over determinístico: pedidos de carry são reinjetados depois da resposta remota, com capturas agendadas priorizadas;
- fila de captura completa: uma captura futura mantém descrição, contexto, passos, resultado, critério, recorrência e data, pode ser editada/cancelada em Hoje e é consumida uma só vez quando vence;
- persistência confirmada: editar/excluir/adiar tarefa, salvar perfil, concluir foco, criar/regenerar roadmap, navegar após Discovery, renomear/excluir no Brain e operações de import/reset só fecham ou navegam depois do save;
- foco idempotente: cada sessão recebe um `sessionId` estável, retry deduplica pelo ID e o runtime só é limpo após a gravação durável;
- reset sem ressurreição: save lento, runtime de foco, reminder e geração em curso são coordenados com a fila antes de limpar o estado;
- ledger de desafios: recompensa é concedida uma única vez por ID, reabrir tarefa não cultiva XP e desafio concluído conserva o progresso final;
- substituição transacional: import, Undo e reset bloqueiam commits comuns, abortam e aguardam IA/geração/sincronização ativa e reconciliam storage, reminder, foco, widget e React antes de liberar o estado;
- stream cancelado: fragmento transitório do Brain/Atlas é sempre removido, a mensagem do usuário fica disponível para retry e um cancelamento intencional não vira erro falso;
- ações de assistente honestas: `create_task` só confirma depois de observar delta persistido; `update_goal` exige `payload.mainGoal` no tipo, Zod, JSON Schema, prompt e Provider; revisão do Atlas distingue não salvo, salvo aguardando revisão e revisado;
- revisão semanal explícita: fatos e hipóteses aparecem separados, sem métricas de módulos retirados;
- status honesto: `GET` informa configuração/contrato; somente o probe `POST` bem-sucedido afirma que o backend respondeu.

O repositório agora serializa também limpeza temporária, reset total, import e rollback, não apenas saves comuns. Imports vazios, wrappers vazios, objetos sem identidade material ou sem perfil concluído são recusados em vez de serem normalizados silenciosamente para defaults.

## UI e temas

Os temas selecionáveis são Nexus Dark, AMOLED, Glass, Light, Pixel e Minimal. Todos compartilham tokens de fundo, superfícies, texto, primário, estados semânticos, bordas, overlay, tab bar, sombra, glow e geometria.

Foram corrigidos:

- contraste de texto primário, secundário, warning e danger;
- texto sobre ações primárias e sucesso;
- ErrorBoundary no tema claro;
- cores fixas em componentes centrais e mascotes;
- branding de versão;
- Companion visível mesmo com fala desligada;
- parâmetro de deep link do Brain consumido uma única vez;
- toast antes apresentado sempre como sucesso;
- coordenada de campo focado em formulários aninhados;
- contexto separado no editor de tarefa;
- estados vazios, erro e loading nas telas do núcleo.

## Widget Studio e Android

As famílias finais são Mini 1×1, Strip 2×1, Companion 2×2, Mission 4×2 e Command 4×4. `WidgetRenderSpec` define família, campos, limite, aparência, conteúdo, privacidade, mascote, ação e estado vazio.

O Studio expõe apenas escolhas representáveis pelo Android. O preview e o payload derivam do mesmo contrato. Salvar o padrão aguarda AsyncStorage, sincronização e redraw reportado pelo bridge; salvar uma instância aguarda a operação nativa que persiste e redesenha. A sincronização de abertura ocorre uma vez, sem o redraw duplo que existia no primeiro snapshot. Configurações são independentes por `appWidgetId`.

O módulo nativo normaliza ações antigas para destinos do núcleo, valida se uma Activity exportada recebeu um ID pertencente a um provider Nexus, restaura defaults do payload para instâncias novas e preserva nonce/idempotência em ações de tarefa. Recursos e previews sem consumidor foram removidos.

Uma revisão independente encontrou que o intake ainda prometia um segundo Professor/próxima lição no widget, embora o renderer v3 nunca mostrasse esse canal. A superfície foi reduzida de forma explícita: controles, payload, IDs XML e chamadas Kotlin mortos saíram; Atlas e roadmaps continuam completos dentro do app, e Atlas ainda pode ser o mascote único de uma instância. As flags antigas seguem no schema/storage para restauração de backups, mas novos presets e saves as mantêm desligadas.

Também foram alinhados metadata e raiz dos cinco layouts nos mínimos 40×40, 110×40, 110×110, 250×110 e 250×250 dp. Mini/Strip receberam conteúdo compatível com uma célula baixa; Companion, Mission e Command tiveram padding, mascote, tipografia, linhas e altura de tarefas ajustados. Um teste estrutural protege os pares de dimensões e os principais orçamentos, sem alegar que isso substitui Gradle ou QA físico.

Como Kotlin, XML, providers e plugin mudaram, a v3 exige novo APK-base. Nenhuma dessas alterações pode ser publicada somente por OTA.

## Workflows e produção

O CI usa Node 22.14, pnpm 10 e instalação frozen. Ele executa verify, release check, Expo Doctor, config/export web, prebuild Android, compilação Gradle e diff check. Security executa audit alto, secret scan e CodeQL.

OTA de produção só pode partir de `main`, com confirmação explícita e diff contra a base instalada. Uma tag de release deve corresponder à versão, pertencer à história de `main` e passar pelo gate do backend v3 antes do build/publicação.

A OTA de produção agora também consulta `GET /api/status` antes do EAS Update e exige versão, identidade, configuração, disponibilidade e capacidades v3. Ela deliberadamente não usa o probe POST, evitando bloqueio de publicação por cooldown/rate limit de uma operação de diagnóstico.

Em 13 de julho de 2026, o endpoint público ainda respondia `apiVersion: "2.3.1"`. Deploy, tag, release e distribuição da v3 permanecem bloqueados até ele servir o contrato `3.0.0`; o bloqueio não impede abrir um draft PR para revisão e CI. Não altere o cliente para aceitar uma API antiga e não remova o gate para contornar o deploy pendente.

O backend permanece adequado a uso pessoal/demonstração, não a SaaS público multiusuário: não há autenticação, quotas e idempotência são locais a cada processo e o planejamento não possui bucket IP-only resistente à rotação de `clientId`. Antes de distribuição pública, mover quotas/idempotência para armazenamento compartilhado, autenticar usuários, impor orçamento por conta e adicionar proteção de abuso por IP são requisitos de produção.

## Trabalho com subagentes

O trabalho foi dividido em frentes independentes, todas na mesma branch. “Read-only” significa que o agente apenas auditou e reportou; “implementação” significa que ele editou a worktree compartilhada e o agente principal integrou e validou o resultado.

| Frente | Natureza | Resultado incorporado |
| --- | --- | --- |
| `audit_ai_core` (Pauli) | read-only, auditoria inicial de IA/API | mapeou roteamento, fallback, contexto, prompts, status e evidência. |
| `audit_infra_data` (Peirce) | read-only, auditoria inicial de storage/infra | mapeou migração, import, release, workflows e riscos de produção. |
| `audit_ui_widgets` (McClintock) | read-only, auditoria inicial de UI/widget | mapeou navegação, paridade visual, opções sem efeito e riscos Android. |
| `senior_review_ai` (Feynman) | implementação + revisão do núcleo remoto | fechou `evidence_review`, validação semântica por tentativa, deadline, retry, metadados e probe; 47 testes focados passaram no snapshot entregue. |
| `senior_review_product` (Chandrasekhar) | implementação + revisão de produto/UX | fechou revisão semanal auditável, privacidade, contraste, deep link, editor, Companion e feedback semântico; 22 testes focados passaram. |
| `implement_product_core` (Bacon) | implementação de widget/native/release | alinhou Studio, preview, bridge, Kotlin/XML, OTA e gates; 37 testes do recorte passaram, além de prebuild e verificador nativo. |
| `provider_integration_review` | read-only após integração | encontrou confirmação antes de persistir, backup pré-migração órfão, redraw duplicado, captura insegura e mutadores legados; todos viraram correção ou teste. |
| `fix_plan_idempotency` | implementação focada | corrigiu fingerprint/conflito de geração e verificou que TaskEditor, Hoje, Foco, Discovery, Brain e Roadmap só concluem o fluxo após persistência confirmada. |
| `fix_native_release_truth` | implementação focada | removeu controles nativos sem renderer, alinhou dimensões e orçamento visual e tornou o gate OTA dependente do contrato GET, sem consumir o probe POST. |
| `fix_roadmap_state` | implementação focada | fechou persistência, ativação e semântica de regeneração/reenvio dos roadmaps. |
| `fix_rollover_overflow` | implementação focada | corrigiu overflow, IDs estáveis, recuperação local e carry-over sem duplicação. |
| `fix_challenge_ledger` | implementação focada | criou o ledger imutável de recompensa e, na rodada final, fechou import transacional e o contrato discriminado de `update_goal`. |
| `final_senior_audit` | read-only, revisão independente | entrou sem participação anterior, revisou regressões, código morto, duplicações, fluxos quebrados, prompts, imports, arquivos órfãos, UX e riscos de produção; a primeira passagem expôs as corridas de hidratação/reset/foco, perda de evidência, captura agendada incompleta, farm de XP e confirmações falsas corrigidas neste relatório. |
| `final_model_prompt_scan` | read-only, varredura aninhada do auditor final | verificou modelos, prompts, respostas estruturadas, status e semântica de fallback. |
| `final_native_release_scan` | read-only, varredura aninhada do auditor final | verificou Studio, Kotlin/XML, dimensões, OTA, workflows e veracidade dos gates nativos. |
| `final_deadcode_ux_rescan` | read-only, rechecagem aninhada final | repetiu imports não usados, código morto e contratos de UX; encontrou o último narrowing de `create_roadmap` e confirmou o snapshot corrigido. |

Os dados legados permanecem somente no schema/storage. Seus mutadores, conquista residual, métricas semanais, payload de widget e contexto remoto foram removidos. A rechecagem read-only do snapshot congelado terminou com veredito explícito `NO BLOCKER` para commit, push e abertura do PR draft. Isso não autoriza merge, tag ou release.

## Evidência de validação

Resultados realmente executados no snapshot de 13 de julho de 2026:

| Gate | Resultado |
| --- | --- |
| instalação frozen | passou no snapshot final |
| typecheck | passou |
| lint | passou |
| testes | passaram: 48 arquivos, 276 testes |
| TypeScript `noUnusedLocals`/`noUnusedParameters` | passou |
| secret scan | passou |
| release check | passou |
| audit alto | passou, sem vulnerabilidade reportada |
| Expo Doctor | passou, 20/20 checks |
| export web | passou: 15 rotas estáticas e 3 rotas API |
| prebuild Android limpo | passou no snapshot final |
| Gradle debug | não executado localmente: ambiente sem JDK, Android SDK e Gradle; obrigatório no CI |
| XML/Kotlin/widget verifier | passou |
| `git diff --check` | passou |
| revisão sênior independente do snapshot corrigido | `NO BLOCKER` para commit/push/PR draft; child final também PASS |
| backend público | bloqueia tag/release, não o draft PR: ainda responde `apiVersion: 2.3.1` e precisa de `3.0.0` antes da distribuição |

## Runbook para a próxima sessão

1. confirme que está em `release/v3.0.0-core-reborn`, rode `git status --short --branch` e nunca assuma que a worktree está limpa;
2. leia `AGENTS.md` e os documentos ligados no primeiro parágrafo deste relatório;
3. verifique o backend público com `GET /api/status` antes de diagnosticar o cliente;
4. se código mudou desde este relatório, rode `pnpm install --frozen-lockfile` e toda a sequência de validação do `AGENTS.md` em Node 22;
5. preserve a ordem hidratação → rollover persistido → ações de widget ao tocar no Provider;
6. preserve evidência ao replanejar/resetar, consumo único de captura agendada, `sessionId` estável de foco e ledger idempotente de desafios;
7. trate falha de Brain/Atlas como falha remota, não acrescente fallback conversacional local;
8. não adicione modelo sem dados atuais de preço, endpoints, privacidade, contexto e teste de capacidade;
9. não exponha opção de widget sem implementar preview, payload e RemoteViews;
10. preserve seções legadas no storage, mesmo que não existam rotas para editá-las;
11. não publique OTA quando o diff contiver runtime, config nativa, Kotlin, XML, Manifest, provider ou plugin;
12. não faça merge automático; o draft PR precisa da rechecagem sênior sem blocker, enquanto merge/tag/release exigem backend v3 e CI verde.
