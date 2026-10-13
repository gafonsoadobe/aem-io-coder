/**
 * Popup Manager runtime.
 * Fetches the campaigns published in the Popup Manager page, picks the eligible
 * campaign with the highest priority, arms its trigger and renders the authored
 * popup (a fragment page) in an accessible modal dialog. Only one popup is open
 * at a time and impressions, closes and clicks are tracked.
 *
 * URL options: ?popups=off (disable), ?popups=debug (log decisions),
 * ?popup=<campaign-id> (preview a campaign, ignoring its rules).
 */
import { loadCSS, sampleRUM } from '../aem.js';
import { fetchCampaigns } from './popup-config.js';
import { checkEligibility, normalizePath, selectCampaign } from './popup-rules.js';

const STORE_KEY = 'agi-popups';
const SESSION_KEY = 'agi-popups-session';
const HISTORY_DAYS = 31;
const POPUP_BLOCKS = ['popup-promocional', 'popup-informativo', 'popup-engajamento'];

let openDialog = null;

function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode): frequency rules apply per page view only
  }
}

const getHistory = () => read(window.localStorage, STORE_KEY);
const getSession = () => read(window.sessionStorage, SESSION_KEY);

function getContext() {
  return {
    path: normalizePath(window.location.pathname),
    now: Date.now(),
    history: getHistory(),
    session: getSession(),
  };
}

/** Stores an impression, used by frequency cap and cooldown. */
function recordImpression(campaign) {
  const now = Date.now();
  const history = getHistory();
  const entry = history[campaign.id] || {};
  entry.shows = [...(entry.shows || []).filter((t) => now - t < HISTORY_DAYS * 864e5), now];
  entry.total = (entry.total || 0) + 1;
  entry.lastShown = now;
  history[campaign.id] = entry;
  write(window.localStorage, STORE_KEY, history);

  const session = getSession();
  session[campaign.id] = (session[campaign.id] || 0) + 1;
  write(window.sessionStorage, SESSION_KEY, session);
}

/**
 * Tracks a popup event in the data layer (Adobe Analytics / Launch), in RUM
 * and as a DOM event ("popup:track") for any other integration.
 * @param {'impression'|'close'|'click'} action event type
 */
function track(action, campaign, extra = {}) {
  const detail = {
    action,
    id: campaign.id,
    name: campaign.name,
    popup: campaign.popup,
    type: campaign.type,
    page: window.location.pathname,
    ...extra,
  };
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push({ event: `popup-${action}`, popup: detail });
  sampleRUM(`popup-${action}`, { source: campaign.id, target: extra.target || campaign.popup });
  document.dispatchEvent(new CustomEvent('popup:track', { detail }));
}

/**
 * Loads the authored popup and wraps it in a dialog.
 * @returns {Promise<HTMLDialogElement|null>}
 */
async function buildDialog(campaign) {
  // eslint-disable-next-line import/no-cycle
  const { loadFragment } = await import('../../blocks/fragment/fragment.js');
  const fragment = await loadFragment(campaign.popup);
  const block = fragment?.querySelector(POPUP_BLOCKS.map((name) => `.${name}`).join(','));
  if (!block) return null;

  campaign.type = POPUP_BLOCKS.find((name) => block.classList.contains(name));
  const dialog = document.createElement('dialog');
  dialog.className = `popup-dialog ${campaign.type}-dialog`;
  dialog.dataset.popupId = campaign.id;
  if (block.dataset.level === 'critico') dialog.setAttribute('role', 'alertdialog');

  const title = block.querySelector('.popup-title');
  if (title) {
    title.id = `popup-title-${campaign.id}`;
    dialog.setAttribute('aria-labelledby', title.id);
  } else {
    dialog.setAttribute('aria-label', campaign.name);
  }
  const text = block.querySelector('.popup-text');
  if (text) {
    text.id = `popup-text-${campaign.id}`;
    dialog.setAttribute('aria-describedby', text.id);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'popup-close';
  close.setAttribute('aria-label', 'Fechar');
  close.innerHTML = '<span aria-hidden="true">×</span>';

  const inner = document.createElement('div');
  inner.className = 'popup-dialog-inner';
  inner.append(close, block);
  dialog.append(inner);
  return dialog;
}

/** Opens the dialog (one at a time) and wires tracking and closing. */
function openPopup(campaign, dialog, { preview = false } = {}) {
  if (openDialog || document.querySelector('dialog[open]')) return;
  openDialog = dialog;
  const previousFocus = document.activeElement;
  let closeReason = 'botao';

  const close = (reason) => {
    closeReason = reason;
    dialog.close();
  };

  dialog.querySelector('.popup-close').addEventListener('click', () => close('botao'));
  dialog.addEventListener('cancel', () => { closeReason = 'esc'; });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      close('fora');
      return;
    }
    const cta = e.target.closest('a[href]');
    if (cta) track('click', campaign, { target: cta.href, label: cta.textContent.trim() });
  });
  dialog.addEventListener('submit', () => {
    track('click', campaign, { target: 'formulario', label: 'envio do formulário' });
  }, true);
  dialog.addEventListener('close', () => {
    track('close', campaign, { reason: closeReason });
    dialog.remove();
    openDialog = null;
    previousFocus?.focus?.();
  });

  // inside main, so block styles scoped to "main" (e.g. the form) apply
  (document.querySelector('main') || document.body).append(dialog);
  dialog.showModal();
  if (!preview) recordImpression(campaign);
  track('impression', campaign, { preview });
}

/** Calls fire() when the campaign trigger happens: imediato, tempo (s) or scroll (%). */
function armTrigger(campaign, fire) {
  if (campaign.trigger === 'tempo') {
    window.setTimeout(fire, campaign.triggerValue * 1000);
  } else if (campaign.trigger === 'scroll') {
    const target = Math.min(campaign.triggerValue || 50, 100);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max <= 0 ? 100 : (window.scrollY / max) * 100;
      if (percent >= target) {
        window.removeEventListener('scroll', onScroll);
        fire();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  } else {
    fire();
  }
}

/** Debug helpers, available in the browser console as window.agiPopups. */
function exposeHelpers(campaigns) {
  window.agiPopups = {
    campaigns,
    decisions: () => campaigns.map((c) => ({
      id: c.id, priority: c.priority, ...checkEligibility(c, getContext()),
    })),
    reset: () => {
      window.localStorage.removeItem(STORE_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    },
  };
}

export default async function initPopups() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('popups') === 'off') return;
  const ctx = getContext();
  // popup content and the Popup Manager itself never show popups
  if (ctx.path === '/popups' || ctx.path.startsWith('/popups/')) return;

  const campaigns = await fetchCampaigns();
  exposeHelpers(campaigns);
  const previewId = params.get('popup');
  const campaign = previewId
    ? campaigns.find((c) => c.id === previewId)
    : selectCampaign(campaigns, ctx);

  if (params.get('popups') === 'debug') {
    // eslint-disable-next-line no-console
    console.table(window.agiPopups.decisions());
    // eslint-disable-next-line no-console
    console.info('[popups] selecionado:', campaign?.id || 'nenhum');
  }
  if (!campaign) return;

  loadCSS(`${window.hlx.codeBasePath}/styles/popups.css`);
  const dialog = await buildDialog(campaign);
  if (!dialog) return;

  if (previewId) {
    openPopup(campaign, dialog, { preview: true });
    return;
  }
  armTrigger(campaign, () => {
    // re-check: another tab may have shown it meanwhile
    if (checkEligibility(campaign, getContext()).eligible) openPopup(campaign, dialog);
  });
}
