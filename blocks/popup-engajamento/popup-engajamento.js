import {
  buildCta, buildForm, buildText, buildTitle, fieldLink, getFields, renderPopup,
} from '../../scripts/popups/popup-blocks.js';

/**
 * Popup Engajamento: title, text and a call to action or a simple form.
 * Rows: title | text | CTA label | CTA link | form (link to a form definition,
 * e.g. /forms/abra-sua-conta.json). When a form is set, it replaces the CTA.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [title, text, ctaLabel, ctaLink, form] = getFields(block);
  const formHref = fieldLink(form);
  const action = formHref ? await buildForm(formHref) : buildCta(ctaLabel, ctaLink);
  if (formHref) block.classList.add('popup-engajamento-form');
  renderPopup(block, {
    parts: [buildTitle(title), buildText(text), action],
  });
}
