# Estratégia de testes — Nexus AI 2.1

## Automatizados

```bash
npm run typecheck
npm run lint
npm test
npm run security:secrets
npm run release:check
npm run export:web
npx expo install --check
```

Ou execute a sequência completa, incluindo o prebuild Android:

```bash
bash scripts/post-build-check.sh
```

O export web usa no máximo dois workers para reduzir picos de memória no Replit e no GitHub Actions.

## Cobertura de regressão

A suíte cobre, entre outros pontos:

- fórmula progressiva de nível, XP, reversão e proteção contra valor negativo;
- conclusão, exclusão, adiamento e limite de tarefas;
- plano local, normalização, JSON da IA, timeout e retry;
- rollover de data e regra de streak;
- migração do storage v3 para v4 sem apagar perfil, plano, XP ou preferências;
- recuperação independente de seções corrompidas;
- entrevista do Professor Atlas com validação por campo e textos invisíveis;
- teclado e áreas roláveis nas telas de formulário;
- API antiga/incompatível, fallback local e mensagens de diagnóstico;
- limites de corpo, profundidade, complexidade e prototype pollution;
- repetição de ações do Brain e do widget sem duplicar tarefa ou XP;
- presets e payload do Widget Studio;
- isolamento do módulo Android no bundle web;
- varredura de segredos e regressões de React Native Web.

## Manual web — 390×844

1. Concluir onboarding e diagnóstico com o teclado aberto em cada campo longo.
2. Confirmar que o botão de continuar permanece acessível e o campo ativo fica visível.
3. Testar Atlas nos quatro níveis, preenchendo somente “o que já tentou” e depois somente “o que já sabe”.
4. Criar roadmap, recarregar e confirmar persistência.
5. Criar, pesquisar, renomear, arquivar e excluir conversas.
6. Confirmar ações propostas pela IA apenas após a prévia.
7. Marcar/desmarcar tarefas e observar XP idempotente.
8. Testar captura rápida, replanejamento e fallback offline.
9. Iniciar, pausar, retomar e recuperar Focus OS após recarregar.
10. Alternar as áreas de Perfil e Progresso e validar hierarquia visual.
11. Percorrer todos os presets do Widget Studio e redimensionar a prévia.
12. Exportar e reimportar backup v4.

## Manual Android

1. Gerar APK Preview pelo EAS.
2. Testar notificações concedidas e negadas.
3. Repetir onboarding e entrevista Atlas com Gboard/Samsung Keyboard.
4. Adicionar widgets em pelo menos 1×1, 2×2, 4×2 e 4×4.
5. Criar duas instâncias com estilos e ações diferentes.
6. Concluir a mesma tarefa repetidamente pelo widget e confirmar XP único.
7. Reiniciar app e aparelho, confirmando persistência e sincronização.
8. Testar deep links Hoje, Foco, Brain e Captura.
9. Verificar TalkBack, movimento reduzido e alvos de toque.
10. Repetir em AMOLED e privacidade.
