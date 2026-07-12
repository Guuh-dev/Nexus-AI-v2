# Instalação da Nexus AI v2.1.1 pelo Replit

## Antes de enviar o ZIP

No Shell do projeto atual:

```bash
git switch main
git pull --ff-only origin main

if [ -n "$(git status --porcelain)" ]; then
  git stash push -u -m "backup before Nexus 2.1.1"
fi

git branch -f backup/pre-v2.1.1 main
git switch -C release/v2.1.1 main
```

Agora envie `Nexus-AI-v2.1.1.zip` para a raiz do Replit.

## Aplicar o pacote sem apagar Git ou secrets

```bash
rm -rf /tmp/nexus-211
mkdir -p /tmp/nexus-211
unzip -q Nexus-AI-v2.1.1.zip -d /tmp/nexus-211

test -f /tmp/nexus-211/Nexus-AI-v2.1.1/package.json

rsync -a --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.cache/' \
  --exclude='.local/' \
  --exclude='.config/' \
  --exclude='node_modules/' \
  --exclude='.expo/' \
  --exclude='dist/' \
  /tmp/nexus-211/Nexus-AI-v2.1.1/ ./

rm -rf /tmp/nexus-211
```

O ZIP não contém `.env`, tokens, chave OpenRouter, credenciais Expo, keystore, `node_modules`, `android/` gerado ou `dist/`.

## Instalar e validar

```bash
rm -rf node_modules dist .expo android ios package-lock.json

npx -y pnpm@10.0.0 install --frozen-lockfile
npx -y pnpm@10.0.0 run verify
npx -y pnpm@10.0.0 run release:check
npx -y pnpm@10.0.0 run export:web
npx -y pnpm@10.0.0 audit --audit-level=moderate
```

Todos os comandos precisam terminar sem erro.

## Enviar a branch

```bash
git add -A
git diff --cached --check
git commit -m "fix: release Nexus AI 2.1.1 with OTA recovery"
git push -u origin release/v2.1.1
```

Abra um Pull Request:

```text
base: main
compare: release/v2.1.1
```

Faça merge somente depois de **Nexus CI**, **Nexus Security** e **Nexus Native Change Detector** concluírem. O detector deve informar que um APK novo é obrigatório nesta versão.

## Backend da IA

No Render, confirme:

```text
OPENROUTER_API_KEY=<segredo>
OPENROUTER_ALLOW_PAID_FALLBACK=false
```

Depois do merge, aguarde o deploy da `main` e teste:

```bash
curl -sS https://nexus-ai-v1.onrender.com/api/status
```

O retorno precisa incluir:

```json
{
  "configured": true,
  "apiVersion": "2.1",
  "assistantAvailable": true
}
```

## Gerar o APK-base e a tag

No Replit:

```bash
git switch main
git pull --ff-only origin main
git tag -a v2.1.1 -m "Nexus AI v2.1.1"
git push origin v2.1.1
```

A tag inicia **Nexus Release**. O workflow valida o projeto, gera o APK Release no EAS e anexa o arquivo ao GitHub Release. Não faça novas OTAs antes desse workflow terminar verde e o APK aparecer na release.

## Instalação e teste

1. Exporte o backup JSON no Perfil da versão atual.
2. Baixe o APK da GitHub Release `v2.1.1`.
3. Instale por cima da versão antiga.
4. Conclua um onboarding teste.
5. Teste cancelamento, retry e plano local.
6. Teste Brain, Atlas, teclado e widgets.
7. Abra Perfil → Sistema → Atualizações e confirme runtime `2.1.1` e canal `production`.

## Atualizações seguintes

- Mudança comum mergeada na `main`: OTA Preview automática.
- Depois de validar: Actions → Nexus OTA Production → digite `PRODUCTION`.
- Mudança nativa: aumente a versão e gere outro APK/tag.
- OTA problemática: Actions → Nexus OTA Rollback → group ID + `ROLLBACK`.
