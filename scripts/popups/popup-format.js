/**
 * Human-readable descriptions of popup settings, shared by the popup simulation
 * (popup pages) and the Popup Manager dashboard.
 */
import { normalizePath } from './popup-rules.js';

export const STATUS_LABELS = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  agendado: 'Agendado',
  encerrado: 'Encerrado',
};

export const TYPE_LABELS = {
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

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const formatDate = (time) => (time ? dateFormat.format(time) : '—');

export function describePeriod({ start, end }) {
  if (!start && !end) return 'Sem data definida';
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export function describePages({ pages }) {
  if (!pages.length) return 'Nenhuma página escolhida';
  return pages.map((p) => (p === '/' ? '/ (home)' : p)).join(', ');
}

export function describeTrigger({ trigger, triggerValue }) {
  if (trigger === 'tempo') return `Após ${triggerValue || 0} s`;
  if (trigger === 'scroll') return `Rolagem de ${triggerValue || 50}%`;
  return 'Imediato';
}

export function describeFrequency({ frequencyCap, frequencyPeriod }) {
  if (!frequencyCap) return 'Sem limite';
  return `${frequencyCap}× por ${PERIODS[frequencyPeriod]}`;
}

export const describeCooldown = ({ cooldownHours }) => (cooldownHours ? `${cooldownHours} h` : 'Sem cooldown');

/** A page where the campaign can be previewed: its first non-wildcard page, or the home. */
export function previewUrl(campaign) {
  const page = campaign.pages.find((p) => !p.startsWith('!') && !p.includes('*'));
  return `${page ? normalizePath(page) : '/'}?popup=${encodeURIComponent(campaign.id)}`;
}

/**
 * Link that opens a page for editing (Document Authoring opens it in the
 * Universal Editor, as configured for the site). Derived from the
 * {branch}--{repo}--{owner} host; null elsewhere (e.g. local development).
 */
export function editUrl(path) {
  const match = window.location.hostname.match(/^[^.]+--([^.]+)--([^.]+)\./);
  if (!match) return null;
  const [, repo, owner] = match;
  return `https://da.live/edit#/${owner}/${repo}${path}`;
}
