import { createOptimizedPicture } from '../../scripts/aem.js';

const SVG_DATA_RE = /^data:image\/svg\+xml(;[^,]*)?,(.*)$/is;

/** Only same-origin (media bus) images can use the optimization query params. */
function isLocalImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Inlines a data: SVG icon so it inherits `currentColor` from the card.
 * The markup is parsed as SVG and stripped of scripts, styles, foreign content,
 * event handlers and non-fragment links. Returns null when it cannot be inlined.
 */
function inlineSvgIcon(img) {
  const match = img.getAttribute('src')?.match(SVG_DATA_RE);
  if (!match) return null;
  let markup;
  try {
    if ((match[1] || '').includes('base64')) {
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      markup = new TextDecoder().decode(bytes);
    } else {
      markup = decodeURIComponent(match[2]);
    }
  } catch {
    return null;
  }
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.localName !== 'svg' || doc.querySelector('parsererror')) return null;

  svg.querySelectorAll('script, style, foreignObject, iframe').forEach((n) => n.remove());
  [svg, ...svg.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach(({ name, value }) => {
      if (/^on/i.test(name) || (/href$/i.test(name) && !value.trim().startsWith('#'))) {
        el.removeAttribute(name);
      }
    });
  });
  // size and color come from the block CSS
  ['class', 'width', 'height', 'style'].forEach((attr) => svg.removeAttribute(attr));
  svg.classList.add('cards-product-icon-svg');
  svg.setAttribute('focusable', 'false');
  if (img.alt) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', img.alt);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  return document.importNode(svg, true);
}

function decorateImage(img) {
  const picture = img.closest('picture');
  const target = picture || img;
  const svg = inlineSvgIcon(img);
  if (svg) {
    target.replaceWith(svg);
  } else if (isLocalImage(img.src)) {
    target.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]));
  } else {
    // external or non-SVG data images are kept as authored
    img.setAttribute('loading', 'lazy');
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
let filterCount = 0;

/**
 * Builds the "gooey" SVG filter used to round the corners of the
 * clip-path shaped (slanted) cards, mirroring the source site.
 * @param {string} id filter id
 * @returns {SVGSVGElement}
 */
function buildRoundCornerFilter(id) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('cards-product-filter');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = id;
  const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
  blur.setAttribute('in', 'SourceGraphic');
  blur.setAttribute('stdDeviation', '14');
  blur.setAttribute('result', 'blur');
  const matrix = document.createElementNS(SVG_NS, 'feColorMatrix');
  matrix.setAttribute('in', 'blur');
  matrix.setAttribute('mode', 'matrix');
  matrix.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9');
  matrix.setAttribute('result', 'goo');
  const composite = document.createElementNS(SVG_NS, 'feComposite');
  composite.setAttribute('in', 'SourceGraphic');
  composite.setAttribute('in2', 'goo');
  composite.setAttribute('operator', 'atop');
  filter.append(blur, matrix, composite);
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.append(filter);
  svg.append(defs);
  return svg;
}

const ARROW_PATHS = {
  prev: 'M19 12H5m6-6-6 6 6 6',
  next: 'M5 12h14m-6-6 6 6-6 6',
};

function buildArrowButton(dir, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cards-product-nav-${dir}`;
  button.setAttribute('aria-label', label);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ARROW_PATHS[dir]);
  svg.append(path);
  button.append(svg);
  return button;
}

/**
 * Turns the card list into a horizontally scrolling carousel with
 * previous / next buttons (feature cards on product pages).
 * @param {Element} block The block element
 * @param {HTMLUListElement} ul The card list (scroll container)
 */
function decorateCarousel(block, ul) {
  ul.setAttribute('tabindex', '0');
  ul.setAttribute('aria-label', block.closest('.section')?.querySelector('h2')?.textContent.trim() || 'Cards');
  const nav = document.createElement('div');
  nav.className = 'cards-product-nav';
  const prev = buildArrowButton('prev', 'Anterior');
  const next = buildArrowButton('next', 'Próximo');
  nav.append(prev, next);

  const step = () => {
    const card = ul.querySelector('.cards-product-card');
    if (!card) return ul.clientWidth;
    const style = getComputedStyle(card);
    return card.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
  };
  // wraps around at both ends, like the source carousel loop
  prev.addEventListener('click', () => {
    if (ul.scrollLeft <= 1) ul.scrollTo({ left: ul.scrollWidth, behavior: 'smooth' });
    else ul.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  next.addEventListener('click', () => {
    if (ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 1) ul.scrollTo({ left: 0, behavior: 'smooth' });
    else ul.scrollBy({ left: step(), behavior: 'smooth' });
  });
  return nav;
}

/**
 * Picks the visual variant from the authored structure:
 * - feature: cards without icons that have a CTA (centered, rounded carousel cards)
 * - benefits: cards without a CTA (icon + title [+ text] advantage tiles)
 * - default: icon + text + CTA product cards; when the block opens its section
 *   (homepage) the cards alternate between the two brand blues.
 * @param {Element} block The block element
 * @param {HTMLUListElement} ul The card list
 * @returns {string} variant name
 */
function detectVariant(block, ul) {
  const cards = [...ul.children];
  const hasIcon = cards.some((li) => li.querySelector('.cards-product-card-icon'));
  const hasCta = cards.some((li) => li.querySelector('.cards-product-card-cta'));
  if (!hasIcon && hasCta) return 'feature';
  if (!hasCta) return 'benefits';
  const wrapper = block.parentElement;
  if (wrapper && wrapper.classList.contains('cards-product-wrapper') && !wrapper.previousElementSibling) {
    return 'alternate';
  }
  return 'default';
}

/**
 * loads and decorates the cards-product block
 * Each row = one card: icon/image cell + body cell (heading, text, CTA).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  filterCount += 1;
  const filterId = `cards-product-round-${filterCount}`;
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-product-card';
    const inner = document.createElement('div');
    inner.className = 'cards-product-card-inner';
    while (row.firstElementChild) inner.append(row.firstElementChild);
    li.append(inner);
    [...inner.children].forEach((div) => {
      const empty = div.textContent.trim() === '';
      const onlyMedia = empty && (div.querySelector('picture, img, .icon, svg'));
      if (onlyMedia) div.className = 'cards-product-card-icon';
      else if (empty && !div.children.length) div.remove();
      else div.className = 'cards-product-card-body';
    });
    // the last paragraph holding only a link is the card CTA
    const body = li.querySelector('.cards-product-card-body');
    if (body) {
      const ctas = [...body.querySelectorAll('p')].filter((p) => {
        const link = p.querySelector('a');
        return link && p.textContent.trim() === link.textContent.trim();
      });
      if (ctas.length) ctas[ctas.length - 1].classList.add('cards-product-card-cta');
      // "*..." paragraphs are footnotes (e.g. "*Sujeito a análise")
      body.querySelectorAll(':scope > p').forEach((p) => {
        if (p.textContent.trim().startsWith('*')) p.classList.add('cards-product-card-note');
      });
    }
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach(decorateImage);
  // unwrap paragraphs left around icons
  ul.querySelectorAll('.cards-product-card-icon > p').forEach((p) => p.replaceWith(...p.childNodes));

  const variant = detectVariant(block, ul);
  if (variant !== 'default') block.classList.add(`cards-product-${variant}`);

  if (variant === 'benefits') {
    // icon + title share one row (mobile) / column (desktop), like the source tiles
    ul.querySelectorAll('.cards-product-card-inner').forEach((inner) => {
      const icon = inner.querySelector(':scope > .cards-product-card-icon');
      const heading = inner.querySelector(':scope > .cards-product-card-body > :is(h1, h2, h3, h4, h5, h6):first-child');
      if (!icon && !heading) return;
      const head = document.createElement('div');
      head.className = 'cards-product-card-head';
      head.append(...[icon, heading].filter(Boolean));
      inner.prepend(head);
    });
  }

  if (variant === 'feature') {
    block.replaceChildren(ul, decorateCarousel(block, ul));
    return;
  }
  block.style.setProperty('--cards-product-filter', `url("#${filterId}")`);
  block.replaceChildren(ul, buildRoundCornerFilter(filterId));
}
