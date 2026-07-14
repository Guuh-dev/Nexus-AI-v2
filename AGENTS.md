# Nexus AI agent guide — v3.0.0 Core Reborn

## Leitura obrigatória ao iniciar

Este arquivo é o contrato operacional atual. Para entender por que a v3 tomou cada decisão, leia em seguida:

1. `docs/IMPLEMENTATION_REPORT_3_0.md` — escopo, alternativas rejeitadas, auditorias e runbook;
2. `docs/AI_SYSTEM.md` — modelos, capacidades, privacidade, fallback e telemetria;
3. `docs/WIDGETS.md` — contrato compartilhado e implementação Android;
4. `docs/RELEASE_3_0.md` — migração, riscos e ordem de publicação;
5. `docs/ANDROID_QA.md` — validação em Android físico.

Não presuma que backend, CI ou worktree continuam no estado registrado por um relatório histórico. Verifique os três antes de editar.

## Visão do produto

Nexus AI é um Personal Mission OS local-first em Expo Router, React Native, React Native Web e Android. A versão 3.0 concentra o produto em transformar objetivos em uma missão diária, tarefas observáveis, foco, evidência, revisão e próximo passo.

A navegação principal tem exatamente cinco abas:

1. Hoje;
2. Brain;
3. Foco;
4. Progresso;
5. Perfil.

Professor Atlas e roadmaps vivem no Brain. Aparência e Widget Studio partem do Perfil. Não reintroduza dashboards paralelos ou uma nova aba sem uma decisão explícita de produto.

## Escopo mantido e legado

Mantidos:

- onboarding, perfil e diagnóstico;
- missão, tarefas, planejamento, rollover e captura;
- Brain, Atlas, chats, memórias e roadmaps;
- foco, XP, streak, histórico e revisão semanal;
- Companion;
- temas, backup/import, updates e privacidade;
- cinco widgets Android com configuração por instância.

Removidos da superfície e das rotas de produto:

- operações;
- hábitos;
- semana;
- finanças;
- Command Center e layouts de dashboard;
- excesso de skins, acessórios, presets e opções de widget.

Os tipos e dados legados continuam no storage para migração. Não apague seções antigas só porque a UI não as exibe, mas também não exponha novas mutações no Provider nem recrie links para módulos retirados sem uma decisão explícita de produto.

## Mapa do repositório

- `app/`: telas Expo Router e rotas HTTP. Abas em `app/(tabs)/`.
- `components/`: UI compartilhada, cards, editor, mensagens, Companion e preview.
- `features/`: lógica determinística de domínio.
- `providers/NexusProvider.tsx`: estado em memória e mutações persistentes.
- `schemas/`: contratos Zod de storage, planejamento e IA.
- `services/`: storage, IA, status, updates e bridge Android.
- `constants/`: defaults, release e registro de modelos.
- `theme/theme.ts`: fonte única dos seis temas.
- `modules/nexus-widget/`: Kotlin, XML e módulo Expo Android.
- `scripts/`: release, secrets e classificação nativa.
- `tests/`: regressões de domínio, API, UI, storage, workflows e Android.
- `docs/`: arquitetura, IA, widgets, release e QA.

## Regras de IA

A chave OpenRouter existe somente no servidor. Nunca inclua secret em cliente, `EXPO_PUBLIC_*`, fixture, log, widget, backup ou documentação.

`constants/models.ts` contém a allowlist de produção, nesta ordem:

1. `deepseek/deepseek-v4-flash`;
2. `qwen/qwen3-30b-a3b-instruct-2507`.

As duas rotas são pagas, têm custo limitado pela policy, múltiplos endpoints ZDR observados e failover entre provedores. A conta OpenRouter do backend precisa ter créditos. O provider exige `dataCollection: deny`, `zdr: true`, teto de preço e failover entre endpoints do mesmo ID. Não confunda preço promocional de vitrine com preço efetivo do subconjunto ZDR; confirme ambos antes de mudar a allowlist.

Cada requisição usa no máximo esses dois IDs, após retry curto, para respeitar o watchdog. Variáveis de modelo apenas reordenam IDs exatos já presentes na allowlist; variantes gratuitas e pagas nunca são aliases entre si. O único alias de resolução é o slug canônico exato e versionado do primário registrado em código; nunca aceite prefixo ou wildcard.

Capacidades:

- Brain: conversa + português;
- Professor: conversa + instrução + português;
- Roadmap/captura: instrução + estrutura + português;
- revisão: estrutura + evidência + português;
- planejamento: estrutura + planejamento + português;
- safety: validação interna, nunca resposta visível.

Bloqueie IDs de safety, moderation, classifier, guard, embedding, reranker, image-only e vision-only. `openrouter/free` é proibido nos requests. Valide o modelo antes da chamada e o modelo resolvido em cada chunk/resposta.

Retry:

1. modelo principal;
2. retry curto apenas em falha temporária;
3. modelo alternativo compatível;
4. erro honesto e acionável.

Não repita nem tente outro modelo em autenticação ou pagamento: a mesma credencial e conta seriam usadas. Não repita payload de entrada inválido. Bloqueio ou incompatibilidade do modelo resolvido não recebe retry no mesmo candidato, mas pode usar o alternativo explicitamente allowlisted; esse isolamento é uma das razões para manter duas famílias. Nunca concatene uma segunda tentativa depois que conteúdo parcial já ficou visível.

Telemetria pode registrar request ID sanitizado, modo, modelo, tentativa, latência, status, fallback e código de erro. Nunca registre chave, header, prompt completo, memória sensível ou raciocínio.

## Brain e Professor Atlas

Brain deve:

- responder em português natural;
- usar missão, tarefas, roadmap e contexto relevante;
- responder curto primeiro;
- evitar copiar a pergunta;
- propor ação concreta;
- fazer no máximo uma pergunta por mensagem;
- manter histórico e rascunho;
- mostrar conexão/geração real;
- oferecer retry;
- rejeitar rótulos de classificador e texto interno.

Atlas ensina uma etapa por vez. Estrutura padrão: Agora, passos, Entrega, Concluído quando. Ele identifica nível e intenção, pede evidência, corrige e adapta. Não transforme aprendizado em venda sem pedido comercial explícito.

Falha remota no Brain ou Atlas não pode gerar conversa local fingindo ser IA. Planejamento determinístico offline é permitido para manter o app utilizável, sempre com `source: "offline"` e aviso visível.

## Roadmaps

Classifique a intenção usando tópico, nível, objetivo, conhecimento, projeto e contexto específico do roadmap. O objetivo financeiro global não contamina uma trilha técnica.

- “Programação” é técnica: lógica, fundamentos, projeto, arquitetura, debugging, APIs, banco, testes e deploy.
- “Programação com IA” é técnica/aplicada: leitura de código, prompting técnico, arquitetura, validação, testes, debugging, segurança e projeto.
- Comercial só com termos explícitos de venda, clientes, freelance, dinheiro, oferta, prospecção, serviço ou negócio.
- Nível avançado não recomeça do zero.

CRUD deve ser persistente: renomear, arquivar, ativar, excluir e regenerar. Ao remover/arquivar o ativo, escolha outro não arquivado ou limpe o ID. Criação só navega depois de persistir; falha preserva o intake.

## Revisão, planejamento e tarefas

Revisão semanal parte de evidências locais: janela real de sete dias, planejado/concluído, foco, XP, dias ativos, adiamentos e roadmaps. Dados dos módulos retirados continuam preservados no storage, mas não voltam ao contexto remoto nem às métricas ativas. Score é determinístico e `null` quando faltam dados. IA pode organizar fatos e hipóteses, não substituir métricas nem inventar causas.

Toda missão/tarefa deve ser executável:

- título específico;
- contexto;
- primeira ação;
- resultado observável;
- critério de conclusão;
- tempo e prioridade.

Não copie uma meta longa para o card. Não injete vendas em objetivo técnico. Mutações de tarefa e XP devem ser idempotentes.

### Hidratação, rollover e captura

`NexusProvider` só pode consumir ações pendentes de widget depois que o storage foi hidratado. No `AppState` ativo, preserve esta ordem: concluir o rollover devido e confirmar sua persistência; depois consumir ações de widget. Uma falha ao salvar o rollover restaura o plano anterior. O rollover também roda ao retomar o app, não apenas no cold start.

Replan, reset do dia e fallback local nunca podem apagar evidência já produzida no mesmo dia. `mergeSameDayPlanEvidence` preserva tarefas concluídas, missão concluída e o `createdAt` mais antigo. A geração usa fingerprint idempotente: repetir a mesma intenção reutiliza o resultado seguro; reutilizar a mesma chave com payload diferente é conflito, não uma nova gravação silenciosa.

Capturas futuras vivem em uma fila agendada, preservando título, descrição, contexto, passos, resultado, critério de conclusão, recorrência e data. Itens vencidos ou devidos são consumidos uma única vez na hidratação ou retomada; a tela Hoje permite editar a data ou cancelar antes do consumo. Carry-over solicitado pelo usuário é reinjetado deterministicamente depois da geração remota, com itens agendados priorizados, para que a resposta do modelo não o descarte.

## Temas

Existem somente seis temas selecionáveis: Nexus Dark, AMOLED, Glass, Light, Pixel e Minimal. Cada entrada em `NEXUS_THEMES` deve conter todos os tokens de cor e visuais.

Componentes básicos consomem tokens; não criam paletas paralelas. Texto de ação usa `onPrimary`; check sobre sucesso usa `onSuccess`. Preserve contraste AA. Identificadores antigos são convertidos por `resolveThemeId` e pelo storage v6.

## Widgets

Cinco famílias:

- Mini 1×1, zero tarefas;
- Strip 2×1, zero tarefas;
- Companion 2×2, zero tarefas;
- Mission 4×2, até duas tarefas;
- Command 4×4, até quatro tarefas.

`features/widget/render-spec.ts` é o contrato compartilhado por preview, payload e Android. Só exponha uma opção no Studio se Kotlin/RemoteViews puder reproduzi-la. Estilos: Nexus, AMOLED, Transparente, Pixel e Minimal.

Um canal separado de Professor Atlas e aprendizado não é conteúdo de widget na v3. Atlas pode continuar como o mascote único da instância. As flags antigas de segundo Professor/lição continuam no schema apenas para migração/rollback e devem permanecer desativadas em novos saves. Não volte a expor esses controles sem adicionar uma família/campo completo no render spec, preview, payload, XML, Kotlin e QA.

Os mínimos declarados pelo layout e pelo metadata precisam ser idênticos: Mini 40×40 dp, Strip 110×40 dp, Companion 110×110 dp, Mission 250×110 dp e Command 250×250 dp. Preserve o orçamento de padding, tipografia, mascote e linhas no menor tamanho; teste estrutural não substitui launcher físico.

Cada `appWidgetId` mantém configuração própria. Salvar deve persistir, sincronizar payload e pedir redraw. Conclusão de tarefa usa nonce e consumo idempotente. O payload nunca leva secret ou perfil completo. Mudança em Kotlin, XML, Manifest, plugin ou providers exige novo APK.

## Persistência

Storage atual: v6 na chave estável `@nexus-ai/state`. Backup pré-migração: `@nexus-ai/pre-v3.0-backup`.

Preserve perfil, objetivo, plano, tarefas, progresso, histórico, chats, roadmaps e preferências. Recupere coleções item a item. Um campo inválido não deve apagar toda a seção. Converta temas e widgets legados. Storage com versão futura fica bloqueado contra escrita para impedir downgrade.

Todo import passa por limite de 8 MB, bloqueio de versão futura, identidade material, migração, schema e normalização. Um backup importável precisa trazer `installationId` válido, onboarding concluído e perfil completo; objetos vazios, wrappers vazios, chaves alheias ou estado sem perfil concluído não podem virar defaults. Não altere o storage version sem migração e teste.

O Undo de import é um snapshot interno v6 estrito: corrupção não pode ser recuperada tolerantemente nem aparecer como Undo disponível, mas a chave deve permanecer intacta para diagnóstico. A restauração pré-migração percorre candidatos e ignora cópias corrompidas ou sem identidade material.

`nexusRepository.enqueueWrite` serializa `save`, limpeza temporária, reset total, import e rollback. Um save lento anterior não pode ressuscitar dados depois de reset. Import, Undo e reset total adquirem o lock de substituição, abortam e aguardam geração, assistente e sincronização ativa, reconciliam reminder/foco/widget e só então publicam o novo estado. Commits comuns, nova geração, retomada diária e fila do widget não atravessam esse lock.

Não mostre sucesso antes da Promise resolver. Captura, perfil, mensagens antes de chamar IA, criação/regeneração de roadmap, evidência do Atlas, revisão, tarefas, foco e padrão do widget usam persistência confirmada. Se adicionar um fluxo que fecha modal, limpa runtime ou navega, ele também deve aguardar a gravação. A restauração pré-migração sempre salva o estado atual como rollback; dados legados restaurados continuam preservados, mas não voltam ao contexto remoto ou à superfície ativa.

Cancelar um stream do Brain/Atlas sempre remove a mensagem assistente transitória e mantém a mensagem do usuário marcada para retry; cancelamento intencional não exibe falso erro. Actions são propostas discriminadas. Em especial, `update_goal` exige `payload.mainGoal` entre 10 e 600 caracteres no Zod, JSON Schema, prompt e Provider; payload inválido permanece pendente com aviso, nunca é aceito silenciosamente.

Uma sessão de foco recebe `sessionId` estável quando nasce e mantém esse ID no runtime persistido. Registro/retry deduplica por esse ID; o runtime só é limpo depois que a sessão concluída e seus efeitos foram gravados. Reset cancela geração ativa, reminder e runtime em ordem coordenada com a fila do repositório.

Desafios diários usam um ledger por ID. O XP de um desafio concluído é imutável e só pode ser concedido uma vez; reabrir e concluir a mesma tarefa não permite farm. O progresso de desafio concluído permanece no alvo, e desativar desafios remove o desafio gerado atual.

## Render e status

O backend é o export web Expo no Render. A URL nativa permanece em `eas.json`; o nome público é histórico. `GET /api/status` retorna `configured`, `apiVersion: "3.0.0"` e `assistantAvailable`. `POST` executa probe com timeout e cooldown.

Release de APK pode usar o probe explícito, mas OTA de produção deve ser bloqueada pelo contrato GET e não consumir o POST sujeito a cooldown.

Cold start deve aparecer como conexão/timeout/retry. Não esconda indisponibilidade. `render.yaml` usa Node 22, pnpm frozen e health check `/api/status`.

## Testes e validação

Antes de entregar mudança ampla:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run verify
pnpm run release:check
pnpm audit --audit-level=high
pnpm run doctor
pnpm run export:web
pnpm exec expo prebuild --platform android --clean
./android/gradlew :app:assembleDebug
git diff --check
```

Use Node `>=22.13 <23` e pnpm 10. Em Termux sem binário `pnpm`, `corepack pnpm` é aceitável. Um comando impedido por rede, memória ou SDK deve ser relatado exatamente; não declare sucesso.

Estado local observado no snapshot final de 13 de julho de 2026:

- instalação frozen passou;
- typecheck, lint e secret scan passaram; 48 arquivos/276 testes passaram;
- checagem TypeScript adicional com `noUnusedLocals` e `noUnusedParameters` passou;
- `release:check`, audit alto sem vulnerabilidades, Expo Doctor 20/20, verificador nativo e `git diff --check` passaram;
- export web passou com 15 rotas estáticas e 3 rotas API;
- prebuild Android limpo passou;
- o script agregado `verify` não encontra o binário filho `pnpm` neste Termux; seus quatro gates foram executados separadamente por `corepack pnpm` e passaram;
- o Node local 24 gerou o warning de engine esperado; pacote e CI exigem Node 22.14;
- Gradle não foi executado localmente porque o ambiente não possui JDK, Android SDK nem Gradle; a compilação Kotlin/Android continua obrigatória no CI com Node 22.14/JDK 17;
- a reauditoria sênior independente e sua varredura aninhada encerraram com `NO BLOCKER` para commit, push e PR draft.

O backend público ainda respondia `apiVersion: "2.3.1"` nesta data. Isso bloqueia tag, release e distribuição da v3 até o deploy do contrato `3.0.0`, mas não impede abrir um draft PR para executar revisão e CI; não enfraqueça o gate para contornar o bloqueio.

O backend atual não tem autenticação e mantém quotas/idempotência em memória. O endpoint de planejamento combina IP e `clientId`, mas não possui um bucket IP-only resistente a rotação de IDs. Isso é aceitável apenas para uso pessoal/demo; antes de distribuição pública multiusuário, autentique usuários, adote quota durável/compartilhada, limite gasto por conta e acrescente proteção de abuso por IP.

Cobertura mínima por mudança:

- IA: capacidade, modelo resolvido, bloqueio, retry, português e erro;
- roadmap: intenção, nível e CRUD;
- revisão: poucos dados, fatos, hipótese e score;
- tarefa: síntese e contrato observável;
- storage: migração e preservação;
- tema: tokens e contraste;
- widget: render spec, instância, limites, XML e Kotlin;
- navegação: cinco abas e nenhum link legado;
- workflow: Node 22, frozen install, doctor, prebuild e Gradle.

## CI, APK e OTA

CI executa validação JS/web e um job nativo com JDK 17, prebuild limpo e `:app:assembleDebug`. Security usa audit alto, secret scan e CodeQL. EAS CLI fica fixado nos workflows.

`runtimeVersion` segue `appVersion`. Mudança nativa ou de versão precisa de novo APK-base. OTA só é permitida quando o detector confirma que não houve mudança nativa desde a tag instalada. Não desative o detector, anti-bricking ou confirmações de produção/rollback.

## GitHub e disciplina de trabalho

- Repositório: `Guuh-dev/Nexus-AI-v2`.
- Não trabalhe em `main` sem solicitação explícita.
- Preserve alterações do usuário e mudanças não relacionadas.
- Commits devem ser pequenos e explicáveis por área.
- Não force push sem autorização.
- Não faça merge; abra PR draft quando solicitado.
- Procure marcadores de conflito e rode `git diff --check` antes de push.

## Proibido

- secret no cliente;
- `openrouter/free` em geração;
- classificador como resposta;
- fallback conversacional local disfarçado;
- evidência inventada;
- ação da IA sem confirmação;
- nova opção visual sem implementação real;
- limpar dados legados por conveniência;
- publicar código nativo por OTA;
- declarar release pronta sem testes completos e APK compilável.
