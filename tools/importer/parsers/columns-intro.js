/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-intro. Base: columns.
 * Source: https://agibank.com.br/ (main > section.hide-captcha > section:nth-of-type(2))
 * Structure: 1 row x 2 columns -> [image | heading + paragraph].
 * Selectors verified in migration-work/block-context/columns-intro/source.html:
 *   div[class*="bg-[url("]       -> photo panel(s) (desktop .card-verde-home + mobile duplicate, same image)
 *   h2 / p inside the text panel -> heading and subheading
 * On the live page the photo is a CSS background (Tailwind bg-[url('...')]), so an <img>
 * is created from the class/inline style when no <img> is present.
 */
function bgUrlFrom(el, document) {
  const cls = el.getAttribute('class') || '';
  let m = cls.match(/bg-\[url\(['"]?([^'")\]]+)['"]?\)\]/);
  if (!m) m = (el.getAttribute('style') || '').match(/background(?:-image)?\s*:[^;]*url\(['"]?([^'")]+)['"]?\)/);
  if (!m) {
    try {
      const view = document.defaultView || window;
      const bg = view.getComputedStyle(el).backgroundImage || '';
      m = bg.match(/url\(['"]?([^'")]+)['"]?\)/);
    } catch (e) { /* no computed style available */ }
  }
  return m ? m[1] : null;
}

export default function parse(element, { document }) {
  // Image column
  const panels = [...element.querySelectorAll('div[class*="bg-[url("], .card-verde-home')];
  const imageCell = [];
  const seen = new Set();
  panels.forEach((panel) => {
    let img = panel.querySelector('img:not([src^="data:"])');
    const url = img ? img.getAttribute('src') : bgUrlFrom(panel, document);
    if (!url || seen.has(url)) return;
    // de-dupe by background url too (desktop and mobile panel share the same image)
    const bg = bgUrlFrom(panel, document);
    if (bg && seen.has(bg)) return;
    seen.add(url);
    if (bg) seen.add(bg);
    if (!img) {
      img = document.createElement('img');
      img.src = url;
    }
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
    imageCell.push(img);
  });

  // Text column
  const textCell = [];
  const heading = element.querySelector('h1, h2, h3');
  if (heading) textCell.push(heading);
  const textRoot = heading ? heading.parentElement : element;
  [...textRoot.querySelectorAll('p')].forEach((p) => {
    if (p.textContent.trim()) textCell.push(p);
  });

  if (!heading && !textCell.length && !imageCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[imageCell.length ? imageCell : '', textCell.length ? textCell : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-intro', cells });
  element.replaceWith(block);
}
