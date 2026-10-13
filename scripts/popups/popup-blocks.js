/**
 * Shared decoration for the popup blocks (popup-promocional, popup-informativo,
 * popup-engajamento). Each block row holds one authored field: first the content
 * fields, then the display settings (see scripts/popups/popup-config.js).
 * Inside the dialog opened by the Popup Manager the block renders the popup card;
 * on its own page (/popups/...) it renders a visual simulation of the popup over
 * a dimmed page, with a desktop/mobile switch and a summary of the settings.
 */
import {
  buildBlock, createOptimizedPicture, decorateBlock, loadBlock, loadCSS,
} from '../aem.js';
import { moveImageInstrumentation, moveInstrumentation } from '../scripts.js';
import { CONTENT_ROWS, getFieldCells, parsePopupBlock } from './popup-config.js';
import {
  STATUS_LABELS, TYPE_LABELS, describeCooldown, describeFrequency, describePages,
  describePeriod, describeTrigger, editUrl, previewUrl,
} from './popup-format.js';
import { getStatus, normalizePath } from './popup-rules.js';

/** The content fields (the settings rows that follow are read, not rendered). */
export function getFields(block) {
  return getFieldCells(block).slice(0, CONTENT_ROWS);
}

export const fieldText = (cell) => cell?.textContent.trim() || '';

/** Link target of a field: the authored link, or the plain text path/URL. */
export function fieldLink(cell) {
  const link = cell?.querySelector('a[href]');
  return link ? link.getAttribute('href') : fieldText(cell);
}

/** Empty fields are kept in the editor, so authors can still select and fill them. */
const keep = (cell) => fieldText(cell) || cell?.querySelector('picture, img')
  || cell?.hasAttribute('data-aue-prop');

function isLocalImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function buildMedia(cell) {
  const img = cell?.querySelector('img');
  if (!img) return null;
  const media = document.createElement('div');
  media.className = 'popup-media';
  if (isLocalImage(img.src)) {
    // eager: the popup is built before its trigger fires, so the image is ready when shown
    const picture = createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 600px)', width: '900' }, { width: '750' },
    ]);
    moveImageInstrumentation(img, picture);
    media.append(picture);
  } else {
    media.append(img.closest('picture') || img);
  }
  return media;
}

export function buildTitle(cell) {
  if (!keep(cell)) return null;
  const title = document.createElement('h2');
  title.className = 'popup-title';
  title.textContent = fieldText(cell);
  moveInstrumentation(cell, title);
  return title;
}

export function buildText(cell) {
  if (!keep(cell)) return null;
  const text = document.createElement('div');
  text.className = 'popup-text';
  text.append(...cell.childNodes);
  moveInstrumentation(cell, text);
  return text;
}

/**
 * Builds the call to action from its label and link fields.
 * @returns {HTMLParagraphElement|null} null when label or link is missing
 */
export function buildCta(labelCell, linkCell) {
  const label = fieldText(labelCell);
  const href = fieldLink(linkCell);
  if (!label || !href) return null;
  const wrapper = document.createElement('p');
  wrapper.className = 'button-wrapper popup-actions';
  const link = document.createElement('a');
  link.className = 'button primary';
  link.href = href;
  link.textContent = label;
  if (/^https?:/.test(href) && new URL(href).origin !== window.location.origin) {
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `${label} (abre em nova aba)`);
  }
  wrapper.append(link);
  return wrapper;
}

/**
 * Builds and loads a form block (blocks/form) from a form definition link.
 * @param {string} href form definition, e.g. /forms/abra-sua-conta.json
 */
export async function buildForm(href) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = href;
  const wrapper = document.createElement('div');
  wrapper.className = 'popup-form';
  const form = buildBlock('form', [[link]]);
  wrapper.append(form);
  decorateBlock(form);
  await loadBlock(form);
  return wrapper;
}

function buildCard({ media = null, parts = [] }) {
  const card = document.createElement('div');
  card.className = 'popup-card';
  if (media) card.append(media);
  const body = document.createElement('div');
  body.className = 'popup-body';
  body.append(...parts.filter(Boolean));
  card.append(body);
  return card;
}

/** Skeleton of a page, behind the simulated popup. */
const PAGE_SKELETON = `
  <div class="popup-simulation-header"><span></span><span></span><span></span></div>
  <div class="popup-simulation-hero"></div>
  <div class="popup-simulation-row"><span></span><span></span><span></span></div>
  <div class="popup-simulation-row"><span></span><span></span></div>`;

function buildRules(campaign) {
  const status = getStatus(campaign);
  const rules = document.createElement('dl');
  rules.className = 'popup-simulation-rules';
  [
    ['Status', `<span class="popup-status popup-status-${status}">${STATUS_LABELS[status]}</span>`],
    ['Prioridade', String(campaign.priority)],
    ['Período', describePeriod(campaign)],
    ['Páginas', describePages(campaign)],
    ['Trigger', describeTrigger(campaign)],
    ['Frequência', describeFrequency(campaign)],
    ['Cooldown', describeCooldown(campaign)],
  ].forEach(([label, value], i) => {
    const item = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    // only the status badge (first item) is markup; values are authored text
    if (i === 0) dd.innerHTML = value;
    else dd.textContent = value;
    item.append(dt, dd);
    rules.append(item);
  });
  return rules;
}

function buildActions(campaign) {
  const actions = document.createElement('p');
  actions.className = 'popup-simulation-actions';
  const test = document.createElement('a');
  test.href = previewUrl(campaign);
  test.target = '_blank';
  test.rel = 'noopener';
  test.textContent = 'Testar na página real';
  test.setAttribute('aria-label', 'Testar na página real (abre em nova aba)');
  actions.append(test);
  const edit = editUrl(campaign.popup);
  if (edit) {
    const link = document.createElement('a');
    link.href = edit;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Editar no Universal Editor';
    link.setAttribute('aria-label', 'Editar no Universal Editor (abre em nova aba)');
    actions.append(link);
  }
  return actions;
}

/**
 * Visual simulation of the popup, shown on the popup page.
 * @param {Element} block popup block
 * @param {Element} card decorated popup card
 * @param {object} campaign settings read from the block
 */
function buildSimulation(block, card, campaign) {
  loadCSS(`${window.hlx.codeBasePath}/styles/popups.css`);
  const type = TYPE_LABELS[campaign.type] || 'Popup';

  const simulation = document.createElement('div');
  simulation.className = 'popup-simulation';
  simulation.innerHTML = `
    <div class="popup-simulation-bar">
      <p class="popup-simulation-label">Simulação · Popup ${type}</p>
      <div class="popup-simulation-devices" role="group" aria-label="Visualizar como">
        <button type="button" data-device="desktop" aria-pressed="true">Desktop</button>
        <button type="button" data-device="mobile" aria-pressed="false">Celular</button>
      </div>
    </div>
    <div class="popup-simulation-stage" data-device="desktop">
      <div class="popup-simulation-page" aria-hidden="true">${PAGE_SKELETON}</div>
      <div class="popup-dialog popup-simulation-dialog ${campaign.type}-dialog">
        <div class="popup-dialog-inner"><span class="popup-close" aria-hidden="true">×</span></div>
      </div>
    </div>`;
  simulation.querySelector('.popup-dialog-inner').append(card);
  simulation.append(buildRules(campaign), buildActions(campaign));

  const stage = simulation.querySelector('.popup-simulation-stage');
  simulation.querySelectorAll('.popup-simulation-devices button').forEach((button) => {
    button.addEventListener('click', () => {
      stage.dataset.device = button.dataset.device;
      simulation.querySelectorAll('.popup-simulation-devices button')
        .forEach((b) => b.setAttribute('aria-pressed', b === button));
    });
  });
  // the simulation is a preview: forms inside it are not sent
  stage.addEventListener('submit', (e) => e.preventDefault());

  block.classList.add('popup-simulated');
  block.replaceChildren(simulation);
}

/**
 * Replaces the block content with the popup card, or with its simulation when
 * the block is shown on its own page (popups loaded by the Popup Manager are
 * decorated off-document, as fragments).
 * @param {Element} block popup block
 * @param {{media?: Element, parts: (Element|null)[]}} content
 */
export function renderPopup(block, content) {
  const onPage = block.isConnected;
  const campaign = onPage ? parsePopupBlock(block, normalizePath(window.location.pathname)) : null;
  const card = buildCard(content);
  if (onPage) buildSimulation(block, card, campaign);
  else block.replaceChildren(card);
}
