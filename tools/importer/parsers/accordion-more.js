/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-more. Base: accordion.
 * Source: https://agibank.com.br/ (#more-products)
 * Structure: 2 columns, one row -> [toggle label | intro paragraph + list of product links].
 * Selectors verified in migration-work/block-context/accordion-more/source.html:
 *   :scope > div:first-child a[href="#more-products"] span -> toggle label "Ver mais produtos"
 *   .animate-collapse > p                                   -> intro paragraph
 *   .animate-collapse .grid > a[href]                       -> product links (distinct hrefs)
 */
export default function parse(element, { document }) {
  // Toggle label: the self-referencing anchor button
  const toggle = element.querySelector('a[href^="#"]');
  let labelText = toggle ? toggle.textContent.replace(/\s+/g, ' ').trim() : '';
  if (!labelText) labelText = 'Ver mais produtos';

  // Collapsible content
  const panel = element.querySelector('.animate-collapse')
    || [...element.querySelectorAll(':scope > div')].find((d) => d.querySelector('a[href]:not([href^="#"])'))
    || element;

  const contentCell = [];
  [...panel.querySelectorAll('p')].forEach((p) => {
    if (p.textContent.trim() && !p.closest('a')) contentCell.push(p);
  });

  const links = [...panel.querySelectorAll('a[href]')].filter((a) => a !== toggle && !a.getAttribute('href').startsWith('#'));
  if (links.length) {
    const ul = document.createElement('ul');
    links.forEach((a) => {
      const text = a.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = text;
      li.append(link);
      ul.append(li);
    });
    if (ul.children.length) contentCell.push(ul);
  }

  if (!contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[labelText, contentCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-more', cells });
  element.replaceWith(block);
}
