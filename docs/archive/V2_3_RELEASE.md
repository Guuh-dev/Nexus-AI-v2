# Nexus AI 2.3.0 Widget Family

## Objetivo

A 2.3.0 transforma o único widget redimensionável em uma família Android nativa, com formatos que aparecem separadamente no seletor e exibem somente o conteúdo que cabe em cada área.

## Família

| Widget | Tamanho inicial | Faixa | Uso principal |
| --- | --- | --- | --- |
| Mini | 1×1 | fixo | Mascote e estado |
| Strip | 2×1 | até 4×1 | Próxima ação ou frase |
| Companion | 2×2 | até 3×3 | Mascote, humor e fala |
| Mission | 4×2 | 3×2 até 5×2 | Missão, tarefas e progresso |
| Command | 4×4 | 3×3 até 5×6 | Central completa |

## Transparência e movimento

O modo transparente usa `#00000000`; frosted e card continuam separados. O Companion alterna poses e posição por estado, horário, progresso e interação. Não existe loop permanente, overlay ou serviço de fundo.

## Compatibilidade

- App/runtime: 2.3.0
- Android package: `com.gustavoaraujo.nexusai`
- Expo Router e web permanecem funcionais.
- O APK 2.2.0 não pode receber esta camada nativa por OTA.

## Instalação

1. Exporte um backup JSON na versão instalada.
2. Gere um APK `preview` 2.3.0.
3. Instale por cima da versão anterior.
4. Remova widgets antigos que o One UI tenha mantido em cache.
5. Abra o seletor e adicione cada família novamente.
6. Teste transparência sobre wallpapers claro, escuro e colorido.
7. Confirme ações com o app fechado e após reiniciar o aparelho.
