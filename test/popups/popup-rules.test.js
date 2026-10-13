import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkEligibility, countImpressions, getStatus, matchesPages, normalizeCampaign,
  normalizePath, parseDate, selectCampaign,
} from '../../scripts/popups/popup-rules.js';

const NOW = new Date(2026, 9, 13, 12, 0).getTime();
const HOUR = 3600e3;

const campaign = (raw, order = 0) => normalizeCampaign({
  name: 'Teste', popup: '/popups/teste', active: 'true', ...raw,
}, order);

const ctx = (extra = {}) => ({
  path: '/', now: NOW, history: {}, session: {}, ...extra,
});

describe('parseDate', () => {
  it('reads ISO and Brazilian dates', () => {
    assert.equal(parseDate('2026-10-13'), new Date(2026, 9, 13).getTime());
    assert.equal(parseDate('13/10/2026 08:30'), new Date(2026, 9, 13, 8, 30).getTime());
    assert.equal(parseDate('2026-10-13T08:00:00.000Z'), Date.UTC(2026, 9, 13, 8));
  });
  it('makes date-only end dates inclusive', () => {
    assert.equal(parseDate('13/10/2026', true), new Date(2026, 9, 13, 23, 59, 59, 999).getTime());
  });
  it('returns null for empty or invalid values', () => {
    assert.equal(parseDate(''), null);
    assert.equal(parseDate('amanhã'), null);
  });
});

describe('pages', () => {
  it('normalizes the home page', () => {
    assert.equal(normalizePath('/index'), '/');
    assert.equal(normalizePath('/cartoes/'), '/cartoes');
    assert.equal(normalizePath('/pix.html?x=1'), '/pix');
  });
  it('matches exact, section and wildcard patterns, with exclusions', () => {
    assert.ok(matchesPages(['/'], '/index'));
    assert.ok(!matchesPages(['/'], '/cartoes'));
    assert.ok(matchesPages(['/fale-conosco/*'], '/fale-conosco/pix-e-transferencias'));
    assert.ok(matchesPages(['*', '!/ouvidoria'], '/pix'));
    assert.ok(!matchesPages(['*', '!/ouvidoria'], '/ouvidoria'));
  });
});

describe('normalizeCampaign', () => {
  it('applies defaults and authored values', () => {
    const c = campaign({
      priority: '2', trigger: 'Scroll', triggerValue: '40', pages: '/, /pix', frequencyPeriod: 'Sessão',
    });
    assert.equal(c.id, 'teste');
    assert.equal(c.priority, 2);
    assert.equal(c.trigger, 'scroll');
    assert.equal(c.triggerValue, 40);
    assert.deepEqual(c.pages, ['/', '/pix']);
    assert.equal(c.frequencyPeriod, 'sessao');
  });
  it('treats unknown values safely', () => {
    const c = campaign({ active: 'talvez', trigger: 'hover', priority: 'x' });
    assert.equal(c.active, false);
    assert.equal(c.trigger, 'imediato');
    assert.equal(c.priority, 99);
  });
});

describe('eligibility', () => {
  it('respects status and schedule', () => {
    assert.equal(getStatus(campaign({ active: 'false' }), NOW), 'inativo');
    assert.equal(getStatus(campaign({ start: '14/10/2026' }), NOW), 'agendado');
    assert.equal(getStatus(campaign({ end: '12/10/2026' }), NOW), 'encerrado');
    assert.equal(getStatus(campaign({ start: '13/10/2026', end: '13/10/2026' }), NOW), 'ativo');
  });
  it('respects eligible pages', () => {
    const result = checkEligibility(campaign({ pages: '/cartoes' }), ctx());
    assert.deepEqual(result, { eligible: false, reason: 'página não elegível' });
  });
  it('applies the frequency cap per period', () => {
    const c = campaign({ frequencyCap: '1', frequencyPeriod: 'dia' });
    const yesterday = { teste: { shows: [NOW - 25 * HOUR], total: 1 } };
    const today = { teste: { shows: [NOW - HOUR], total: 1 } };
    assert.ok(checkEligibility(c, ctx({ history: yesterday })).eligible);
    assert.equal(checkEligibility(c, ctx({ history: today })).reason, 'limite de frequência');
  });
  it('counts session and lifetime impressions', () => {
    assert.equal(countImpressions(campaign({ frequencyPeriod: 'sessao' }), {}, 2, NOW), 2);
    assert.equal(countImpressions(campaign({ frequencyPeriod: 'sempre' }), { shows: [], total: 5 }, 0, NOW), 5);
  });
  it('applies the cooldown', () => {
    const c = campaign({ cooldownHours: '24' });
    const history = { teste: { lastShown: NOW - 2 * HOUR } };
    assert.equal(checkEligibility(c, ctx({ history })).reason, 'em cooldown');
    history.teste.lastShown = NOW - 30 * HOUR;
    assert.ok(checkEligibility(c, ctx({ history })).eligible);
  });
});

describe('selectCampaign', () => {
  const promo = campaign({ name: 'Promo', priority: '1' }, 0);
  const info = campaign({ name: 'Info', priority: '2' }, 1);
  const eng = campaign({ name: 'Eng', priority: '2' }, 2);

  it('picks the eligible campaign with the highest priority', () => {
    assert.equal(selectCampaign([eng, info, promo], ctx()).id, 'promo');
  });
  it('falls back when the winner is not eligible, breaking ties by order', () => {
    const capped = campaign({ name: 'Promo', priority: '1', frequencyCap: '1' }, 0);
    const history = { promo: { shows: [NOW - HOUR], total: 1 } };
    assert.equal(selectCampaign([capped, eng, info], ctx({ history })).id, 'info');
  });
  it('returns null when nothing is eligible', () => {
    assert.equal(selectCampaign([campaign({ active: 'false' })], ctx()), null);
  });
});
