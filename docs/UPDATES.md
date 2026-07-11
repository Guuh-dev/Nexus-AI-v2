# Fluxo de atualização — Nexus AI 2.1

## Checkpoints

Antes de atualizar uma versão instalada, mantenha:

- tag da versão anterior, por exemplo `v2.0.0-rc1-backup`;
- backup JSON exportado pelo Perfil;
- branch de release separada até o CI ficar verde.

O storage v4 cria um backup local antes de migrar dados anteriores e recupera seções inválidas de forma independente.

## Atualização JavaScript/web

Use para telas, estilos, textos, regras locais e backend Expo sem mudança nativa:

1. crie uma branch;
2. implemente a mudança;
3. rode `npm run verify`, `npm run release:check` e `npm run export:web`;
4. abra PR;
5. faça merge somente com CI e Security verdes;
6. deixe o Render publicar a nova versão do backend/web.

## Atualização nativa

Gere APK/AAB novo ao mudar widget, Kotlin, permissões, dependências nativas, ícones, splash, intents ou Expo SDK.

O workflow **Nexus Android Preview** pode ser iniciado manualmente ou automaticamente por uma tag `v2.1.*` após configurar `EXPO_TOKEN`.

## Configuração única

1. Adicione `EXPO_TOKEN` em GitHub → Settings → Secrets and variables → Actions.
2. Conecte o Render à branch `main` com auto-deploy.
3. Guarde `OPENROUTER_API_KEY` somente no ambiente do Render.
4. Confirme `/api/status` com `apiVersion: "2.1"` antes de gerar o APK.

## Checklist de release

- [ ] TypeScript, lint e testes passam.
- [ ] Secret scan, npm audit e workflow Security passam.
- [ ] Export web completa.
- [ ] Fallback offline funciona.
- [ ] Migração preserva perfil, plano, tarefas, XP, streak, chats e roadmaps.
- [ ] Teclado foi testado nos formulários Android.
- [ ] Ações do Brain exigem confirmação.
- [ ] Ações repetidas do widget não duplicam XP.
- [ ] Backend V2.1 está publicado e com a chave configurada.
- [ ] Changelog, versão e rollback estão preparados.
