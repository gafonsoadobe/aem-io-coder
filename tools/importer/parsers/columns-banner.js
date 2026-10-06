/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-banner. Base: columns.
 * Sources:
 *   https://agibank.com.br/ (home: main > section.hide-captcha > section:nth-of-type(7))
 *   https://agibank.com.br/conta-corrente (product-detail):
 *     main > section[class="mt-6 flex flex-col items-center justify-center md:mb-4"]:has(img)
 * Structure: 1 row x 2 columns
 *   home:            [heading + CTA | desktop image + mobile image]
 *   product-detail:  [photo | heading + text + CTA]  (photo precedes the angled panel in the DOM;
 *                    the block marks image-first rows with .columns-banner-img-first)
 * Selectors verified in migration-work/templates/home/block-context/columns-banner/source.html
 * and migration-work/block-context/columns-banner/source.html:
 *   h2                             -> heading (blue panel)
 *   a[href] with text              -> CTA "Conheça o Agibank"
 *   img.md\:block / img.md\:hidden -> desktop / mobile image (desktop first)
 *   img.object-cover (product)     -> single photo, placed first when it precedes the heading
 * Also validated on /seguros and /emprestimo-consignado-servidor-publico.
 * Decorative data: images (clip-path filter svg) are ignored.
 */
export default function parse(element, { document }) {
  const isReal = (img) => !(img.getAttribute('src') || '').startsWith('data:');

  // ---- Text column
  const textCell = [];
  const heading = element.querySelector('h1, h2, h3');
  if (heading) textCell.push(heading);
  [...element.querySelectorAll('p')].forEach((p) => {
    if (p.textContent.trim() && !p.closest('a')) textCell.push(p);
  });
  [...element.querySelectorAll('a[href]')].forEach((a) => {
    const text = a.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    const p = document.createElement('p');
    p.append(link);
    textCell.push(p);
  });

  // ---- Image column: desktop first, then mobile
  const imgs = [...element.querySelectorAll('img')].filter(isReal);
  let desktop = imgs.find((img) => /(^|\s)md:block(\s|$)/.test(img.className));
  let mobile = imgs.find((img) => /(^|\s)md:hidden(\s|$)/.test(img.className));
  if (!desktop) desktop = imgs.find((img) => img !== mobile);
  if (!mobile) mobile = imgs.find((img) => img !== desktop);
  const imageCell = [];
  if (desktop) imageCell.push(desktop);
  if (mobile && mobile !== desktop) imageCell.push(mobile);

  if (!textCell.length && !imageCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Image-first when the photo precedes the heading in document order (product-detail banner)
  const imageFirst = !!(heading && imageCell.length
    && (imageCell[0].compareDocumentPosition(heading) & 4)); // eslint-disable-line no-bitwise
  const textOut = textCell.length ? textCell : '';
  const imageOut = imageCell.length ? imageCell : '';
  const cells = [imageFirst ? [imageOut, textOut] : [textOut, imageOut]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-banner', cells });
  element.replaceWith(block);
}
