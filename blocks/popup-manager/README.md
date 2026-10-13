# popup-manager

**Popup Manager**: gestor central de popups. A página `/popups/manager` lista as campanhas, que são editadas no Universal Editor. A mesma página é a configuração lida pelo site.

## Arquitetura (responsabilidades separadas)

| Camada | O que faz | Onde |
|---|---|---|
| **AEM (conteúdo)** | Popups criados como páginas em `/popups/` com os blocos `popup-promocional`, `popup-informativo` e `popup-engajamento`. Campanhas criadas na página `/popups/manager` | Document Authoring / Universal Editor |
| **Edge (regras e entrega)** | A página do Popup Manager e os popups são publicados e entregues pela CDN do Edge Delivery. Publicar o Popup Manager atualiza as campanhas em todas as páginas, sem republicar as páginas nem mudar código | `.aem.page` / `.aem.live` |
| **Regras e decisão** | Elegibilidade (status, datas, páginas, frequency cap, cooldown) e conflito por prioridade. São funções puras, iguais no site, no painel e nos testes | `scripts/popups/popup-rules.js` |
| **Frontend (renderização e tracking)** | Busca as campanhas, escolhe 1 popup por página, aplica o trigger, abre um único diálogo acessível e registra impressão, fechamento e clique | `scripts/popups/popup-manager.js` |

## Campos de cada campanha (uma linha do bloco, uma célula por campo)

| # | Campo | Valores |
|---|---|---|
| 1 | Nome | texto. Também gera o id usado no histórico do visitante (renomear zera o histórico) |
| 2 | Popup | link para a página do popup (`/popups/...`) |
| 3 | Ativo | `true` / `false` |
| 4 | Prioridade | número, **1 = mais alta**. Empate: a ordem na lista |
| 5 | Data inicial | `2026-10-13`, `2026-10-13T08:00` ou `13/10/2026 08:00`. Vazio = já começa |
| 6 | Data final | idem. Data sem hora vale até 23:59. Vazio = sem fim |
| 7 | Páginas elegíveis | separadas por vírgula: `/` (home), `/cartoes`, `/fale-conosco/*` (seção), `*` (todas), `!/ouvidoria` (exclui) |
| 8 | Trigger | `imediato`, `tempo` ou `scroll` |
| 9 | Valor do trigger | segundos (tempo) ou % da página (scroll, padrão 50) |
| 10 | Frequency cap | máximo de exibições (0 = sem limite) |
| 11 | Período do cap | `sessao`, `dia`, `semana`, `mes` ou `sempre` |
| 12 | Cooldown | horas até poder exibir o mesmo popup de novo (0 = sem cooldown) |

## Regras de decisão

1. Busca `/popups/manager.plain.html`, revalidando na CDN para pegar a publicação mais recente.
2. Descarta as campanhas inativas, fora do período, fora da página, no limite de frequência ou em cooldown.
3. Das que sobram, vence a de **maior prioridade**. Só **1 popup por página** e **1 aberto por vez**.
4. Arma o trigger da vencedora. Ao disparar, confere de novo a elegibilidade (outra aba pode ter mostrado o popup).
5. O histórico de exibições fica no navegador do visitante: `localStorage` para dia, semana, mês e total; `sessionStorage` para a sessão.

As páginas `/popups/*` e o Universal Editor nunca exibem popups.

## Tracking

Cada evento é enviado para:
- `window.adobeDataLayer` (Adobe Analytics / Tags): `popup-impression`, `popup-close` e `popup-click`, com `popup.id`, `name`, `type`, `page`. O fechamento traz `reason` (`botao`, `esc`, `fora`) e o clique traz `target` e `label`.
- RUM do AEM (`sampleRUM`), com os mesmos nomes.
- Evento DOM `popup:track` no `document`, para outras integrações.

## Painel

Na página `/popups/manager`, o bloco mostra:
- contadores por status;
- a tabela ordenada por prioridade (período, páginas, trigger, frequência, cooldown);
- o tipo e o título de cada popup;
- um **simulador** que mostra qual popup um visitante novo veria numa página;
- um link de **pré-visualização** de cada campanha.

## Testes e depuração

- `npm test`: testes das regras (`test/popups/popup-rules.test.js`).
- `?popup=<id>`: abre uma campanha ignorando as regras, sem contar impressão. Exemplo: `/?popup=promo-consignado`.
- `?popups=debug`: mostra no console a decisão de cada campanha.
- `?popups=off`: desliga os popups na página.
- No console: `agiPopups.decisions()` e `agiPopups.reset()`, que limpa o histórico do visitante.
