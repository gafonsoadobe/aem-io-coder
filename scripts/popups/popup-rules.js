/**
 * Popup rules: pure functions that decide which popup campaign may be shown.
 * No DOM or storage access here, so the same rules run in the browser runtime,
 * in the Popup Manager dashboard and in unit tests.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const TRIGGERS = ['imediato', 'tempo', 'scroll'];

/** Frequency cap windows, in milliseconds (session is tracked separately). */
export const CAP_PERIODS = {
  sessao: null,
  dia: DAY,
  semana: 7 * DAY,
  mes: 30 * DAY,
  sempre: Infinity,
};

const DEFAULTS = {
  active: false,
  priority: 99,
  pages: ['/'],
  trigger: 'imediato',
  triggerValue: 0,
  frequencyCap: 0,
  frequencyPeriod: 'sempre',
  cooldownHours: 0,
};

/**
 * Parses an authored date: ISO (2026-10-13 or 2026-10-13T08:00) or
 * Brazilian format (13/10/2026 or 13/10/2026 08:00).
 * @param {string} value authored value
 * @param {boolean} endOfDay for date-only values, use 23:59:59.999 instead of 00:00
 * @returns {number|null} timestamp, or null when empty or invalid
 */
export function parseDate(value, endOfDay = false) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (br) {
    const [, d, m, y, hh, mm] = br;
    const date = new Date(+y, +m - 1, +d, hh ? +hh : 0, mm ? +mm : 0);
    if (!hh && endOfDay) date.setHours(23, 59, 59, 999);
    return date.getTime();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (endOfDay) date.setHours(23, 59, 59, 999);
    return date.getTime();
  }
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : time;
}

const toNumber = (value, fallback) => {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

const toBoolean = (value) => /^(true|sim|yes|ativo|on|1|x)$/i.test(String(value ?? '').trim());

const toKey = (value) => String(value ?? '').trim().toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

/** Normalizes a page path: no trailing slash, /index is the home page. */
export function normalizePath(path) {
  let p = String(path || '/').trim().split(/[?#]/)[0] || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

/**
 * Builds a campaign from authored values, applying defaults.
 * @param {object} raw authored values (strings)
 * @param {number} order position in the Popup Manager (tie breaker)
 */
export function normalizeCampaign(raw, order = 0) {
  const name = String(raw.name || '').trim();
  const popup = String(raw.popup || '').trim();
  const trigger = toKey(raw.trigger);
  const period = toKey(raw.frequencyPeriod);
  const pages = String(raw.pages ?? '').split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
  const id = (name || popup).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    id,
    name: name || popup,
    popup: popup ? normalizePath(popup) : '',
    active: toBoolean(raw.active),
    priority: toNumber(raw.priority, DEFAULTS.priority),
    start: parseDate(raw.start),
    end: parseDate(raw.end, true),
    pages: pages.length ? pages : DEFAULTS.pages,
    trigger: TRIGGERS.includes(trigger) ? trigger : DEFAULTS.trigger,
    triggerValue: Math.max(0, toNumber(raw.triggerValue, DEFAULTS.triggerValue)),
    frequencyCap: Math.max(0, Math.floor(toNumber(raw.frequencyCap, DEFAULTS.frequencyCap))),
    frequencyPeriod: period in CAP_PERIODS ? period : DEFAULTS.frequencyPeriod,
    cooldownHours: Math.max(0, toNumber(raw.cooldownHours, DEFAULTS.cooldownHours)),
    order,
  };
}

/**
 * Checks a path against page patterns: "/" (exact), "/cartoes/*" (section),
 * "*" (all pages); a leading "!" excludes ("!/fale-conosco/*"). Exclusions win.
 */
export function matchesPages(patterns, path) {
  const current = normalizePath(path);
  const test = (pattern) => {
    if (pattern === '*' || pattern === '/*') return true;
    if (pattern.endsWith('/*')) {
      const base = normalizePath(pattern.slice(0, -2));
      return current === base || current.startsWith(`${base}/`);
    }
    return normalizePath(pattern) === current;
  };
  const includes = patterns.filter((p) => !p.startsWith('!'));
  const excludes = patterns.filter((p) => p.startsWith('!')).map((p) => p.slice(1).trim());
  if (excludes.some(test)) return false;
  return includes.some(test);
}

/**
 * Schedule status, independent of the visitor.
 * @returns {'inativo'|'agendado'|'encerrado'|'ativo'}
 */
export function getStatus(campaign, now = Date.now()) {
  if (!campaign.active) return 'inativo';
  if (campaign.start && now < campaign.start) return 'agendado';
  if (campaign.end && now > campaign.end) return 'encerrado';
  return 'ativo';
}

/**
 * Impressions counted against the frequency cap.
 * @param {object} campaign normalized campaign
 * @param {{shows?: number[]}} history visitor history for this campaign
 * @param {number} sessionShows impressions in the current session
 */
export function countImpressions(campaign, history = {}, sessionShows = 0, now = Date.now()) {
  const span = CAP_PERIODS[campaign.frequencyPeriod];
  if (span === null) return sessionShows;
  const shows = history.shows || [];
  if (span === Infinity) return history.total ?? shows.length;
  return shows.filter((t) => now - t < span).length;
}

/**
 * Checks whether a campaign may be shown to this visitor on this page.
 * @param {object} campaign normalized campaign
 * @param {object} ctx { path, now, history: {[id]: {shows, total, lastShown}}, session: {[id]: n} }
 * @returns {{eligible: boolean, reason: string}}
 */
export function checkEligibility(campaign, ctx) {
  const now = ctx.now ?? Date.now();
  if (!campaign.popup) return { eligible: false, reason: 'sem popup' };
  const status = getStatus(campaign, now);
  if (status !== 'ativo') return { eligible: false, reason: status };
  if (!matchesPages(campaign.pages, ctx.path)) return { eligible: false, reason: 'página não elegível' };

  const history = ctx.history?.[campaign.id] || {};
  if (campaign.frequencyCap > 0) {
    const shows = countImpressions(campaign, history, ctx.session?.[campaign.id] || 0, now);
    if (shows >= campaign.frequencyCap) return { eligible: false, reason: 'limite de frequência' };
  }
  if (campaign.cooldownHours > 0 && history.lastShown
    && now - history.lastShown < campaign.cooldownHours * HOUR) {
    return { eligible: false, reason: 'em cooldown' };
  }
  return { eligible: true, reason: 'elegível' };
}

/** Sorts by priority (1 = highest), then by position in the Popup Manager. */
export function byPriority(a, b) {
  return (a.priority - b.priority) || (a.order - b.order);
}

/**
 * Resolves conflicts: the eligible campaign with the highest priority wins.
 * Only one popup is shown per page view.
 * @returns {object|null} the winning campaign
 */
export function selectCampaign(campaigns, ctx) {
  return [...campaigns]
    .sort(byPriority)
    .find((campaign) => checkEligibility(campaign, ctx).eligible) || null;
}
