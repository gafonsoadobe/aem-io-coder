/**
 * loads and decorates the accordion-faq block
 * Each row = one FAQ item: cell1 question, cell2 answer.
 * Items are native <details>/<summary> elements, so they are keyboard and
 * screen-reader accessible without extra ARIA wiring.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [questionCell, answerCell] = row.children;
    if (!questionCell || questionCell.textContent.trim() === '') {
      row.remove();
      return;
    }

    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-question';

    const label = document.createElement('span');
    label.className = 'accordion-faq-question-text';
    // flatten a single wrapping paragraph/heading into the label
    const only = questionCell.children.length === 1 ? questionCell.firstElementChild : null;
    label.append(...(only && /^(P|H[1-6])$/.test(only.tagName) ? only : questionCell).childNodes);

    const icon = document.createElement('span');
    icon.className = 'accordion-faq-icon';
    icon.setAttribute('aria-hidden', 'true');

    summary.append(label, icon);

    const answer = answerCell || document.createElement('div');
    answer.className = 'accordion-faq-answer';

    const details = document.createElement('details');
    details.className = 'accordion-faq-item';
    details.append(summary, answer);
    row.replaceWith(details);
  });
}
