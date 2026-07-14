# Changelog

## 3.0.0 — Core Reborn

- Reduzida a navegação principal a Hoje, Brain, Foco, Progresso e Perfil; módulos incompletos saíram da superfície sem apagar dados legados.
- Reconstruído o roteamento de IA por capacidades, com allowlist conversacional, validação do modelo resolvido, retry temporário e erro remoto honesto.
- Refeito o Brain para manter rascunhos, oferecer tentativa explícita e impedir que respostas de classificadores ou conteúdo interno cheguem à conversa.
- Separadas intenções técnicas, aplicadas e comerciais nos roadmaps; criação, ativação, arquivamento e exclusão agora persistem de forma segura.
- Planejamento, tarefas e revisão semanal passaram a exigir ações, resultados e evidências observáveis.
- Consolidado o design em seis temas completos: Nexus Dark, AMOLED, Glass, Light, Pixel e Minimal.
- Reconstruído o Widget Studio em cinco famílias nativas, todas derivadas do mesmo `WidgetRenderSpec` usado pelo preview.
- Removidos do widget os controles de Professor/aprendizado que não possuíam renderização v3; os campos antigos continuam preservados apenas para migração, e os layouts agora respeitam o menor tamanho anunciado ao launcher.
- Atualizado o storage para v6 com backup pré-migração, recuperação item a item, conversão de preferências e proteção contra downgrade.
- OTA de produção agora exige o contrato v3 publicado por `GET /api/status` antes de enviar qualquer bundle, sem consumir o probe remoto sujeito a cooldown.
- Ampliado o CI com Expo Doctor, prebuild Android limpo, compilação Gradle e audit de dependências em nível alto.

> Esta versão altera Kotlin, XML, configuração nativa, storage e runtime. Ela exige um novo APK-base 3.0.0 e não pode ser publicada apenas por OTA.

## 2.4.0 — Systemic Mission OS RC

- Correção global de teclado para formulários, entrevista Atlas, onboarding, modais e campos multiline usando uma abstração compartilhada de Screen/Field keyboard-aware.
- Roadmaps agora classificam intenção e nível real para gerar trilhas avançadas de oferta, aquisição, fechamento e entrega quando o usuário já sabe construir LPs, SaaS, apps ou produtos com IA.
- Planejamento diário e fallback local sintetizam metas longas em missão curta, próxima ação e resultado verificável em vez de copiar o texto bruto do usuário.
- Revisão semanal passa a usar evidências determinísticas, marca dados insuficientes e sanitiza hipóteses de IA não sustentadas por fatos.
- Widget payload ganha estado vazio útil e o Android evita renderizar cards grandes sem conteúdo, mantendo personalização e atualização nativa.
- Tarefas exibem resultado esperado já no card recolhido para reduzir ambiguidade antes de abrir os detalhes.

> Esta versão altera comportamento nativo de widget e teclado. Ela exige novo APK-base 2.4.0; não publique como OTA.

## 2.3.1 — Recovery & Widget Polish

- Bloqueado vazamento de raciocínio, prompts internos, respostas em inglês e textões do Brain/Professor Atlas.
- Atlas agora entrega uma etapa e no máximo uma pergunta por resposta.
- Roadmaps e revisões semanais só recebem selo de IA quando chegam estruturados do backend; falhas continuam com fallback local explícito.
- Corrigida a oclusão do teclado na One UI, sem espaço branco por resize duplo e sem perder a posição em conversas longas.
- Refinados os widgets Mini, Strip, Companion, Mission e Command com conteúdo responsivo, margens seguras e mascotes legíveis.
- Personalização por instância agora respeita opacidade, alinhamento, fonte, conteúdo, tarefas, privacidade, mascote e estilo no widget Android real.

> Esta versão altera Kotlin, XML, drawables e runtime. Ela exige um novo APK-base 2.3.1.

## 2.3.0 — Widget Family

- O seletor Android agora oferece cinco widgets reais: Mini, Strip, Companion, Mission e Command.
- Adicionados tamanhos iniciais e responsivos 1×1, 2×1, 2×2, 4×1, 4×2 e 4×4.
- Cada família possui metadata, descrição, preview e orçamento de conteúdo próprios.
- Fundo transparente verdadeiro foi separado dos estilos frosted e card.
- O Companion ganhou poses reativas e deslocamento seguro dentro dos limites do widget, sem serviço, overlay ou loop contínuo.
- Todas as famílias compartilham o payload local, preservam configuração por instância, nonce e ações idempotentes.
- O config plugin registra e atualiza os cinco providers sem quebrar o Expo Web.

> Esta versão altera Kotlin, XML, Manifest e runtime. Ela exige um novo APK-base 2.3.0.

## 2.2.1 — Flow OTA

- Brain e Professor Atlas agora mantêm o composer visível acima do teclado e virtualizam conversas extensas.
- Adicionados auto-scroll contextual, restauração de posição por conversa e atalho acessível para voltar ao final.
- O streaming acompanha a mensagem sem animações repetidas e respeita movimento reduzido.
- Removida a tentativa duplicada do roteador gratuito; os limites de tempo e o fallback foram encurtados.
- Requisições SSE repetidas com o mesmo identificador passam a compartilhar uma única geração.

> Esta é uma atualização OTA para o runtime nativo 2.2.0. Por isso `app.json` e `package.json` permanecem em 2.2.0 até o próximo APK-base.

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
