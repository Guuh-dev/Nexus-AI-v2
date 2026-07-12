# Fluxo de atualização — Nexus AI 2.1.1

## Regra principal

A versão 2.1.1 instala a base nativa de `expo-updates`. Por isso, **o primeiro passo é gerar e instalar um APK 2.1.1**. Depois disso, mudanças compatíveis podem chegar por OTA sem baixar outro APK.

### Pode ser OTA

- telas, componentes e navegação em JavaScript/TypeScript;
- regras locais, textos, estilos e temas;
- correções no Brain, Atlas, onboarding e planejamento que não mudem módulos nativos;
- assets comuns compatíveis com o mesmo runtime.

### Exige APK novo

- `app.json`, `eas.json`, versão do app ou runtime;
- dependências ou plugins Expo/React Native;
- Kotlin, widget, permissões, ícone, adaptive icon ou splash;
- qualquer alteração em `modules/`, `plugins/`, `android/` ou `ios/`.

O workflow **Nexus Native Change Detector** classifica cada pull request e falha de forma conservadora: em caso de dúvida, exige APK em vez de arriscar uma OTA incompatível.

## Canais

- `preview`: atualização privada para teste no APK Preview.
- `production`: atualização estável para o APK Release.

O Perfil mostra versão nativa, runtime, canal, ID da atualização e estado de emergência. O botão **Verificar atualização** consulta o canal atual; quando existe pacote novo, **Baixar e reiniciar** aplica a atualização com reload controlado.

## Fluxo preview automático

Depois do APK-base 2.1.1:

1. crie uma branch;
2. rode `pnpm run verify` e `pnpm run release:check`;
3. abra PR e confirme o classificador;
4. faça merge na `main` somente com CI e Security verdes;
5. se a mudança for OTA, **Nexus OTA Preview** publica automaticamente no canal `preview`;
6. se for nativa, o workflow explica por que foi ignorada e você gera novo APK.

## Produção

Depois de validar no preview:

1. abra **Actions → Nexus OTA Production**;
2. informe a mensagem;
3. digite exatamente `PRODUCTION`;
4. o workflow bloqueia mudanças nativas, repete testes e publica no canal `production`.

## Rollback

Abra **Actions → Nexus OTA Rollback**, informe o group ID da atualização mais recente, a mensagem e digite exatamente `ROLLBACK`. O rollback é publicado no mesmo runtime e os metadados ficam guardados como artifact do workflow.

Mantenha sempre:

- backup JSON exportado pelo Perfil;
- tag do APK-base estável;
- group ID da última OTA estável;
- branch de release até todos os checks ficarem verdes.
