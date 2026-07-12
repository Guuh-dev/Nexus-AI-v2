# Nexus Companion

## Propósito

O Companion é uma camada de presença contextual. Ele não substitui Brain, Atlas ou notificações. Sua função é transformar o estado local do usuário em uma reação curta, útil e visualmente consistente.

## Personalidades

| ID | Comportamento |
| --- | --- |
| `happy` | Alegre, leve e comemorativo. |
| `playful` | Humor curto e provocações gentis. |
| `motivational` | Incentivo direto orientado à ação. |
| `serious` | Objetivo e sem distrações. |
| `strict` | Cobra entrega e reduz negociação. |
| `calm` | Reduz pressão e propõe pequenos passos. |
| `quiet` | Presença visual sem fala desnecessária. |

## Presença

- `quiet`: oculta o card proativo dentro do app.
- `balanced`: aparece quando existe progresso, conclusão ou um sinal relevante.
- `active`: mantém presença contínua no Command Center.

## Contexto

O motor usa apenas dados locais já disponíveis:

- tarefas concluídas e pendentes;
- missão do dia;
- streak;
- fonte do plano;
- estado de progresso;
- presença configurada.

A saída é determinística para o mesmo dia/contexto e não faz uma chamada adicional à IA. Isso evita custo, latência e frases mudando a cada render.

## Widgets independentes

A preferência global controla o Companion dentro do app. Cada widget Android armazena separadamente:

- mascote;
- humor;
- estilo de fala;
- acessório;
- conteúdo;
- estilo visual;
- ação ao toque.

Duas instâncias podem, portanto, apresentar personalidades completamente diferentes.

## Boas práticas

- Falas devem ser curtas o suficiente para telas pequenas.
- Humor nunca deve humilhar ou pressionar de forma nociva.
- O modo estrito cobra uma ação, não julga a pessoa.
- Dados sensíveis devem respeitar `privacyMode`.
- O Companion não pode modificar tarefas sem confirmação.
