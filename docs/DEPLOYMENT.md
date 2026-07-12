# Publicação do Nexus AI 2.3.0

## 1. Requisitos

- Node.js `22.13+ <23`;
- pnpm `10.0.0`;
- conta Expo dona do projeto `littleguhh/nexus-ai`;
- `EXPO_TOKEN` nos secrets do GitHub;
- backend Render publicado a partir da `main` 2.3.0.

```bash
npx -y pnpm@10.0.0 install --frozen-lockfile
pnpm run verify
pnpm run release:check
pnpm run export:web
pnpm exec expo install --check
bash scripts/verify-native-widget.sh
```

O projeto usa somente `pnpm-lock.yaml`. Não recrie `package-lock.json`, pois EAS pode selecionar npm.

## 2. Backend e IA

URL nativa:

```text
https://nexus-ai-v1.onrender.com
```

O nome `v1` é histórico. O serviço deve executar a `main` atual.

Secrets exclusivos do servidor:

```text
OPENROUTER_API_KEY
OPENROUTER_ALLOW_PAID_FALLBACK=false
```

Nunca prefixe a chave com `EXPO_PUBLIC_`.

Depois do deploy:

```bash
curl -sS https://nexus-ai-v1.onrender.com/api/status
```

O resultado deve incluir `configured: true`, `apiVersion: "2.3.0"` e `assistantAvailable: true`.

## 3. GitHub Actions

Secret obrigatório:

```text
EXPO_TOKEN
```

Workflows:

- Nexus CI
- Nexus Security
- Nexus Native Change Detector
- Nexus OTA Preview
- Nexus OTA Production
- Nexus OTA Rollback
- Nexus Android Build
- Nexus Release

## 4. APK base 2.3.0

A 2.3.0 muda o runtime e a família nativa de widgets. Após o merge:

```bash
git switch main
git pull --ff-only origin main
node -p "require('./package.json').version"
git tag -a v2.3.0 -m "Nexus AI v2.3.0 Widget Family"
git push origin v2.3.0
```

A tag dispara **Nexus Release**, que valida o projeto, solicita o build EAS e anexa o APK à GitHub Release quando concluído.

Antes de instalar:

1. exporte backup JSON;
2. mantenha o APK anterior disponível;
3. instale por cima para testar migração;
4. remova e adicione novamente widgets com cache antigo.

## 5. OTAs futuras

Depois do APK 2.3.0 instalado:

- mudança OTA-compatible na `main` → Preview;
- teste aprovado → execute OTA Production e confirme `PRODUCTION`;
- mudança nativa/runtime → nova versão e novo APK;
- regressão OTA → execute OTA Rollback com o group ID.

O `runtimeVersion` usa `appVersion`, impedindo código 2.2 de ser enviado a um binário 2.1.1 incompatível.
