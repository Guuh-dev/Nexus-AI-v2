# Fluxo de atualização — Nexus AI 3.0

## Regra de compatibilidade

O runtime é a versão do app. Primeiro publique e instale o APK-base v3.0.0. Depois, somente mudanças compatíveis com esse runtime podem seguir por OTA no mesmo canal.

Exigem APK novo:

- `app.json`, `eas.json`, versão ou política de runtime;
- dependências, plugins Expo e módulos React Native;
- Kotlin, Java, Manifest, Gradle, XML, drawables, ícone ou splash;
- qualquer arquivo em `modules/`, `plugins/`, `android/` ou `ios/`.

Podem ser OTA quando o classificador não encontra mudança nativa:

- telas, componentes e regras TypeScript/JavaScript;
- textos, prompts e estilos que usam capacidades já instaladas;
- correções do preview ou do Studio que não alteram o contrato nativo.

O detector falha fechado: erro de histórico ou classificação bloqueia OTA e exige análise para novo APK.

## Baseline e comparação

A tag `v<versão>` e seu APK publicado representam o runtime instalado. Os workflows OTA comparam diretamente a árvore dessa tag com a árvore do commit candidato (`base..head`). Não usam merge-base para esconder mudanças presentes em uma árvore e ausentes na outra.

O baseline deve ser ancestral do commit candidato. Se a tag não existir ou a GitHub Release não tiver APK, nenhuma OTA é publicada.

## Canais

- `preview`: validação privada das mudanças compatíveis;
- `production`: atualização estável dos APKs ligados ao canal Production.

OTA de produção só pode ser disparada a partir de `main`, exige a confirmação literal `PRODUCTION`, executa verificação completa, bloqueia qualquer diferença nativa e exige que o backend publicado responda ao contrato v3 por GET. Esse gate não dispara o probe POST do provedor e, portanto, não depende de sua janela de cooldown.

## Release de APK

1. Faça merge do commit de release em `main` com CI, Security e detector verdes.
2. Aguarde a publicação do backend e confirme `/api/status` v3.
3. Crie a tag `v3.0.0` no commit contido em `main`.
4. O workflow valida versão, ancestralidade, testes, release check e compatibilidade Expo.
5. Antes do build, o workflow exige o contrato exato do backend v3 e um probe real do provedor.
6. O EAS gera o APK e a GitHub Release recebe o binário e os metadados do build.

Uma tag criada fora do histórico de `main`, um backend incompatível ou um probe indisponível interrompe o release antes do build.

## OTA de produção

1. Faça merge da correção em `main`.
2. Confirme que Preview foi publicado e validado.
3. Abra **Nexus OTA Production** usando `main`.
4. Informe a mensagem e confirme `PRODUCTION`.
5. O workflow compara a árvore com a tag/APK-base e executa `verify` e `release:check`.
6. Antes de publicar, `GET /api/status` deve confirmar versão, identidade, disponibilidade e capacidades do backend v3.

## Rollback

Use **Nexus OTA Rollback** somente dentro do mesmo runtime compatível. Informe o group ID validado, a mensagem e a confirmação solicitada pelo workflow.

Mantenha o backup JSON, a tag e o APK-base estáveis, o group ID da OTA aprovada e o registro do teste em Android físico.
