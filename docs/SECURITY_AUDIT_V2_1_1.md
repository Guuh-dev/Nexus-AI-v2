# Auditoria defensiva — Nexus AI 2.1.1

## Revisado

- rotas de plano, Brain, Atlas, captura, status e revisão;
- contexto OpenRouter, limites de payload e tratamento de erro;
- idempotência, rate limit, cache e isolamento entre clientes;
- AsyncStorage, migração, backup, widget e XP;
- Expo/EAS, Render, GitHub Actions, OTA e rollback;
- varredura de segredos e dependências.

## Correções adicionais

- cache e operações em andamento agora usam `clientId:requestId`, evitando colisão entre instalações;
- `X-Nexus-Client-Id` incompatível com o corpo recebe resposta de validação;
- inputs de workflows não são interpolados diretamente em shell;
- produção e rollback exigem palavras de confirmação exatas;
- somente o workflow de tag possui `contents: write`;
- detector nativo falha fechado;
- `OPENROUTER_API_KEY` permanece exclusivamente no servidor;
- scanner bloqueia padrões de tokens e segredos em arquivos `.env` versionados.

## Limites conhecidos

- rate limit em memória é adequado para uso pessoal/demo, não para SaaS público multi-instância;
- AsyncStorage não protege contra aparelho comprometido;
- OTA deve ser publicada somente após validação Preview;
- uma auditoria automatizada não substitui pentest externo antes de vender acesso público ou créditos pagos.
