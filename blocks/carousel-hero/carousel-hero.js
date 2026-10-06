import { createOptimizedPicture } from '../../scripts/aem.js';

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;
  block.querySelectorAll('.carousel-hero-slide').forEach((slide, idx) => {
    const active = idx === slideIndex;
    slide.setAttribute('aria-hidden', !active);
    slide.querySelectorAll('a').forEach((link) => {
      if (active) link.removeAttribute('tabindex');
      else link.setAttribute('tabindex', '-1');
    });
  });
  block.querySelectorAll('.carousel-hero-indicator button').forEach((button, idx) => {
    if (idx === slideIndex) {
      button.setAttribute('aria-current', 'true');
      button.disabled = true;
    } else {
      button.removeAttribute('aria-current');
      button.disabled = false;
    }
  });
}

function showSlide(block, slideIndex) {
  const slides = block.querySelectorAll('.carousel-hero-slide');
  if (!slides.length) return;
  let index = slideIndex;
  if (index < 0) index = slides.length - 1;
  if (index >= slides.length) index = 0;
  const track = block.querySelector('.carousel-hero-slides');
  // relative to the first slide so track padding (peek layout) is ignored
  track.scrollTo({ top: 0, left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: 'smooth' });
  updateActiveSlide(block, index);
}

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
function buildPicture(img, eager, breakpoints) {
  if (isLocalImage(img.src)) return createOptimizedPicture(img.src, img.alt, eager, breakpoints);
  const picture = img.closest('picture') || document.createElement('picture');
  if (!picture.contains(img)) picture.append(img);
  img.setAttribute('loading', eager ? 'eager' : 'lazy');
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
 * Builds one art-directed picture: first authored picture = desktop,
 * optional second picture = mobile. Only the matching image is downloaded.
 */
function buildSlidePicture(pictures, eager) {
  const imgs = pictures.map((p) => p.querySelector('img')).filter(Boolean);
  const [desktop, mobile] = imgs;
  if (!desktop) return null;
  if (!mobile) {
    return buildPicture(desktop, eager, [{ media: DESKTOP_MEDIA, width: '2000' }, { width: '900' }]);
  }
  if (!mobile.alt && desktop.alt) mobile.alt = desktop.alt;
  const picture = buildPicture(mobile, eager, [{ width: '900' }]);
  picture.prepend(...desktopSources(desktop, '2000'));
  return picture;
}

function decorateImageCell(cell, eager) {
  cell.className = 'carousel-hero-slide-image';
  const pictures = [...cell.querySelectorAll('picture')];
  const link = pictures[0] && pictures[0].closest('a');
  const picture = buildSlidePicture(pictures, eager);
  if (!picture) return;
  if (link) {
    // slide-wide link authored around the image: keep it
    const anchor = link.cloneNode(false);
    anchor.append(picture);
    cell.replaceChildren(anchor);
  } else {
    cell.replaceChildren(picture);
  }
}

/** Tags content roles (eyebrow, title lines, CTA) so styling doesn't depend on order. */
function decorateContentCell(cell) {
  cell.className = 'carousel-hero-slide-content';
  const children = [...cell.children];
  children.forEach((el) => {
    if (el.tagName !== 'P') return;
    const { firstElementChild: child } = el;
    const only = el.children.length === 1 && el.textContent.trim() === child.textContent.trim()
      ? child : null;
    if (only && only.tagName === 'A') {
      el.classList.add('carousel-hero-cta');
      only.classList.add('carousel-hero-cta-link');
    } else if (only && only.tagName === 'STRONG') {
      // bold-only paragraphs act as title lines
      el.classList.add('carousel-hero-title');
    }
  });
  const [first] = children;
  if (first && first.tagName === 'P' && children.length > 1 && !first.className) {
    first.classList.add('carousel-hero-eyebrow');
  }
}

function createSlide(row, idx, carouselId) {
  const slide = document.createElement('li');
  slide.className = 'carousel-hero-slide';
  slide.dataset.slideIndex = idx;
  slide.id = `carousel-hero-${carouselId}-slide-${idx}`;

  const cells = [...row.children];
  const imageCell = cells.find((c) => c.querySelector('picture'));
  const contentCells = cells.filter((c) => c !== imageCell && c.textContent.trim() !== '');

  if (imageCell) {
    // only the first slide's image is an LCP candidate
    decorateImageCell(imageCell, idx === 0);
    slide.append(imageCell);
  }
  // image-only slides (copy baked into the artwork) show the whole image
  if (!contentCells.length) slide.classList.add('carousel-hero-slide-image-only');
  contentCells.forEach((cell) => {
    decorateContentCell(cell);
    slide.append(cell);
  });

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);
  return slide;
}

let carouselCount = 0;

/**
 * loads and decorates the carousel-hero block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  carouselCount += 1;
  const carouselId = carouselCount;
  const rows = [...block.children];

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.className = 'carousel-hero-slides-container';
  const track = document.createElement('ul');
  track.className = 'carousel-hero-slides';

  rows.forEach((row, idx) => {
    track.append(createSlide(row, idx, carouselId));
    row.remove();
  });
  container.append(track);
  block.replaceChildren(container);

  if (rows.length < 2) return;

  // controls: prev arrow, dots, next arrow (grouped together, centered under slides)
  const controls = document.createElement('div');
  controls.className = 'carousel-hero-controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-hero-prev';
  prev.setAttribute('aria-label', 'Previous slide');

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-hero-next';
  next.setAttribute('aria-label', 'Next slide');

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Carousel slide controls');
  const indicators = document.createElement('ol');
  indicators.className = 'carousel-hero-indicators';
  rows.forEach((_, idx) => {
    const li = document.createElement('li');
    li.className = 'carousel-hero-indicator';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show slide ${idx + 1} of ${rows.length}`);
    button.addEventListener('click', () => showSlide(block, idx));
    li.append(button);
    indicators.append(li);
  });
  nav.append(indicators);
  controls.append(prev, nav, next);
  container.append(controls);

  prev.addEventListener('click', () => showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1));
  next.addEventListener('click', () => showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { root: track, threshold: 0.6 });
  track.querySelectorAll('.carousel-hero-slide').forEach((slide) => observer.observe(slide));

  updateActiveSlide(block, 0);
}
