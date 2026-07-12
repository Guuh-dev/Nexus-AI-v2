# Estratégia de testes — Nexus AI 2.1.1

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
```

Validação nativa completa:

```bash
bash scripts/post-build-check.sh
```

Ela também executa prebuild Android limpo e valida o manifest/provider do widget.

## Regressões cobertas

- geração do onboarding não é cancelada por mudança de estágio ou rerender;
- timeout absoluto de 50 segundos ativa plano local;
- cancelamento explícito preserva perfil e oferece retry/recuperação;
- teclado Android, Safe Area, fundo e rodapés permanecem acessíveis;
- configuração OTA, canais, runtime e detector de mudanças nativas;
- workflow_dispatch não injeta entradas diretamente em comandos shell;
- IDs de idempotência são isolados por cliente e headers inconsistentes são rejeitados;
- fórmula de nível, XP idempotente, rollover, storage v4 e backup;
- limites de payload, profundidade, complexidade e prototype pollution;
- Atlas, roadmaps, widget, isolamento Android/web e secret scan.

## Teste manual Android

1. Exporte backup JSON e instale o APK 2.1.1 por cima.
2. Conclua o onboarding com Gboard e Samsung Keyboard.
3. Deixe a rede indisponível e confirme que o plano local abre em até 50 segundos.
4. Cancele manualmente, teste **Tentar novamente** e **Continuar com plano local**.
5. Verifique que não existe faixa branca inferior nos formulários.
6. Teste Brain e Atlas com backend configurado e depois sem rede.
7. Abra Perfil → Atualizações e confira versão, runtime e canal.
8. Publique OTA Preview, verifique e aplique pelo Perfil.
9. Reinicie app/aparelho e confirme dados, tarefas, XP e widgets.
10. Teste várias instâncias do widget e conclusão repetida sem XP duplicado.
