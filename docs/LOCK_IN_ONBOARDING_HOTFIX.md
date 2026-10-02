# Correção do cadastro, teclado e marca — 2026-10-02

## Problema reproduzido

O cadastro aceitava avançar com nomes de compromissos no campo que exigia
intervalos. O resumo bloqueava a confirmação com uma mensagem genérica, sem
indicar a seção a corrigir. A medição dos campos podia usar uma coordenada
relativa ao card como se fosse relativa ao conteúdo inteiro do ScrollView;
o callback do teclado também podia conservar dimensões anteriores ao resize.
O ícone anterior usava outro desenho e não tinha o mesmo enquadramento do mascote.

## Correção

- Janelas e compromissos têm início/fim separados, teclado numérico e formatação
  HH:MM. Nomes antigos permanecem em linhas editáveis até receberem horários.
- O avanço valida a seção atual, identifica o campo e mantém o rascunho. Salvar
  seção continua permitindo dados incompletos. A volta para corrigir uma seção
  persiste antes de mudar a etapa e preserva a missão já escrita.
- Rascunhos antigos na etapa final oferecem “Corrigir horários e compromissos”.
  Nenhum horário, duração ou capacidade é deduzido só pelo nome do compromisso.
- Field e viewport são medidos em coordenadas da janela com hosts nativos
  explícitos. O teclado/layout dispara nova medição; a rolagem considera o topo
  real do IME e o espaço já removido por adjustResize, sem duplicar compensação.
- Botões de seção quebram linha em telas estreitas. Avançar/confirmar fecha o IME.
- Ícone, foreground adaptativo, splash e favicon usam a mesma grade Nexus dos
  widgets. Silhueta centralizada, pixels nítidos, margens para o recorte adaptativo,
  fundo carvão e sem lettering no splash.

Storage continua v7, sem novo estado autoritativo, dependência ou permissão.
Reservas confirmadas continuam sendo intervalos existentes do schema. Nomes
opcionais só vivem no rascunho; não são horários inferidos nem contexto de IA.
O parser continua aceitando intervalos antigos sem nomes. Um leitor anterior
pode não interpretar o formato rotulado do rascunho; não recomendar downgrade
como recuperação desse fluxo. Backup/import e o leitor de versão futura não mudam.

THIS CHANGE REQUIRES A NEW APK BASE.

A correção JS do formulário pode ser compatível com OTA em uma base conhecida,
mas os ícones/splash/configuração Android exigem novo APK. Nenhuma OTA será
publicada. Produto/runtime permanecem 3.0.0; EAS incrementa versionCode remoto.

## Validação antes da build

- Frozen, verify: PASS, 59 arquivos/339 testes, typecheck/lint/scanner de segredos.
- Release check: PASS; Expo dependency check: PASS; Doctor: 20/20.
- Export web: PASS.
- Playwright 390×844: objetivo inválido fica na seção; retoma rascunho antigo
  bloqueado; preserva três nomes de compromisso e missão; bloqueia horários
  incompletos na seção; salva/reabre rascunho parcial; aceita 1500 como 15:00;
  confirma missão de 30 min e a recupera após reload; sem page errors.
- Testes de geometria cobrem IME sobreposto, resize completo, campo visível e
  campo acima do viewport. Não equivalem a validação de teclado Android físico.

APK corrigido ainda depende da conclusão da execução Android Build. Aceite físico
pendente: instalar por cima sem apagar dados, completar o rascunho existente,
abrir teclado no último campo de cada seção, rolar até as ações, comparar launcher
circular/quadrado e splash. Confirmar com o teclado aberto e depois reabrir o app.
As pendências de API pública/audit registradas em LOCK_IN_APK_PREVIEW.md permanecem.
