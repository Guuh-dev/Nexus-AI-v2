# Nexus AI v2.1.1 — relatório de correção, OTA e segurança

## Resultado

A V2.1.1 corrige o travamento após o onboarding, adiciona recuperação determinística, prepara atualizações OTA seguras e estabiliza o pipeline GitHub → EAS → APK usando pnpm.

## Causa real do travamento em 2 de 4

A rota `app/loading-plan.tsx` possuía um cleanup de `useEffect` que chamava `cancelPlanGeneration`. A função exposta pelo provider mudava de identidade durante rerenders. Quando o texto visual avançava de “Entendendo...” para “Organizando...”, o React executava o cleanup anterior e abortava a requisição.

O provider interpretava esse abort como cancelamento silencioso e saía sem:

- salvar plano remoto;
- executar fallback local;
- concluir onboarding;
- navegar para Hoje.

Por isso a tela normalmente congelava em **2 de 4**.

## Correções de geração

- `cancelPlanGeneration` estabilizado com `useCallback`.
- Removido cancelamento automático ligado a rerender/cleanup da tela.
- Motivos de abort separados: usuário, watchdog, recuperação e desmontagem.
- Timeout remoto de 45 segundos.
- Watchdog absoluto de 50 segundos.
- Falha, timeout ou indisponibilidade ativam plano local automaticamente.
- Cancelamento manual preserva perfil e respostas.
- Tela de recuperação com **Tentar novamente**, **Continuar com plano local** e **Voltar ao diagnóstico**.
- Navegação só acontece depois que existe um plano persistido.

## Android e interface

- `softwareKeyboardLayoutMode: resize` no Android.
- `KeyboardAvoidingView` apenas no iOS, evitando resize duplo.
- Safe Area inferior e fundo escuro contínuo.
- Rodapés e campos continuam acessíveis com teclado aberto.
- Barra de navegação Android configurada em modo escuro sem travar o export web.
- Foi identificado e corrigido um segundo problema: renderizar `<NavigationBar />` declarativamente fazia o SSG web ficar preso. A configuração passou a usar API imperativa somente no Android.

## Atualizações OTA

- `expo-updates` instalado.
- `runtimeVersion` isolado por `appVersion`.
- Canais `preview` e `production`.
- Perfil mostra versão nativa, runtime, canal e update ativo.
- Verificação, download e reinicialização controlada dentro do app.
- Detector conservador de mudanças nativas.
- OTA somente é liberada quando existe:
  - tag correspondente à versão instalada;
  - GitHub Release correspondente;
  - APK anexado à release;
  - nenhuma alteração nativa desde essa base.

Essa barreira impede publicar JavaScript incompatível com um APK antigo.

## Automação criada

- `ci.yml`: TypeScript, lint, 75 testes, secret scan, release check e export web.
- `security.yml`: audit a partir de severidade moderada, testes defensivos e CodeQL.
- `native-change-detector.yml`: classifica PR como OTA ou APK.
- `ota-preview.yml`: OTA automática e privada após merge compatível.
- `ota-production.yml`: produção manual com confirmação `PRODUCTION`.
- `android-build.yml`: APK manual nos perfis preview/release.
- `release.yml`: tag semântica, EAS Build, download do APK e GitHub Release.
- `ota-rollback.yml`: rollback manual com group ID e confirmação `ROLLBACK`.

O EAS CLI foi fixado em `20.5.1` para evitar que uma mudança inesperada em `latest` quebre o pipeline.

## Build e gerenciador de pacotes

- Removido o caminho problemático de `npm ci`.
- Projeto padronizado em `pnpm@10.0.0`.
- `package-lock.json` não deve existir.
- GitHub Actions, Replit, Render e EAS usam o mesmo lockfile.
- Replit/Render exigem Node 22.13 ou superior dentro da série 22.

## Segurança revisada

- Chave OpenRouter permanece somente no servidor.
- Scanner ampliado para OpenRouter, GitHub tokens, chaves privadas, `.env` e variáveis públicas perigosas.
- Cache/idempotência agora usa `clientId + requestId`, evitando colisão entre instalações.
- Header `X-Nexus-Client-Id` divergente do corpo é rejeitado.
- Entradas manuais de GitHub Actions são passadas por variáveis de ambiente, não interpoladas diretamente em shell.
- Produção e rollback exigem confirmações exatas.
- Somente o workflow de release tem `contents: write`.
- Detector de mudanças nativas falha fechado.
- Android manifest mantém backup do app desativado e widget validado após prebuild.

## Validação executada

- TypeScript: aprovado.
- Expo ESLint: aprovado.
- Vitest: **21 arquivos e 75 testes aprovados**.
- Secret scan: aprovado.
- Release check: aprovado.
- pnpm audit: **0 info, 0 low, 0 moderate, 0 high, 0 critical**.
- Expo dependency check: dependências alinhadas ao SDK local.
- Export web com 18 rotas estáticas e 3 rotas de API: aprovado.
- Endpoint `/api/status` servido localmente: aprovado.
- Expo Android prebuild: aprovado.
- Manifest/provider/configuração do widget: aprovado.
- Todos os 8 workflows: YAML válido.
- Todos os 44 blocos shell dos workflows: sintaxe Bash válida.

## Limites que continuam intencionais

- O rate limit é em memória e atende uso pessoal/demo. Um SaaS público precisa autenticação e quota durável.
- AsyncStorage não é proteção contra dispositivo comprometido.
- A primeira V2.1.1 exige APK novo porque adiciona dependências/configuração nativas.
- Não publique OTA antes de o GitHub Release `v2.1.1` possuir o APK-base.
- A IA online depende do backend Render com `OPENROUTER_API_KEY`; sem ele, o app continua com fallback local.

## Arquivos de apoio

- `docs/REPLIT_INSTALL_V2_1_1.md`: instalação exata no Replit.
- `docs/V2_1_1_RELEASE.md`: resumo técnico da versão.
- `docs/SECURITY_AUDIT_V2_1_1.md`: auditoria defensiva.
- `docs/UPDATES.md`: fluxo OTA/APK/rollback.
- `docs/DEPLOYMENT.md`: Render, GitHub, EAS e release.
