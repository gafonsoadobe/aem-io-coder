import {
  buildCta, buildMedia, buildText, buildTitle, getFields, renderPopup,
} from '../../scripts/popups/popup-blocks.js';

/**
 * Popup Promocional: image, title, text and call to action.
 * Rows: image | title | text | CTA label | CTA link.
 * Shown by the Popup Manager (scripts/popups/popup-manager.js).
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [image, title, text, ctaLabel, ctaLink] = getFields(block);
  await renderPopup(block, {
    media: buildMedia(image),
    parts: [buildTitle(title), buildText(text), buildCta(ctaLabel, ctaLink)],
  });
}
