# Nexus AI v2.1 — relatório histórico da atualização

## Bugs corrigidos

- Entrevista Atlas não acusa vazio quando existe conteúdo em “tentativas anteriores”.
- Mensagens agora apontam o campo exato com problema.
- Teclado Android não cobre mais o campo ativo ou os botões do onboarding.
- Captura rápida e editor de tarefas ganharam rolagem e resize corretos com teclado.
- APK detecta backend antigo sem `/api/assistant` e explica o problema em vez de falhar silenciosamente.
- OpenRouter gratuito pode cair de JSON Schema para JSON simples e ainda validar a resposta.
- Preferências antigas do widget migram para o modelo v4 sem perder tema, XP ou tarefas.

## UI

- Perfil separado em cinco áreas curtas.
- Progresso separado em três visões.
- Widget Studio organizado em Presets, Conteúdo, Visual e Ações.
- Preview do widget responde a tamanho, privacidade, densidade, alinhamento, glow e métricas.
- Componentes de tela têm largura máxima, área segura e comportamento consistente de teclado.

## Segurança

- Verificação de estado antes de gravar no AsyncStorage.
- Bloqueio de `__proto__`, `prototype` e `constructor` em JSON não confiável.
- Limites de profundidade, nós, arrays e chaves nos contextos da IA.
- Rate limit por cliente e teto global diário.
- Cache idempotente com remoção de entradas expiradas.
- Sem chave no cliente, bundle web, widget ou logs.
- Workflow CodeQL, npm audit, secret scan e testes defensivos.

## Compatibilidade

- Android e React Native Web.
- Fallback local/offline.
- Migração storage v3 → v4.
- Novo APK obrigatório por causa do Widget Studio nativo.
