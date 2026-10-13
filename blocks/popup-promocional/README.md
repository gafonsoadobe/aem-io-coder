# popup-promocional

**Popup Promocional**: imagem, título, texto e CTA. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Conteúdo (aba "Conteúdo" no Universal Editor)

Um campo por linha, nesta ordem:

| Linha | Campo | Obrigatório |
|---|---|---|
| 1 | Imagem (com texto alternativo) | não |
| 2 | Título | sim |
| 3 | Texto (rich text) | não |
| 4 | CTA – texto do botão | não |
| 5 | CTA – link | não (o botão só aparece com texto e link) |

## Exibição (aba "Exibição" no Universal Editor)

Depois dos 5 campos de conteúdo vêm, uma linha cada, as regras de exibição. Elas são as mesmas nos 3 tipos de popup:

| Linha | Campo | Valores |
|---|---|---|
| 6 | Ativo | `true` / `false` |
| 7 | Prioridade | número, 1 = mais alta |
| 8 | Data inicial | vazio = já começa |
| 9 | Data final | vazio = sem fim (data sem hora vale até 23:59) |
| 10 | Páginas onde o popup aparece | seletor de páginas (uma ou mais) |
| 11 | Regras de páginas (opcional) | `/secao/*`, `*` (site todo), `!/pagina` (excluir) |
| 12 | Trigger | `imediato`, `tempo` ou `scroll` |
| 13 | Valor do trigger | segundos (tempo) ou % (scroll) |
| 14 | Frequency cap | máximo de exibições (0 = sem limite) |
| 15 | Período do cap | `sessao`, `dia`, `semana`, `mes`, `sempre` |
| 16 | Cooldown | horas (0 = sem cooldown) |

## Simulação

Na própria página do popup (`/popups/...`), o bloco mostra o popup como o visitante vai ver: sobre uma página escurecida, com botões **Desktop** e **Celular**. Abaixo da simulação aparece o resumo das regras, com links para **testar na página real** e **editar no Universal Editor**. Quando o Popup Manager abre o popup num diálogo, só o conteúdo é usado.

## Acessibilidade e layout

- Dentro do popup, o título dá nome ao diálogo (`aria-labelledby`) e o texto o descreve (`aria-describedby`).
- Links externos abrem em nova aba, e isso é avisado ao leitor de tela.
- Celular: imagem em cima, conteúdo embaixo (bottom sheet). A partir de 600px: imagem à esquerda, conteúdo à direita.
