# popup-informativo

**Popup Informativo**: título, mensagem, nível de prioridade e CTA opcional. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Conteúdo (aba "Conteúdo" no Universal Editor)

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
