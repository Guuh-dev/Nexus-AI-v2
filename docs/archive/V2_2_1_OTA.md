# Nexus AI 2.2.1 Flow OTA

Esta atualização corrige a experiência de conversa sem modificar o runtime Android 2.2.0.

## Entregas

- Composer do Brain e do Professor Atlas sempre acima do teclado.
- Lista de mensagens virtualizada para históricos extensos.
- Rolagem automática apenas quando o usuário já está acompanhando a conversa.
- Posição preservada ao alternar entre chats.
- Streaming visual sem saltos e compatível com movimento reduzido.
- Roteamento OpenRouter sem tentativa gratuita duplicada.
- Fallback local mais rápido e idempotência também no caminho SSE.

## Publicação

Publique pelo canal `preview` usando uma instalação 2.2.0. Depois do teste em Android real, promova a mesma alteração para o canal `production`. Não altere `expo.version`, `package.json.version` ou o runtime para publicar esta OTA.

As mudanças nativas da família de widgets pertencem ao APK-base 2.3.0 e não fazem parte deste pacote OTA.
