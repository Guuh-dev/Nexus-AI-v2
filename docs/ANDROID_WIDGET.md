# Widget Studio Android — Nexus AI 2.1

## Recursos implementados

- `NexusWidgetProvider`, configuração por instância e bridge Kotlin isolada do web.
- Layout adaptável de 1×1 até 5×2, incluindo 2×2, 4×2, 4×4 e formatos redimensionáveis.
- Presets prontos e edição manual independente por instância.
- Estilos Nexus, AMOLED, transparente, glass, pixel, minimalista, gamer, neon, mascote e privacidade.
- Cores, opacidade, tipografia, alinhamento, cantos, bordas, brilho e rótulo personalizado.
- Missão, até cinco tarefas, XP, nível, streak, foco, progresso, captura, mascote e Professor Atlas.
- Próxima lição do roadmap quando habilitada.
- Tarefas compactas ou detalhadas e formatos de progresso em barra, círculo, texto ou número.
- Ação ao tocar configurável para Hoje, Brain, Captura, Foco, Progresso ou Operações.
- Conclusão direta de tarefas usando estado desejado, fila privada e sincronização idempotente de XP.
- Consumo atômico da fila para reduzir corrida entre retomadas do app.
- Payload compacto e limitado a 32 KB, sem chave, perfil completo ou conteúdo privado desnecessário.

## Por que não aparece no Expo Go

O provider precisa ser compilado no APK/AAB. Use development build ou APK Preview.

## Gerar automaticamente pelo GitHub

1. Adicione `EXPO_TOKEN` em **Settings → Secrets and variables → Actions**.
2. Abra **Actions → Nexus Android Preview → Run workflow**, ou publique uma tag `v2.1.*`.
3. O workflow valida o projeto e inicia o EAS Build Preview.

Também é possível pelo Shell:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

## Teste recomendado

1. Instale o APK e abra o app uma vez.
2. Adicione duas instâncias com tamanhos e presets diferentes.
3. Teste estilos AMOLED, glass, neon, mascote e privacidade.
4. Altere conteúdo, alinhamento, brilho, borda, cantos e ação ao tocar.
5. Conclua a mesma tarefa várias vezes pelo widget e confirme que o XP entra uma vez.
6. Ative Nexus + Atlas e próxima lição.
7. Reinicie o aparelho e confirme persistência.
8. Após atualizar o APK, remova e adicione novamente widgets que mantiverem layout antigo.

## Se não atualizar

- Abra o Nexus para renovar o payload.
- Remova e adicione a instância após uma atualização grande.
- Revise restrições extremas de bateria do fabricante.
- Valide widgets somente no APK, nunca na prévia web.
