# ADR 001 — Nexus Lock-In: base, autoridade de dados e migração

Status: aprovado pelo usuário em 2026-10-01. O desenho inicial abaixo registra a
fatia 1; o [adendo de ciclo e pixels](LOCK_IN_CYCLE_AND_PIXEL_QA.md) registra foco,
revisão/amanhã, reparo Atlas e a extensão nativa posteriormente aprovada.
Data: 2026-10-01.

## Decisão aprovada

Implementar o escopo A incrementalmente em `feat/nexus-lock-in`, a partir de
`b8f3e8506556a6ed8c0347ca0c4bbf17b5912f1b`, mantendo os módulos existentes e
extraindo regras determinísticas do Provider. Adotar storage v7 mediante migração
validada e backup, com uma única autoridade para metas, capacidade, missão e
execução. Manter produto/API/runtime em 3.0.0 e contrato de widget atual.

As cinco abas de destino são Hoje, Plano, Foco, Brain e Progresso. Perfil passa
para configurações com acesso a dados, privacidade e updates. A mudança de
navegação acompanha a primeira fatia funcional, sem retirar serviços existentes.

## Autoridade e fronteiras

O repository mantém a fila serializada e o Provider coordena hidratação,
substituição e operações confirmadas. Operações de execução devem passar pelo
mesmo lock de substituição de import/reset, incluindo o runtime separado de foco.
Regras de intervalos, capacidade, dependências e propostas não dependem da IA.

`activePlan` continua sendo a autoridade única do dia. O domínio Lock-In valida e coordena seu conteúdo para dias novos;
históricos v6 permanecem como registros legados imutáveis. Não manter duas cópias
editáveis do mesmo dia. UI e widget usam o mesmo `activePlan`; ações passam pelas validações do Provider. `profile.mainGoal` é projeção unidirecional da meta primary. A retirada do adaptador ocorre quando todos
os mutadores ativos tiverem migrado, antes de liberar o ciclo A.

Missão agrega `taskIds`; seu esforço é derivado uma vez das tarefas. Backlog não
aloca tempo. Janelas são unidas e recortadas por agora, timezone, compromissos,
necessidades/transições e buffer; nenhum limite universal das 22h. Mudanças de
prioridade/escopo usam proposta com revisão-base revalidada e aprovação.

## Mapping v6 → v7

| Origem | Destino | Regra |
| --- | --- | --- |
| `installationId` | identidade existente | Preservar literalmente. |
| `profile` e `onboardingDraft` | perfil e rascunho progressivo | Preservar fatos; horários livres em texto não viram janelas autorizadas. Energia histórica não é relato atual. |
| `profile.mainGoal`, razão, deadline | meta candidata com ID estável | Preservar texto/data; aceite e tipo do prazo ficam desconhecidos até confirmação. Apenas uma primary após confirmação. |
| `activePlan.tasks` | tarefas legadas preservadas | Preservar IDs, conclusão e timestamps existentes; vínculos só quando confirmados, sem evidência ou duração inventada. |
| `activePlan.mainMission` | missão legada | Manter resultado e conclusão históricos; não reconstruir esforço agregado sem vínculo conhecido. Solicitar confirmação de novo plano. |
| `history`, `progress` | histórico/XP existentes | Não recalcular nem apagar conquistas; não converter checkbox em evidência objetiva. |
| foco finalizado | sessões existentes | Preservar ID e tempo registrado; não recuperar tempo que o timer antigo truncou. |
| runtime de foco separado | runtime existente, sem mudança na fatia 1 | Preservar `sessionId`; desenho de segmentos/restauração pertence à fatia 2. |
| `brain`, `learning` | chats/memórias/roadmaps existentes | Preservar dados; aprendizado usa a capacidade comum após vínculo confirmado. |
| `weeklyPlan`, `recurringTasks` | fila/recorrências legadas | Preservar integralmente; não criar cópias diárias na migração. |
| preferências/legado | seções existentes | Preservar temas, widgets por instância e dados ocultos. |
| diário/visual/apps | sem dados novos | Não coletar nem ativar consentimento na migração/import. |

IDs novos derivam de identidade e origem estáveis; migrar/reimportar o mesmo
snapshot não pode duplicar entidades. Os schemas da fatia 1 estão em `schemas/lock-in.schema.ts`; incluem unicidade, referências e validação de ciclos no domínio.

## Escrita e recuperação

1. Ler e validar v6, preservando recuperação item a item e bloqueio futuro.
2. Criar backup pré-Lock-In dedicado sem sobrescrever `@nexus-ai/pre-v3.0-backup`.
3. Construir candidato v7 em memória; validar limites, vínculos e invariantes.
4. Gravar pela fila e lock existentes em `@nexus-ai/state`; só publicar em memória
   e navegar após confirmação. Falha mantém original/rascunho e permite retry.
5. Na fatia 2, runtime separado receberá segmentos e recuperação própria; testes de
   interrupção deverão provar reconciliação entre gravação central e runtime.

Import/export central continua limitado a 8 MB. Preservar limites das coleções
legadas; definir e medir limites adicionais antes de gravar novos históricos.
Limites implementados na fatia 1: 100 metas, 1.000 snapshots de plano, 20 janelas e 40 reservas por dia, além dos limites legados. Marcos, revisões novas e evidências aguardam seus schemas nas próximas fatias.
Esses tetos não autorizam truncamento silencioso: atingir orçamento deve produzir
aviso e opções de exportação/limpeza explícita. Medir bytes e pico de memória com
fixtures próximas do teto; reduzir o orçamento se o backup de 8 MB não comportar.
Imagens ficam fora do JSON e fora do escopo A. Diário sensível aguarda proteção
criptográfica definida; não usar criptografia caseira.

Leitor v6 bloqueia v7. Rollback OTA para v3 não é transparente: preferir versão
corrigida que leia v7. Restaurar v6 exige decisão explícita e cópia exportável dos
registros v7 posteriores; não substituir silenciosamente. Testar leitor antigo,
import futuro/corrupto, backup falho, migração repetida e escrita interrompida.

## Fatia 1 aprovada

Perfil retomável → meta candidata/primary confirmada → janelas e compromissos →
capacidade determinística → missão ligada a tarefas. Incluir UI Plano e mover
Perfil, mantendo acesso a backups. Rejeitar sobrecarga com conflito explicável.
Validar restart, falha de persistência, timezone, sobreposições, dependências,
nenhuma dupla contagem e preservação do v6. Não antecipar experimentos nativos.

## Pendências independentes

- Reparar dívida Security por exposição e versões, sem audit fix indiscriminado.
- Confirmar backend e geração remota; GET sozinho não prova geração.
- Confirmar APK instalado, runtime/canal/commit e conclusão EAS antes de OTA.
- Reproduzir Atlas com fixtures antes de corrigir hipóteses.
- Antes de público multiusuário: autenticação, quota durável/compartilhada,
  orçamento e proteção de abuso. Não criar servidor de histórico pessoal.
- Retenção nativa, diário criptografado e experimentos de aparelho ficam fora A.

Nenhuma publicação, merge, alteração nativa ou captura de aparelho é autorizada
por este ADR. Qualquer mudança nativa futura deve comunicar
`THIS CHANGE REQUIRES A NEW APK BASE.` e apresentar alternativa OTA aplicável.
