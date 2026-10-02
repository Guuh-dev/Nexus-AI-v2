# Lock-In — ciclo utilizável, Atlas e Pixel Companions

Snapshot: 2026-10-01. Atualização de SDK/APK em
[LOCK_IN_APK_PREVIEW.md](LOCK_IN_APK_PREVIEW.md) (2026-10-02). Branch: `feat/nexus-lock-in`. Complementa o
[ADR 001](LOCK_IN_ADR_001.md), a [fatia 1](LOCK_IN_SLICE_1.md) e a
[direção visual aprovada](LOCK_IN_PIXEL_DIRECTION.md). Os relatórios antigos
continuam sendo evidência dos respectivos snapshots, não da árvore atual.

## Entrega implementada

- Perfil e proposta retomáveis, meta primary, janelas/capacidade e missão agregada
  pelas tarefas. Confirmação revalida a revisão-base, preserva execução anterior
  e aguarda gravação antes de navegar. Aprendizagem utiliza essa mesma capacidade.
- Deep Session/Sprint: identidade estável, segmentos reais, pausas excluídas,
  checkpoint, retomada e inbox. O alvo pausa a sessão; continuar exige ação
  explícita. O fim da janela autorizada pausa antes da reserva protegida. Depois
  de uma interrupção sem encerramento, só o checkpoint conhecido conta; a lacuna
  não vira trabalho. Finalizar persiste sessão/XP/evidência antes de limpar runtime.
- Evidência textual/link HTTP(S), com origem de relato separada de observação;
  exclusão retira referências das revisões e a reflexão correspondente na sessão,
  preservando tempo e XP históricos. Inbox não cria tarefas automaticamente.
- Revisão curta distingue completo/parcial/não concluído/desconhecido; checkboxes
  observados e relato do usuário ficam separados. Amanhã é rascunho offline,
  prioriza pendências/ próxima ação e exige novas janelas e confirmação.
- Atlas: diagnóstico salva seção e conteúdo; compactação conserva a aula real;
  threads vinculam roadmap/aula para não saltar de contexto quando a trilha avança.
  A aula pode virar proposta de missão, preservando sua identidade e aceite.
  Falha remota continua sendo erro, sem conversa local fingindo ser IA.
- Hoje, Foco, Brain/Atlas, Progresso e aparência usam a direção carvão/lavanda/menta.
  São cinco abas; configurações preservam backup/import, privacidade e updates.
- Nexus e Atlas em pixels, quatro estados principais, livro e cenários. As grades
  em `features/mascot/sprites.ts` geram SVG e vetores Android; testes comparam todas
  as células. Não existem duas fontes desenhadas independentemente.
- Cinco widgets: Mini 1×1, Strip 2×1, Companion 2×2, Missão 4×2 e Command 4×4.
  Carvão, AMOLED e Transparente, acento, opacidade, conteúdo, mascote, privacidade,
  toque e cenários permitidos são configuráveis por instância. Preview transparente
  usa papel de parede ilustrativo; o widget nativo revela o wallpaper real.
  Famílias compactas não recebem cenário. O launcher controla a geometria final.
- Widget sincroniza gravações em ordem, rejeita snapshots obsoletos e não leva
  diário, reflexão ou inbox. Minutos de sessão vêm de checkpoint confirmado;
  modo privado oculta conteúdo/métricas e impede ações de tarefa. Novas opções
  são expostas no Android somente quando a base instalada declara suporte.
- Lembrete diário cancela sua própria categoria, preservando notificações de
  outros donos; sua mensagem pede revisão, sem afirmar que uma missão foi gerada.

## Dados e recuperação

Storage comercial continua v7, produto/API/runtime 3.0.0 e payload de widget v3
(aceita leitores 0..3). Nenhuma dessas versões deriva automaticamente da outra.
Novos campos opcionais de v7: evidências (10.000), revisões (3.660), rascunho de
amanhã, manifesto do diário (3.660), vínculo de aula, diagnóstico e thread/aula.
Sessões aceitam até 1.000 segmentos e 100 capturas. Limites recusam crescimento,
sem truncamento silencioso. Import/export central permanece em 8 MB.

Runtime separado recebe versão 2, epoch e checkpoint. Reset/import invalidam
escritas antigas; runtime inválido/futuro é preservado, sem iniciar por cima dele.
Legado conserva tempo e ID conhecidos, sem reconstruir duração histórica.
Conclusão repetida deduplica pela sessão e não concede XP novamente.

Leitores v6 bloqueiam v7. Leitores das primeiras fatias internas v7 também não
conhecem todos estes campos estritos; rollback para esses commits pode bloquear
ou perder campos em recuperação legada. NÃO usar rollback OTA como restauração
transparente. Recuperação preferida é uma versão corrigida que leia todos os
campos; preservar ambos os backups pré-migração e exportar o estado posterior
antes de uma restauração explicitamente escolhida.

O diário é uma extensão Android opcional: AES-256-GCM pela implementação da
plataforma, chave Android Keystore, AAD por ID e arquivo AtomicFile em
`noBackupFilesDir`. Texto não entra no JSON, widget, IA ou telemetria. A fila
coordena escrita/leitura/exclusão/reset e descarta saves pendentes anteriores ao
reset. Falha nativa de limpeza impede falso sucesso. Leitura permite recuperação
AtomicFile de `.bak`, mantendo limites de tamanho. Web e APK antigo não oferecem
fallback em texto puro. Exportação legível exige escolha de um registro; restaurar
JSON em outro aparelho não recupera chave/conteúdo. QA de Keystore em aparelho e
restauração após falhas permanece obrigatório antes de distribuir essa extensão.

## Segurança de dependências e CI

O audit atual anterior às correções concluiu com 36 ocorrências high e 11 moderate.
A análise identificou parsers/expansores de build, XML/plist, CSS, configuração YAML,
IDs do Router, queries e mocks de teste; isso não comprova exploração do app.

Overrides limitados às linhas existentes atualizam Browserslist, js-yaml 4,
PostCSS 8, xmldom 0.8/0.9, brace-expansion 1/5, nanoid 3 e baseline-browser-mapping 2.
Vitest permanece na linha 4 (4.1.11). Não há troca de SDK nem relaxamento de engines.

Duas transições exigiram verificar contrato em vez de usar audit fix:

1. Metro 0.84.4 usa `image-size` com Buffer e com caminho de arquivo. A versão
   2.0.4 mantém o primeiro contrato; o patch em Metro adapta o segundo para
   `imageSizeFromFile`, assíncrono e com leitura limitada. Testes exercitam os
   quatro PNGs reais pelas duas APIs do próprio Metro e asseguram término em
   entradas ICNS/JXL malformadas. O export completo cobre assets dos pacotes.
2. `decode-uri-component` 0.5 corrige o caminho de decodificação malformada, mas
   passa a ESM. O patch de duas linhas em query-string 7.1.3 resolve o default
   e conserva o tratamento anterior de `+`; testes percorrem Unicode, `%2B`,
   parâmetros repetidos, roundtrip de links e entrada inválida longa com timeout.
   O patch é aplicado pelo pnpm frozen, não por edição manual de node_modules.

Audit de dependências, scanner/regressões e CodeQL são jobs independentes. Todos
continuam obrigatórios: não há ignore, downgrade de severidade ou continue-on-error.
Não foi enviado commit ao GitHub para alegar CI remoto verde.

## Evidência de execução

Node 22.14.0 e pnpm 10.0.0. Resultados na árvore final:

| Gate | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS, incluindo os dois patches versionados |
| `pnpm run verify` | PASS: typecheck, lint, 58 arquivos/333 testes e scanner de segredos |
| `pnpm run release:check` | PASS estrutural; não aprova publicação |
| `pnpm audit --audit-level=high` | PASS, sem vulnerabilidades conhecidas; também executado sem aumentar heap |
| `pnpm run export:web` | PASS, 16 rotas estáticas e 3 APIs |
| `pnpm exec expo export --platform android` | PASS, bundle Hermes de 5,4 MB e assets |
| `git diff --check` | PASS, inclusive comparação desde a base preservada |
| `pnpm run doctor` | NÃO PASSOU: 17/20, duas falhas externas e divergências de 22 versões SDK |
| Android prebuild/verificador/Gradle | PASS em checkout isolado com JDK 17 e mirror descrito abaixo |
| Launcher/aparelho/EAS/backend | PENDENTE, sem alegação de PASS |

Chromium 390×844: perfil/rascunho após restart; rejeição de sobrecarga; missão
confirmada; foco parcial e concluído; restauração com ID/tempo/inbox preservados;
evidência; revisão parcial; rascunho de amanhã após restart; diagnóstico Atlas
retomável; aula chegando ao Plano com vínculo durável. Sem exceções de página.
A restauração normal do navegador pausa via AppState; o caso de encerramento
abrupto sem AppState é coberto no teste de checkpoint, não alegado como QA físico.
Foram capturadas as cinco famílias nas três aparências, com dados de demonstração.
Um percurso adicional no navegador confirmou pausa no alvo de um Sprint,
continuação explicitamente escolhida, tempo real além do alvo e pausa na borda
da janela autorizada. O foco começa pela estimativa da tarefa selecionada.

Android foi preparado em cópia isolada, sem prebuild no checkout de trabalho:
JDK 17, SDK 36, build-tools/NDK/CMake selecionados pelo Gradle. Prebuild e verificador
nativo passaram. `:app:assembleDebug` compilou quatro ABIs (arm64-v8a, armeabi-v7a,
x86, x86_64), incluindo Kotlin dos widgets/diário. Maven Central respondeu HTTP 429;
um init script somente no checkout de validação utilizou o mirror oficial Google
Maven Central e o proxy/CA do ambiente. Não alterou os repositórios Gradle do app.
O APK é debug para validação, depende de Metro e não é base de distribuição assinada.
SHA-256 do APK final: `abd55c1a2f2ff1a7e7b7e71b6a43f216f36380db82a377193c1d19b92ae01810`.
O ambiente reiniciou durante o primeiro export Android; esse comando interrompido
não foi contado como PASS. A execução repetida concluiu o bundle Hermes acima.

## Gates e escopo restante

- Doctor: chamadas externas ao schema Expo e React Native Directory falham neste
  ambiente; 22 versões instaladas ainda divergem do patch atual recomendado pelo
  SDK. Não mascarar essas verificações com exclude. Alinhar SDK em fatia nativa
  própria e repetir JS/Android antes de release.
- Launcher e aparelho físico: redimensionamento nos mínimos declarados, texto
  ampliado, leitor de tela, contraste, múltiplas instâncias, ações/nonce, reinício,
  consumo/bateria, permissões, Keystore e backup/exclusão ainda precisam de QA.
- Backend, geração real remota, autenticação, quotas duráveis e gasto antes de
  público multiusuário. Não foi criado servidor de histórico pessoal.
- Confirmar APK instalado, build EAS concluído, origem/commit/runtime/canal antes
  de decidir release. Na data deste snapshot ainda não havia autorização para push/build. Em
  2026-10-02 o usuário autorizou branch e APK preview; merge/release público
  continuam fora desse escopo.
- Continuidade B permanece incremental: calibração por amostra, semana/recorrências
  completas, propostas em lote/undo compensatório, memória com proveniência e
  exclusão de derivados, export legível completo e orçamento de notificações.
  As estruturas legadas foram preservadas, não declaradas como novos contratos.
- Metadados de apps, captura visual e restrições C não foram habilitados.

THIS CHANGE REQUIRES A NEW APK BASE.

Sprites/XML/Kotlin/diário e dependências impedem OTA isolada. Nenhuma versão de
produto foi alterada e nenhum controle de produção/rollback foi contornado.
