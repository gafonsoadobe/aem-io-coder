import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the accordion-more block
 * Each row = item: cell1 toggle label, cell2 expandable content (text + list of links).
 * The label cell may hold a second paragraph, used as the label while the item is open
 * (e.g. "Ver mais produtos" / "Ver menos").
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [labelCell, bodyCell] = row.children;
    if (!labelCell) {
      row.remove();
      return;
    }

    const summary = document.createElement('summary');
    summary.className = 'accordion-more-item-label';

    const paragraphs = [...labelCell.querySelectorAll(':scope > p')];
    if (paragraphs.length > 1) {
      const [closedP, openP] = paragraphs;
      const closed = document.createElement('span');
      closed.className = 'accordion-more-label-closed';
      closed.append(...closedP.childNodes);
      const open = document.createElement('span');
      open.className = 'accordion-more-label-open';
      open.append(...openP.childNodes);
      summary.append(closed, open);
      moveInstrumentation(labelCell, summary);
    } else {
      const labelText = document.createElement('span');
      labelText.append(...(paragraphs[0] || labelCell).childNodes);
      moveInstrumentation(labelCell, labelText);
      summary.append(labelText);
    }

    const body = bodyCell || document.createElement('div');
    body.className = 'accordion-more-item-body';
    // link lists become a grid of link buttons
    body.querySelectorAll('ul, ol').forEach((list) => list.classList.add('accordion-more-links'));

    const details = document.createElement('details');
    details.className = 'accordion-more-item';
    moveInstrumentation(row, details);
    details.append(summary, body);
    row.replaceWith(details);
  });
}
