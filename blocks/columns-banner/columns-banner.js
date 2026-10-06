import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveImageInstrumentation, moveInstrumentation } from '../../scripts/scripts.js';

const DESKTOP_MEDIA = '(min-width: 900px)';

/** Only same-origin (media bus) images can use the optimization query params. */
function isLocalImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Optimized picture for local images; external/data images are kept as authored. */
function buildPicture(img, breakpoints) {
  if (isLocalImage(img.src)) return createOptimizedPicture(img.src, img.alt, false, breakpoints);
  const picture = img.closest('picture') || document.createElement('picture');
  if (!picture.contains(img)) picture.append(img);
  img.setAttribute('loading', 'lazy');
  return picture;
}

/** <source> elements that swap in the desktop image above the desktop breakpoint. */
function desktopSources(img, width) {
  const make = (srcset, type) => {
    const source = document.createElement('source');
    source.setAttribute('media', DESKTOP_MEDIA);
    if (type) source.setAttribute('type', type);
    source.setAttribute('srcset', srcset);
    return source;
  };
  if (!isLocalImage(img.src)) return [make(img.src)];
  const { pathname } = new URL(img.src, window.location.href);
  const ext = pathname.split('.').pop();
  return [
    make(`${pathname}?width=${width}&format=webply&optimize=medium`, 'image/webp'),
    make(`${pathname}?width=${width}&format=${ext}&optimize=medium`),
  ];
}

/**
 * One art-directed picture from the cell's pictures:
 * first = desktop, optional second = mobile. Only the matching image is downloaded.
 */
function buildBannerPicture(pictures) {
  const [desktop, mobile] = pictures.map((p) => p.querySelector('img')).filter(Boolean);
  if (!desktop) return null;
  if (!mobile) {
    return buildPicture(desktop, [{ media: DESKTOP_MEDIA, width: '1200' }, { width: '750' }]);
  }
  if (!mobile.alt && desktop.alt) mobile.alt = desktop.alt;
  const picture = buildPicture(mobile, [{ width: '750' }]);
  picture.prepend(...desktopSources(desktop, '1200'));
  return picture;
}

const GOO_FILTER_ID = 'columns-banner-goo';

/**
 * Adds (once per page) the SVG "goo" filter that rounds the corners of the
 * angled panel, matching the source site's blur + alpha-threshold filter.
 * @param {Element} block The block element
 */
function addGooFilter(block) {
  if (document.getElementById(GOO_FILTER_ID)) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg class="columns-banner-filter" aria-hidden="true" focusable="false" width="0" height="0">
    <defs>
      <filter id="${GOO_FILTER_ID}">
        <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur"></feGaussianBlur>
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="goo"></feColorMatrix>
        <feComposite in="SourceGraphic" in2="goo" operator="atop"></feComposite>
      </filter>
    </defs>
  </svg>`;
  block.append(holder.firstElementChild);
}

/**
 * loads and decorates the columns-banner block
 * Angled text panel (heading + CTA) overlapping a photo.
 * The image cell may hold two pictures: desktop first, mobile second.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  block.classList.add(`columns-banner-${cols}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-banner-row');
    [...row.children].forEach((col) => {
      const pictures = [...col.querySelectorAll('picture')];
      if (pictures.length && col.textContent.trim() === '') {
        col.classList.add('columns-banner-img-col');
        const desktopImg = pictures[0].querySelector('img');
        const wrapper = pictures[0].parentElement;
        const picture = buildBannerPicture(pictures);
        if (picture) {
          // the rendered <img> stands for the desktop image (the editor's default viewport)
          moveImageInstrumentation(desktopImg, picture);
          if (wrapper.tagName === 'P' && !picture.hasAttribute('data-aue-resource')) {
            moveInstrumentation(wrapper, picture);
          }
          col.replaceChildren(picture);
        }
        // a text-first row places the panel left; an image-first row mirrors it
        if (col === row.firstElementChild) row.classList.add('columns-banner-img-first');
      } else if (col.textContent.trim() === '' && !col.children.length) {
        col.remove();
      } else {
        col.classList.add('columns-banner-text-col');
        // a paragraph holding only a link is the panel's call-to-action
        col.querySelectorAll(':scope > p').forEach((p) => {
          const link = p.querySelector('a');
          if (link && p.textContent.trim() === link.textContent.trim()) {
            p.classList.add('columns-banner-cta');
          }
        });
      }
    });
  });

  // product-page variant: photo on the left, angled panel on the right
  if (block.querySelector('.columns-banner-img-first')) {
    block.classList.add('columns-banner-media-left');
  }

  addGooFilter(block);
}
