# Widget Android do Nexus AI

## O que está implementado

- `NexusWidgetProvider` em Kotlin.
- Layout `RemoteViews` adaptável de 1×1 até 5×2, incluindo 2×2, 4×2 e 4×4.
- Missão principal, até cinco tarefas, progresso, streak, XP, nível e foco.
- Estilos Nexus, AMOLED, transparente, glass, pixel, minimalista, gamer e privacidade.
- Mascote Nexus, companheiros e Professor Atlas opcional ao lado do mascote principal.
- Próxima lição do roadmap e duração, quando habilitadas no Widget Studio.
- Conclusão de tarefas diretamente no widget com fila nativa e sincronização idempotente de XP.
- Configuração independente por instância para estilo, conteúdo, mascote e cor.
- Modo de privacidade.
- SharedPreferences privado como ponte.
- Atualização após mudança do plano, tarefa, streak ou preferências.
- Toques abrem Hoje ou Captura rápida.
- Config plugin registra receiver, intent e metadata no Manifest.

## Por que não aparece no Expo Go

O Expo Go possui uma coleção fixa de módulos nativos. O provider do widget precisa ser compilado dentro do APK. Use um development build, preview APK ou build de produção.

## Gerar e instalar o APK

No Shell do Replit:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

Quando o EAS terminar:

1. Abra o link do build no Galaxy.
2. Baixe o `.apk`.
3. Autorize temporariamente “Instalar apps desconhecidos” para o navegador.
4. Instale o Nexus AI.
5. Abra o app uma vez e conclua o onboarding.
6. Segure um espaço vazio na tela inicial.
7. Entre em **Widgets**.
8. Procure **Nexus AI — Missão de hoje**.
9. Arraste o widget e escolha a configuração dessa instância.
10. Redimensione pelo launcher para o formato desejado.
11. Abra Perfil → Widget Studio para controlar conteúdo global, Atlas, roadmap, tipografia e privacidade.

## Teste recomendado

1. Conclua uma tarefa dentro do app.
2. Volte à tela inicial.
3. Confirme a alteração de `0/4` para `1/4` e o check da tarefa.
4. Toque no widget e confirme a abertura da tela Hoje.
5. Conclua outra tarefa diretamente no widget, abra o app e confirme que o XP foi aplicado uma única vez.
6. Ative Professor Atlas + próxima lição e valide a dupla ao lado da missão.
7. Adicione duas instâncias com estilos diferentes.
8. Troque para AMOLED e modo privacidade.
9. Reinicie o celular e confirme que o conteúdo permanece.

## Se o widget não atualizar

- Abra o Nexus uma vez para renovar o payload.
- Remova e adicione o widget novamente após instalar uma versão nova.
- Desative restrição extrema de bateria apenas para o Nexus, se a fabricante impedir atualizações.
- Não tente validar o provider pelo navegador: a prévia web é apenas visual.
