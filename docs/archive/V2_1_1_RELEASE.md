# Nexus AI v2.1.1 — Recovery & OTA Foundation

## Causa do travamento

A tela de geração registrava um cleanup dependente de `cancelPlanGeneration`. Como a função recebia uma nova identidade durante rerenders do provider, cada avanço visual do loading executava o cleanup e abortava a requisição. O abort era tratado como cancelamento silencioso, sem plano remoto, fallback local ou navegação. O resultado era a tela presa normalmente em 2 de 4.

## Correção

- cancelamento estabilizado com `useCallback` e acionado somente por intenção real;
- motivo do abort separado em usuário, watchdog, recuperação e desmontagem;
- timeout remoto de 45 segundos e watchdog absoluto de 50 segundos;
- fallback determinístico automático para falha/timeout;
- retry e recuperação local explícitos sem apagar respostas;
- navegação só ocorre quando existe plano persistido.

## Android e formulários

- `softwareKeyboardLayoutMode: resize` no Android;
- `KeyboardAvoidingView` limitado ao iOS para evitar resize duplo;
- Safe Area inferior, fundo escuro contínuo e rodapés roláveis;
- navigation/status bars escuras.

## OTA

- `expo-updates` e runtime baseado em `appVersion`;
- canais `preview` e `production`;
- verificação e aplicação controlada no Perfil;
- detector conservador de mudanças nativas;
- workflows de preview, produção, APK, release e rollback.

## Segurança

- idempotência isolada por `clientId + requestId`;
- rejeição de divergência entre client ID do header e corpo;
- secret scan ampliado para OpenRouter, GitHub, chaves privadas e variáveis públicas perigosas;
- entradas manuais de Actions passam por variáveis de ambiente e confirmações explícitas;
- audit de dependências sem vulnerabilidades conhecidas no lockfile validado.
