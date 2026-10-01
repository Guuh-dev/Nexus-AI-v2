# Nexus Lock-In — fatia 1

Decisão aprovada: [ADR 001](LOCK_IN_ADR_001.md). Base preservada e gates externos:
[baseline de 2026-10-01](LOCK_IN_BASELINE_2026_10_01.md).

## Comportamento entregue

Perfil/meta, disponibilidade e missão são três seções com gravação confirmada.
Salvar permite fechar e retomar na mesma seção; erro retém o rascunho visível.
Antes de confirmar, o resumo apresenta capacidade, blocos e impacto sobre o plano
atual. Confirmação revalida a revisão-base e só navega após persistir.

Há uma meta principal; metas de manutenção reservam orçamento na mesma capacidade;
backlog não aloca horas. Janelas autorizadas são unidas, descontando passado,
reservas sobrepostas, buffer e manutenção. Timezone inválido, horário DST ambíguo,
dependência ausente/cíclica e tarefa sem intervalo contínuo suficiente impedem
confirmação. Não há escala de horas por intensidade nem corte universal às 22h.

Uma missão agrega tarefas vinculadas. Minutos são somados pelas tarefas uma única
vez; conclusão vem das tarefas e não concede XP adicional da missão. Substituir o
plano preserva entregas concluídas, XP, início original, snapshot e pendências.
Adicionar/editar trabalho revalida a capacidade restante; operações de conclusão
podem persistir após o fim da janela. No próximo dia, o app arquiva o anterior uma
vez e aguarda novas janelas/confirmação, sem gerar dívida automaticamente.

Hoje destaca missão e próxima ação; Plano contém criação/revisão. As cinco abas
são Hoje, Plano, Foco, Brain e Progresso. `/settings` mantém perfil, temas, widgets,
backup/import, privacidade e updates. O planejamento é identificado como local e
não exige envio de dados à IA.

## Contrato implementado e migração

- `lockIn.goals`: IDs estáveis, primary única, candidato legado sem aceite inventado,
  manutenção com orçamento, backlog e arquivo. Até 100 metas.
- `lockIn.execution`: data, timezone, até 20 janelas, 40 reservas, buffer e manutenção.
- `lockIn.draft`: campos das três seções e posição retomável.
- `activePlan`: única autoridade do dia, com `mainMission.taskIds`, dependências e
  metadados de capacidade/blocos/revisão. `profile.mainGoal` é projeção de
  compatibilidade, bloqueada contra edição independente após primary.
- `planSnapshots`: versões preservadas, até 1.000, sem truncamento silencioso.
  Demais limites de coleções legadas permanecem.

Storage v6 → v7 preserva perfil, plano legado, histórico, chats, roadmaps, temas,
XP, filas e configurações. A meta antiga vira candidata por identidade estável;
texto de rotina não vira disponibilidade autorizada, checkbox não vira evidência.
`@nexus-ai/state` permanece a chave. Backup dedicado
`@nexus-ai/pre-lock-in-v7-backup` é gravado antes da migração, sem sobrescrever
`@nexus-ai/pre-v3.0-backup`. Falha no backup ou gravação mantém o original e protege
contra escrita. Undo v6 estrito continua restaurável por validação e migração;
cópia corrompida não ganha defaults nem desaparece.

Fila serializada, lock de import/reset, recuperação legada por item e bloqueio de
versão futura permanecem. Estado Lock-In inválido bloqueia escrita em vez de
apagar fatos. Import/export mantêm 8 MB; save valida o tamanho UTF-8 do JSON legível
com margem para o envelope. Crescimento excessivo é recusado sem alterar os dados
salvos. Um teste com 1.000 snapshots e texto multibyte verifica recusa; um estado
acima de 90% do orçamento verifica save/export/reimport sem perder snapshots.
Esse teste em Node não substitui benchmark de memória no Android.

Leitor v6 bloqueia v7. Recuperação preferida: versão corrigida que leia v7.
Restaurar snapshot antigo substitui dados posteriores: exportar uma cópia antes e
confirmar conscientemente. Não há rollback OTA transparente. Runtime de foco
separado e dados nativos não foram migrados nesta fatia.

## Validação e limites

Node 22.14 / pnpm 10. `verify` passou: typecheck, lint, 50 arquivos/304 testes e scanner de segredos;
`release:check`, export web (16 rotas estáticas/3 APIs) e diff sem erros passaram.
A execução no Chromium em viewport 390×844 percorreu onboarding, salvar/recarregar
rascunho, bloquear plano inviável, revisar impacto, confirmar, recarregar missão e
concluir/recarregar tarefa e abrir updates/backup em Configurações, incluindo salvar nome do perfil; sem exceções de página. Missão e CTA foram
inspecionados acima da dobra. Não é QA físico Android.

Cobertura adicionada: migração idempotente, falhas de persistência, Undo legado,
limite de bytes, sobreposições, passado/timezone/DST, dependências, proposta
obsoleta, ausência de dupla contagem, manutenção/backlog, conclusão tardia,
preservação de execução e rollover inclusive limite de pendências.

Fatia 2 ainda deve implementar Deep/Sprint por segmentos, pausa/retomada,
inbox e evidências. Foco atual preservado continua com as limitações registradas
no baseline. Revisão/amanhã/recovery completo pertencem à fatia 3. Atlas exige
reprodução antes de reparo. Esta entrega não comprova o ciclo A completo.

Sem alteração de dependências/lockfile, versão 3.0.0, backend ou código nativo.
Security remoto continua vermelho; audit local impedido por OOM; Doctor possui
falhas externas e divergências SDK. Backend, APK/EAS concluído e QA Android
continuam pendentes. Sem publicação, push ou merge.
