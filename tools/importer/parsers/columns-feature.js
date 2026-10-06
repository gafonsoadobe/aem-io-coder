/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-feature. Base: columns.
 * Sources:
 *   https://agibank.com.br/ (home: main > section.hide-captcha > section:nth-of-type(5) and (6))
 *   https://agibank.com.br/conta-corrente (product-detail):
 *     main > section[class="py-8 bg-white"]            -> div > [text div (h2, p, CTA) | img.rounded-3xl]
 *     main > section[class="flex flex-col items-center"] -> article > [Digital sempre div | Físico div]
 * Structure: 1 row ->
 *   home / py-8:              [text column | media column]
 *   Digital sempre / Físico:  [text column (with QR/app badges) | text column] (+ media column if present)
 *   download_app slice (https://agibank.com.br/agibank): article > single div of stacked rows
 *     (h2 | paragraphs | CTAs | QR + badges) -> [text column | media column (empty if none)]
 *   Text column: h2, paragraphs, CTA links (one per paragraph), then badge images
 *                (QR code image, app-store badge links wrapping images).
 *   Media column: illustration image, or a link to the .webm video (block JS builds <video>).
 * Selectors verified in migration-work/templates/home/block-context/columns-feature/source.html,
 * instances/01.html and migration-work/block-context/columns-feature/source.html + instances/01.html:
 *   article > div (2 children)       -> columns; without an article, the first element level
 *                                       that splits into 2+ children is used (py-8 wrapper div)
 *   video[src] | video source        -> video URL
 */
function cleanText(node) {
  return node.textContent.replace(/\s+/g, ' ').trim();
}

const MEDIA_SEL = 'img, video, picture';

function hasMedia(col) {
  return col.matches(MEDIA_SEL) || !!col.querySelector(MEDIA_SEL);
}

function buildTextCell(textCol, heading, document) {
  const textCell = [];
  if (heading) {
    // flatten <br> inside heading to a space
    heading.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    textCell.push(heading);
  }
  [...textCol.querySelectorAll('p')].forEach((p) => {
    if (p.textContent.trim() && !p.closest('a')) textCell.push(p);
  });
  // CTA links (text links, not image badges)
  [...textCol.querySelectorAll('a[href]')].forEach((a) => {
    if (a.querySelector('img, picture')) return;
    if (a.closest('p')) return; // inline link already kept inside its paragraph
    const text = cleanText(a);
    if (!text) return;
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    const p = document.createElement('p');
    p.append(link);
    textCell.push(p);
  });
  // Badge images: standalone images (QR) and image links (app stores), in document order
  [...textCol.querySelectorAll('img')].forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('data:')) return; // decorative inline svg
    const a = img.closest('a[href]');
    const p = document.createElement('p');
    if (a) {
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.append(img);
      p.append(link);
    } else {
      p.append(img);
    }
    textCell.push(p);
  });
  return textCell;
}

function buildMediaCell(mediaCol, document) {
  const mediaCell = [];
  const video = mediaCol.matches('video') ? mediaCol : mediaCol.querySelector('video');
  const videoSrc = video && (video.getAttribute('src')
    || (video.querySelector('source[src]') && video.querySelector('source[src]').getAttribute('src')));
  if (videoSrc) {
    const poster = video.getAttribute('poster');
    if (poster) {
      const img = document.createElement('img');
      img.src = poster;
      img.alt = '';
      mediaCell.push(img);
    }
    const link = document.createElement('a');
    link.href = videoSrc;
    link.textContent = videoSrc;
    mediaCell.push(link);
  } else {
    const imgs = mediaCol.matches('img') ? [mediaCol] : [...mediaCol.querySelectorAll('img')];
    imgs.forEach((img) => {
      if (!(img.getAttribute('src') || '').startsWith('data:')) mediaCell.push(img);
    });
  }
  return mediaCell;
}

export default function parse(element, { document }) {
  const article = element.querySelector('article') || element;
  let cols = [...article.querySelectorAll(':scope > div')];
  if (cols.length < 2) cols = [...article.children];
  // No article split (product "py-8 bg-white"): descend single wrappers until the columns appear
  let wrapper = null;
  while (cols.length === 1 && cols[0].children.length && !cols[0].matches(MEDIA_SEL)) {
    [wrapper] = cols;
    cols = [...cols[0].children];
  }

  const heading = element.querySelector('h1, h2, h3');
  let textCol = (heading && cols.find((c) => c.contains(heading))) || cols[0];
  // download_app slice: article > single text div whose children are stacked rows
  // (h2 wrapper | paragraphs | CTAs | QR + badges), not columns. If descending landed on a
  // heading-only child, the wrapper itself is the text column.
  if (wrapper && heading && textCol && textCol.contains(heading)
    && !textCol.querySelector('p, a, img, video, picture')) {
    cols = [wrapper];
    textCol = wrapper;
  }
  const mediaCol = cols.find((c) => c !== textCol && hasMedia(c)
    && !c.querySelector('h1, h2, h3')) || null;
  // Further text columns (product "Digital sempre | Físico quando você quiser")
  const extraTextCols = cols.filter((c) => c !== textCol && c !== mediaCol
    && c.querySelector('h1, h2, h3'));

  // ---- Text column(s)
  const textCell = textCol ? buildTextCell(textCol, heading, document) : [];
  const extraTextCells = extraTextCols
    .map((c) => buildTextCell(c, c.querySelector('h1, h2, h3'), document))
    .filter((cell) => cell.length);

  // ---- Media column
  const mediaCell = mediaCol ? buildMediaCell(mediaCol, document) : [];

  if (!textCell.length && !mediaCell.length && !extraTextCells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const row = [textCell.length ? textCell : '', ...extraTextCells];
  if (mediaCell.length || !extraTextCells.length) row.push(mediaCell.length ? mediaCell : '');
  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-feature', cells });
  element.replaceWith(block);
}
