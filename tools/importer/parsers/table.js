/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table. Base: table.
 * Source: https://agibank.com.br/politicas-de-privacidade
 *   main section[data-slice-type="table"] > table > (thead > tr > th) + (tbody > tr > td)
 * Structure (library convention): row 1 = block name, then one row per source table row,
 *   one cell per source cell. The header row (th cells) is emitted as the first data row.
 *   Cell inner content (p, strong, links) is kept as-is.
 * Any heading / caption / other content around the table inside the slice stays as default
 * content before (or after) the block.
 * Selectors verified in migration-work/block-context/table/source.html (2 instances):
 *   table, thead > tr > th, tbody > tr > td
 */
function cellContent(cell, document) {
  const nodes = [...cell.childNodes].filter((n) => n.nodeType !== 3 || n.textContent.trim());
  if (!nodes.length) return '';
  const wrap = document.createElement('div');
  wrap.append(...nodes);
  return wrap;
}

function buildTable(table, document) {
  // Rows in document order across thead / tbody / tfoot; skip nested tables' rows
  const trs = [...table.querySelectorAll('tr')].filter((tr) => tr.closest('table') === table);
  const rows = trs
    .map((tr) => [...tr.children].filter((c) => c.matches('th, td')))
    .filter((cells) => cells.length && cells.some((c) => c.textContent.trim() || c.querySelector('img, a')))
    .map((cells) => cells.map((c) => cellContent(c, document)));
  if (!rows.length) return null;
  // Pad short rows so every content row has the same number of cells
  const cols = Math.max(...rows.map((r) => r.length));
  rows.forEach((r) => { while (r.length < cols) r.push(''); });
  return WebImporter.Blocks.createBlock(document, { name: 'table', cells: rows });
}

export default function parse(element, { document }) {
  const tables = element.matches('table')
    ? [element]
    : [...element.querySelectorAll('table')].filter((t) => !t.parentElement.closest('table'));
  if (!tables.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single table, nothing else in the slice: the whole slice becomes the block
  const onlyTable = tables.length === 1 && !tables[0].querySelector('caption')
    && element.textContent.trim() === tables[0].textContent.trim();
  if (onlyTable) {
    const block = buildTable(tables[0], document);
    if (!block) {
      element.replaceWith(...element.childNodes);
      return;
    }
    element.replaceWith(block);
    return;
  }

  // Otherwise keep surrounding content (headings, captions, notes) as default content
  tables.forEach((table) => {
    const caption = table.querySelector(':scope > caption');
    const block = buildTable(table, document);
    const replacement = [];
    if (caption && caption.textContent.trim()) {
      const p = document.createElement('p');
      p.append(...caption.childNodes);
      replacement.push(p);
    }
    if (block) replacement.push(block);
    table.replaceWith(...replacement);
  });
  element.replaceWith(...element.childNodes);
}
