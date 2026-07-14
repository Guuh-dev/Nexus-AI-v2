# Release 3.0.0 — Core Reborn

## Escopo

Esta é uma nova base de runtime, storage e Android. O objetivo é concentrar o Nexus no ciclo diário de direção, execução, aprendizado e evidência.

### Mantido

- perfil, onboarding e diagnóstico pessoal;
- missão diária, tarefas, foco, progresso e histórico;
- Brain, Professor Atlas, roadmaps e revisão semanal;
- Companion com sete personalidades;
- backup/import, updates e privacidade;
- widgets Android e configuração por instância.

### Removido da superfície principal

- operações;
- hábitos;
- semana;
- finanças;
- Command Center e layouts de dashboard;
- temas, skins, presets e opções de widget sem diferença real ou sem paridade nativa.

Os dados desses módulos não são apagados. O storage v6 continua validando e preservando as seções legadas para uma conversão futura segura.

### Reconstruído

- roteamento de IA por capacidade e allowlist;
- Brain com retry e indisponibilidade honesta;
- intenção e ciclo de vida de roadmaps;
- síntese de missão e contratos de tarefa;
- revisão baseada em evidências;
- seis temas completos;
- Widget Studio e cinco famílias Android;
- migração e recuperação seletiva;
- CI web e nativo.

## Backend e Render

O serviço continua exposto pela URL histórica configurada em `eas.json`. `GET /api/status` é o health check e deve retornar:

```json
{
  "configured": true,
  "apiVersion": "3.0.0",
  "assistantAvailable": true
}
```

`configured` e `assistantAvailable` ficam falsos quando a chave não está configurada; o endpoint não mascara esse estado. A chave OpenRouter permanece somente no Render. O backend aplica timeout, retry temporário, alternativas por capacidade, validação do modelo resolvido e telemetria sanitizada.

Antes da release, publique o commit candidato no serviço e valide status, Brain, Atlas, plano estruturado, roadmap e revisão. Cold start deve resultar em estado de conexão e retry, nunca em resposta conversacional local.

## Migração

- storage: v5 → v6;
- backup: `@nexus-ai/pre-v3.0-backup` antes da primeira conversão;
- temas antigos: convertidos para Nexus, AMOLED, Glass, Light, Pixel ou Minimal;
- widget antigo: normalizado para uma das cinco famílias e cinco aparências suportadas;
- coleções: recuperadas item a item;
- versão futura: leitura protegida e escrita bloqueada.

O teste de atualização deve ocorrer sobre uma instalação 2.x com dados reais e widgets existentes. Exportar backup antes e depois faz parte da aceitação.

## Mudanças nativas

A release altera Kotlin, XML, providers, payload do widget e plugin Expo. Portanto:

- requer novo APK;
- muda o runtime para `3.0.0`;
- não pode ser publicada como OTA sobre uma base 2.x;
- precisa de prebuild limpo e compilação Gradle.

## Workflows

- CI: verify, release check, Expo config, export web, Expo Doctor e `git diff --check`.
- Android native compile: prebuild limpo, JDK 17 e `:app:assembleDebug`.
- Security: audit em nível alto, secret scan, regressões defensivas e CodeQL.
- Native Change Detector: bloqueia OTA quando runtime, config ou código nativo mudam.
- Android Build e Release: EAS CLI fixado e APK de release.
- OTA Preview/Production/Rollback: disponíveis somente depois da base instalada compatível.

Tanto a tag de APK quanto uma OTA de produção são bloqueadas se `GET /api/status` não confirmar versão `3.0.0`, identidade `nexus-ai-v3`, configuração, disponibilidade e capacidades obrigatórias. O gate da OTA usa somente GET: ele verifica o contrato publicado sem consumir o probe POST sujeito a cooldown/rate limit.

## Validação local

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run verify
pnpm run release:check
pnpm audit --audit-level=high
pnpm run doctor
pnpm run export:web
pnpm exec expo prebuild --platform android --clean
./android/gradlew :app:assembleDebug
git diff --check
```

Use Node 22. Um aviso causado por execução local em Node 24 não deve ser tratado como validação equivalente; repita a etapa no CI ou em ambiente Node 22.

## Riscos e limitações

- o serviço hospedado pode sofrer cold start, limite ou indisponibilidade do provedor;
- modelos disponíveis podem mudar, por isso o registro deve ser atualizado com teste de capacidade antes de liberar novos IDs;
- `RemoteViews` limita tipografia e efeitos; o preview representa apenas o que o Android consegue reproduzir;
- configurações legadas ficam preservadas, mas opções removidas não permanecem editáveis;
- a migração não sobrescreve storage de versão futura; o usuário precisa atualizar o app.
- o backend ainda não autentica usuários; quotas e idempotência vivem em memória e o planejamento não possui bucket IP-only resistente à rotação de `clientId`, portanto a configuração atual é somente para uso pessoal/demo;
- uso público multiusuário exige autenticação, quota durável/compartilhada, orçamento por conta e proteção de abuso por IP antes da distribuição.

## Ordem de publicação

1. concluir revisão e QA;
2. abrir PR de `release/v3.0.0-core-reborn` para `main`;
3. aguardar CI, segurança e compilação nativa;
4. revisar a lista de mudanças e riscos;
5. após merge aprovado por uma pessoa, publicar o backend;
6. criar a tag `v3.0.0`;
7. aguardar EAS Build e anexar o APK à release;
8. instalar por cima da 2.x e executar [ANDROID_QA.md](ANDROID_QA.md);
9. somente depois considerar uma OTA compatível com runtime 3.0.0.

Este documento não autoriza merge nem publicação automática.
