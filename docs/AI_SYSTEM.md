# Sistema de IA do Nexus AI 3.0

## Regra central

Nenhum endpoint envia `openrouter/free` como modelo. O backend seleciona IDs conhecidos em `constants/models.ts`, valida as capacidades exigidas pelo modo e valida novamente o ID efetivamente retornado pelo provedor.

O cliente nunca escolhe um modelo e nunca recebe a chave OpenRouter.

## Registro aprovado

Allowlist revisada em 13 de julho de 2026:

| Papel | ID | Preço de vitrine em 13/07/2026 | Faixa observada nos endpoints ZDR elegíveis | Contexto anunciado | Uso |
| --- | --- | --- | --- | --- | --- |
| Primário | `deepseek/deepseek-v4-flash` | US$ 0,09 entrada / US$ 0,18 saída por 1M tokens | US$ 0,09–0,15 entrada / US$ 0,18–0,28 saída por 1M tokens; 12 endpoints | Modelo: 1M; endpoints ZDR observados: 65K–1M | Chat, raciocínio, código, instruções e estrutura. |
| Alternativo | `qwen/qwen3-30b-a3b-instruct-2507` | US$ 0,04815 entrada / US$ 0,1931 saída por 1M tokens | US$ 0,09–0,15 entrada / US$ 0,30–0,55 saída por 1M tokens; 4 endpoints | Modelo: 131K; endpoints ZDR observados anunciavam 262K | Instrução multilíngue, JSON e alternativa leve em modo não-thinking. |

Referências oficiais do provedor: [DeepSeek V4 Flash](https://openrouter.ai/deepseek/deepseek-v4-flash/api), [Qwen3 30B Instruct](https://openrouter.ai/qwen/qwen3-30b-a3b-instruct-2507/api), [endpoints DeepSeek](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash/endpoints), [endpoints Qwen3](https://openrouter.ai/api/v1/models/qwen/qwen3-30b-a3b-instruct-2507/endpoints), [endpoints ZDR](https://openrouter.ai/api/v1/endpoints/zdr), [política ZDR](https://openrouter.ai/docs/guides/features/zdr), [free router](https://openrouter.ai/docs/guides/routing/routers/free-router) e [seleção de provider](https://openrouter.ai/docs/guides/routing/provider-selection). Preço, descontos, endpoints e uptime são voláteis. A auditoria de 13 de julho de 2026 encontrou 17 endpoints totais/12 ZDR para o primário e 6 totais/4 ZDR para o alternativo. O desconto público do Qwen vinha de um endpoint que não aparecia na lista ZDR; por isso a tabela separa preço de vitrine de custo realmente elegível à policy do Nexus. Outros filtros de status e parâmetros ainda podem reduzir o conjunto em runtime.

O registro é código, não descoberta automática. Antes de adicionar um ID, confirme modalidade, parâmetros, política de dados, disponibilidade e comportamento em português; depois acrescente testes de bloqueio e de resposta resolvida.

O ID público do primário possui o slug canônico exato `deepseek/deepseek-v4-flash-20260423`. Ele é aceito somente na validação do `model` resolvido que o provedor pode devolver; as requisições continuam usando o ID público. Prefixos, wildcards, slugs parecidos e outras versões permanecem bloqueados.

O roteamento anterior usava um seletor gratuito aleatório. A primeira proposta de substituição fixava uma variante gratuita de Qwen2.5 72B, mas a [listagem oficial de endpoints](https://openrouter.ai/api/v1/models/qwen/qwen-2.5-72b-instruct%3Afree/endpoints) estava vazia na revisão final e o candidato foi removido antes da publicação. A variante gratuita de GPT-OSS 20B também foi retirada: sua [listagem oficial](https://openrouter.ai/api/v1/models/openai/gpt-oss-20b%3Afree/endpoints) tinha somente um endpoint ativo e nenhum endpoint ZDR sob aquele ID. Variantes pagas e gratuitas não são aliases porque diferem em custo, disponibilidade e política de dados.

## Matriz de substituições

Nenhuma troca final foi feita apenas por preferência. “Qualidade” abaixo descreve adequação ao contrato do Nexus — português, conversa, instrução, estrutura, fallback validável e previsibilidade — e não um ranking universal. Velocidade e disponibilidade são retratos operacionais, não garantias permanentes.

| Modelo/rota anterior | Modelo/rota final | Motivo técnico | Qualidade | Velocidade | Custo | Disponibilidade | Janela de contexto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `openrouter/free` como rota primária aleatória | `deepseek/deepseek-v4-flash` como primário fixo | O roteador gratuito podia resolver para famílias ou capacidades diferentes a cada chamada. O ID fixo permite allowlist, validação do modelo resolvido, política ZDR, teto de preço e testes reproduzíveis. | Melhora a consistência e reduz o risco de receber classificador, modelo incompatível ou structured output frágil; não implica que todo modelo gratuito seja inferior. | O DeepSeek é apresentado como flash/alto throughput e o backend ordena endpoints por throughput. A latência ainda varia por provedor, mas deixa de depender da fila aleatória do free router. | Passa de custo nominal zero para uma faixa ZDR observada de US$ 0,09–0,15/US$ 0,18–0,28 por 1M tokens de entrada/saída, limitada pela policy. O aumento foi aceito pela previsibilidade e pela menor chance de chamadas desperdiçadas. | Na auditoria havia 17 endpoints totais e 12 ZDR para o ID. O free router tinha pool variável, limites gratuitos e capacidade não determinística. | O modelo anuncia 1M, mas a janela depende do endpoint: o menor ZDR observado anunciava 65.536. O payload atual cabe folgadamente nesse piso; não se presume 1M em toda chamada. |
| `deepseek/deepseek-v4-flash` como fallback pago opcional | o mesmo ID como primário obrigatório | Não houve substituição de modelo: o melhor candidato já existente foi promovido porque o caminho padrão aleatório era o problema. A flag que podia desativá-lo foi removida. | Mantém as capacidades do modelo e as torna o comportamento normal, em vez de exceção eventual. | Elimina a tentativa aleatória anterior quando ela falharia; pode reduzir tempo total de fallback, sem prometer uma latência fixa. | O preço do próprio modelo não mudou; aumenta apenas a proporção de chamadas que o utiliza. | Deixa de depender de uma flag de deploy para estar disponível. Failover continua ocorrendo entre endpoints elegíveis do mesmo ID e depois no alternativo. | O modelo continua anunciando 1M; a janela efetiva ainda varia por endpoint, com piso ZDR observado de 65.536. |
| ausência de alternativo fixo; na prática, nova seleção aleatória | `qwen/qwen3-30b-a3b-instruct-2507` como alternativo | Era necessário outro ID conhecido, de família diferente, compatível com português, instrução e JSON, sem alias gratuito e com endpoints ativos. | Aumenta a chance de recuperação quando o primário falha e mantém o contrato estruturado; não substitui o primário em condições normais. | O modo non-thinking e 3,3B parâmetros ativos indicam uma alternativa leve, mas não provam que ela seja mais rápida. A latência real deve ser medida e o modelo só entra após falha/retry do primário. | A vitrine mostrava US$ 0,04815/US$ 0,1931, porém o endpoint promocional não era ZDR. A faixa ZDR realmente elegível era US$ 0,09–0,15/US$ 0,30–0,55; continua dentro dos caps, mas a saída é mais cara que a do primário. | Havia 6 endpoints totais e 4 ZDR na auditoria. A diversidade de família evita depender apenas de uma implantação DeepSeek. | O modelo anuncia 131K. Os quatro endpoints ZDR observados anunciavam 262K, mas o Nexus trata 131K como limite seguro; ambos excedem amplamente o payload atual. |
| `qwen/qwen-2.5-72b-instruct:free` no primeiro rascunho da v3 | Qwen3 30B A3B Instruct | O candidato gratuito estava sem endpoint ativo na API auditada; mantê-lo seria um fallback apenas nominal. | A decisão não dependeu de gosto: priorizou uma rota executável e compatível. A geração do Qwen3 também é mais recente e voltada a instrução, mas não foi declarada superior em todo benchmark. | Não havia endpoint do candidato para medir latência real. O novo modelo usa arquitetura esparsa e modo non-thinking, mas continua sujeito ao provedor. | De gratuito para a faixa ZDR do Qwen3 indicada acima; o custo compra uma rota efetivamente utilizável sob a política de privacidade. | De zero endpoint ativo observado para 6 endpoints totais/4 ZDR observados. | Ambos anunciavam cerca de 131K; sem perda material de janela. |
| `openai/gpt-oss-20b:free` no primeiro rascunho da v3 | Qwen3 30B A3B Instruct | O candidato tinha somente um endpoint gratuito observado e nenhum endpoint elegível à policy ZDR naquele ID. Isso criaria ponto único e faria o fallback falhar sob a política real. | Impacto comparativo de qualidade não foi usado como justificativa. O ganho é previsibilidade contratual, multilíngue e structured output validável. | Não há base estável para prometer ganho; ambos são modelos leves. O Qwen usa modo non-thinking e múltiplos endpoints, o que melhora as opções de roteamento sem provar menor latência. | De gratuito para a faixa ZDR do Qwen3 indicada acima; o aumento é explícito e limitado pelos caps. | De um endpoint total sem rota ZDR elegível observada para 6 endpoints totais/4 ZDR. | Ambos anunciavam cerca de 131K; janela equivalente para o payload atual. |

O backend agora exige `dataCollection: "deny"` e `zdr: true`, mantém failover entre provedores do mesmo ID e limita preços a US$ 0,15/1M tokens de entrada e US$ 0,55/1M de saída. Isso não permite troca cega de modelo: cada chunk/resposta continua validando o ID resolvido contra a allowlist. A conta OpenRouter do servidor precisa ter créditos; uma falha de pagamento é exibida como indisponibilidade acionável, sem resposta local fingida.

Embora os modelos aceitem contextos muito maiores, o cliente limita o payload compacto a cerca de 22 mil caracteres. Portanto, a janela maior reduz risco de estouro e deixa espaço para evolução, mas não justifica enviar histórico ilimitado.

## Capacidades por modo

| Modo | Capacidades obrigatórias |
| --- | --- |
| Brain | conversa + português |
| Professor Atlas | conversa + instrução + português |
| Roadmap | instrução + estrutura + português |
| Captura | instrução + estrutura + português |
| Revisão semanal | estrutura + evidência + português |
| Revisão de evidência | instrução + estrutura + evidência + português |
| Planejamento | estrutura + planejamento + português |
| Safety | safety interno; nunca é uma resposta ao usuário |

Classificadores, moderadores, guard models, embeddings, rerankers e modelos exclusivos de imagem ou visão são bloqueados pelo identificador e pela ausência na allowlist. Aliases só são aceitos quando apontam para uma entrada conhecida.

## Ordem de tentativa

1. filtrar configuração de ambiente pela allowlist e pelas capacidades;
2. escolher o primeiro modelo compatível;
3. fazer retry curto somente em erro temporário;
4. tentar o modelo alternativo;
5. para structured output incompatível, repetir no mesmo modelo com instrução JSON antes de trocar;
6. se tudo falhar, retornar erro sanitizado e acionável.

Autenticação e pagamento encerram todo o roteamento imediatamente, porque a credencial e a conta são compartilhadas. Payload de entrada inválido também não é repetido. Bloqueio ou incompatibilidade do modelo resolvido encerra aquele candidato, mas pode acionar o outro ID explicitamente allowlisted; não há retry inútil no mesmo modelo. Se parte de uma resposta já foi publicada, o servidor não concatena outra tentativa ao texto visível.

## Validação da resposta

Brain e Atlas rejeitam:

- rótulos de safety ou moderação;
- texto de prompt ou instrução interna;
- resposta predominantemente em inglês;
- mais de uma pergunta por mensagem;
- conteúdo acima do limite do modo;
- JSON inesperado apresentado como conversa.

O streaming mantém uma cauda curta no servidor antes de publicar deltas, permitindo bloquear um rótulo incompatível antes que ele apareça na UI. Quando não houver streaming seguro, a tela mostra feedback de conexão/geração sem simular caracteres localmente.

Roadmaps, captura, revisão e planejamento passam por extração, schema Zod, normalização e validação semântica. O modelo resolvido também precisa permanecer na allowlist; um roteador ou provider não pode trocar silenciosamente por um classificador.

## Erro e retry no cliente

Uma falha remota não cria uma mensagem local como se fosse da IA. O Brain preserva rascunho, contexto e histórico e oferece “Tentar novamente”. Atlas, roadmap e revisão mantêm os dados necessários para repetir a operação.

Planejamento diário pode usar um plano determinístico offline para não bloquear o app. Esse plano recebe `source: "offline"` e aviso visível; nunca recebe metadado ou selo de IA.

## Telemetria

Cada tentativa registra:

- `requestId` sanitizado;
- modo;
- modelo solicitado ou resolvido;
- número da tentativa;
- latência;
- status: sucesso, falha ou bloqueio;
- motivo do fallback;
- código de erro;
- timestamp.

É proibido registrar chave, header de autorização, prompt completo, contexto pessoal completo, memória sensível ou raciocínio do modelo. O buffer em memória é limitado e o log do servidor usa somente o evento sanitizado.

## Status e cold start

`GET /api/status` retorna configuração e prontidão estática. `POST /api/status` realiza um probe limitado, com cooldown por cliente e timeout. A resposta nunca inclui a chave.

O cliente considera compatível apenas uma API `3.x`. Durante cold start, exibe estado de conexão e permite nova tentativa. Um timeout do probe não transforma o backend em “configurado e saudável”.

## Secrets

Permitidos somente no servidor:

```text
OPENROUTER_API_KEY
OPENROUTER_FAST_MODELS
OPENROUTER_ROADMAP_MODELS
OPENROUTER_REVIEW_MODELS
OPENROUTER_STRUCTURED_MODELS
OPENROUTER_PLANNING_MODELS
```

As listas de ambiente apenas reordenam entradas conhecidas. Um ID desconhecido é descartado. Nenhuma dessas variáveis pode receber prefixo `EXPO_PUBLIC_`.
