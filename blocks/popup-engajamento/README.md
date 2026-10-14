# popup-engajamento

**Popup Engajamento**: título, texto e um CTA **ou** um formulário simples. Criado numa página própria em `/popups/` e exibido pelo Popup Manager (veja `blocks/popup-manager/README.md`).

## Conteúdo (aba "Conteúdo" no Universal Editor)

O bloco é uma tabela **chave | valor**, gravada pelo Universal Editor a partir do painel de propriedades. Campos de conteúdo:

| Campo | Descrição | Obrigatório |
|---|---|---|
| `title` | Título | sim |
| `text` | Texto (rich text) | não |
| `ctaLabel` | CTA – texto do botão | não |
| `ctaLink` | CTA – link | não |
| `form` | Formulário: link para a definição do formulário (ex.: `/forms/abra-sua-conta.json`) | não |

Quando o formulário está preenchido, ele substitui o CTA. O formulário reutiliza o bloco `form` do projeto: mesmos campos, validação e envio. O envio é registrado como clique (`popup-click`, alvo `formulario`).

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
