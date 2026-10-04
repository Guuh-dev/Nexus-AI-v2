# Brain, Atlas e personalidades — desenho e dados

Decisões aprovadas pelo usuário em 2026-10-02: pixels preservados; personalidades
separadas para Nexus/Atlas; entender → propor → ajustar/aprovar → ajudar; widgets
redimensionáveis pelo launcher dentro da grade suportada; UI com cinco abas.

## Mapping e recuperação

Storage continua v7 na chave estável. `preferences.mascot.atlasMood` é opcional:
backup sem esse campo usa `companionMood`, sem modificar o temperamento pedagógico
`atlasPersonality` já existente. `strict` permanece o mesmo ID; rótulo agora Firme.
Nenhuma escolha de personalidade aumenta autonomia ou autoriza alterações.

`ChatThread.consultation` é opcional. Conversas existentes mantêm seu histórico e
comportamento; novas conversas começam em understanding, revision 0. Uma resposta
pode fazer uma pergunta ou produzir `assistanceProposal`, validada por Zod. Proposta
contém entendimento, contexto declarado, resultado, incertezas, abordagem, entrega
e tempo conhecido/desconhecido. Referência ao ID da mensagem garante origem. Não
há cópia autoritativa da proposta em memória separada nem histórico pessoal remoto.

Proposta recebida incrementa revisão. Ajustar preserva a proposta anterior como
referência; escrever uma nova mensagem invalida aprovação pendente antes do envio.
Aprovar exige a revisão exibida e a mensagem de origem ainda presente; gravação
confirmada precede a primeira solicitação de ajuda. Falha remota posterior mantém
a aprovação e a mensagem para retry. Cancelamento nunca confirma resposta parcial.
Aprovação da ajuda não aprova automaticamente tarefas, metas ou roadmaps: actions
mantêm seu próprio gate de confirmação. Reset/import seguem lock e fila existentes.

Leitores v7 anteriores desconhecem estes campos e podem descartar itens na
recuperação tolerante. Rollback OTA para eles **não é transparente**. Recuperação
por versão corrigida é preferida; exporte o estado atualizado antes de restauração
explícita de snapshot. Preserve backups pré-v3 e pré-Lock-In e dados posteriores.
Não há alteração de appVersion, runtime, chave, limite de import 8 MB ou payload
widget v3. Os grids gráficos permanecem código/recursos fora do JSON central.

## Backend e responsividade

Diagnóstico usa schema restrito a message/assistanceProposal, uma chamada por
resposta e nenhuma geração antecipada de roadmap. Ajuda aprovada mantém streaming
validado, cancelamento e retry existentes. Antes de aprovação o cliente bloqueia
actions/roadmaps/memórias, inclusive se o servidor ainda estiver desatualizado.
Backend novo requer deploy separado: APK sozinho não atualiza o Render.

A primeira trilha é compacta (até 3 fases × 2 lições no prompt) para reduzir saída
na geração inicial. Allowlist, ZDR, teto de gasto, validação, watchdog e ausência de
fallback conversacional local permanecem. Não há promessa de latência instantânea.
GET do Render nesta execução excedeu 20 segundos sem receber bytes; isso não prova
falha de modelo nem permite diagnosticar créditos, causa do roadmap ou latência de
primeiro token. Uma segunda consulta retornou configured/assistantAvailable true e API 3.0.0, mas
não anuncia diagnostic-approval: o novo contrato ainda exige deploy. Uma solicitação
Brain sintética real via SSE terminou HTTP 200 em 7,773 s; primeiro byte em 1,016 s
é abertura do canal, não primeiro token. Meta remota: 6.970 ms, duas tentativas,
modelo Qwen alternativo. Isso não prova latência de Atlas/roadmap ou causa da falha.
Telemetria do código novo mede firstTokenMs por tentativa, sem conteúdo do pedido.
Esse campo fica nos logs do servidor e não altera meta estrita de APKs anteriores.

## Widgets e personalidade

Sete personalidades alteram pixels e tom: Feliz, Zoeiro, Motivado, Sério, Firme,
Calmo, Quieto. Estado observado (foco/pausa/conclusão) permanece separado do estilo.
Recursos Android são gerados dos mesmos grids de personalidade e pose do app.
Widgets têm escolha por instância e não herdam silenciosamente outra instância.
Mini, Strip e Companion passam a horizontal|vertical; Mission/Command já o usam.
Mínimos existentes preservados; máximos de cada provider limitam a ampliação.
Arrastar depende do launcher e sua grade, sem tamanhos arbitrários em pixels.
Alterações XML/Kotlin/recursos exigem novo APK. Sem animação contínua ou monitoramento.

## Latência: evidência e mudança limitada

Outra requisição sintética real, roadmap React intermediário, retornou 3 fases em
21,218 s (meta 20.877 ms), uma tentativa DeepSeek e 421 reasoning tokens. Isso
reproduz geração lenta, mas não a falha específica do diagnóstico do usuário.
Metadata oficial OpenRouter consultado em 2026-10-02: V4 Flash anuncia reasoning
com default_effort high, mandatory false, supported_efforts xhigh/high. Qwen
Instruct opera sem thinking e não anuncia reasoning. Por isso o novo servidor
envia reasoning.effort none apenas para DeepSeek em Brain/Professor/roadmap;
não inventa esforço low não suportado nem manda esse parâmetro ao Qwen. Modos de
revisão/evidência preservam configuração existente. Schema, semântica, allowlist,
ZDR, fallback e aprovação permanecem. Ganho de latência/qualidade deve ser medido
após deploy; não há chave OpenRouter local para comparativo direto.

Fontes públicas verificadas:
- https://openrouter.ai/api/v1/models
- https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash/endpoints
- https://openrouter.ai/docs/guides/best-practices/reasoning-tokens

## Validação executada

- Node 22.14.0 / pnpm 10; instalação frozen sem mudança no lockfile.
- Verify: typecheck, lint, **60 arquivos / 350 testes**, scanner de segredos PASS.
- Release check PASS; Expo Doctor **20/20**; export web PASS.
- Navegador 390×844, respostas sintéticas interceptadas: pergunta sem aprovação
  falsa, proposta, ajuste preservando resultado, restart, aprovação persistida
  antes de enviar ajuda; personalidades independentes alteram pixels e persistem.
- Tela de conversa tem viewport limitado, cabeçalho e compositor fora da lista
  rolável; proposta extensa não deve deslocar cabeçalho para fora da tela.
- Prebuild em cópia preparada, verificador de widgets e assembleDebug Android
  PASS, quatro ABIs: 16m55s; após ajustar previews, recompilação PASS em 40s.
- APK debug inspecionado com aapt: resizeMode 0x3 (ambos eixos) nas cinco famílias.
  É evidência de compilação nativa, não APK standalone assinado para entrega.
- Audit permanece **FAIL: 1 high em node-forge**, já mitigado pelo patch existente,
  mas sem versão corrigida publicada. Não é baseline de release pública aprovado.
- Git diff --check PASS. Não houve modificação de package version/app/runtime,
  dependências, payload widget v3, permissões ou captura/monitoramento de aparelho.

Gates remanescentes: deploy explícito do backend diagnostic-approval, comparação
real de latência/qualidade após mudança de reasoning, APK preview assinado concluído
e launcher/IME/aparelho físico. Sem afirmar bug zero, animação contínua ou paridade
física validada apenas pelo browser. Antes de público, autenticação, quotas duráveis,
gasto/abuso e advisory de ferramenta continuam bloqueadores.
