/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-product. Base: cards.
 * Sources:
 *   https://agibank.com.br/ (home: main > section.hide-captcha > section:nth-of-type(3))
 *   https://agibank.com.br/conta-corrente (product-detail):
 *     main > section[class="py-6 flex flex-col items-center justify-center bg-[var(--slice-bg-color)] md:py-10"]
 *     main > section[class="mt-6 flex flex-col items-center justify-center md:mb-4"]:not(:has(img))
 * Structure: 2 columns, one row per card -> [icon | h3 + description + CTA].
 * Card detection (verified in home + product-detail source.html):
 *   home / other-products: div.flex.flex-col.h-full (3 cards, "Contrate agora" / "Quero este!" CTAs)
 *   product benefits:      div.flex.flex-col.w-full.md:mx-0 (4-5 cards, some icon + title only)
 *   -> generic rule: the card is the outermost ancestor of each h3 that holds no other h3.
 *   div.items-center (header) > svg|img -> icon (inline SVG on live, data: img in cleaned.html)
 *   h3, p, a[href]                      -> title, description, CTA
 * Content outside the cards (section h2, intro p, CTA such as "Abra sua conta") is kept as
 * default content: placed before the block when it precedes the cards, after it otherwise.
 * The hidden filter SVG (svg.flt_svg / trailing img sibling of the card body) is ignored.
 * Note: on the live home page this section is client-rendered; before hydration it holds only
 * div.animate-pulse skeletons (no content), in which case the empty-block guard applies.
 */
function svgToImg(svg, document) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const markup = clone.outerHTML;
  let b64;
  try {
    b64 = btoa(unescape(encodeURIComponent(markup)));
  } catch (e) {
    b64 = Buffer.from(markup, 'utf8').toString('base64');
  }
  const img = document.createElement('img');
  img.src = `data:image/svg+xml;base64,${b64}`;
  img.alt = '';
  return img;
}

function cleanText(node) {
  return node.textContent.replace(/\s+/g, ' ').trim();
}

/** Outermost ancestor of the heading (inside element) that contains no other card heading. */
function cardFor(heading, element) {
  let card = heading;
  while (card.parentElement && card.parentElement !== element
    && card.parentElement.querySelectorAll('h3').length === 1) {
    card = card.parentElement;
  }
  return card;
}

/** Default content (headings, paragraphs, CTA links) found outside the cards. */
function collectDefaultContent(element, cards, document) {
  const before = [];
  const after = [];
  const firstCard = cards[0];
  const nodes = [...element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a[href]')]
    .filter((n) => !cards.some((c) => c.contains(n)));
  nodes.forEach((n) => {
    // eslint-disable-next-line no-bitwise
    const isBefore = !!(n.compareDocumentPosition(firstCard) & 4); // FOLLOWING
    const bucket = isBefore ? before : after;
    const tag = n.tagName.toLowerCase();
    if (tag === 'a') {
      if (n.closest('p, h1, h2, h3, h4, h5, h6')) return; // kept with its parent
      const text = cleanText(n);
      if (!text) return;
      const link = document.createElement('a');
      link.href = n.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      p.append(link);
      bucket.push(p);
      return;
    }
    if (n.closest('a') || !cleanText(n)) return;
    if (tag !== 'p' && n.parentElement && n.parentElement.closest('h1, h2, h3, h4, h5, h6, p')) return;
    n.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    if (/^h[1-6]$/.test(tag)) {
      const h = document.createElement(tag);
      h.textContent = cleanText(n);
      bucket.push(h);
    } else {
      bucket.push(n);
    }
  });
  return { before, after };
}

export default function parse(element, { document }) {
  const headings = [...element.querySelectorAll('h3')];
  let cards = [];
  headings.forEach((h) => {
    const card = cardFor(h, element);
    if (!cards.includes(card)) cards.push(card);
  });
  if (!cards.length) {
    // Fallback: legacy home-page card wrapper
    cards = [...element.querySelectorAll('div.flex.flex-col.h-full')];
  }

  const cells = [];
  cards.forEach((card) => {
    const heading = card.querySelector('h3, h2, h4');
    const header = heading ? heading.closest('div.items-center') || heading.parentElement.parentElement : card;

    // Icon cell
    const iconCell = [];
    let icon = header.querySelector(':scope > svg:not(.flt_svg), :scope > img, :scope > picture');
    if (!icon) {
      icon = [...card.querySelectorAll('svg:not(.flt_svg), img, picture')].find((i) => !i.closest('a')
        && !(i.parentElement && i.parentElement.closest('svg, picture'))
        && heading && (i.compareDocumentPosition(heading) & 4)); // eslint-disable-line no-bitwise
    }
    if (icon) {
      if (icon.tagName.toLowerCase() === 'svg') iconCell.push(svgToImg(icon, document));
      else iconCell.push(icon);
    }

    // Body cell
    const bodyCell = [];
    if (heading) {
      const h = document.createElement('h3');
      h.textContent = heading.textContent.trim();
      bodyCell.push(h);
    }
    [...card.querySelectorAll('p')].forEach((p) => {
      if (p.textContent.trim() && !p.closest('a')) bodyCell.push(p);
    });
    [...card.querySelectorAll('a[href]')].forEach((a) => {
      const text = a.textContent.trim();
      if (!text) return;
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      p.append(link);
      bodyCell.push(p);
    });

    if (!bodyCell.length && !iconCell.length) return;
    cells.push([iconCell.length ? iconCell : '', bodyCell.length ? bodyCell : '']);
  });

  if (!cells.length) {
    // Not hydrated yet (skeleton cards): keep any section heading as clean default content
    element.querySelectorAll('h1 br, h2 br, h3 br').forEach((br) => br.replaceWith(' '));
    element.replaceWith(...element.childNodes);
    return;
  }

  const { before, after } = collectDefaultContent(element, cards, document);
  if (before.length) element.before(...before);
  if (after.length) element.after(...after);

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-product', cells });
  element.replaceWith(block);
}
