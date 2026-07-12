# Widget Studio Android — Nexus AI 2.2

## Recursos

- provider Kotlin e configuração independente por instância;
- layouts adaptáveis de 1×1 a 5×2;
- 16 presets de missão, foco, Atlas, Companion, progresso, hábitos e dinheiro;
- 11 estilos, incluindo Light Clean;
- missão, até cinco tarefas, XP, nível, streak, foco, progresso, aprendizado, hábitos, Boss Battle e finanças;
- humor, fala, mascote e acessório por instância;
- troca de página;
- conclusão idempotente de tarefas;
- nonce para conclusão e navegação interna de página;
- payload compacto sem chave, perfil completo ou conversa.

## APK obrigatório

A 2.2.0 altera Kotlin, XML, drawable e runtime. Ela precisa de novo APK e não pode ser entregue ao binário 2.1.1 por OTA.

Depois que o APK 2.2.0 estiver instalado, mudanças compatíveis apenas em JavaScript/TypeScript podem chegar via OTA 2.2.x.

## Build

1. Configure `EXPO_TOKEN` no GitHub.
2. Faça merge da branch da 2.2.0 após CI, Security e Native Change Detector verdes.
3. Crie a tag `v2.2.0` para disparar **Nexus Release**.

Build manual:

```bash
pnpm dlx eas-cli@20.5.1 build --platform android --profile preview
```

## Teste

1. Faça backup JSON.
2. Instale o APK e abra o app uma vez.
3. Remova widgets antigos mantidos em cache pelo launcher.
4. Adicione duas instâncias com estilos e humores diferentes.
5. Teste missão, tarefas, Companion, finanças, hábitos e Boss Battle.
6. Ative troca de página e reinicie o aparelho.
7. Conclua a mesma tarefa repetidamente e confirme XP único.
8. Teste privacy mode.
9. Altere Money Mission e confirme atualização do widget.
10. Confirme que cada instância preserva configuração independente.

Leia também [WIDGET_STUDIO_2_2.md](WIDGET_STUDIO_2_2.md).
