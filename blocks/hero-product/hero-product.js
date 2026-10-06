import { createOptimizedPicture } from '../../scripts/aem.js';

/** Only same-origin (media bus) images can use the optimization query params. */
function isLocalImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** A cell holding only pictures/images (no text) is the illustration. */
function isMediaCell(cell) {
  return !!cell.querySelector('picture, img') && cell.textContent.trim() === '';
}

/** A paragraph whose only content is a single link (the CTA). */
function isLinkOnly(p) {
  if (p.tagName !== 'P' || p.querySelector('picture, img')) return false;
  const links = p.querySelectorAll('a[href]');
  return links.length === 1 && p.textContent.trim() === links[0].textContent.trim();
}

function decorateMedia(cell) {
  cell.className = 'hero-product-media';
  cell.querySelectorAll('img').forEach((img) => {
    if (isLocalImage(img.src)) {
      // the illustration is above the fold: load it eagerly (LCP candidate)
      const picture = createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '1000' },
        { width: '750' },
      ]);
      (img.closest('picture') || img).replaceWith(picture);
    } else {
      img.setAttribute('loading', 'eager');
    }
  });
  // unwrap paragraphs left around the illustration
  cell.querySelectorAll(':scope > p').forEach((p) => {
    if (p.querySelector('picture, img') && p.textContent.trim() === '') p.replaceWith(...p.childNodes);
  });
}

function decorateText(cell) {
  cell.className = 'hero-product-content';
  const ctas = [...cell.children].filter(isLinkOnly);
  ctas.forEach((p, i) => {
    p.className = 'hero-product-cta';
    const a = p.querySelector('a');
    a.classList.remove('button', 'primary', 'secondary');
    if (i > 0) a.classList.add('hero-product-cta-secondary');
  });
}

/**
 * loads and decorates the hero-product block
 * 1 row x 2 cells: text (h1, paragraph, CTA link) | illustration.
 * The cell order is detected, so the illustration may also be authored first.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  // fold any extra rows' cells into the first row (authors may split text and image into rows)
  [...block.children].slice(1).forEach((extra) => {
    row.append(...extra.children);
    extra.remove();
  });
  row.className = 'hero-product-inner';

  let media = null;
  [...row.children].forEach((cell) => {
    if (cell.textContent.trim() === '' && !cell.querySelector('picture, img')) {
      cell.remove();
    } else if (!media && isMediaCell(cell)) {
      media = cell;
      decorateMedia(cell);
    } else {
      decorateText(cell);
    }
  });

  // a single mixed cell: move its picture into its own media column
  if (!media) {
    const content = row.querySelector('.hero-product-content');
    const pic = content && content.querySelector('picture, img');
    if (pic) {
      const holder = pic.closest('p') && pic.closest('p').textContent.trim() === '' ? pic.closest('p') : pic;
      const cell = document.createElement('div');
      cell.append(holder);
      row.append(cell);
      decorateMedia(cell);
      media = cell;
    }
  }

  // text always comes first visually (left on desktop, top on mobile)
  if (media) row.append(media);
  block.classList.toggle('hero-product-no-media', !media);
}
