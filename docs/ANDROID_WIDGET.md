# Widget Studio Android — Nexus AI 3.0

## Arquitetura instalada

O APK registra cinco `AppWidgetProvider`: Mini, Strip, Companion, Mission e Command. Todos consomem um payload compacto v3, mas cada provider escolhe seu próprio layout e aplica o limite de conteúdo da família.

`NexusWidgetConfigureActivity` é opcional e reconfigurável. Antes de ler ou gravar uma instância, ela confirma com `AppWidgetManager` que o ID pertence a um provider Nexus conhecido. Os valores iniciais vêm do render spec da família; valores salvos pela instância têm precedência.

## Capacidades

- cinco layouts com preview estático no launcher;
- Nexus, AMOLED, Transparente, Pixel e Minimal;
- opacidades de 0%, 70%, 85%, 96% e 100%;
- cor de destaque, inclusive cor personalizada já salva;
- sete mascotes e sete personalidades;
- fala contextual ou silenciosa;
- privacidade global ou por instância;
- abertura de Hoje, Brain, Foco ou Progresso;
- conclusão segura de até duas tarefas em Mission e quatro em Command.

Opções de versões antigas são migradas. A família real sempre vem do provider, fala antiga vira contextual e destinos removidos viram Hoje.

Os mínimos nativos são 40×40 dp (Mini), 110×40 dp (Strip), 110×110 dp (Companion), 250×110 dp (Mission) e 250×250 dp (Command). O elemento raiz de cada XML declara exatamente o mesmo mínimo do metadata do provider; imagens, padding, linhas e tarefas visíveis foram dimensionados para esse limite, evitando depender de espaço extra concedido por um launcher específico.

Aprendizado e o Professor Atlas separado permanecem no app. A v3 não oferece controles nem payload paralelo para uma lição ou segundo personagem, pois nenhuma das cinco famílias renderiza esse canal. Atlas continua disponível como o mascote único da instância. Preferências antigas continuam válidas durante migração/restore, mas não reativam uma superfície invisível.

## Quando é necessário um APK

Qualquer alteração em `modules/nexus-widget`, `plugins`, configuração Expo, Manifest, recursos Android ou dependências nativas exige novo runtime e novo APK. OTA só pode alterar código compatível com as capacidades já instaladas.

## Verificação local

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm exec expo prebuild --platform android --clean
bash scripts/verify-native-widget.sh
./android/gradlew :app:assembleDebug
```

O último comando requer JDK e Android SDK configurados. O verificador confere providers, Activity, política de backup, previews, normalizadores, rotas permitidas e ausência de recursos órfãos. Testes TypeScript também comparam dimensões do metadata e da raiz dos cinco layouts; isso não substitui a compilação Gradle nem o teste em launcher real.

## Roteiro em Android físico

1. Instale o APK v3 e abra o app uma vez para sincronizar o payload.
2. Abra o seletor do launcher e confira a amostra das cinco famílias.
3. Adicione uma instância de cada família e conclua a configuração inicial.
4. Reabra a configuração e confirme que os valores permanecem selecionados.
5. Configure duas instâncias da mesma família com estilos diferentes.
6. Teste fala contextual e silenciosa.
7. Ative privacidade global e por instância; confirme que textos e métricas não vazam.
8. Teste as quatro ações de raiz.
9. Conclua tarefas em Mission e Command e confirme sincronização idempotente no app.
10. Reinicie o dispositivo e confirme persistência e redesenho.

Consulte também [WIDGETS.md](WIDGETS.md) e [ANDROID_QA.md](ANDROID_QA.md).
