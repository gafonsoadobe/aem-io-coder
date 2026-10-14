# popup-informativo

**Popup Informativo**: título, mensagem, nível de prioridade e CTA opcional. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Conteúdo (aba "Conteúdo" no Universal Editor)

O bloco é uma tabela **chave | valor**, gravada pelo Universal Editor a partir do painel de propriedades. Campos de conteúdo:

| Campo | Descrição | Obrigatório |
|---|---|---|
| `title` | Título | sim |
| `message` | Mensagem (rich text) | sim |
| `level` | Nível: `info`, `aviso` ou `critico` | não (padrão `info`) |
| `ctaLabel` | CTA – texto do botão | não |
| `ctaLink` | CTA – link | não |

O nível define a cor e o selo visível ("Informação", "Atenção", "Importante"), para que a informação não dependa só da cor. No nível `critico`, o diálogo usa `role="alertdialog"`.

Este nível é só visual. A **prioridade de exibição** entre popups é o campo `priority`, na aba Exibição.

## Exibição (aba "Exibição" no Universal Editor)

As regras de exibição são as mesmas nos 3 tipos de popup:

| Campo | Descrição | Valores |
|---|---|---|
| `active` | Ativo | `true` / `false` |
| `priority` | Prioridade | número, 1 = mais alta |
| `start` | Data inicial | vazio = já começa |
| `end` | Data final | vazio = sem fim (data sem hora vale até 23:59) |
| `pages` | Páginas onde o popup aparece | seletor de páginas (uma ou mais) |
| `pageRules` | Regras de páginas (opcional) | `/secao/*`, `*` (site todo), `!/pagina` (excluir) |
| `trigger` | Trigger | `imediato`, `tempo` ou `scroll` |
| `triggerValue` | Valor do trigger | segundos (tempo) ou % (scroll) |
| `frequencyCap` | Frequency cap | máximo de exibições (0 = sem limite) |
| `frequencyPeriod` | Período do cap | `sessao`, `dia`, `semana`, `mes`, `sempre` |
| `cooldownHours` | Cooldown | horas (0 = sem cooldown) |

## Simulação

Na própria página do popup (`/popups/...`), o bloco mostra o popup como o visitante vai ver: sobre uma página escurecida, com botões **Desktop** e **Celular**. Abaixo da simulação aparece o resumo das regras, com links para **testar na página real** e **editar no Universal Editor**. Quando o Popup Manager abre o popup num diálogo, só o conteúdo é usado.
