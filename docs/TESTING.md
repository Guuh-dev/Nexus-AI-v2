# Estratégia de testes — Nexus AI 3.0

## Pirâmide

1. Funções de domínio: classificação de intenção, síntese, evidência, migração e render spec.
2. Contratos: schemas, API, roteamento de modelos e payload nativo.
3. Regressões de UI: navegação, temas, teclado, erro e retry.
4. Compilação: export web, Expo prebuild, XML/Kotlin e Gradle.
5. QA físico: atualização por cima, cold start, widgets e runtime.

## Comandos finais

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run verify
pnpm run release:check
pnpm audit --audit-level=high
pnpm run doctor
pnpm run export:web
pnpm exec expo prebuild --platform android --clean
./android/gradlew :app:assembleDebug
git diff --check
```

Execute com Node 22. Se rede, memória ou SDK local impedirem uma etapa, registre comando, saída e ambiente; não transforme a falha em aprovação.

## Cobertura obrigatória

### IA

- bloqueio de classificadores, moderação, embeddings, rerank e modelos de imagem/visão;
- seleção apenas por capacidade;
- validação do modelo resolvido;
- retry com alternativa permitida;
- erro honesto e rascunho preservado;
- português, contexto e uma pergunta por vez no Atlas;
- telemetria sem prompt ou secret.

### Roadmaps e revisão

- programação técnica;
- programação com IA técnica/aplicada;
- oferta comercial;
- nível avançado sem introdução elementar;
- intenção financeira sem contaminar tópicos comuns;
- ativar, arquivar, excluir e persistir;
- poucos dados, dados completos e retry remoto;
- score determinístico e nenhuma evidência inventada.

### Tarefas e planejamento

- títulos específicos;
- síntese de meta longa;
- contexto, primeira ação, resultado e critério;
- rollover e XP idempotente;
- planejamento offline claramente identificado.

### Storage

- v1–v5 para v6;
- conversão de tema e widget;
- perfil, tarefas, progresso, histórico, chats, roadmaps e preferências preservados;
- recuperação item a item;
- backup pré-migração;
- import com limite e schema;
- versão futura bloqueada contra downgrade.

### UI e temas

- exatamente cinco abas principais;
- nenhum link quebrado para módulos removidos da superfície;
- seis conjuntos completos de tokens;
- contraste de texto e ação primária;
- cores obrigatórias centralizadas;
- teclado e barras de sistema.

### Widgets

- preview e Android derivados do mesmo spec;
- cinco famílias e seus limites;
- configuração por instância;
- salvar sincroniza payload e redraw;
- estado vazio;
- estilo, opacidade e Companion;
- remoção e nova adição;
- nonce e conclusão idempotente.

## Segurança

Os testes verificam payload profundo, prototype pollution, IDs, rate limits, idempotência SSE, secrets em arquivos e inputs de workflows. O audit automatizado falha em vulnerabilidade alta; CodeQL complementa, mas não substitui, as regressões do repositório.

## Android

`expo prebuild --clean` valida o plugin e gera o projeto nativo do zero. `:app:assembleDebug` compila recursos XML, Kotlin, Manifest e providers. O script `verify-native-widget.sh` acrescenta verificações estáticas específicas.

O teste físico completo está em [ANDROID_QA.md](ANDROID_QA.md).
