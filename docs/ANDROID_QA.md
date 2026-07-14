# QA Android — Nexus AI 3.0

## Preparação

- Use um aparelho físico com Android suportado e uma instalação 2.x que contenha perfil, tarefas, chats, roadmaps e ao menos um widget.
- Exporte um backup JSON antes da atualização.
- Gere a v3.0.0 com prebuild limpo e Gradle ou instale o APK produzido pelo EAS.
- Mantenha o APK anterior disponível para diagnóstico; não limpe os dados do app antes do teste de migração.

## Atualização por cima

1. Instale o APK 3.0.0 sobre a versão anterior.
2. Abra o app e confirme perfil, objetivo, missão, tarefas, XP, histórico, chats e roadmaps.
3. Confirme que temas antigos foram convertidos sem tela branca ou contraste ilegível.
4. Abra Perfil → Dados e exporte um novo backup.
5. Reinicie o app e o aparelho; confirme que o estado continua igual.
6. Verifique os avisos de recuperação. Eles devem identificar somente campos realmente descartados.

## Navegação e layout

- A barra inferior mostra apenas Hoje, Brain, Foco, Progresso e Perfil.
- Teclado não cobre compositores, botões de onboarding, Atlas, editor de tarefa ou campos do Widget Studio.
- Back gesture retorna à tela esperada e não perde rascunhos.
- Tema Light ajusta status bar e navigation bar; temas escuros não causam flash branco.
- Texto ampliado e redução de movimento continuam utilizáveis.

## Brain e Atlas

- Com backend saudável, envie uma pergunta em português e confirme resposta conversacional curta.
- Confirme que Atlas entrega uma etapa e no máximo uma pergunta por vez.
- Interrompa a rede durante uma resposta: o app deve mostrar indisponibilidade e permitir tentar novamente.
- Reabra a tela e confirme que o rascunho não enviado permanece.
- Simule cold start do backend e confirme estado de conexão, timeout limitado e retry explícito.
- Verifique que não aparecem prompts internos, rótulos de classificador, conteúdo em inglês inesperado ou identificadores sensíveis.

## Roadmaps e revisão

- Crie trilhas para programação, programação com IA e uma oferta comercial; compare intenção e nível.
- Ative, arquive, reative e exclua um roadmap; reinicie o app após cada mutação.
- Provoque falha de persistência durante a criação e confirme que a entrevista permanece na tela.
- Gere revisão com poucos dados e com uma semana completa; confirme que falta de evidência é declarada e que métricas não mudam entre execuções equivalentes.

## Foco e tarefas

- Inicie, pause, restaure e conclua uma sessão de foco.
- Feche o app no meio da sessão e confirme restauração correta.
- Desative sons e confirme que nenhum áudio começa.
- Crie e edite tarefa com contexto, primeira ação, resultado esperado e critério de conclusão.
- Marque e desmarque a mesma tarefa; XP não pode duplicar.

## Widgets

Para cada família Mini, Strip, Companion, Mission e Command:

1. adicione pelo launcher;
2. confirme o estado vazio antes de existir plano;
3. abra o Studio, selecione a instância e salve uma configuração;
4. compare preview e widget real;
5. altere estilo, cor, opacidade, conteúdo e ação;
6. conclua uma tarefa pelo widget quando a família permitir;
7. reinicie aparelho e app;
8. remova e adicione novamente.

Confirme também duas instâncias da mesma família com configurações diferentes. Transparente deve ser realmente transparente. Mission mostra no máximo duas tarefas; Command, no máximo quatro.

No menor tamanho permitido de cada família, confirme que mascote, textos, tarefas e progresso não são cortados. O Studio e a entrevista do Atlas não devem oferecer controles de segundo Professor/aprendizado no widget, e nenhum widget deve mostrar uma lição antiga mesmo que a instalação migrada ainda preserve essas flags no backup. Selecionar Atlas como mascote único continua válido e deve renderizar normalmente.

## Atualização e release

- A v3.0.0 deve ser instalada como APK novo porque contém alterações nativas.
- Uma OTA do mesmo runtime não pode alterar Kotlin, XML, Manifest, plugin, dependências nativas ou versão do app.
- Teste check, download, reload e rollback de uma OTA compatível somente depois de existir o APK-base 3.0.0.

## Evidências de aprovação

Registre versão, commit, modelo do aparelho, versão Android, caminho de instalação, capturas dos cinco widgets e resultado de cada cenário. Um bloqueio deve incluir passos de reprodução e logs sanitizados, nunca secrets ou conteúdo privado completo.
