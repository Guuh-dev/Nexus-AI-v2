# Publicação do Nexus AI v2.1

## 1. GitHub

Crie ou use `Guuh-dev/Nexus-AI-v2`, coloque estes arquivos na raiz e envie:

```bash
git init
git branch -M main
git add -A
git commit -m "release: Nexus AI v2.1"
git remote add origin https://github.com/Guuh-dev/Nexus-AI-v2.git
git push -u origin main
```

Nunca envie `.env`, APKs assinados, keystores, `credentials.json`, `google-services.json`, `android/` ou `ios/` gerados.

## 2. Backend e OpenRouter

O APK atual usa a URL configurada em `eas.json`. Antes de gerar o APK, publique **este mesmo código V2.1** no serviço Render apontado ali. Se a URL continuar com nome `nexus-ai-v1`, isso é apenas o nome histórico do serviço; o deploy precisa conter as rotas V2.1.

No Render:

```text
OPENROUTER_API_KEY=sua_chave
OPENROUTER_ALLOW_PAID_FALLBACK=false
```

A chave nunca recebe prefixo `EXPO_PUBLIC_`.

O repositório inclui `render.yaml`. Em um novo Blueprint, o Render usa:

```text
Build: npm ci && npm run export:web
Start: npx expo serve --port $PORT
Health: /api/status
```

Após o deploy, abra:

```text
https://SEU_BACKEND/api/status
```

O retorno correto inclui:

```json
{
  "configured": true,
  "apiVersion": "2.1",
  "assistantAvailable": true
}
```

Se `configured` estiver falso, o fallback local continua funcionando, mas Brain e Atlas online não usam OpenRouter.

## 3. Verificação local

```bash
npm ci
npm run verify
npm run release:check
npm run export:web
npx expo-doctor
```

Mudanças no widget exigem:

```bash
npx expo prebuild --platform android --clean
```

## 4. APK automático pelo GitHub

Em `Settings → Secrets and variables → Actions`, crie:

```text
EXPO_TOKEN
```

Obtenha esse token na conta Expo dona do projeto. Não publique o valor.

Há duas formas de iniciar o APK:

1. `Actions → Nexus Android Preview → Run workflow`.
2. Criar uma tag de release:

```bash
git tag v2.1.0
git push origin v2.1.0
```

O workflow valida o projeto e inicia um build `preview` no EAS. O APK fica disponível no painel do projeto Expo quando o processamento terminar.

## 5. Build manual

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

O pacote Android continua:

```text
com.gustavoaraujo.nexusai
```

Ao instalar a V2.1, remova widgets antigos e adicione novamente para carregar os novos layouts.

## 6. Rollback

Antes de substituir uma versão publicada, crie uma tag estável:

```bash
git tag v2.0.0-rc1-backup
git push origin v2.0.0-rc1-backup
```

O storage v4 cria backup pré-migração e preserva perfil, plano, XP, histórico, chats e roadmaps. Mesmo assim, exporte um JSON pelo Perfil antes de testar APKs novos.
