# Estratégia de testes — Nexus AI 2.2

## Automatizados

```bash
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run security:secrets
pnpm run release:check
pnpm audit --audit-level=high
pnpm run export:web
pnpm exec expo install --check
bash scripts/verify-native-widget.sh
```

Validação nativa completa:

```bash
bash scripts/post-build-check.sh
```

## Regressões cobertas

- streaming SSE e renderer de resposta compacta;
- prompts Brain/Atlas com clareza e limite;
- fallback local e diagnóstico sanitizado;
- personalidade, presença e falas determinísticas do Companion;
- 16 presets e novos modos do Widget Studio;
- preferências independentes por instância;
- nonce em conclusão de tarefa e troca de página;
- storage v5 e defaults de finanças/Companion;
- XP idempotente, rollover e backup;
- onboarding, timeout e recuperação;
- limites de payload, profundidade, complexidade e prototype pollution;
- OTA/runtime e detector de mudança nativa;
- isolamento Android/web e estilos seguros;
- secret scan e workflow input hardening.

## Teste manual Android 2.2

1. Exporte backup na versão atual.
2. Instale o APK 2.3.0 por cima.
3. Confirme migração de perfil, XP, chats e roadmaps.
4. Teste Brain e Atlas com streaming remoto.
5. Desligue a rede e confirme fallback local.
6. Teste todas as personalidades e níveis de presença.
7. Teste tema Light Clean e todos os temas escuros.
8. Abra Money Mission e altere os indicadores.
9. Crie widgets de Companion feliz e estrito lado a lado.
10. Teste finanças, hábitos, Boss Battle e troca de página.
11. Conclua uma tarefa várias vezes e confirme XP único.
12. Reinicie app e aparelho e confirme persistência.
13. Teste backup/restore.
14. Após uma OTA 2.2.x, confira update, reload e rollback.
