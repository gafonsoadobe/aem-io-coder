# popup-manager

**Popup Manager**: o gestor central de popups. A página `/popups/manager` tem a lista de popups do site e mostra um painel com o status de cada um.

## Onde se edita cada coisa

| O quê | Onde |
|---|---|
| Conteúdo do popup (imagem, título, texto, botão, formulário) | Página do popup (`/popups/...`), aba **Conteúdo** do Universal Editor |
| Regras de exibição (ativo, prioridade, datas, páginas, trigger, frequency cap, cooldown) | Página do popup, aba **Exibição** do Universal Editor. As páginas são escolhidas no seletor de páginas |
| Quais popups fazem parte do site | Esta página: um item **Popup** por popup, escolhido no seletor de páginas |

Na página de cada popup, o miolo mostra uma **simulação visual** do popup, em desktop e celular, com o resumo das regras.

## Arquitetura (responsabilidades separadas)

| Camada | O que faz | Onde |
|---|---|---|
| **AEM (conteúdo)** | Popups são páginas em `/popups/` com os blocos `popup-promocional`, `popup-informativo` e `popup-engajamento`, com conteúdo e regras. O Popup Manager lista essas páginas | Document Authoring / Universal Editor |
| **Edge (regras e entrega)** | O Popup Manager e os popups são publicados e entregues pela CDN do Edge Delivery. Publicar um popup ou o Popup Manager atualiza o site sem republicar as páginas e sem mudar código | `.aem.page` / `.aem.live` |
| **Regras e decisão** | Elegibilidade (status, datas, páginas, frequency cap, cooldown) e conflito por prioridade. São funções puras, usadas no site, na simulação, no painel e nos testes | `scripts/popups/popup-rules.js`, `scripts/popups/popup-config.js` |
| **Frontend (renderização e tracking)** | Lê a lista e as regras de cada popup, escolhe 1 popup por página, aplica o trigger, abre um único diálogo acessível e registra impressão, fechamento e clique | `scripts/popups/popup-manager.js` |

## Regras de decisão

1. Busca `/popups/manager.plain.html` e, em paralelo, a página de cada popup da lista, revalidando na CDN para pegar a publicação mais recente.
2. Descarta os popups inativos, fora do período, sem página escolhida, fora da página atual, no limite de frequência ou em cooldown.
3. Dos que sobram, vence o de **maior prioridade** (1 = mais alta; empate: a ordem na lista). Só **1 popup por página** e **1 aberto por vez**.
4. Arma o trigger do vencedor. Ao disparar, confere de novo a elegibilidade (outra aba pode ter mostrado o popup).
5. O histórico de exibições fica no navegador do visitante: `localStorage` para dia, semana, mês e total; `sessionStorage` para a sessão.

O id de cada popup é o nome da página dele (ex.: `/popups/teste-cartoes` vira `teste-cartoes`). As páginas `/popups/*` e o Universal Editor nunca exibem popups de verdade.

## Tracking

- `window.adobeDataLayer` (Adobe Analytics / Tags): `popup-impression`, `popup-close` (com `reason`: `botao`, `esc`, `fora`) e `popup-click` (com `target` e `label`). Todos levam `popup.id`, `name`, `type` e `page`.
- RUM do AEM (`sampleRUM`), com os mesmos nomes.
- Evento DOM `popup:track` no `document`.

## Painel

Mostra contadores por status, a tabela por prioridade (período, páginas, trigger, frequência, cooldown) e o **simulador** ("o que um visitante novo vê nesta página?"). Cada popup tem links para **ver a simulação**, **testar** na página real e **editar** no Universal Editor.

## Testes e depuração

- `npm test`: testes das regras (`test/popups/popup-rules.test.js`).
- `?popup=<id>`: abre um popup ignorando as regras, sem contar impressão. Exemplo: `/cartoes?popup=teste-cartoes`.
- `?popups=debug`: mostra no console a decisão de cada popup.
- `?popups=off`: desliga os popups na página.
- No console: `agiPopups.decisions()` e `agiPopups.reset()`, que limpa o histórico do visitante.
- Custo por página: 1 busca do Popup Manager e 1 por popup da lista, todas pequenas e em cache na CDN. Com muitos popups, vale trocar por um índice (query index).
