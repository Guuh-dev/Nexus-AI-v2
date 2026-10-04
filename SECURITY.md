# Segurança do Nexus AI 3.0

## Modelo de ameaça

O Nexus é local-first, não possui autenticação e usa um identificador aleatório de instalação. Esse identificador serve para idempotência e rate limit; ele não prova identidade e não deve autorizar ações privilegiadas.

Dados pessoais ficam no armazenamento privado da instalação. Planejamento, Brain, Professor Atlas, roadmaps, captura e revisão podem enviar contexto ao backend do Nexus. O backend chama a OpenRouter sem expor a chave ao cliente.

## Controles implementados

- chave OpenRouter somente em `process.env.OPENROUTER_API_KEY` no servidor;
- nenhuma variável `EXPO_PUBLIC_*` contém segredo;
- política de provedor com `dataCollection: deny`, `zdr: true`, teto de preço e allowlist de modelos/capacidades;
- Zod estrito para corpo da API, perfil, respostas de IA e dados persistidos;
- limites de tamanho, profundidade, quantidade de nós, arrays, textos, tarefas e backups;
- bloqueio de chaves relacionadas a prototype pollution;
- conteúdo da IA tratado como texto; nenhum código gerado é executado;
- sem `dangerouslySetInnerHTML`;
- timeouts por fluxo, retry limitado a falhas temporárias e cancelamento explícito;
- Brain, Professor Atlas, roadmaps e revisão falham de forma transparente, sem resposta conversacional local fingindo ser IA;
- planejamento local e captura local explicitamente rotulados e validados antes da persistência;
- idempotência isolada por instalação e request ID, com conflito quando o mesmo ID recebe outro payload;
- streaming SSE sem chave, prompt integral ou contexto em eventos públicos;
- rate limit por IP/instalação, teto global diário e limite de operações simultâneas;
- respostas sensíveis com `Cache-Control: no-store`, `nosniff` e política de referrer restrita;
- erros públicos sem stack trace, chave, prompt completo ou perfil;
- recuperação campo a campo de storage, backup pré-migração e validação antes de salvar;
- preview, confirmação e snapshot reversível antes de importar backup;
- busca automatizada por padrões de segredo no repositório e bundle web;
- OTA separada por runtime/canal e detector conservador de mudanças nativas;
- ações de widget que alteram estado usam nonce por instalação e consumo idempotente;
- inputs manuais de GitHub Actions passam por variáveis de ambiente e confirmações explícitas.

## Política de dados remotos

`dataCollection: deny` e `zdr: true` restringem os endpoints aceitos pelo roteador, mas não substituem TLS, controle de acesso à hospedagem nem revisão contratual do provedor. ZDR não significa que o conteúdo deixa de ser processado em memória durante a inferência.

O backend mantém operações em andamento e dá às respostas idempotentes em memória uma validade de reutilização de dez minutos. Entradas expiradas não têm apagamento físico cronometrado: a limpeza ocorre por capacidade ou reinício do processo. A telemetria própria registra ID, modo, modelo, tentativa, latência, status e erro, sem gravar deliberadamente prompt, conversa ou perfil. Proxies e plataforma de hospedagem podem produzir logs de acesso; produção deve aplicar menor privilégio, retenção curta e revisão periódica.

## Limites conhecidos

### Rate limit em memória

Os buckets, tetos diários, caches e operações em andamento vivem na memória de cada processo. Isso atende uso pessoal e demonstração, mas apresenta riscos em implantação pública:

- reiniciar uma instância zera contadores;
- múltiplas instâncias não compartilham quotas e podem aplicar limites de forma desigual;
- IPs compartilhados podem causar bloqueios coletivos;
- IDs de instalação podem ser recriados por clientes modificados;
- não há autenticação nem quota durável para proteger créditos pagos.

Antes de uso público ou pago, mover quotas e idempotência para armazenamento compartilhado, autenticar usuários, limitar gasto por conta e configurar alertas de custo/abuso.

### Armazenamento local e backups

O armazenamento privado da plataforma não é uma defesa contra aparelho desbloqueado, malware com privilégios, perfil do navegador comprometido ou backup do sistema exposto. Backups JSON são legíveis e devem ser tratados como dados pessoais. Não incluir segredos, tokens ou credenciais no perfil, tarefas, conversas ou memórias.

### Cliente inspecionável

APK e bundle web podem ser analisados por terceiros. Nenhum segredo, crédito, regra de autorização ou confiança no cliente pode substituir validação no servidor.

### Infraestrutura externa

Disponibilidade, política de retenção efetiva e segurança operacional também dependem da hospedagem, OpenRouter e provedores elegíveis. Produção deve verificar continuamente a política ZDR, restringir acesso aos logs, rotacionar chaves e manter plano de revogação.

## Operação segura em produção

- usar uma conta OpenRouter separada, com crédito e alertas limitados;
- manter somente modelos aprovados e endpoints compatíveis com ZDR;
- executar auditoria de dependências, secret scan, testes e build nativo no CI;
- proteger ambientes e workflows de release com revisão;
- validar o backend público v3 antes de publicar APK ou OTA;
- não publicar dumps, backups, prompts reais, chaves ou logs com conteúdo de usuários.

## Relato responsável

Não abra issue pública com dados reais, backups ou chaves. Envie ao mantenedor uma reprodução mínima, impacto, versão afetada e qualquer evidência já sanitizada por canal privado.

## Exceções do audit de dependências

`pnpm audit --audit-level=high` continua bloqueando o CI. Só os advisories abaixo
estão em `pnpm.auditConfig.ignoreGhsas`, por decisão do mantenedor em
2026-10-04. Nenhum tem versão corrigida publicada e ambos têm patch local
aplicado via `pnpm.patchedDependencies`. Qualquer advisory novo continua falhando.

| Advisory | Pacote | Por que entra no projeto | Mitigação |
| --- | --- | --- | --- |
| GHSA-86w9-cpqp-85rv | node-forge ≤1.4.0 | Ferramentas de certificado da CLI do Expo (build). Não é empacotado no app. | `patches/node-forge@1.4.0.patch` rejeita filhos excedentes no DigestAlgorithm (proposta upstream digitalbazaar/forge#1152). Ver `docs/LOCK_IN_APK_PREVIEW.md`. |
| GHSA-vfj7-8cjw-p6xm | braces ≤3.0.3 | `metro` → `micromatch` (bundler e file map). Processa globs da configuração do projeto, não entrada de usuário do app. | `patches/braces@3.0.3.patch` limita o aninhamento a 128 níveis e lança `SyntaxError` antes dos walkers recursivos estourarem a pilha. Teste em `tests/dependency-security.test.ts`. |

Revisar até: 2026-11-04. Na revisão, ou quando sair versão corrigida, atualize a
dependência, remova o patch e retire o GHSA da lista. Não acrescente IDs a essa
lista sem patch ou justificativa equivalente registrada aqui.
