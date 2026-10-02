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
- Export web: PASS. Audit continua FAIL, 1 high conhecido e mitigado pelo patch,
  sem novos alertas. Foreground adaptativo: raio ocupado 308,99 px, dentro da zona
  segura circular de 312,89 px. Prebuild isolado/verificador nativo: PASS.
- Gradle no checkout isolado: BUILD SUCCESSFUL, 14m50s, 555 tarefas, quatro ABIs.
  Este APK debug não substitui o APK standalone assinado do EAS.
- Playwright 390×844: objetivo inválido fica na seção; retoma rascunho antigo
  bloqueado; preserva três nomes de compromisso e missão; bloqueia horários
  incompletos na seção; salva/reabre rascunho parcial; aceita 1500 como 15:00;
  confirma missão de 30 min e a recupera após reload; sem page errors.
- Digitação tecla por tecla e viewport 320×480: PASS após corrigir o ramo web
  do keyboardDismissMode. No navegador, scroll por foco fechava o input.
  O ramo Android permanece on-drag; esta correção adicional é exclusiva do web.
- Testes de geometria cobrem IME sobreposto, resize completo, campo visível e
  campo acima do viewport. Não equivalem a validação de teclado Android físico.

[Android Build 37007970668](https://github.com/Guuh-dev/Nexus-AI-v2/actions/runs/37007970668)
compila o commit `0ce121f5465a700d6dbed08f0283b5ad3b965e8e`. Os gates de frozen,
verify, release check, dependency check, Doctor e export passaram no Actions;
a etapa EAS terminou FINISHED em 13:10:57 UTC e o Actions terminou SUCCESS.
O checkpoint de 13:04 UTC ainda estava em andamento, com logs parciais
indisponíveis (BlobNotFound); não foi interpretado como falha de compilação.
A correção web `eba79c0` é posterior ao checkout da build e mantém exatamente
o mesmo ramo Android de keyboardDismissMode. Não alegar que o APK contém esse
commit adicional nem distribuir um APK debug como substituto.

APK corrigido gerado e verificado. Aceite físico
pendente: instalar por cima sem apagar dados, completar o rascunho existente,
abrir teclado no último campo de cada seção, rolar até as ações, comparar launcher
circular/quadrado e splash. Confirmar com o teclado aberto e depois reabrir o app.
As pendências de API pública/audit registradas em LOCK_IN_APK_PREVIEW.md permanecem.


## APK preview corrigido — build 14

- [Download](https://expo.dev/artifacts/eas/UrfmxoObiQWg79zLDy02s0dI0-OtkZMSS_JziEgyCXs.apk).
- EAS `fe786cb2-7d15-4d14-bbf4-fb51c4ec0f57`, FINISHED; artifact GitHub
  `11227791588` (`nexus-eas-build-metadata-preview`).
- Android/internal, perfil/canal preview, produto/runtime 3.0.0, versionCode 14.
- Pacote `com.gustavoaraujo.nexusai`, mesmo certificado SHA-256 da build 13:
  `cad14635ac1c7d5765385f98acb7fc730761cab3607a9c077abd6cf5c7e98d66`.
- Assinatura APK verificada; bundle embarcado contém o editor de compromissos
  e o acesso de correção do rascunho. Recursos compilados têm foreground pixel
  e fundo #101218. Não depende de Metro.
- 113.273.174 bytes; SHA-256:
  `26e3dcba4d5d317b7faf32a9efc9b2cfe4082939329f22652c5b2702fcfe7a25`.
- Manifest sem overlay/UsageStats/áudio; runtime 3.0.0 verificado no recurso
  Android, canal preview no header. Bundle/manifest/resources sem padrões de
  chaves OpenRouter, GitHub ou privadas.

Instalar por cima da build 13, sem desinstalar, para manter o rascunho salvo.
Salvar a seção antes de sair do app: campos ainda não salvos ficam só em memória.
Na etapa final, usar “Corrigir horários e compromissos”, completar início/fim
para cada reserva e revisar a confirmação. Não requer limpar dados/reset/import.
QA de IME/launcher no aparelho continua pendente; não alegar ausência de bugs.
A tentativa de consulta auxiliar de status não iniciou outra build: o GitHub
não registra um workflow dispatch novo somente na feature branch (404).
O arquivo auxiliar foi removido; nenhuma mudança em main foi usada para contornar
isso. A build original concluiu normalmente e forneceu toda a metadata.
