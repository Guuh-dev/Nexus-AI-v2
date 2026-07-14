# Política de Privacidade — Nexus AI 3.0

Última atualização: 13 de julho de 2026.

## Resumo

O Nexus AI é local-first e funciona sem conta. Os dados permanecem no armazenamento local até que você use um recurso remoto ou escolha exportar um backup. O aplicativo não inclui publicidade comportamental, analytics de produto, pagamentos nem sincronização entre aparelhos nesta versão.

## Dados armazenados localmente

Conforme os recursos usados, o Nexus pode manter no dispositivo ou navegador:

- perfil, objetivo, rotina, prioridades e diagnóstico pessoal;
- planos, tarefas, recorrências e histórico diário;
- XP, streak, atributos, conquistas e sessões de foco;
- conversas, memórias controladas pelo usuário e resumos de continuidade;
- roadmaps, entrevistas do Professor Atlas, entregas e correções;
- revisões semanais, preferências, configuração de tema e widgets;
- dados de módulos legados preservados pela migração;
- backups internos de migração e um snapshot anterior à última importação, quando existirem.

Esses dados usam o armazenamento privado disponibilizado pela plataforma, mas não recebem uma camada adicional de criptografia do Nexus. A segurança também depende do bloqueio, das atualizações e da integridade do aparelho ou navegador.

## Dados enviados aos recursos remotos

O conteúdo enviado depende da ação escolhida:

- **planejamento:** perfil, disponibilidade, prioridades, pendências permitidas e contexto de replanejamento;
- **Brain e Professor Atlas:** mensagem, trechos recentes da conversa, perfil, plano atual, histórico recente, foco, memórias relevantes e roadmaps ativos;
- **roadmaps:** tópico, nível, objetivo, projeto-prova, recursos, limitações e preferências de estudo informados na entrevista;
- **captura estruturada:** texto da captura e contexto compacto necessário para transformá-lo em tarefa;
- **revisão semanal:** métricas calculadas localmente e fatos observáveis da janela avaliada.

Também são processados um identificador aleatório da instalação, o ID da solicitação e dados de rede necessários a rate limit, idempotência e proteção contra abuso. O Nexus não usa esses identificadores para publicidade.

## Backend, OpenRouter e política de dados

As operações remotas passam pelo backend do Nexus e depois pela OpenRouter e pelo provedor do modelo selecionado. A chave da OpenRouter permanece no servidor e nunca é incorporada ao aplicativo.

O backend solicita `dataCollection: deny` e `zdr: true`, restringindo o roteamento a endpoints compatíveis com coleta negada e zero data retention. Se não houver endpoint compatível, a operação deve falhar de forma explícita. Essas opções não eliminam o processamento transitório necessário para responder nem eventuais metadados de acesso mantidos pela infraestrutura de hospedagem conforme sua configuração.

## Caches e logs operacionais

Para evitar cobranças e respostas duplicadas, o backend mantém operações em andamento e atribui às respostas em memória uma validade de reutilização de dez minutos. O código atual não garante apagamento físico exatamente ao expirar: entradas vencidas são descartadas durante limpezas de capacidade ou quando a instância reinicia. Esse cache não é um banco durável, mas também não deve ser descrito como retenção rígida de dez minutos.

A telemetria implementada pelo Nexus registra somente metadados técnicos de tentativa, como ID da solicitação, modo, modelo, latência, status e código de erro. O aplicativo não grava deliberadamente o texto integral da conversa, o prompt completo ou o perfil nessa telemetria. A plataforma de hospedagem pode manter logs de acesso próprios; a implantação de produção deve limitar acesso e retenção desses logs.

## Funcionamento offline

O planejamento diário possui fallback local e é marcado como **offline**. A captura pode usar interpretação local e exige revisão antes de salvar. Brain, Professor Atlas, geração de roadmap e revisão remota não fabricam uma resposta offline: informam indisponibilidade e preservam o texto ou os dados para nova tentativa.

## Dados que o aplicativo não acessa

- senhas ou credenciais de login;
- contatos, fotos, mensagens ou localização precisa;
- dados bancários;
- conteúdo de outros aplicativos;
- identificadores publicitários.

## Exportação, importação e exclusão

O Perfil permite exportar um backup JSON legível, importar somente após preview e confirmação, desfazer a última importação, restaurar a cópia anterior à migração quando ela existir, reiniciar o plano atual e apagar os dados. Antes de restaurar a cópia de migração, o Nexus salva o estado atual como rollback. O arquivo exportado deixa a área privada do aplicativo quando você o compartilha; cabe ao usuário escolher um destino seguro.

Apagar todos os dados remove o estado principal, backups internos conhecidos e dados temporários gerenciados pelo Nexus. Desinstalar o aplicativo normalmente remove dados locais não exportados, sujeito ao comportamento de backup/restauração da plataforma.

## Notificações

Lembretes são opcionais e usam a permissão de notificações da plataforma. Negar a permissão não limita os demais recursos.

## Crianças e adolescentes

O Nexus é uma ferramenta geral de produtividade e aprendizado, sem publicidade comportamental. Uma distribuição pública deve declarar corretamente o público-alvo e cumprir as exigências legais e da loja aplicáveis.

## Mudanças futuras

Login, sincronização, pagamentos, publicidade ou analytics exigirão atualização desta política antes de serem lançados.

## Contato

Responsável pelo projeto: Gustavo Araújo. Um canal público de suporte e privacidade deve ser informado na ficha da loja antes da publicação ampla.
