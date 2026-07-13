# Nexus AI 2.3.1 — Recovery & Widget Polish

## Por que esta versão existe

A 2.3.1 corrige problemas observados no aparelho real depois da estreia da família de widgets 2.3.0: layouts comprimidos, mascotes com tint incorreto, diferenças entre preview e `RemoteViews`, teclado cobrindo o chat e respostas inválidas de modelos gratuitos.

## IA e Professor Atlas

- respostas exclusivamente finais e em português brasileiro;
- bloqueio server-side de reasoning, prompt interno, inglês predominante e conteúdo excessivo;
- Atlas limitado a uma etapa e uma pergunta por turno;
- roadmap e revisão semanal precisam validar o objeto estruturado remoto;
- uma tentativa de reparo cabe no watchdog antes do fallback local;
- o app identifica claramente quando a origem é remota ou local.

## Brain e teclado

- compensação adaptativa da parte do teclado que não foi absorvida pelo `adjustResize`;
- composer sempre visível;
- sem compensação duplicada ou faixa branca;
- posição preservada quando o usuário está lendo mensagens antigas;
- acompanhamento automático apenas quando a conversa já estava no final.

## Widget Android real

- cinco famílias mantidas: Mini, Strip, Companion, Mission e Command;
- densidade de conteúdo por espaço disponível;
- margens, ellipsize e tamanhos mínimos seguros;
- opacidade real em 50%, 70%, 85%, 96% e 100%;
- mascotes com proporção e cores próprias, sem tint destrutivo;
- configuração independente por instância;
- privacidade, nonce e XP idempotente preservados.

## Entrega

Esta atualização altera Kotlin, XML, drawables e runtime. Portanto, precisa de um APK-base 2.3.1 e não pode ser enviada ao APK 2.3.0 somente por OTA.
