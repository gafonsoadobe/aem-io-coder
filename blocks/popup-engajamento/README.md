# popup-engajamento

**Popup Engajamento**: título, texto e um CTA **ou** um formulário simples. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Autoria

Um campo por linha, nesta ordem:

| Linha | Campo | Obrigatório |
|---|---|---|
| 1 | Título | sim |
| 2 | Texto (rich text) | não |
| 3 | CTA – texto do botão | não |
| 4 | CTA – link | não |
| 5 | Formulário: link para a definição do formulário (ex.: `/forms/abra-sua-conta.json`) | não |

Quando o formulário está preenchido, ele substitui o CTA. O formulário reutiliza o bloco `form` do projeto: mesmos campos, validação e envio. O envio é registrado como clique (`popup-click`, alvo `formulario`).
