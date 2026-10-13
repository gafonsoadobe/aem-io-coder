# popup-informativo

**Popup Informativo**: título, mensagem, nível de prioridade e CTA opcional. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Autoria

Um campo por linha, nesta ordem:

| Linha | Campo | Obrigatório |
|---|---|---|
| 1 | Título | sim |
| 2 | Mensagem (rich text) | sim |
| 3 | Nível: `info`, `aviso` ou `critico` | não (padrão `info`) |
| 4 | CTA – texto do botão | não |
| 5 | CTA – link | não |

O nível define a cor e o selo visível ("Informação", "Atenção", "Importante"), para que a informação não dependa só da cor. No nível `critico`, o diálogo usa `role="alertdialog"`.

Este nível é só visual. A **prioridade de exibição** entre campanhas é definida no Popup Manager.
