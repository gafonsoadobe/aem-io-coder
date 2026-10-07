import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveImageInstrumentation } from '../../scripts/scripts.js';

/** Only same-origin (media bus) images can use the optimization query params. */
function isLocalImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

const GOO_FILTER_ID = 'columns-intro-goo';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Adds (once per document) the "goo" SVG filter used by the source site to
 * round the corners of the clipped green panel.
 * @param {Element} block The block element
 */
function addGooFilter(block) {
  if (document.getElementById(GOO_FILTER_ID)) return;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs><filter id="${GOO_FILTER_ID}">`
    + '<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>'
    + '<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="goo"/>'
    + '<feComposite in="SourceGraphic" in2="goo" operator="atop"/>'
    + '</filter></defs>';
  block.append(svg);
}

/**
 * loads and decorates the columns-intro block
 * Image panel beside a centered text panel.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  block.classList.add(`columns-intro-${cols}-cols`);

  const rows = [...block.children];
  addGooFilter(block);

  rows.forEach((row) => {
    row.classList.add('columns-intro-row');
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      const hasText = col.textContent.trim() !== '';
      if (pic && !hasText) {
        col.classList.add('columns-intro-img-col');
        const img = pic.querySelector('img');
        if (img && isLocalImage(img.src)) {
          const optimized = createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]);
          moveImageInstrumentation(img, optimized);
          col.replaceChildren(optimized);
        } else if (img) {
          // external images are kept as authored (no media-bus params)
          img.setAttribute('loading', 'lazy');
          col.replaceChildren(pic);
        }
      } else if (!hasText && !col.children.length && !col.hasAttribute('data-aue-prop')) {
        col.remove();
      } else {
        col.classList.add('columns-intro-text-col');
      }
    });
  });
}
