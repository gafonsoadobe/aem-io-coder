const FILTER_ID = 'footer-goo';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

const CHEVRON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M396 235L269.3 354.2c-4.2 4.2-9.2 5.8-13.3 5.8c-5 0-10-1.7-14.2-5L115.2 235c-8.3-7.5-8.3-20-.8-28.3s20-8.3 28.3-.8L256 312.5 368.5 205.8c8.3-7.5 20.8-7.5 28.3 .8s7.5 20.8-.8 28.3z"/></svg>';

/**
 * Fetches the footer fragment. Tries the local content tree first, then the
 * site root (DA/EDS). Relative image paths are resolved against the fragment URL.
 * @returns {Promise<HTMLElement|null>} container holding the fragment sections
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  container.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, resp.url).href;
    img.loading = 'lazy';
  });
  return container;
}

/**
 * Adds the SVG "goo" filter (blur + alpha threshold) once per page; it rounds
 * the corners of the clipped footer panel.
 * @param {Element} block footer block that hosts the filter
 */
function addGooFilter(block) {
  if (document.getElementById(FILTER_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'footer-filter');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<defs><filter id="${FILTER_ID}">
    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="goo"/>
    <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
  </filter></defs>`;
  block.append(svg);
}

/**
 * Classifies a fragment section by its content.
 * @param {Element} section fragment section
 * @returns {string} section class name
 */
function classify(section) {
  const links = [...section.querySelectorAll('a')];
  if (section.querySelector('li > ul')) return 'footer-links';
  if (links.length && links.every((a) => a.querySelector('img') && !a.textContent.trim())) return 'footer-social';
  if (!links.length && section.querySelector('img')) return 'footer-media';
  if (section.querySelector(':scope > ul > li > p')) return 'footer-contacts';
  if (section.querySelector('h1, h2, h3, h4, h5, h6')) return 'footer-help';
  return 'footer-legal';
}

/**
 * Turns each top-level item of a link-group list into a titled group whose
 * title toggles its links (accordion on mobile, always open on desktop).
 * @param {Element} section footer-links section
 */
function decorateLinkGroups(section) {
  section.querySelectorAll(':scope > ul > li').forEach((li, i) => {
    li.classList.add('footer-group');
    const title = li.querySelector(':scope > p');
    const list = li.querySelector(':scope > ul');
    if (!title || !list) return;
    title.classList.add('footer-group-title');
    list.id = `footer-group-${i}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'footer-group-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', list.id);
    const label = document.createElement('span');
    label.append(...title.childNodes);
    const icon = document.createElement('span');
    icon.className = 'footer-group-icon';
    icon.innerHTML = CHEVRON_SVG;
    toggle.append(label, icon);
    title.append(toggle);
    // groups open independently of each other
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      li.classList.toggle('is-open', open);
    });
  });
}

/**
 * On desktop the group titles are static headings; on mobile they are toggles.
 * @param {Element} block footer block
 */
function syncGroupToggles(block) {
  block.querySelectorAll('.footer-group-toggle').forEach((toggle) => {
    toggle.disabled = isDesktop.matches;
    if (isDesktop.matches) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.closest('.footer-group').classList.remove('is-open');
    }
  });
}

/**
 * Applies authored link options: a "#_blank" suffix opens the link in a new tab.
 * Phone links get a plain-text twin; CSS shows the text on desktop and the
 * tap-to-call link on mobile.
 * @param {Element} root footer root
 */
function decorateLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href.endsWith('#_blank')) {
      a.setAttribute('href', href.slice(0, -'#_blank'.length));
      a.target = '_blank';
      a.rel = 'noopener';
    }
    if (a.getAttribute('href').startsWith('tel:')) {
      a.classList.add('footer-phone-link');
      const text = document.createElement('span');
      text.className = 'footer-phone-text';
      text.textContent = a.textContent;
      a.after(text);
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  if (!fragment) return;
  block.textContent = '';

  const panel = document.createElement('div');
  panel.className = 'footer-panel';

  // a section that starts with a heading opens a new column
  let column;
  [...fragment.children].forEach((src, i) => {
    const startsWithHeading = /^H[1-6]$/.test(src.firstElementChild?.tagName || '');
    if (!column || startsWithHeading) {
      column = document.createElement('div');
      column.className = 'footer-column';
      panel.append(column);
    }
    const section = document.createElement('div');
    // the first section is the highlighted help card
    section.className = `footer-section ${i === 0 ? 'footer-card' : classify(src)}`;
    section.append(...src.childNodes);
    if (section.classList.contains('footer-links')) decorateLinkGroups(section);
    column.append(section);
  });

  decorateLinks(panel);

  const shape = document.createElement('div');
  shape.className = 'footer-shape';
  shape.append(panel);
  block.append(shape);
  addGooFilter(block);

  syncGroupToggles(block);
  isDesktop.addEventListener('change', () => syncGroupToggles(block));
}
