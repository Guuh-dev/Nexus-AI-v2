# Auditoria defensiva Nexus AI v2.1

## Superfícies revisadas

- APIs de plano, Brain, Atlas, captura e revisão.
- Contexto enviado à OpenRouter.
- Persistência, importação, migração e backup.
- XP, conclusão de tarefa e fila do widget.
- Configuração EAS, Render, GitHub Actions e segredos.
- React Native Web e isolamento Kotlin.

## Casos automatizados

- JSON malformado e corpo excessivo.
- Chaves de prototype pollution.
- Profundidade excessiva.
- Ausência de chave sem stack trace.
- Backend incompatível.
- Falta de suporte a JSON Schema.
- Migração de widget v3 → v4.
- XP idempotente e rollback de tarefas.
- Imports nativos fora do bundle web.

## Limites conhecidos

- O rate limit em memória é suficiente para uso pessoal e demonstração. Uma versão pública paga precisa de autenticação e armazenamento durável de quotas.
- AsyncStorage é privado por sandbox, mas não é um cofre criptografado contra dispositivo comprometido.
- A auditoria não substitui pentest externo antes de vender acesso público ou compartilhar créditos pagos.
