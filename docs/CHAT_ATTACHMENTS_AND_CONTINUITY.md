# Chat: continuidade e arquivos de texto — 2026-10-02

Pedido: Brain/Atlas conversacionais, corrigir repetição após envio de evidência e
botão + para anexos. Esta fatia entrega continuidade e arquivos textuais; imagens
aguardam decisão do usuário sobre modelo visual e validação de custo/privacidade.

## Conversa

O servidor encaminha os últimos dez turnos como mensagens user/assistant,
separados do contexto JSON, com limite por turno. Papéis privilegiados, conteúdo
vazio e mensagens falhas são descartados. O pedido atual vem por último. Atlas
usa a estrutura da atividade apenas para atividades novas; respostas a evidência
e contestação devem avançar a conversa. Isso reduz uma causa de repetição, sem
prometer eliminar toda repetição probabilística. Links ainda não são acessados:
o prompt exige informar essa limitação, sem alegar incorreção ou inspeção.

## Botão + compartilhado

Usa expo-document-picker já presente, sem adicionar dependências/permissões.
TXT/MD/CSV/JSON/LOG e código textual: até 3 KB, uma seleção por vez. O conteúdo
vai para o rascunho visível; só Enviar autoriza a transmissão. Sem envio automático
nem truncamento silencioso. Cópia temporária nativa removida após leitura.
Conteúdo é dado não confiável, jamais system prompt. O texto enviado integra a
mensagem persistida e portanto os backups já existentes; não há mídia/base64 no
estado central. Imagens, PDF e binários são rejeitados explicitamente. Se o total
excede 4000 caracteres, conserva-se o rascunho anterior e mostra-se o erro.

As duas IAs allowlisted são text->text na metadata oficial consultada nesta data.
Não habilitar imagens apenas trocando um ícone. Implementação visual precisa de
allowlist verificada, limites de tamanho/quantidade, autorização por envio,
persistência separada, cancelamento/retry seguro e política ZDR/custo elegível.

## Entrega

JS sem mudança nativa: candidato a OTA somente após comparação com a base real.
O workflow OTA existente exige tag + APK publicado e pode pular publicação;
não fabricar tag nem contornar detector. Backend exige deploy Render separado.
Não houve publicação OTA nesta fatia. O APK preview 15, commit d61055b, contém a
fatia anterior; não contém estes arquivos/correções.

## Validação

Verify: 61 arquivos / 354 testes, typecheck/lint/scanner passaram. Release check e
export web passaram. Regressões cobrem papéis, histórico falho, pedido atual,
limites UTF-8, rejeição de imagem/PDF e preservação do texto sem falsa análise.
Teste de navegador verifica seleção, rascunho e envio explícito; QA com seletor
Android físico e efeito sobre respostas reais permanecem pendentes.
