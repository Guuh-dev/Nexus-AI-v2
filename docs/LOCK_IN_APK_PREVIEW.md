# Lock-In — preparação do APK de teste pessoal

2026-10-02. O usuário autorizou publicar a branch da feature e executar a
automação Android para obter um APK de teste. Isso não autoriza merge, OTA,
tag/release público ou monitoramento do aparelho.

## SDK e validação

Expo permanece no SDK 57, alinhado ao patch 57.0.26 e suas versões recomendadas;
React Native passa a 0.86.3. Peers de Metro runtime/dom-webview e Metro config
foram alinhados. Node continua 22.14.0, pnpm 10, frozen obrigatório. Produto,
API e runtime continuam 3.0.0; storage v7 e widget payload v3 são independentes.
As restrições de migração e rollback do ADR e relatório do ciclo permanecem.

Metro 0.84.5 removeu a dependência de image-size e implementa parsers limitados
próprios. O patch/override antigo de Metro 0.84.4 foi removido; testes exercitam
os PNGs reais via Buffer e arquivo, Router/URI e término em entrada malformada.
O patch de query-string continua necessário.

- Frozen, verify: PASS, 59 arquivos/335 testes, typecheck, lint e scanner.
- Expo dependency check e release check estrutural: PASS.
- Expo Doctor: PASS 20/20. Localmente foi necessário configurar o dispatcher
  fetch para o proxy HTTPS já autorizado, por preload externo ao repositório.
  TLS permanece validado; nenhum check foi excluído.
- Export web: PASS, 16 rotas estáticas/3 APIs.
- Android Hermes/export: PASS, bundle de 5,5 MB e assets.
- Chromium 390×844: PASS, concluído/parcial/recovery, ID/inbox/evidência,
  revisão/amanhã e diagnóstico Atlas após restart, sem exceções de página.
  Cinco famílias × três aparências e aula do Atlas vinculada à proposta: PASS.
- Backend GET: após timeout inicial, respondeu 3.0.0/nexus-ai-v3/configured.
  Probe POST: PASS HTTP 200, modelo alternativo autorizado, 2.853 ms.
  Brain e Professor: duas requisições com perfil sintético/contexto vazio,
  respostas reais aprovadas pelo schema cliente. Brain: primário, 3.719 ms/1
  tentativa; Professor: alternativo, 7.682 ms/2. Sem envio de diário/histórico
  pessoal e sem conclusão sobre todos os percursos de aprendizagem.
- Android prebuild/verificador/Gradle com SDK alinhado: PASS em cópia isolada,
  JDK 17/SDK 36/NDK 27.1, quatro ABIs, 23m21s/555 tarefas. O prebuild regenerou
  o projeto incompatível somente nessa cópia; o checkout de trabalho permaneceu
  sem pasta Android gerada. Proxy/mirror oficial Google aplicados somente ali.
  APK debug SHA-256: `0771151b71927443968cd85071ccd856eadfdb31b12e207985204f78f2ac4339`.
  Não é o APK EAS assinado de distribuição.
- Build EAS assinado: PASS, preview/build 13; conferência abaixo.

## Alerta de assinatura nas ferramentas de build

O audit após o alinhamento encontrou GHSA-86w9-cpqp-85rv, node-forge <=1.4.0,
sem versão corrigida publicada. A dependência vem da CLI/certificados do Expo;
isso não comprova exploração do app e não transforma o scanner em PASS.

Aplicado patch mínimo reproduzindo a proposta upstream
[digitalbazaar/forge#1152](https://github.com/digitalbazaar/forge/pull/1152),
commit `ceba34402e329f0365134f23fe19898756527d65`, ainda não integrado upstream.
A validação rejeita filhos excedentes do DigestAlgorithm, preservando OID e
NULL opcional. Não substitui algoritmos ou constrói criptografia nova.

Regressões usam o vetor público upstream (licença BSD-3-Clause, origem na fixture)
e assinatura SHA256/RSA criada pelo crypto do Node: vetor malformado rejeitado,
assinatura válida aceita, conteúdo alterado rejeitado. A fixture não contém chave
privada; o teste gera chaves efêmeras em memória.

**Audit permanece FAIL: 1 high**, porque a versão publicada continua vulnerável
para o advisory. Não há ignore, alteração de severidade ou continue-on-error.
O controle Security continua bloqueando release público enquanto isso não for
resolvido por versão corrigida/decisão de segurança verificável. O APK solicitado
é preview pessoal para QA, com mitigação testada e limitação explicitada.

## Automação

Os perfis EAS fixam Node 22.14.0 e pnpm 10.0.0, também no builder remoto.
A imagem padrão SDK 57 lista pnpm 11, que não lê os overrides/patches legados
no package.json; não depender desse default. Referência: [infraestrutura EAS](https://docs.expo.dev/build-reference/infrastructure/).

O workflow Android mantém perfil preview interno com APK, incremento de
versionCode, canal preview e EAS CLI 20.5.1 fixada. Verifica frozen, verify,
release check, alinhamento Expo, Doctor e export web antes de EAS.

A espera do EAS agora é explícita (`--wait`), com timeout de 90 minutos e
`set -euo pipefail`, evitando sucesso do tee esconder falha de build. Metadata
é guardada mesmo em falha. Workflow verde deve representar build terminado,
não apenas submissão; ID/commit/runtime/canal e URL devem ser conferidos.

THIS CHANGE REQUIRES A NEW APK BASE.

Os novos widgets, diário e patches nativos exigem instalar esse APK; OTA isolada
não entrega essas capacidades. QA físico de launcher/mínimos/múltiplas instâncias,
acessibilidade/Keystore, assinatura instalada e geração remota continua pendente.
O preview não constitui autorização de distribuição pública multiusuário.

## Execuções remotas iniciadas

- Primeira execução: [36945150792](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/36945150792),
  commit `6e7682d5dd7c82953428f369ef89b05410cc7b8f`, anterior ao pin do builder.
- Execução com builder fixado: [36945875085](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/36945875085),
  commit `f24cd7456d39dd0d6dec19067facd6c97609b9bf`, preview.

Ambas usam a branch da feature, sem merge/main/OTA. A primeira execução e a segunda ainda pendente foram canceladas para substituir
o builder anterior ao pin. EAS da primeira: `2057103e-9322-4822-a450-8448f15baf12`.
Cancelar Actions não comprova cancelamento no EAS; a automação agora permite
cancelar explicitamente um UUID de build supersedido, usando a credencial já
guardada no runner, sem revelar tokens. UUID é validado antes da CLI, recebido
via env e nunca interpolado como comando. A CLI 20.5.1 recebeu erro do servidor ao tentar cancelar um build já terminado.
O workflow agora lê o estado antes: preserva FINISHED/ERRORED/CANCELED, cancela
somente NEW/IN_QUEUE/IN_PROGRESS e recusa estado desconhecido. O JSON do build
anterior fica junto da metadata para conferir origem/resultado. A nova execução deve cancelar esse build
supersedido e gerar o preview fixado; sua existência não comprova APK pronto.
Arquivos e commits foram enviados pela Git Data API com SHA comparado ao objeto
local, depois de falha de autenticação no transporte Git. Não houve force push
ou substituição de histórico.

Execução [36947524304](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/36947524304):
frozen/335 testes/Doctor 20/20/export passaram; falhou somente na tentativa
de cancelar o EAS anterior já FINISHED. Não gerou novo APK, nem foi declarada
PASS. A correção de estado acima conserva todos os gates.

## APK concluído e conferido

Execução [36948225339](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/36948225339):
**SUCCESS**. Frozen, 335 testes/typecheck/lint/secrets, Expo dependency check,
Doctor 20/20, export e token passaram. O estado anterior FINISHED foi preservado.
A metadata original e a anterior estão no artifact `nexus-eas-build-metadata-preview`.

- EAS [64e31722-f4f0-493a-a9bf-e3fbf6d100e1](https://expo.dev/accounts/littleguhh/projects/nexus-ai/builds/64e31722-f4f0-493a-a9bf-e3fbf6d100e1),
  FINISHED em 2026-10-02 01:10:37 UTC.
- Commit compilado: `b301396bcad21f7fbdc96e0fa60b86ec3d73fef3`.
  Alteração posterior apenas documental não muda o código desse APK.
- Android, distribuição INTERNAL, perfil/canal preview, SDK 57, produto/runtime
  3.0.0, versionCode 13. Logs do builder confirmam Node 22.14.0 e pnpm 10.0.0.
- [Download do APK](https://expo.dev/artifacts/eas/xqpcHmQ72Ms5s27MGHlZSR10_m89Rdx-oEFRKIKzozk.apk).
- SHA-256: `58fa7f27d17b8b93c82bfe546912f35e2861061bbd97a45e1f5a6a61e61d1d2e`.
- `apksigner verify`: PASS, assinatura v2, um signer. SHA-256 do certificado:
  `cad14635ac1c7d5765385f98acb7fc730761cab3607a9c077abd6cf5c7e98d66`.
- `aapt`: pacote `com.gustavoaraujo.nexusai`, 3.0.0/build 13, min SDK 24,
  target/compile SDK 36. Quatro ABIs; bundle embarcado, sem dependência de Metro.
- Manifest release sem debug, overlay, gravação de áudio, UsageStats ou permissões
  legadas de armazenamento. Canal preview presente no request header de updates;
  runtime também confirmado no manifesto embarcado.
- Recursos compilados contêm Nexus/Atlas e estados/livro/cenários desk/garden/night.
  Bundle/manifest/resources passaram na busca de padrões de chave OpenRouter,
  token GitHub e chave privada, sem registrar conteúdo ou valores.

Este é um APK de teste pessoal, não uma release pública aprovada. Audit continua
1 high mitigado pelo patch, API pública ainda precisa de autenticação/quotas/gasto,
e QA físico/Keystore/múltiplas instâncias/launcher permanece pendente. Fazer backup
pelo app antes de instalar. Não presumir assinatura/canal/origem do APK já instalado;
essa comparação exige o aparelho. Não usar rollback para leitor v6/v7 anterior como
restauração transparente. Sem tag, merge, OTA ou publicação de release.
