import { moveInstrumentation } from '../../scripts/scripts.js';
import { fetchPopup, readManagerPaths } from '../../scripts/popups/popup-config.js';
import {
  STATUS_LABELS, TYPE_LABELS, describeCooldown, describeFrequency, describePages,
  describePeriod, describeTrigger, editUrl, previewUrl,
} from '../../scripts/popups/popup-format.js';
import {
  byPriority, checkEligibility, getStatus, normalizePath,
} from '../../scripts/popups/popup-rules.js';

const COLUMNS = ['Prioridade', 'Popup', 'Status', 'Período', 'Páginas', 'Trigger', 'Frequência', 'Cooldown', 'Na página simulada', 'Ações'];

function cell(row, label, content, className) {
  const td = document.createElement('td');
  td.dataset.label = label;
  if (className) td.className = className;
  if (content instanceof Node) td.append(content);
  else td.textContent = content;
  row.append(td);
  return td;
}

function link(href, text, label) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (label) {
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', label);
  }
  return a;
}

function buildSummary(campaigns) {
  const summary = document.createElement('div');
  summary.className = 'popup-manager-summary';
  const counts = campaigns.reduce((acc, c) => {
    const status = getStatus(c);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  Object.entries(STATUS_LABELS).forEach(([key, label]) => {
    const count = counts[key] || 0;
    const p = document.createElement('p');
    p.className = `popup-manager-count popup-status-${key}`;
    p.innerHTML = `<strong>${count}</strong> ${label}${count === 1 ? '' : 's'}`;
    summary.append(p);
  });
  return summary;
}

/** Table row of a popup that could be read. */
function buildRow(campaign, sourceRow) {
  const tr = document.createElement('tr');
  moveInstrumentation(sourceRow, tr);
  const status = getStatus(campaign);
  cell(tr, COLUMNS[0], String(campaign.priority), 'popup-manager-priority');

  const name = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = campaign.name || 'Popup sem título';
  const type = document.createElement('span');
  type.className = 'popup-manager-type';
  type.textContent = TYPE_LABELS[campaign.type];
  name.append(title, link(campaign.popup, campaign.popup), type);
  cell(tr, COLUMNS[1], name);

  const badge = document.createElement('span');
  badge.className = `popup-status popup-status-${status}`;
  badge.textContent = STATUS_LABELS[status];
  cell(tr, COLUMNS[2], badge);
  cell(tr, COLUMNS[3], describePeriod(campaign));
  cell(tr, COLUMNS[4], describePages(campaign));
  cell(tr, COLUMNS[5], describeTrigger(campaign));
  cell(tr, COLUMNS[6], describeFrequency(campaign));
  cell(tr, COLUMNS[7], describeCooldown(campaign));
  cell(tr, COLUMNS[8], '');

  const actions = document.createElement('div');
  actions.className = 'popup-manager-actions';
  actions.append(link(campaign.popup, 'Ver simulação'));
  actions.append(link(previewUrl(campaign), 'Testar', `Testar ${campaign.name} na página (abre em nova aba)`));
  const edit = editUrl(campaign.popup);
  if (edit) actions.append(link(edit, 'Editar', `Editar ${campaign.name} no Universal Editor (abre em nova aba)`));
  cell(tr, COLUMNS[9], actions);
  return tr;
}

/** Table row of a list entry without a readable popup, kept so it stays editable. */
function buildErrorRow(path, error, sourceRow) {
  const tr = document.createElement('tr');
  moveInstrumentation(sourceRow, tr);
  tr.className = 'popup-manager-error';
  cell(tr, COLUMNS[0], '—');
  cell(tr, COLUMNS[1], path ? `${path}: ⚠ ${error}` : '⚠ escolha a página do popup');
  COLUMNS.slice(2).forEach((label) => cell(tr, label, ''));
  return tr;
}

/**
 * Popup Manager dashboard. Each row of the block points to a popup page (chosen
 * with the page picker in the Universal Editor); the content and the display
 * settings of each popup are edited on its own page. The dashboard reads every
 * popup and shows status, schedule and rules, with a simulator of which popup a
 * new visitor would see on a page. The runtime (scripts/popups/popup-manager.js)
 * reads the same list.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];
  const paths = rows.map((row) => readManagerPaths({ children: [row] })[0] || '');
  const results = await Promise.all(paths.map((path, i) => (path
    ? fetchPopup(path, i)
    : Promise.resolve({ popup: '', order: i, error: 'sem página' }))));
  const campaigns = results.filter((r) => !r.error);

  const intro = document.createElement('div');
  intro.className = 'popup-manager-intro';
  intro.innerHTML = `
    <p>Esta lista define quais popups fazem parte do site. Para incluir um popup, adicione um item
    <strong>Popup</strong> e escolha a página dele. O conteúdo e as regras de exibição (ativo, prioridade,
    período, páginas, trigger, frequência e cooldown) são editados na página de cada popup, nas abas
    <strong>Conteúdo</strong> e <strong>Exibição</strong> do Universal Editor.</p>
    <p>Mudanças entram no site quando o popup é publicado. As páginas onde ele aparece não precisam ser publicadas de novo.</p>`;

  const simulator = document.createElement('form');
  simulator.className = 'popup-manager-simulator';
  simulator.innerHTML = `
    <label for="popup-manager-path">Simular página</label>
    <input id="popup-manager-path" name="path" type="text" value="/" autocomplete="off" spellcheck="false">
    <button type="submit" class="button secondary">Simular</button>
    <p class="popup-manager-result" role="status" aria-live="polite"></p>`;

  const table = document.createElement('table');
  table.className = 'popup-manager-table';
  table.innerHTML = `<caption>Popups do site, ordenados por prioridade</caption>
    <thead><tr>${COLUMNS.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>`;
  const tbody = document.createElement('tbody');
  const sorted = [...campaigns].sort(byPriority);
  const decisions = new Map();
  sorted.forEach((campaign) => {
    const tr = buildRow(campaign, rows[campaign.order]);
    decisions.set(campaign.order, tr.cells[8]);
    tbody.append(tr);
  });
  results.filter((r) => r.error)
    .forEach((r) => tbody.append(buildErrorRow(r.popup, r.error, rows[r.order])));
  table.append(tbody);

  // simulation of a first visit: no frequency or cooldown history
  const simulate = (path) => {
    const ctx = {
      path, now: Date.now(), history: {}, session: {},
    };
    let winner = null;
    sorted.forEach((campaign) => {
      const { eligible, reason } = checkEligibility(campaign, ctx);
      const isWinner = eligible && !winner;
      if (isWinner) winner = campaign;
      const td = decisions.get(campaign.order);
      if (isWinner) td.textContent = '✔ Exibido';
      else td.textContent = eligible ? 'Elegível (prioridade menor)' : `— ${reason}`;
      td.closest('tr').classList.toggle('popup-manager-winner', isWinner);
    });
    simulator.querySelector('.popup-manager-result').textContent = winner
      ? `Em ${normalizePath(path)}, um visitante novo vê: ${winner.name} (prioridade ${winner.priority}).`
      : `Em ${normalizePath(path)}, nenhum popup é exibido.`;
  };
  simulator.addEventListener('submit', (e) => {
    e.preventDefault();
    simulate(simulator.elements.path.value);
  });
  simulate('/');

  const wrapper = document.createElement('div');
  wrapper.className = 'popup-manager-table-wrapper';
  if (rows.length) {
    wrapper.append(table);
  } else {
    wrapper.innerHTML = '<p>Nenhum popup na lista. Adicione um item <strong>Popup</strong> a este bloco no Universal Editor.</p>';
  }

  block.replaceChildren(intro, buildSummary(campaigns), simulator, wrapper);
}
