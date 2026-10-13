import { moveInstrumentation } from '../../scripts/scripts.js';
import { readCampaignRow } from '../../scripts/popups/popup-config.js';
import {
  byPriority, checkEligibility, getStatus, normalizeCampaign, normalizePath,
} from '../../scripts/popups/popup-rules.js';

const STATUS = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  agendado: 'Agendado',
  encerrado: 'Encerrado',
};

const TYPES = {
  'popup-promocional': 'Promocional',
  'popup-informativo': 'Informativo',
  'popup-engajamento': 'Engajamento',
};

const PERIODS = {
  sessao: 'sessão',
  dia: 'dia',
  semana: 'semana',
  mes: 'mês',
  sempre: 'visitante',
};

const COLUMNS = ['Prioridade', 'Campanha', 'Status', 'Período', 'Páginas', 'Trigger', 'Frequência', 'Cooldown', 'Na página simulada', 'Ações'];

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const formatDate = (time) => (time ? dateFormat.format(time) : '—');

function describeTrigger({ trigger, triggerValue }) {
  if (trigger === 'tempo') return `Após ${triggerValue || 0} s`;
  if (trigger === 'scroll') return `Rolagem de ${triggerValue || 50}%`;
  return 'Imediato';
}

function describeFrequency({ frequencyCap, frequencyPeriod }) {
  if (!frequencyCap) return 'Sem limite';
  return `${frequencyCap}× por ${PERIODS[frequencyPeriod]}`;
}

/** A page where the campaign can be previewed: its first non-wildcard page, or the home. */
function previewPage(campaign) {
  const page = campaign.pages.find((p) => !p.startsWith('!') && !p.includes('*'));
  return page ? normalizePath(page) : '/';
}

function cell(row, label, content, className) {
  const td = document.createElement('td');
  td.dataset.label = label;
  if (className) td.className = className;
  if (content instanceof Node) td.append(content);
  else td.textContent = content;
  row.append(td);
  return td;
}

/** Reads type and title of each popup page, to show what each campaign displays. */
async function loadPopupInfo(path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return { error: 'popup não encontrado' };
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const type = Object.keys(TYPES).find((name) => doc.querySelector(`.${name}`));
    if (!type) return { error: 'página sem bloco de popup' };
    const fields = [...doc.querySelector(`.${type}`).children];
    const titleRow = type === 'popup-promocional' ? fields[1] : fields[0];
    return { type: TYPES[type], title: titleRow?.textContent.trim() };
  } catch {
    return { error: 'popup não encontrado' };
  }
}

function buildSummary(campaigns) {
  const summary = document.createElement('div');
  summary.className = 'popup-manager-summary';
  const counts = campaigns.reduce((acc, c) => {
    const status = getStatus(c);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  summary.innerHTML = Object.entries(STATUS)
    .map(([key, label]) => `<p class="popup-manager-count popup-status-${key}"><strong>${counts[key] || 0}</strong> ${label}${(counts[key] || 0) === 1 ? '' : 's'}</p>`)
    .join('');
  return summary;
}

/**
 * Popup Manager dashboard: lists the campaigns authored in this block (one row
 * per campaign, edited in the Universal Editor) with their computed status and
 * a simulator showing which popup a new visitor would see on a page.
 * The same rows are read by the runtime (scripts/popups/popup-manager.js).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  // incomplete rows are listed too, so new campaigns stay selectable in the editor
  const campaigns = rows.map((row, i) => normalizeCampaign(readCampaignRow(row), i));
  const sorted = [...campaigns].sort(byPriority);

  const intro = document.createElement('div');
  intro.className = 'popup-manager-intro';
  intro.innerHTML = `
    <p>Cada linha é uma campanha. No Universal Editor, selecione uma linha para ativar ou desativar,
    mudar a prioridade (1 = mais alta), o período, as páginas, o trigger, a frequência e o cooldown.
    Publique esta página para aplicar as mudanças no site: as páginas não precisam ser publicadas de novo.</p>`;

  const simulator = document.createElement('form');
  simulator.className = 'popup-manager-simulator';
  simulator.innerHTML = `
    <label for="popup-manager-path">Simular página</label>
    <input id="popup-manager-path" name="path" type="text" value="/" autocomplete="off" spellcheck="false">
    <button type="submit" class="button secondary">Simular</button>
    <p class="popup-manager-result" role="status" aria-live="polite"></p>`;

  const table = document.createElement('table');
  table.className = 'popup-manager-table';
  table.innerHTML = `<caption>Campanhas de popup, ordenadas por prioridade</caption>
    <thead><tr>${COLUMNS.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>`;
  const tbody = document.createElement('tbody');

  const decisionCells = new Map();
  sorted.forEach((campaign) => {
    const tr = document.createElement('tr');
    moveInstrumentation(rows[campaign.order], tr);
    const status = getStatus(campaign);

    cell(tr, COLUMNS[0], String(campaign.priority), 'popup-manager-priority');

    const name = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = campaign.name || 'Campanha sem nome';
    const type = document.createElement('span');
    type.className = 'popup-manager-type';
    name.append(title);
    if (campaign.popup) {
      const link = document.createElement('a');
      link.href = campaign.popup;
      link.textContent = campaign.popup;
      name.append(link);
      type.textContent = '…';
      loadPopupInfo(campaign.popup).then((info) => {
        type.textContent = info.error
          ? `⚠ ${info.error}`
          : `${info.type}: “${info.title || 'sem título'}”`;
      });
    } else {
      type.textContent = '⚠ escolha a página do popup';
    }
    name.append(type);
    cell(tr, COLUMNS[1], name);

    const badge = document.createElement('span');
    badge.className = `popup-status popup-status-${status}`;
    badge.textContent = STATUS[status];
    cell(tr, COLUMNS[2], badge);
    cell(tr, COLUMNS[3], `${formatDate(campaign.start)} → ${formatDate(campaign.end)}`);
    cell(tr, COLUMNS[4], campaign.pages.join(', '));
    cell(tr, COLUMNS[5], describeTrigger(campaign));
    cell(tr, COLUMNS[6], describeFrequency(campaign));
    cell(tr, COLUMNS[7], campaign.cooldownHours ? `${campaign.cooldownHours} h` : '—');
    decisionCells.set(campaign.order, cell(tr, COLUMNS[8], ''));

    if (campaign.popup) {
      const preview = document.createElement('a');
      preview.href = `${previewPage(campaign)}?popup=${encodeURIComponent(campaign.id)}`;
      preview.target = '_blank';
      preview.rel = 'noopener';
      preview.textContent = 'Pré-visualizar';
      preview.setAttribute('aria-label', `Pré-visualizar ${campaign.name} (abre em nova aba)`);
      cell(tr, COLUMNS[9], preview);
    } else {
      cell(tr, COLUMNS[9], '—');
    }

    tbody.append(tr);
  });
  table.append(tbody);

  // simulation of a first visit: no frequency or cooldown history
  const simulate = (path) => {
    const ctx = {
      path, now: Date.now(), history: {}, session: {},
    };
    let winner = null;
    sorted.forEach((campaign) => {
      const { eligible, reason } = checkEligibility(campaign, ctx);
      const td = decisionCells.get(campaign.order);
      const isWinner = eligible && !winner;
      if (isWinner) winner = campaign;
      td.textContent = (() => {
        if (isWinner) return '✔ Exibido';
        if (eligible) return 'Elegível (prioridade menor)';
        return `— ${reason}`;
      })();
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
  wrapper.append(table);

  if (!campaigns.length) {
    wrapper.innerHTML = '<p>Nenhuma campanha cadastrada. Adicione uma campanha a este bloco no Universal Editor.</p>';
  }

  block.replaceChildren(intro, buildSummary(campaigns), simulator, wrapper);
}
