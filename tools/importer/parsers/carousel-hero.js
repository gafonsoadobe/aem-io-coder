/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://agibank.com.br/ (main > section.hide-captcha > section:nth-of-type(1))
 * Structure: 2 columns, one row per slide.
 *   Cell 1: desktop image then mobile image (block JS treats 1st picture = desktop, 2nd = mobile).
 *   Cell 2: eyebrow / heading / description / CTA (from figcaption content wrapper).
 * Selectors verified in migration-work/block-context/carousel-hero/source.html:
 *   figure[id^="banner-carousel"]  -> slides (iterationSafe, block-level, not anchors)
 *   img.md\:block / img.md\:hidden -> desktop / mobile image
 *   figcaption > div               -> text content wrapper
 */
export default function parse(element, { document }) {
  let slides = [...element.querySelectorAll('figure[id^="banner-carousel"]')];
  if (!slides.length) slides = [...element.querySelectorAll('figure')];

  const cells = [];

  slides.forEach((slide) => {
    // Images: desktop first, then mobile
    const imgs = [...slide.querySelectorAll(':scope > img, :scope > picture img')];
    let desktop = imgs.find((img) => /(^|\s)md:block(\s|$)/.test(img.className));
    let mobile = imgs.find((img) => /(^|\s)md:hidden(\s|$)/.test(img.className));
    if (!desktop) desktop = imgs.find((img) => img !== mobile);
    if (!mobile) mobile = imgs.find((img) => img !== desktop);
    const imageCell = [];
    if (desktop) imageCell.push(desktop);
    if (mobile && mobile !== desktop) imageCell.push(mobile);

    // Text content
    const contentCell = [];
    const caption = slide.querySelector('figcaption');
    const wrapper = caption && (caption.querySelector(':scope > div') || caption);
    if (wrapper) {
      const nodes = [...wrapper.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a[href]')];
      nodes.forEach((node) => {
        if (node.tagName === 'A') {
          // CTA links only (skip the empty full-size overlay link)
          if (!node.textContent.trim()) return;
          const link = document.createElement('a');
          link.href = node.getAttribute('href');
          link.textContent = node.textContent.trim();
          const p = document.createElement('p');
          p.append(link);
          contentCell.push(p);
          return;
        }
        if (node.closest('a')) return;
        if (!node.textContent.trim()) return;
        // strip leading/trailing <br> and whitespace used for spacing
        while (node.firstChild && (node.firstChild.nodeName === 'BR'
          || (node.firstChild.nodeType === 3 && !node.firstChild.textContent.trim()))) {
          node.firstChild.remove();
        }
        while (node.lastChild && (node.lastChild.nodeName === 'BR'
          || (node.lastChild.nodeType === 3 && !node.lastChild.textContent.trim()))) {
          node.lastChild.remove();
        }
        contentCell.push(node);
      });
    }

    if (!imageCell.length && !contentCell.length) return;
    cells.push([imageCell, contentCell.length ? contentCell : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
