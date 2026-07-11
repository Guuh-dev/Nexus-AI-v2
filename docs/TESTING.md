# Estratégia de testes

## Automatizados

```bash
npm run typecheck
npm run lint
npm test
npm run security:secrets
npm run export:web
npx expo install --check
```

Ou execute a sequência inteira:

```bash
bash scripts/post-build-check.sh
```

Os testes cobrem:

- Fórmula progressiva de nível.
- XP de tarefa, reversão e proteção contra valor negativo.
- Exclusão e adiamento.
- Limite de tarefas.
- Plano local, IDs e normalização.
- JSON cercado por Markdown e rejeição de campos extras.
- Timeout e exatamente um retry.
- Rollover uma única vez por data.
- Regra de 70% e streak.
- API sem chave, JSON malformado e payload excessivo.
- Regressão contra arrays de estilo chegando a elementos DOM.

## Manual web — 390×844

1. Concluir as oito etapas do diagnóstico inicial.
2. Escolher um tema sugerido ou específico na entrevista do Professor Atlas.
3. Informar nível, tentativa anterior, resultado e integração desejada.
4. Tocar várias vezes rapidamente no envio e confirmar uma única solicitação.
5. Recarregar e confirmar perfil/plano, chat e roadmap.
6. Marcar e desmarcar tarefa; observar XP.
7. Adicionar, editar, adiar e excluir.
8. Iniciar, pausar, retomar e finalizar foco.
9. Trocar temas e movimento reduzido.
10. Exportar e reimportar backup.
11. Simular offline e replanejar.
12. Inspecionar console sem erros não capturados.

## Manual Android

1. Build preview via EAS.
2. Testar notificações concedida e negada.
3. Adicionar widgets em pelo menos dois tamanhos, incluindo 4×2.
4. Confirmar atualização, persistência após reinício e deep link.
5. Verificar TalkBack e alvos de toque.
6. Repetir em tema AMOLED e privacidade.
