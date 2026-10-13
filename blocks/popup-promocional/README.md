# popup-promocional

**Popup Promocional**: imagem, título, texto e CTA. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Autoria

Um campo por linha, nesta ordem:

| Linha | Campo | Obrigatório |
|---|---|---|
| 1 | Imagem (com texto alternativo) | não |
| 2 | Título | sim |
| 3 | Texto (rich text) | não |
| 4 | CTA – texto do botão | não |
| 5 | CTA – link | não (o botão só aparece com texto e link) |

## Acessibilidade e layout

- Dentro do popup, o título dá nome ao diálogo (`aria-labelledby`) e o texto o descreve (`aria-describedby`).
- Links externos abrem em nova aba, e isso é avisado ao leitor de tela.
- Celular: imagem em cima, conteúdo embaixo (bottom sheet). A partir de 600px: imagem à esquerda, conteúdo à direita.
