# Changelog

## 2.2.0 — Companion, Streaming AI & Widget Studio 2.2

- Adicionado Nexus Companion com sete personalidades, três níveis de presença, falas contextuais e configuração independente por widget.
- Brain e Professor Atlas agora usam streaming SSE, respostas compactas, Markdown legível e ações rápidas para simplificar, guiar ou transformar conteúdo em tarefa.
- Professor Atlas passou a ensinar uma etapa por vez, com objetivo, ação, entrega e critério de conclusão claros.
- Criados 16 presets de widget cobrindo missão, foco, Atlas, Companion, XP, streak, Boss Battle, hábitos, finanças e freelance.
- Widget Android ampliado com humor, fala, acessório, conteúdo e páginas independentes por instância, além de troca de página protegida por nonce.
- Adicionado Money Mission local-first para receita, meta mensal, prospects, follow-ups, clientes e fechamentos.
- Storage atualizado para v5 com migração segura de Companion, Widget Studio e finanças.
- Adicionados tema Light Clean, barra de sistema dinâmica, temas mais distintos e contraste correto no preview claro de widgets.
- Mascotes e acessórios ganharam maior legibilidade e expressões; Orbit e Ember entraram como novos companheiros.
- Atualizadas API, runtime, release checks, documentação e testes para a base nativa 2.2.0.
- Reforçadas validações do assistente, limites de contexto, diagnóstico sanitizado e segurança de ações nativas.

## 2.1.1 — Recovery, OTA & Build Reliability

- Corrigido o travamento infinito em 2 de 4 após o onboarding, causado pelo cleanup que abortava a geração durante rerenders do loading.
- Adicionados timeout remoto, watchdog absoluto de 50 segundos, retry e recuperação por plano local.
- Cancelamentos agora distinguem ação do usuário, timeout, recuperação e desmontagem sem apagar respostas.
- Corrigidos teclado Android, Safe Area, fundo inferior, rodapés e barras do sistema.
- Adicionados `expo-updates`, runtime por versão, canais preview/production e controles de atualização no Perfil.
- Adicionados detector de mudanças nativas, OTA preview/production, APK manual, release com APK e rollback.
- Migrados Replit, Render, CI, Security e EAS para pnpm 10, eliminando o bug interno do `npm ci`.
- Reforçada idempotência por cliente, validação de client ID, secret scan e segurança de inputs dos workflows.
- Dependências auditadas e lockfile estabilizado sem vulnerabilidades conhecidas no audit final.

## 2.1.0 — Stability, UI & Widget Studio

- Corrigido o falso erro de campo vazio na entrevista do Professor Atlas: conhecimento e tentativa anterior agora são validados separadamente e mensagens invisíveis não contam como resposta.
- Formulários, onboarding, diagnóstico, Professor, captura rápida e editor de tarefas agora respeitam o teclado Android e mantêm ações visíveis.
- Perfil reorganizado em Central, Perfil, Visual, Sistema e Dados.
- Progresso reorganizado em Resumo, Desafios e Histórico.
- Widget Studio ampliado com presets, nove tamanhos, dez estilos, densidade, alinhamento, bordas, cantos, glow, rótulo, métricas, captura, ação ao toque e preview adaptativo.
- Widget Android atualizado para refletir as novas escolhas e configurações independentes por instância.
- Storage atualizado para v4 com migração segura das preferências de widget e validação antes de persistir.
- Corrigida a detecção de backend V1 incompatível e adicionado fallback entre URL configurada e mesma origem web.
- OpenRouter agora repete sem JSON Schema quando um modelo gratuito não suporta structured output.
- Endpoints reforçados contra contextos profundos, complexos ou contendo chaves de prototype pollution.
- Adicionado teto global diário, limpeza de cache, testes defensivos e workflow semanal de segurança com CodeQL.
- GitHub Actions inicia automaticamente um APK Preview no EAS ao publicar uma tag `v2.1.*`.

## 2.0.0-rc.1 — Professor Atlas

- Expanded onboarding into a deep personal evolution diagnosis.
- Added Professor Atlas subject interviews, persistent learning context and adaptive roadmaps.
- Added Nexus Brain chats, controlled memories, smart replanning and weekly AI reviews.
- Added operations, intelligent habits, weekly planning, quick capture and Focus OS modes.
- Added Command Center themes, layouts, mascot skins, accessories and Professor variants.
- Added Widget Studio with adaptive sizes, per-instance configuration, direct task completion and learning widgets.
- Migrated local storage to v3 with pre-migration backup and selective corruption recovery.
- Added free-first OpenRouter routing, safe local fallback, payload compaction and explicit Android backend URL.
