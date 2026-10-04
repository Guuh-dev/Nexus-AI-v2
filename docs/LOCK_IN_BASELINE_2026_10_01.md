# Nexus Lock-In — preparação e baseline de 2026-10-01

## Checkout preservado

- Diretório: `/workspace/Nexus-AI-v2`, clone separado inicialmente limpo.
- Origin: `https://github.com/Guuh-dev/Nexus-AI-v2.git`; fetch executado.
- HEAD/base: `b8f3e8506556a6ed8c0347ca0c4bbf17b5912f1b`, igual ao snapshot auditado.
- HEAD versus origin/main: 0/0 commits exclusivos; nenhum arquivo diferente.
- `origin/release/v3.0.0-core-reborn` aponta para `d0db44f`; é ancestral de main,
  com 0/1 commits exclusivos. `git cherry` não lista patches exclusivos e o diff
  de árvores é vazio. Não há divergência a resolver neste clone.
- Referência de preservação: `preserve/pre-lock-in-20261001-b8f3e85`.
- Branch local preparada: `feat/nexus-lock-in`, baseada em main atualizado.
- Sem pull/rebase/reset/merge/cherry-pick, publicação ou alteração de domínio.

## Ambiente e execução

Linux x86_64; Node 22.14.0 e pnpm 10.0.0 instalados fora do repositório em
`/workspace/scratch/lock-in-tools`. O Node padrão 24 não foi usado no baseline.
Engines, lockfile, dependências, app/API/runtime 3.0.0 e código nativo intactos.
Logs locais ficam em scratch, não no controle de versão.

| Gate | Resultado atual |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; 13,3 s. Scripts de build de @openrouter/sdk e unrs-resolver ignorados pelo pnpm; nenhuma autorização de scripts adicionada. |
| `pnpm run verify` | PASS: typecheck, lint, 49 arquivos/277 testes, scanner de segredos. |
| `pnpm run release:check` | PASS estrutural; não representa aprovação de release. |
| `pnpm audit --audit-level=high --json` | IMPEDIDO: exit 134, heap OOM perto de 2 GB, sem relatório local de vulnerabilidades. |
| `pnpm run doctor` | FAIL: 17/20; schema Expo com ECONNREFUSED, Directory com resposta externa inesperada, versões SDK divergentes em 22 pacotes. |
| `pnpm run export:web` | PASS: 15 rotas estáticas, 3 APIs. |
| `git diff --check` | PASS; arquivos novos também devem ser verificados ao stage/commit. |
| `bash scripts/verify-native-widget.sh` | IMPEDIDO: ausência de android/app/src/main/AndroidManifest.xml. |
| prebuild/Gradle/QA físico | Não executados: sem Android SDK/adb; JDK disponível 21, requisito 17. Não há validação física. |
| backend `GET /api/status` | INCONCLUSIVO: curl exit 28 após 40 s, HTTP 000, zero bytes. Não prova versão ou geração saudável. POST não executado. |

## Evidência remota atual

- [Security 36453535535](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/36453535535),
  2026-09-28, mesmo SHA: audit FAIL, **32 high / 9 moderate (41 ocorrências)**;
  scanner e regressões skipped; CodeQL PASS. O handoff citava 12/4 em run mais
  antigo; esse número não é o baseline atual.
- Pacotes presentes no log: brace-expansion, js-yaml, nanoid, postcss,
  browserslist, @xmldom/xmldom e image-size. Ocorrências não são necessariamente
  vulnerabilidades únicas nem prova de exploração do aplicativo.
- [CI 29304423512](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/29304423512),
  mesmo SHA: verify e Android native compile PASS históricos. Não substituir
  revalidação após upgrades de dependências por esse resultado antigo.
- Android Build 29305517636 está verde, mas o workflow usa EAS `--no-wait`:
  confirma submissão, sem estabelecer conclusão/artefato instalado.
- Tags disponíveis: v2.1.0, v2.1.1, v2.2.0; releases retornadas v2.2.0 e v2.1.1.
  Nenhuma tag/release v3.0.0 encontrada. APK/runtime/canal/update/commit instalado
  e EAS concluído continuam pendentes.

## Inspeção e consequência para fatia 1

Lidos AGENTS (único no repo), documentos v3 obrigatórios, configuração/lockfile,
Provider, schemas, storage/runtime, telas centrais, intake, contexto, temas,
notificações e controles CI/release. Revalidar os trechos envolvidos ao editar.

- `prepareCommit` publica estado otimista; `commitConfirmed` espera save e tenta
  recuperar concorrência. Preservar fila do repository e lock do Provider que
  aborta/aguarda geração, assistente e sync antes de import/reset.
- Hidratação precede widget; retomada grava rollover antes de consumir ações.
  Import de 8 MB, recuperação por item e proteção de versão futura permanecem.
- Missão soma minutos novamente em hydrateAiPlan, task.logic, carry-over,
  rollover e planning.service. Não trocar só o card: migrar cálculo e autoridade.
- smart-replan usa 22h fixas; planner escala tempo por intensidade. Nova
  capacidade deve partir de janelas autorizadas, sem aumento por intensidade.
- Foco trunca elapsed no alvo e conclui automaticamente. SessionId e conclusão
  confirmada existem; segmentos/continuação exigem fatia 2, sem duração inventada.
- Professor intake fica em estado React; compactação acima de 22.000 caracteres
  retorna subconjunto sem roadmaps. São pontos de reprodução, não diagnóstico
  causal suficiente para substituir Atlas nesta preparação.
- Reminder cancela todas as notificações; refatorar categorias antes de ampliar.
- API usa quotas/idempotência em memória e não autentica usuários; público
  multiusuário continua bloqueado até proteção durável e orçamento.

## Dívida CI: plano de reparo

Separar scanner/regressões do audit para obter resultados independentes mantendo
o audit obrigatório. Triar advisories por caminho e exposição: parsing/build/CLI,
servidor e cliente; confirmar versões corrigidas compatíveis com Expo 57.
Alinhar pacotes com faixa SDK, sem atualização indiscriminada ou enfraquecer
Doctor/gates. Mudança de lockfile/dependências é classificada como nativa pelo
detector: comunicar nova base APK antes de fazê-la. Revalidar instalação frozen,
verify, audit, Doctor, export e compilação Android após o reparo.

## Acordo e próximo passo

Ver [ADR 001](LOCK_IN_ADR_001.md). A decisão aprovada pelo usuário reúne base atual,
arquitetura modular/local e migração v7 com backup e recuperação explícita.
A primeira fatia implementada está descrita em [LOCK_IN_SLICE_1.md](LOCK_IN_SLICE_1.md): perfil → meta → capacidade → missão;
seguir depois para foco/evidência e revisão/amanhã. O baseline não aprova release.
