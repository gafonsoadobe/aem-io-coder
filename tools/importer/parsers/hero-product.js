/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-product. Base: hero.
 * Source: https://agibank.com.br/conta-corrente
 *   main > section[class="overflow-hidden bg-primary-100 md:flex md:items-center md:justify-center"]
 * Structure (blocks/hero-product): 1 row x 2 cells -> [h1 + paragraph(s) + CTA link(s) | illustration image].
 * Selectors verified in migration-work/block-context/hero-product/source.html:
 *   h1 (fallback h2)                 -> title
 *   p (inside the text column)       -> description / footnotes (layout <br>s flattened to spaces)
 *   a[href] with text                -> CTA ("Abra sua conta"), kept in document order
 *   picture img / img                -> illustration (outside the text column)
 * Also validated on /seguros and /emprestimo-consignado-servidor-publico (footnotes after CTA, <br> in h1).
 */
function cleanText(node) {
  return node.textContent.replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const heading = element.querySelector('h1') || element.querySelector('h2');
  // Text column = the closest ancestor of the heading that also holds the CTA/paragraphs
  let textCol = heading ? heading.parentElement : null;
  while (textCol && textCol !== element && !textCol.querySelector('a[href], p')) {
    textCol = textCol.parentElement;
  }
  if (!textCol || textCol === element) textCol = heading ? heading.parentElement.parentElement || element : element;

  // ---- Text cell (document order: paragraphs and CTAs; footnotes may follow the CTA)
  const textCell = [];
  if (heading) {
    heading.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    const h1 = document.createElement('h1');
    h1.textContent = cleanText(heading);
    textCell.push(h1);
  }
  [...textCol.querySelectorAll('p, a[href]')].forEach((node) => {
    if (node.tagName === 'P') {
      if (node.closest('a') || !cleanText(node)) return;
      node.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      if (!node.querySelector('a, strong, em, b, i')) node.textContent = cleanText(node);
      textCell.push(node);
      return;
    }
    if (node.closest('p')) return; // inline link kept with its paragraph
    const text = cleanText(node);
    if (!text) return;
    const link = document.createElement('a');
    link.href = node.getAttribute('href');
    link.textContent = text;
    const p = document.createElement('p');
    p.append(link);
    textCell.push(p);
  });

  // ---- Image cell (illustration outside the text column)
  const imageCell = [];
  const img = [...element.querySelectorAll('img')].find((i) => !textCol.contains(i)
    && !(i.getAttribute('src') || '').startsWith('data:'));
  if (img) imageCell.push(img);

  if (!textCell.length && !imageCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[textCell.length ? textCell : '', imageCell.length ? imageCell : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-product', cells });
  element.replaceWith(block);
}
