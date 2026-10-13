/**
 * Popup campaign configuration, authored in the Popup Manager page
 * (/popups/manager, block "popup-manager", one row per campaign).
 * The page is delivered by the edge (CDN) like any other page, so publishing it
 * updates every campaign without touching the pages that show the popups.
 */
import { normalizeCampaign } from './popup-rules.js';

export const MANAGER_PATH = '/popups/manager';

/** Cell order of a campaign row (must match ue/models/blocks/popup-manager.json). */
export const CAMPAIGN_FIELDS = [
  'name',
  'popup',
  'active',
  'priority',
  'start',
  'end',
  'pages',
  'trigger',
  'triggerValue',
  'frequencyCap',
  'frequencyPeriod',
  'cooldownHours',
];

/** Reads a cell value: link target for links, text (one line per paragraph) otherwise. */
function readCell(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  if (link) return new URL(link.getAttribute('href'), window.location.href).pathname;
  const paragraphs = [...cell.querySelectorAll('p')];
  if (paragraphs.length > 1) return paragraphs.map((p) => p.textContent.trim()).join('\n');
  return cell.textContent.trim();
}

/**
 * Reads the authored values of one campaign row.
 * @param {Element} row campaign row of the popup-manager block
 */
export function readCampaignRow(row) {
  const cells = [...row.children];
  return Object.fromEntries(CAMPAIGN_FIELDS.map((field, i) => [field, readCell(cells[i])]));
}

/**
 * Parses all campaigns of a popup-manager block.
 * @param {Element} block the (undecorated) popup-manager block
 */
export function parseCampaigns(block) {
  return [...block.children]
    .map((row, i) => normalizeCampaign(readCampaignRow(row), i))
    .filter((campaign) => campaign.popup);
}

/**
 * Fetches the published campaigns from the Popup Manager page.
 * "no-cache" revalidates with the CDN, so a new publication is picked up at once.
 * @returns {Promise<object[]>} normalized campaigns (empty on error)
 */
export async function fetchCampaigns(path = MANAGER_PATH) {
  try {
    const resp = await fetch(`${path}.plain.html`, { cache: 'no-cache' });
    if (!resp.ok) return [];
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const block = doc.querySelector('.popup-manager');
    return block ? parseCampaigns(block) : [];
  } catch {
    return [];
  }
}
