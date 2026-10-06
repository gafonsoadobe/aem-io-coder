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

function optimizePicture(pic) {
  const img = pic.querySelector('img');
  if (!img) return;
  if (isLocalImage(img.src)) {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '1000' }, { width: '750' }]);
    moveImageInstrumentation(img, optimized);
    pic.replaceWith(optimized);
  } else {
    img.setAttribute('loading', 'lazy');
  }
}

function isCtaParagraph(el) {
  if (el.tagName !== 'P') return false;
  const link = el.querySelector('a');
  return !!link && el.textContent.trim() === link.textContent.trim();
}

function isStrongParagraph(el) {
  if (el.tagName !== 'P') return false;
  const strong = el.querySelector('strong, b');
  return !!strong && el.textContent.trim() === strong.textContent.trim();
}

/**
 * Splits the text cell into a heading followed by inline groups.
 * Each plain element starts a group; a bold-only paragraph (stat figure) or a
 * CTA-only paragraph continues the current group.
 * e.g. "Somos mais de" + "**5 mil pessoas**" | "lutando por..." | "Confira as vagas..." + CTA
 */
function decorateTextCol(col) {
  col.classList.add('columns-dark-text-col');
  const children = [...col.children];
  const heading = children.find((c) => /^H[1-6]$/.test(c.tagName));
  const rest = children.filter((c) => c !== heading);
  if (!rest.length) return;

  const groups = document.createElement('div');
  groups.className = 'columns-dark-groups';
  let current = null;
  rest.forEach((el) => {
    const continues = isCtaParagraph(el) || isStrongParagraph(el);
    if (!current || !continues) {
      current = document.createElement('div');
      current.className = 'columns-dark-group';
      groups.append(current);
    }
    if (isStrongParagraph(el)) el.classList.add('columns-dark-stat-figure');
    if (isCtaParagraph(el)) el.classList.add('columns-dark-cta');
    current.append(el);
  });
  // a group carrying a bold-only figure reads as the highlighted stat
  groups.querySelectorAll('.columns-dark-group').forEach((group) => {
    if (group.querySelector('.columns-dark-stat-figure')) group.classList.add('columns-dark-stat');
  });

  col.replaceChildren(...(heading ? [heading] : []), groups);
}

const FILTER_ID = 'columns-dark-goo';

/**
 * Adds the SVG "goo" filter (blur + alpha threshold) once per page.
 * The block CSS applies it to round the corners of the clipped panel shape.
 * @param {Element} block The block element
 */
function addGooFilter(block) {
  if (document.getElementById(FILTER_ID)) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'columns-dark-filter');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<defs><filter id="${FILTER_ID}">
    <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur"/>
    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="goo"/>
    <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
  </filter></defs>`;
  block.append(svg);
}

/**
 * loads and decorates the columns-dark block
 * Dark panel: photo beside a heading and a row of short text groups with a CTA.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  block.classList.add(`columns-dark-${cols}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-dark-row');
    [...row.children].forEach((col) => {
      const pictures = [...col.querySelectorAll('picture')];
      if (pictures.length && col.textContent.trim() === '') {
        col.classList.add('columns-dark-img-col');
        // one photo expected; keep the first if more were authored
        pictures.slice(1).forEach((pic) => (pic.closest('p') || pic).remove());
        optimizePicture(pictures[0]);
      } else if (col.textContent.trim() === '' && !col.children.length) {
        col.remove();
      } else {
        decorateTextCol(col);
      }
    });
  });

  addGooFilter(block);
}
