import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveImageInstrumentation, moveInstrumentation } from '../../scripts/scripts.js';

const VIDEO_RE = /\.(webm|mp4|mov)(\?.*)?$/i;

function isMediaOnly(el) {
  // only pictures, or picture-links (badges) whose text is just alt/label text
  const clone = el.cloneNode(true);
  clone.querySelectorAll('a').forEach((a) => {
    if (a.querySelector('picture')) a.remove();
  });
  return clone.textContent.trim() === '';
}

/** Only same-origin (media bus) images can use the optimization query params. */
function isLocalImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Optimizes local pictures; external ones (e.g. /_next/image?url=...) are kept as authored. */
function optimizePictures(container, breakpoints) {
  container.querySelectorAll('picture > img').forEach((img) => {
    if (isLocalImage(img.src)) {
      const optimized = createOptimizedPicture(img.src, img.alt, false, breakpoints);
      moveImageInstrumentation(img, optimized);
      img.closest('picture').replaceWith(optimized);
    } else {
      img.setAttribute('loading', 'lazy');
    }
  });
}

/** Link text that is just the URL is not a meaningful label. */
function videoLabel(link) {
  const text = link.textContent.trim();
  if (!text || text === link.href || VIDEO_RE.test(text)) return '';
  return text;
}

function buildVideo(link, poster) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = document.createElement('video');
  video.muted = true;
  video.setAttribute('muted', '');
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'none';
  if (reducedMotion) {
    video.controls = true;
  } else {
    video.setAttribute('autoplay', '');
  }
  const label = videoLabel(link);
  if (label) video.setAttribute('aria-label', label);
  else if (!reducedMotion) video.setAttribute('aria-hidden', 'true'); // decorative animation
  else video.setAttribute('aria-label', 'Video');
  if (poster) video.poster = poster;

  const ext = link.href.split('?')[0].split('.').pop().toLowerCase();
  const type = ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
  // defer the download until the video is near the viewport
  const load = () => {
    const source = document.createElement('source');
    source.src = link.href;
    source.type = type;
    video.append(source);
    video.load();
    if (!reducedMotion) video.play().catch(() => {});
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '200px' });
    observer.observe(video);
  } else {
    load();
  }
  return video;
}

function decorateMediaCol(col) {
  col.classList.add('columns-feature-media-col');
  const videoLink = [...col.querySelectorAll('a')].find((a) => VIDEO_RE.test(a.href));
  if (videoLink) {
    // an optional picture in the same cell becomes the poster frame
    const posterImg = col.querySelector('img');
    const video = buildVideo(videoLink, posterImg ? posterImg.src : '');
    col.replaceChildren(video);
    return;
  }
  optimizePictures(col, [{ media: '(min-width: 900px)', width: '1000' }, { width: '750' }]);
  // unwrap paragraphs left around the illustration
  col.querySelectorAll(':scope > p').forEach((p) => {
    const picture = p.querySelector('picture');
    if (!picture || p.textContent.trim() !== '') return;
    if (!picture.hasAttribute('data-aue-resource')) moveInstrumentation(p, picture);
    p.replaceWith(...p.childNodes);
  });
}

/** A paragraph whose only content is a single text link (a CTA). */
function isLinkOnly(p) {
  if (p.tagName !== 'P' || p.querySelector('picture, img')) return false;
  const links = p.querySelectorAll('a[href]');
  return links.length === 1 && p.textContent.trim() === links[0].textContent.trim();
}

/** Wraps runs of consecutive children matching `test` into a div with `className`. */
function groupChildren(col, test, className) {
  let group = null;
  [...col.children].forEach((child) => {
    if (test(child)) {
      if (!group) {
        group = document.createElement('div');
        group.className = className;
        child.before(group);
      }
      group.append(child);
    } else {
      group = null;
    }
  });
}

function decorateTextCol(col) {
  col.classList.add('columns-feature-text-col');
  // QR code and store badges are small images
  optimizePictures(col, [{ width: '256' }]);

  // CTA links: first is the primary action, the rest are secondary (outlined)
  let ctaIndex = 0;
  [...col.children].forEach((child) => {
    if (!isLinkOnly(child)) return;
    const a = child.querySelector('a');
    if (!a.classList.contains('button')) {
      a.classList.add('button', ctaIndex === 0 ? 'primary' : 'secondary');
      child.className = 'button-wrapper';
    }
    ctaIndex += 1;
  });
  groupChildren(col, (el) => el.matches('p.button-wrapper'), 'columns-feature-ctas');

  // group consecutive image-only paragraphs (QR code, app-store badges) into one inline row
  groupChildren(
    col,
    (el) => el.tagName === 'P' && el.querySelector('picture') && isMediaOnly(el),
    'columns-feature-badges',
  );
  // linked pictures are store badges; a bare picture is the QR code
  col.querySelectorAll('.columns-feature-badges > p').forEach((p) => {
    p.classList.add(p.querySelector('a') ? 'columns-feature-store' : 'columns-feature-qr');
  });
}

/**
 * loads and decorates the columns-feature block
 * Text column (heading, copy, CTAs, badges) beside an illustration or video.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  block.classList.add(`columns-feature-${cols}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-feature-row');
    [...row.children].forEach((col) => {
      const hasVideo = [...col.querySelectorAll('a')].some((a) => VIDEO_RE.test(a.href));
      const mediaOnly = col.querySelector('picture') && col.textContent.trim() === '';
      if (hasVideo || mediaOnly) decorateMediaCol(col);
      else if (col.textContent.trim() === '' && !col.children.length) col.remove();
      else decorateTextCol(col);
    });
  });

  // layout flavour, derived from the authored content (no variant class required)
  const textCols = block.querySelectorAll('.columns-feature-text-col').length;
  const mediaCols = block.querySelectorAll('.columns-feature-media-col').length;
  const hasBadges = !!block.querySelector('.columns-feature-badges');
  const hasVideo = !!block.querySelector('.columns-feature-media-col video');
  if (!mediaCols && textCols === 1) {
    // single app-download call-out (heading, copy, CTAs, QR/badges), centered
    block.classList.add('columns-feature-centered');
  } else if (!mediaCols && textCols > 1) {
    // two text columns side by side (e.g. "Digital sempre" / "Físico quando você quiser")
    block.classList.add('columns-feature-text-only');
  } else if (mediaCols && !hasBadges && !hasVideo) {
    // compact intro: smaller heading + copy + CTA beside a rounded image
    block.classList.add('columns-feature-intro');
  }
}
