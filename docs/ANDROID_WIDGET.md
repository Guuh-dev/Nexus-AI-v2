# Widget Studio Android — Nexus AI 2.1.1

## Recursos

- provider Kotlin e configuração independente por instância;
- layouts adaptáveis, presets e estilos Nexus, AMOLED, glass, pixel, neon, minimalista e privacidade;
- missão, até cinco tarefas, XP, nível, streak, foco, progresso, captura, mascote e Atlas;
- conclusão idempotente de tarefas com fila privada e consumo atômico;
- payload compacto sem chave, perfil completo ou conteúdo privado desnecessário.

## APK obrigatório

O widget é nativo e não funciona no Expo Go ou na prévia web. Alterações em `modules/nexus-widget`, plugins ou configuração exigem um APK novo e não podem ser distribuídas por OTA.

## Build

1. Configure `EXPO_TOKEN` no GitHub.
2. Abra **Actions → Nexus Android Build**.
3. Escolha `preview` para teste ou `release` para base estável.

Pelo Shell:

```bash
pnpm dlx eas-cli@20.5.1 build --platform android --profile preview
```

## Teste

1. Instale o APK e abra o app uma vez.
2. Adicione duas instâncias com tamanhos e presets diferentes.
3. Conclua a mesma tarefa repetidamente e confirme XP único.
4. Ative Nexus + Atlas e próxima lição.
5. Reinicie o aparelho e confirme persistência.
6. Após atualização nativa, remova e adicione novamente widgets que mantiverem cache antigo.
