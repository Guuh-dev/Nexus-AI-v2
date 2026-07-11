# Segurança do Nexus AI

## Modelo de ameaça inicial

O Nexus 1.0 é local-first e não possui autenticação. Dados pessoais ficam no armazenamento privado da instalação. A única operação remota é a geração de plano, mediada pelo servidor.

## Controles implementados

- Chave OpenRouter somente em `process.env.OPENROUTER_API_KEY` no servidor.
- Nenhuma variável `EXPO_PUBLIC_*` contém segredo.
- Zod estrito em corpo da API, perfil, resposta de IA e dados persistidos.
- Tamanhos máximos para corpo, textos, arrays, tarefas e backups.
- Conteúdo da IA tratado como texto; nenhum código gerado é executado.
- Sem `dangerouslySetInnerHTML`.
- Timeout total de 45 segundos e um retry controlado no cliente.
- Idempotência para impedir requisições duplicadas.
- Rate limit por IP/instalação e teto global compatível com a cota gratuita.
- Fallback local quando a rede, chave ou provedor falham.
- Erros públicos sem stack trace, chave, prompt completo ou perfil.
- Respostas sensíveis com `Cache-Control: no-store`.
- Recuperação apenas da seção local corrompida.
- Busca automatizada por padrões de segredo no repositório e bundle web.

## Limites conhecidos

O limitador em memória atende o lançamento pessoal/demonstração. Uma versão paga ou de alto volume deve usar um rate limiter durável no servidor e autenticação de usuários antes de compartilhar créditos pagos.

O APK pode ser inspecionado por terceiros; por isso, nenhum segredo ou autorização privilegiada pode ser colocado nele.

## Relato responsável

Não publique uma vulnerabilidade com dados reais ou chaves. Abra um aviso privado ao mantenedor com reprodução mínima, impacto e versão afetada.
