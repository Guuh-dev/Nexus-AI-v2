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
- Android Hermes/export, browser e build assinado: registrar resultados abaixo
  após conclusão; o APK debug anterior não valida sozinho o novo SDK.
- Backend GET: tentativa de 30 segundos terminou em timeout; não confirmado.

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
