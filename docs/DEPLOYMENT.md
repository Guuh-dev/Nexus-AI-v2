# Publicação do Nexus AI v2.1.1

## 1. Requisitos

- Node.js `22.13+ <23`;
- pnpm `10.0.0`;
- conta Expo dona do projeto `littleguhh/nexus-ai`;
- `EXPO_TOKEN` nos secrets do GitHub;
- backend Render com a V2.1.1 publicada.

Instalação e validação:

```bash
npx -y pnpm@10.0.0 install --frozen-lockfile
pnpm run verify
pnpm run release:check
pnpm run export:web
pnpm exec expo install --check
```

O projeto usa somente `pnpm-lock.yaml`. Não recrie `package-lock.json`, pois o EAS escolheria npm novamente.

## 2. Backend e IA

A URL nativa está em `eas.json`:

```text
https://nexus-ai-v1.onrender.com
```

O nome `v1` é histórico; o serviço precisa executar o código V2.1.1 atual. O `render.yaml` instala com pnpm, exporta o servidor web e usa `/api/status` como health check.

No Render, configure somente como segredo de servidor:

```text
OPENROUTER_API_KEY=sua_chave
OPENROUTER_ALLOW_PAID_FALLBACK=false
```

Nunca use prefixo `EXPO_PUBLIC_` para a chave. Após o deploy, confirme:

```bash
curl -sS https://nexus-ai-v1.onrender.com/api/status
```

O resultado deve incluir `configured: true`, `apiVersion: "2.1"` e `assistantAvailable: true`.

## 3. GitHub Actions

Crie em **Settings → Secrets and variables → Actions**:

```text
EXPO_TOKEN
```

Workflows:

- **Nexus CI**: TypeScript, lint, testes, secret scan, release check e export web.
- **Nexus Security**: audit, regressões defensivas e CodeQL.
- **Nexus Native Change Detector**: decide OTA ou APK no PR.
- **Nexus OTA Preview**: publica mudanças compatíveis na `main` para `preview`.
- **Nexus OTA Production**: promoção manual protegida para `production`.
- **Nexus Android Build**: APK manual `preview` ou `release`.
- **Nexus Release**: tag semântica, APK Release e GitHub Release.
- **Nexus OTA Rollback**: rollback manual confirmado.

## 4. Primeiro APK 2.1.1

A V2.1.1 muda dependências e configuração nativa, portanto a primeira instalação precisa de APK novo.

Depois do merge na `main` e dos checks verdes:

```bash
git switch main
git pull --ff-only origin main
git tag -a v2.1.1 -m "Nexus AI v2.1.1"
git push origin v2.1.1
```

A tag dispara **Nexus Release**, aguarda o EAS, baixa o APK e o anexa ao GitHub Release. Para um teste mais rápido, use **Nexus Android Build → preview**.

Antes de instalar, exporte o backup JSON. Instale por cima da versão atual para testar a migração; remova e adicione widgets novamente caso o launcher mantenha layouts antigos.

## 5. Atualizações futuras

- Merge OTA-compatible na `main`: publica automaticamente em `preview`.
- Depois do teste: execute **Nexus OTA Production** e confirme `PRODUCTION`.
- Mudança nativa: gere APK `release` ou uma nova tag.
- Problema em OTA: execute **Nexus OTA Rollback** com o group ID.

O `runtimeVersion` usa a política `appVersion`. OTAs só chegam a builds com runtime compatível, evitando misturar código JavaScript novo com binários nativos antigos.
