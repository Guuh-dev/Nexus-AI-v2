# Publicação completa do Nexus AI v2

Este é o caminho recomendado para alguém trabalhando pelo celular e Replit.

## 0. Fonte e checkpoint

O repositório oficial usado nesta instalação é `Guuh-dev/Nexus-AI-v1`. Antes de atualizar, confirme que o checkpoint `nexus-v1-stable-before-professor` continua disponível. Ele permite voltar à versão estável anterior sem apagar dados do celular.

## 1. Instalar o projeto

1. Baixe `Nexus-AI.zip` no celular.
2. Crie um App Node.js vazio no Replit.
3. No painel de arquivos, envie `Nexus-AI.zip`.
4. No Shell da raiz, execute:

```bash
unzip Nexus-AI.zip -d .
npm install
npm run web
```

5. Se o Replit perguntar se deve substituir `.replit`, confirme.
6. Quando a tela do Nexus abrir, pare o preview e continue a configuração abaixo.

## 2. GitHub

1. No GitHub, crie um repositório público chamado `nexus-ai`.
2. Não marque README, `.gitignore` ou licença; o projeto já possui os três.
3. No Shell do Replit, conecte o repositório seguindo a URL mostrada pelo GitHub:

```bash
git init
git branch -M main
git add .
git commit -m "feat: launch Nexus AI Personal Mission OS"
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Se o Git pedir sua identidade antes do commit, configure seu nome e o e-mail `noreply` mostrado em **GitHub → Settings → Emails**:

```bash
git config user.name "Gustavo Araújo"
git config user.email "SEU_EMAIL_NOREPLY_DO_GITHUB"
```

Confira no GitHub se `.env`, chaves, `credentials.json`, `android/` e `ios/` não foram enviados.

## 3. Configurar a OpenRouter no Render

1. Abra o serviço `nexus-ai-v1` no Render e entre em **Environment**.
2. Nome: `OPENROUTER_API_KEY`.
3. Valor: sua chave.
4. Nunca use prefixo `EXPO_PUBLIC_`.
5. Salve e faça um novo deploy.
6. Abra `https://nexus-ai-v1.onrender.com/api/status` e confirme `"configured":true`.

O app usa primeiro o roteador gratuito do OpenRouter e depois o plano local. Para permitir contingência paga conscientemente, adicione `OPENROUTER_ALLOW_PAID_FALLBACK=true` somente no ambiente do Render; por padrão, o Nexus não gasta créditos.

## 4. Publicar a web no Render

A configuração de deployment já contém:

- Build: `npm ci && npm run export:web`
- Run: `npx expo serve --port 8080`

No serviço conectado ao GitHub, use Node.js 20 ou 22 e mantenha o Secret no ambiente de produção. A URL HTTPS final serve a interface web e `/api/*` na mesma origem. Instâncias gratuitas podem dormir; o app faz uma chamada segura de aquecimento ao iniciar e usa fallback local se o serviço ainda estiver acordando.

Também é possível usar EAS Hosting:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npm run export:web
npx eas-cli@latest deploy
```

Adicione `OPENROUTER_API_KEY` como variável sensível do ambiente do host, não do build cliente.

## 5. Conta e projeto Expo

1. Crie uma conta gratuita em `expo.dev`.
2. No Shell: `npx eas-cli@latest login`.
3. Execute `npx eas-cli@latest init`.
4. O comando adicionará o `projectId` correto ao `app.json`.
5. Não compartilhe sua senha ou código 2FA.

## 6. Ligar o APK ao backend

O navegador usa `/api` na mesma origem. O APK precisa conhecer a URL pública.

O `eas.json` desta versão já aponta os perfis development, preview e production para:

```text
EXPO_PUBLIC_API_URL=https://nexus-ai-v1.onrender.com
```

Essa variável não é segredo; ela contém apenas o endereço do servidor. Nunca coloque a chave nela.

## 7. Gerar APK pessoal

```bash
npx eas-cli@latest build --platform android --profile preview
```

Instale pelo link do EAS e siga [ANDROID_WIDGET.md](ANDROID_WIDGET.md).

Depois de instalar a V2, remova e adicione novamente widgets antigos para que o Android carregue o novo layout e a tela de configuração por instância.

## 8. Publicar no portfólio

Use:

- URL do site público.
- URL do GitHub.
- Três capturas: onboarding, Hoje e widget no A16.
- Uma gravação curta concluindo tarefa e mostrando o widget atualizar.
- Descrição: “Personal Mission OS local-first com React Native, Expo Router, IA estruturada, fallback offline e widget Android nativo”.

## 9. Preparar a Play Store futuramente

Como o autor ainda não tem 18 anos, a conta Play Console precisa pertencer e ser verificada por um responsável adulto. O pacote definitivo já é `com.gustavoaraujo.nexusai`.

1. O responsável cria a Play Console e paga a taxa única do Google.
2. Crie o aplicativo Nexus AI.
3. Hospede a rota pública `/privacy` e informe essa URL.
4. Preencha público-alvo, segurança de dados e classificação indicativa com informações verdadeiras.
5. Gere o AAB:

```bash
npx eas-cli@latest build --platform android --profile production
```

6. Faça o primeiro upload manual na Play Console.
7. Cumpra os requisitos de teste fechado mostrados pela Play Console no momento da publicação; eles podem variar conforme o tipo e a idade da conta.
8. Corrija feedback, solicite acesso à produção e publique gradualmente.

## Atualizações

- Mudanças somente em JavaScript podem usar EAS Update depois que ele for configurado.
- Mudanças em widget, notificações, Manifest ou módulo Kotlin exigem um novo APK/AAB.
