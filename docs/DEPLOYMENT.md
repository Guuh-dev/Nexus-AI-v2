# Deploy do Nexus AI 3.0

## Requisitos

- Node.js `22.13+ <23`;
- pnpm `10.0.0`;
- projeto Expo vinculado ao owner configurado em `app.json`;
- `EXPO_TOKEN` nos secrets do GitHub;
- `OPENROUTER_API_KEY` somente no serviço Render;
- branch protegida e revisão obrigatória para `main`.

O repositório usa apenas `pnpm-lock.yaml`. Não adicione `package-lock.json`.

## Backend Render

O nome público atual é histórico e permanece configurado em `eas.json` e nos workflows. `render.yaml` instala com lockfile congelado, exporta o servidor web Expo e usa `/api/status` como health check. O serviço de produção ainda não reflete isso (ver "Divergências" abaixo).

Variáveis:

```text
NODE_VERSION=22.14.0
OPENROUTER_API_KEY=<secret server-side>
```

A conta OpenRouter precisa ter créditos para os dois modelos de produção. O backend aplica ZDR, nega coleta persistente e limita o preço por token em código.

### Estado verificado em 2026-10-04

| Item | Valor observado |
| --- | --- |
| Serviço | `Nexus-AI-v1`, web service Node, plano free, região Virginia |
| Branch | `feat/nexus-lock-in` |
| Commit no ar | `cc0a604` (deploy manual após o merge do PR #26) |
| `GET /api/status` | `apiVersion: "3.0.0"`, `configured: true`, `assistantAvailable: true` |
| Logs desde o deploy | sem `error` ou `warn`; "Your service is live" |

O snapshot envelhece. Confirme de novo antes de tag, release ou distribuição.

### Divergências entre o painel e o `render.yaml`

O serviço foi criado no painel e não segue o blueprint. Corrija em **Settings** do serviço:

1. **Build command.** Painel: `pnpm install --no-frozen-lockfile --config.minimum-release-age=0 && pnpm run export:web`. Esperado: `npx -y pnpm@10.0.0 install --frozen-lockfile && npx -y pnpm@10.0.0 run export:web`. Sem `--frozen-lockfile` o servidor pode instalar versões que o CI não testou, e `minimum-release-age=0` aceita pacotes recém-publicados. Os patches de `pnpm.patchedDependencies` aplicam nos dois modos.
2. **Health check.** Painel: vazio. Esperado: `/api/status`.
3. **Auto-deploy.** Está `yes` por commit, mas não disparou nos pushes de 2026-10-02 nem no merge do PR #26. Reconecte o repositório em **Build & Deploy**. Enquanto isso, publique cada merge com **Manual Deploy** ou pela API e confira o commit do deploy.

Plano free: o serviço dorme e a primeira chamada leva dezenas de segundos (observado ~40 s). O app trata isso como conexão, timeout e retry; não esconda indisponibilidade. As quotas do backend são por instância e somem no restart.

### Depois do deploy

```bash
curl --fail --show-error --max-time 90 https://nexus-ai-v1.onrender.com/api/status
```

Use `--max-time` alto por causa da partida a frio. Confira também o commit do deploy ativo no painel e os logs de erro.

Resposta saudável esperada:

```json
{
  "configured": true,
  "apiVersion": "3.0.0",
  "assistantAvailable": true
}
```

Teste também uma chamada conversacional e uma estruturada. O health check não garante sozinho que um modelo permitido está respondendo.

## CI e segurança

Todo PR executa:

- Node 22 e pnpm 10;
- install frozen;
- typecheck, lint e testes;
- scan de secrets e release check;
- Expo Doctor, config e export web;
- prebuild Android limpo;
- compilação Gradle debug;
- detector de mudança nativa;
- audit alto (com as exceções documentadas em [SECURITY.md](../SECURITY.md)) e CodeQL.

Nenhuma etapa verde isolada substitui a suíte completa.

## APK-base 3.0.0

A v3 muda runtime e módulo nativo. Após aprovação, merge e backend saudável:

```bash
git switch main
git pull --ff-only origin main
node -p "require('./package.json').version"
git tag -a v3.0.0 -m "Nexus AI v3.0.0 Core Reborn"
git push origin v3.0.0
```

A tag dispara o workflow Nexus Release, que verifica a versão, solicita o build EAS, baixa o APK e o anexa à GitHub Release.

Antes de distribuir:

1. exporte backup em uma instalação 2.x;
2. instale o APK 3.0.0 por cima;
3. valide migração e reinício;
4. teste as oito famílias de widget (Mini, Strip, Companion, Mission, Command, Timer, Captura e Sequência);
5. registre o resultado do checklist de [ANDROID_QA.md](ANDROID_QA.md).

## OTA

Depois que o APK 3.0.0 estiver publicado e instalado:

- mudança compatível na `main` pode gerar Preview;
- produção exige execução manual e confirmação explícita;
- mudança nativa ou de versão exige outro APK;
- rollback usa o group ID de uma atualização anterior.

Os workflows comparam o diff com a tag da base instalada e falham de modo seguro quando não conseguem classificar a mudança. Não altere essa política para forçar uma OTA.
