/**
 * Builds a table cell, moving the authored content into it.
 * @param {Element} col authored cell
 * @param {boolean} isHeader whether the cell belongs to the header row
 * @returns {HTMLTableCellElement}
 */
function buildCell(col, isHeader) {
  const cell = document.createElement(isHeader ? 'th' : 'td');
  if (isHeader) cell.scope = 'col';
  // unwrap a single paragraph so cells don't carry extra margins
  const only = col.children.length === 1 ? col.firstElementChild : null;
  const source = only && only.tagName === 'P' ? only : col;
  cell.append(...source.childNodes);
  return cell;
}

/**
 * Derives an accessible label for the scroll region.
 * @param {Element} block
 * @returns {string}
 */
function getLabel(block) {
  const headings = 'h1, h2, h3, h4, h5, h6';
  // walk back from the block (or its wrapper) to the nearest preceding heading
  let el = block.parentElement?.classList.contains('table-wrapper') ? block.parentElement : block;
  while (el) {
    el = el.previousElementSibling;
    const heading = el && (el.matches(headings) ? el : [...el.querySelectorAll(headings)].pop());
    if (heading && heading.textContent.trim()) return heading.textContent.trim();
  }
  return 'Table';
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const rows = [...block.children].filter((row) => row.children.length);
  if (!rows.length) return;

  const table = document.createElement('table');
  const columnCount = Math.max(...rows.map((row) => row.children.length));

  const [headerRow, ...bodyRows] = rows;

  const thead = document.createElement('thead');
  const headTr = document.createElement('tr');
  [...headerRow.children].forEach((col) => headTr.append(buildCell(col, true)));
  thead.append(headTr);
  table.append(thead);

  if (bodyRows.length) {
    const tbody = document.createElement('tbody');
    bodyRows.forEach((row) => {
      const tr = document.createElement('tr');
      const cols = [...row.children];
      cols.forEach((col, i) => {
        const td = buildCell(col, false);
        // stretch the last cell when an author omitted trailing cells
        if (i === cols.length - 1 && cols.length < columnCount) {
          td.colSpan = columnCount - cols.length + 1;
        }
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-scroll';
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', getLabel(block));
  wrapper.tabIndex = 0;
  wrapper.append(table);

  block.replaceChildren(wrapper);
}
