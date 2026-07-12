# Fluxo de atualização — Nexus AI 2.2

## Regra principal

A versão 2.2.0 inaugura um novo runtime porque altera o widget Kotlin, layouts XML e o armazenamento. Portanto, **primeiro gere e instale o APK 2.2.0**. Depois disso, mudanças compatíveis 2.2.x podem chegar por OTA.

### Pode ser OTA

- telas, componentes e navegação em JavaScript/TypeScript;
- prompts, streaming, regras locais, textos, estilos e temas;
- ajustes do Brain, Atlas, Companion e Money Mission que não alterem módulos nativos;
- presets/preview do Widget Studio que utilizem capacidades já instaladas;
- assets comuns compatíveis com runtime 2.2.0.

### Exige APK novo

- `app.json`, `eas.json`, app version ou runtime;
- dependências/plugins Expo ou React Native;
- Kotlin, XML, widget provider, permissões, ícone ou splash;
- mudanças em `modules/`, `plugins/`, `android/` ou `ios/`.

O **Nexus Native Change Detector** classifica cada pull request. Em caso de erro ou dúvida, exige APK por segurança.

## Canais

- `preview`: teste privado em builds ligados ao canal Preview.
- `production`: atualização estável para o APK Release.

O Perfil mostra versão nativa, runtime, canal e update ativo. O usuário pode verificar, baixar e reiniciar de forma controlada.

## Fluxo OTA 2.2.x

1. crie branch a partir da `main`;
2. rode `pnpm run verify`, `pnpm run release:check` e `pnpm run export:web`;
3. abra PR;
4. confirme `Native APK required: false`;
5. faça merge somente com CI e Security verdes;
6. valide o Preview;
7. execute **Nexus OTA Production**, informe a mensagem e confirme `PRODUCTION`.

## Fluxo nativo

1. incremente app version/runtime;
2. classificador deve indicar mudança nativa;
3. faça merge após checks;
4. crie tag semântica;
5. **Nexus Release** gera e anexa o APK;
6. faça backup e instale por cima;
7. remova/recrie widgets quando o launcher mantiver layout antigo.

## Rollback

Abra **Nexus OTA Rollback**, informe o group ID, mensagem e confirme `ROLLBACK`. Rollback só funciona dentro do mesmo runtime compatível.

Mantenha sempre:

- backup JSON;
- tag/APK-base estável;
- group ID da OTA estável;
- branch de release até todos os checks terminarem.
