/**
 * Shared decoration for the popup blocks (popup-promocional, popup-informativo,
 * popup-engajamento). Each block row holds one authored field, in the order
 * defined by its model in ue/models/blocks/. The decorated markup is the same
 * on the popup page (preview card, editable in the Universal Editor) and inside
 * the dialog opened by the Popup Manager.
 */
import {
  buildBlock, createOptimizedPicture, decorateBlock, loadBlock,
} from '../aem.js';
import { moveImageInstrumentation, moveInstrumentation } from '../scripts.js';

/** The single cell of each field row. */
export function getFields(block) {
  return [...block.children].map((row) => row.firstElementChild || row);
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

/**
 * Replaces the block content with the popup card.
 * @param {Element} block popup block
 * @param {{media?: Element, parts: (Element|null)[]}} content
 */
export function renderPopup(block, { media = null, parts = [] }) {
  const card = document.createElement('div');
  card.className = 'popup-card';
  if (media) card.append(media);
  const body = document.createElement('div');
  body.className = 'popup-body';
  body.append(...parts.filter(Boolean));
  card.append(body);
  block.replaceChildren(card);
}
