/**
 * Popup configuration.
 * Each popup is a page under /popups/ with one popup block. The block holds the
 * content fields followed by the display settings (both edited in the Universal
 * Editor, in the "Conteúdo" and "Exibição" tabs). The Popup Manager page
 * (/popups/manager) lists which popup pages are part of the site.
 * All of it is delivered by the edge (CDN): publishing a popup or the Popup
 * Manager updates the campaigns without touching the pages that show them.
 */
import { normalizeCampaign } from './popup-rules.js';

export const MANAGER_PATH = '/popups/manager';

export const POPUP_TYPES = ['popup-promocional', 'popup-informativo', 'popup-engajamento'];

/** Content rows at the top of every popup block (see ue/models/blocks/popup-*.json). */
export const CONTENT_ROWS = 5;

/** Display settings rows, after the content rows, in this order. */
export const SETTINGS_FIELDS = [
  'active',
  'priority',
  'start',
  'end',
  'pages',
  'pageRules',
  'trigger',
  'triggerValue',
  'frequencyCap',
  'frequencyPeriod',
  'cooldownHours',
];

/** Row holding the popup title, per type. */
const TITLE_ROW = { 'popup-promocional': 1 };

const toPathname = (href) => {
  try {
    return new URL(href, window.location.href).pathname;
  } catch {
    return href;
  }
};

/**
 * Reads all values of a cell: link targets (page picker) and text lines.
 * @returns {string[]}
 */
export function readValues(cell) {
  if (!cell) return [];
  const links = [...cell.querySelectorAll('a[href]')].map((a) => toPathname(a.getAttribute('href')));
  if (links.length) return links;
  const lines = [...cell.querySelectorAll('p')].map((p) => p.textContent.trim());
  return (lines.length ? lines : [cell.textContent.trim()]).filter(Boolean);
}

const readValue = (cell) => readValues(cell)[0] || '';

/** The single cell of each field row. */
export const getFieldCells = (block) => [...block.children]
  .map((row) => row.firstElementChild || row);

export const findPopupBlock = (root) => root.querySelector(POPUP_TYPES.map((t) => `.${t}`).join(','));

export const getPopupType = (block) => POPUP_TYPES.find((type) => block.classList.contains(type));

/**
 * Reads the campaign (settings, title and type) of an undecorated popup block.
 * @param {Element} block popup block
 * @param {string} path path of the popup page
 * @param {number} order position in the Popup Manager
 */
export function parsePopupBlock(block, path, order = 0) {
  const type = getPopupType(block);
  const cells = getFieldCells(block);
  const settings = Object.fromEntries(SETTINGS_FIELDS.map((field, i) => {
    const cell = cells[CONTENT_ROWS + i];
    return [field, field === 'pages' ? readValues(cell) : readValue(cell)];
  }));
  return normalizeCampaign({
    ...settings,
    popup: path,
    type,
    name: cells[TITLE_ROW[type] || 0]?.textContent.trim(),
  }, order);
}

/** Popup pages listed in a Popup Manager block (one row per popup). */
export function readManagerPaths(block) {
  return [...block.children].map((row) => readValue(row.firstElementChild || row)).filter(Boolean);
}

async function fetchDocument(path) {
  const resp = await fetch(`${path}.plain.html`, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`${resp.status}`);
  return new DOMParser().parseFromString(await resp.text(), 'text/html');
}

/**
 * Fetches one popup page and reads its campaign.
 * @returns {Promise<object>} campaign, or { popup, error } when it can't be read
 */
export async function fetchPopup(path, order = 0) {
  try {
    const block = findPopupBlock(await fetchDocument(path));
    if (!block) return { popup: path, order, error: 'página sem bloco de popup' };
    return parsePopupBlock(block, path, order);
  } catch {
    return { popup: path, order, error: 'popup não encontrado' };
  }
}

/**
 * Fetches the campaigns of all popups listed in the Popup Manager.
 * "no-cache" revalidates with the CDN, so a new publication is picked up at once.
 * @returns {Promise<object[]>} campaigns (popups that can't be read are skipped)
 */
export async function fetchCampaigns(path = MANAGER_PATH) {
  try {
    const block = (await fetchDocument(path)).querySelector('.popup-manager');
    if (!block) return [];
    const popups = await Promise.all(readManagerPaths(block).map((p, i) => fetchPopup(p, i)));
    return popups.filter((popup) => !popup.error);
  } catch {
    return [];
  }
}
