/**
 * Popup configuration.
 * Each popup is a page under /popups/ with one popup block, a key-value table
 * with the content fields and the display settings (edited in the properties
 * panel of the Universal Editor, in the "Conteúdo" and "Exibição" tabs). The Popup Manager page
 * (/popups/manager) lists which popup pages are part of the site.
 * All of it is delivered by the edge (CDN): publishing a popup or the Popup
 * Manager updates the campaigns without touching the pages that show them.
 */
import { normalizeCampaign } from './popup-rules.js';

export const MANAGER_PATH = '/popups/manager';

export const POPUP_TYPES = ['popup-promocional', 'popup-informativo', 'popup-engajamento'];

/** Content fields of each popup type (see ue/models/blocks/popup-*.json). */
export const CONTENT_FIELDS = {
  'popup-promocional': ['image', 'title', 'text', 'ctaLabel', 'ctaLink'],
  'popup-informativo': ['title', 'message', 'level', 'ctaLabel', 'ctaLink'],
  'popup-engajamento': ['title', 'text', 'ctaLabel', 'ctaLink', 'form'],
};

/** Display settings, common to all popup types. */
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

export const findPopupBlock = (root) => root.querySelector(POPUP_TYPES.map((t) => `.${t}`).join(','));

export const getPopupType = (block) => POPUP_TYPES.find((type) => block.classList.contains(type));

const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Value cells of a popup block, by field name. Popup blocks are key-value tables
 * (field name | value), the format the Universal Editor reads and writes for
 * them. The earlier layout (one value per row, in model order) is still read.
 * @param {Element} block popup block
 * @returns {Object<string, Element>}
 */
export function getFieldMap(block) {
  const names = [...(CONTENT_FIELDS[getPopupType(block)] || []), ...SETTINGS_FIELDS];
  const byKey = new Map(names.map((name) => [normalizeKey(name), name]));
  const rows = [...block.children];
  const isKeyValue = rows.some((row) => row.children.length === 2
    && byKey.has(normalizeKey(row.firstElementChild.textContent)));
  const fields = {};
  rows.forEach((row, i) => {
    if (isKeyValue) {
      const [key, value] = row.children;
      const name = byKey.get(normalizeKey(key?.textContent));
      if (name && value) fields[name] = value;
    } else if (names[i]) {
      fields[names[i]] = row.firstElementChild || row;
    }
  });
  return fields;
}

/**
 * Reads the campaign (settings, title and type) of an undecorated popup block.
 * @param {Element} block popup block
 * @param {string} path path of the popup page
 * @param {number} order position in the Popup Manager
 */
export function parsePopupBlock(block, path, order = 0) {
  const fields = getFieldMap(block);
  const settings = Object.fromEntries(SETTINGS_FIELDS.map((field) => [
    field,
    field === 'pages' ? readValues(fields[field]) : readValue(fields[field]),
  ]));
  return normalizeCampaign({
    ...settings,
    popup: path,
    type: getPopupType(block),
    name: fields.title?.textContent.trim(),
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
