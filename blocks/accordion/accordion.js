/**
 * Accordion block (FAQ style).
 * Content contract: each row is one item.
 *   cell 1: question / toggle label
 *   cell 2: answer (optional — rows without a body render as a static label)
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [labelCell, bodyCell] = row.children;
    if (!labelCell || !labelCell.textContent.trim()) {
      row.remove();
      return;
    }

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    const labelText = document.createElement('span');
    labelText.className = 'accordion-item-title';
    // unwrap a single paragraph so the label stays inline
    const paragraphs = labelCell.querySelectorAll(':scope > p');
    if (paragraphs.length === 1 && labelCell.children.length === 1) {
      labelText.append(...paragraphs[0].childNodes);
    } else {
      labelText.append(...labelCell.childNodes);
    }
    const icon = document.createElement('span');
    icon.className = 'accordion-item-icon';
    icon.setAttribute('aria-hidden', 'true');
    summary.append(labelText, icon);

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    if (bodyCell) body.append(...bodyCell.childNodes);
    // any extra cells authors add are appended to the body
    [...row.children].slice(2).forEach((extra) => body.append(...extra.childNodes));

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}
