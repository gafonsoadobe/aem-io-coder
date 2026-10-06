/** A cell whose whole text is a step number (e.g. "1" or "01."). */
const NUMBER_RE = /^\s*(\d{1,3})\.?\s*$/;

/**
 * loads and decorates the cards-steps block
 * Each row = one step: a single text cell with the instruction.
 * The step number is generated from the row order; an optional leading cell holding
 * only a number overrides it.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ol = document.createElement('ol');
  ol.className = 'cards-steps-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((cell) => cell.textContent.trim() !== '' || cell.children.length);
    if (!cells.length) return;

    let number = String(ol.children.length + 1);
    const match = cells.length > 1 && cells[0].textContent.match(NUMBER_RE);
    if (match) {
      [number] = match.slice(1);
      cells.shift();
    }

    const li = document.createElement('li');
    li.className = 'cards-steps-card';

    // the list already conveys the order to assistive tech
    const badge = document.createElement('span');
    badge.className = 'cards-steps-number';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = number;

    const body = document.createElement('div');
    body.className = 'cards-steps-card-body';
    cells.forEach((cell) => body.append(...cell.childNodes));
    // bare text (no paragraph) is wrapped so spacing stays consistent
    if (!body.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol')) {
      const p = document.createElement('p');
      p.append(...body.childNodes);
      body.append(p);
    }

    li.append(badge, body);
    ol.append(li);
  });

  block.replaceChildren(ol);
}
