/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-dark. Base: columns.
 * Source: https://agibank.com.br/ (main > section.hide-captcha > section:nth-of-type(8))
 * Structure: 1 row x 2 columns -> [photo | heading + text groups + CTA].
 * Selectors verified in migration-work/block-context/columns-dark/source.html:
 *   img.md\:block (fallback: first real img) -> photo (desktop rendition; block JS supports one picture)
 *   h2                                       -> heading
 *   p (in document order)                    -> stat / description / CTA lead-in text
 *   a[href] with text                        -> CTA "Quero fazer parte"
 * Decorative data: images (clip-path filter svg) are ignored.
 */
export default function parse(element, { document }) {
  const imgs = [...element.querySelectorAll('img')]
    .filter((img) => !(img.getAttribute('src') || '').startsWith('data:'));
  const photo = imgs.find((img) => /(^|\s)md:block(\s|$)/.test(img.className)) || imgs[0];

  const textCell = [];
  const heading = element.querySelector('h1, h2, h3');
  if (heading) textCell.push(heading);

  // Paragraphs and CTA links in document order (CTA follows its lead-in paragraph)
  const nodes = [...element.querySelectorAll('p, a[href]')];
  nodes.forEach((node) => {
    if (node.tagName === 'A') {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const link = document.createElement('a');
      link.href = node.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      p.append(link);
      textCell.push(p);
      return;
    }
    if (node.closest('a') || !node.textContent.trim()) return;
    textCell.push(node);
  });

  if (!textCell.length && !photo) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[photo || '', textCell.length ? textCell : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-dark', cells });
  element.replaceWith(block);
}
