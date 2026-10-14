import {
  buildCta, buildText, buildTitle, fieldText, getFields, renderPopup,
} from '../../scripts/popups/popup-blocks.js';

/** Priority levels: visible label (not color alone) for accessibility. */
const LEVELS = {
  info: 'Informação',
  aviso: 'Atenção',
  critico: 'Importante',
};

function getLevel(value) {
  const key = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return Object.keys(LEVELS).find((level) => key.startsWith(level.slice(0, 4))) || 'info';
}

/**
 * Popup Informativo: title, message, priority level and optional call to action.
 * Rows: title | message | level (info, aviso, critico) | CTA label | CTA link.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [title, message, level, ctaLabel, ctaLink] = getFields(block);
  const key = getLevel(fieldText(level));
  block.dataset.level = key;
  block.classList.add(`popup-informativo-${key}`);

  const badge = document.createElement('p');
  badge.className = 'popup-level';
  badge.innerHTML = '<span class="popup-level-icon" aria-hidden="true"></span>';
  badge.append(LEVELS[key]);

  await renderPopup(block, {
    parts: [badge, buildTitle(title), buildText(message), buildCta(ctaLabel, ctaLink)],
  });
}
