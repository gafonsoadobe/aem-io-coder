// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

const CHEVRON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M396 235L269.3 354.2c-4.2 4.2-9.2 5.8-13.3 5.8-5 0-10-1.7-14.2-5L115.2 235c-8.3-7.5-8.3-20-.8-28.3s20-8.3 28.3-.8L256 312.5 368.5 205.8c8.3-7.5 20.8-7.5 28.3 .8s7.5 20.8-.8 28.3z"/></svg>';

/**
 * Fetches the nav fragment. Tries the local content tree first, then the
 * site root (DA/EDS). Relative image paths are resolved against the fragment URL.
 * @returns {Promise<HTMLElement|null>} container holding the fragment sections
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  container.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, resp.url).href;
  });
  return container;
}

// panels are only attached to the DOM while open
const panels = new WeakMap();

/**
 * Opens or closes a top-level trigger and attaches/detaches its panel.
 * @param {Element} trigger nav trigger button
 * @param {boolean} open desired state
 */
function setTrigger(trigger, open) {
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  const panel = panels.get(trigger);
  if (!panel) return;
  if (open) {
    trigger.after(panel);
    trigger.setAttribute('aria-controls', panel.id);
  } else {
    panel.remove();
    trigger.removeAttribute('aria-controls');
  }
}

function createChevron(className) {
  const span = document.createElement('span');
  span.className = className;
  span.innerHTML = CHEVRON_SVG;
  return span;
}

/**
 * Returns the label element of a list item: its first direct paragraph or link.
 * @param {Element} li list item
 * @returns {Element|null}
 */
function getLabel(li) {
  return [...li.children].find((el) => el.tagName === 'P' || el.tagName === 'A') || null;
}

/**
 * Closes every open top-level panel in the header.
 * @param {Element} block header block
 * @param {Element} [except] trigger to keep open
 */
function closePanels(block, except) {
  block.querySelectorAll('.nav-trigger[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) setTrigger(btn, false);
  });
  const anyOpen = block.querySelector('.nav-trigger[aria-expanded="true"]');
  block.classList.toggle('panel-open', !!anyOpen);
}

/**
 * Builds a category entry (a panel item that owns a nested list).
 * @param {Element} li source list item with a nested ul
 * @param {string} id unique id for the sub list
 * @returns {Element} decorated list item
 */
function buildCategory(li, id) {
  const label = getLabel(li);
  const sub = li.querySelector(':scope > ul');
  const item = document.createElement('li');
  item.className = 'nav-panel-category';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-category-trigger';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', id);
  const text = document.createElement('span');
  text.textContent = label ? label.textContent.trim() : '';
  btn.append(text, createChevron('nav-category-chevron'));
  sub.id = id;
  sub.className = 'nav-panel-sublist';
  item.append(btn, sub);
  btn.addEventListener('click', () => {
    const list = item.closest('.nav-panel-list');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    list.querySelectorAll('.nav-category-trigger').forEach((other) => other.setAttribute('aria-expanded', 'false'));
    // on desktop a category stays selected; on mobile it toggles like an accordion
    btn.setAttribute('aria-expanded', isDesktop.matches || !expanded ? 'true' : 'false');
  });
  return item;
}

/**
 * Builds the top-level nav item: either a plain link or a trigger with a panel.
 * @param {Element} li source list item
 * @param {number} index position, used for ids
 * @returns {Element} decorated list item
 */
function buildNavItem(li, index) {
  const label = getLabel(li);
  const list = li.querySelector(':scope > ul');
  const item = document.createElement('li');
  item.className = 'nav-item';

  if (!list) {
    const link = li.querySelector('a');
    if (link) {
      link.classList.add('nav-link');
      item.append(link);
    }
    return item;
  }

  const panelId = `nav-panel-${index}`;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  const text = document.createElement('span');
  text.textContent = label ? label.textContent.trim() : '';
  trigger.append(text, createChevron('nav-chevron'));

  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  panel.id = panelId;
  const inner = document.createElement('div');
  inner.className = 'nav-panel-inner';

  const panelList = document.createElement('ul');
  panelList.className = 'nav-panel-list';
  [...list.children].forEach((child, i) => {
    if (child.querySelector(':scope > ul')) {
      panelList.append(buildCategory(child, `${panelId}-sub-${i}`));
    } else {
      const entry = document.createElement('li');
      const link = child.querySelector('a');
      if (link) entry.append(link);
      panelList.append(entry);
    }
  });
  inner.append(panelList);

  // any remaining copy (e.g. an intro paragraph) sits beside the list
  const extras = [...li.children].filter((el) => el !== label && el !== list);
  if (extras.length) {
    const intro = document.createElement('div');
    intro.className = 'nav-panel-intro';
    intro.append(...extras);
    inner.append(intro);
    inner.classList.add('nav-panel-has-intro');
  }

  panel.append(inner);
  panels.set(trigger, panel);
  item.append(trigger);
  return item;
}

/**
 * Opens or closes the mobile menu.
 * @param {Element} nav nav element
 * @param {Element} button hamburger button
 * @param {boolean} [force] desired state
 */
function toggleMenu(nav, button, force) {
  const expanded = force !== undefined ? !force : nav.getAttribute('aria-expanded') === 'true';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
  document.body.style.overflowY = !expanded && !isDesktop.matches ? 'hidden' : '';
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  if (!fragment) return;
  block.textContent = '';

  const sections = [...fragment.children];
  const brandSrc = sections.find((s) => s.querySelector('img'));
  const listSrc = sections.find((s) => s.querySelector(':scope > ul'));
  const toolsSrc = sections.find((s) => s !== brandSrc && s !== listSrc);

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandSrc) {
    const link = brandSrc.querySelector('a') || brandSrc.querySelector('img');
    const img = brandSrc.querySelector('img');
    if (img) {
      img.width = 80;
      img.height = 50;
      img.loading = 'eager';
    }
    brand.append(link);
  }

  // the nav landmark holds only the menu
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-sections';
  nav.setAttribute('aria-expanded', 'false');
  nav.setAttribute('aria-label', 'Menu principal');
  const navList = document.createElement('ul');
  navList.className = 'nav-list';
  if (listSrc) {
    [...listSrc.querySelector(':scope > ul').children].forEach((li, i) => navList.append(buildNavItem(li, i)));
  }
  nav.append(navList);

  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (toolsSrc) {
    const links = [...toolsSrc.querySelectorAll('a')];
    links.forEach((link, i) => {
      link.classList.add(i === links.length - 1 ? 'nav-cta' : 'nav-tool-link');
      tools.append(link);
    });
  }

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = '<button type="button" aria-controls="nav" aria-expanded="false" aria-label="Abrir menu"><span class="nav-hamburger-icon"></span></button>';
  const hamburgerButton = hamburger.querySelector('button');
  hamburgerButton.addEventListener('click', () => toggleMenu(nav, hamburgerButton));

  block.append(brand, nav, tools, hamburger);

  // top-level triggers toggle their panel
  navList.querySelectorAll('.nav-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      // open state follows the attached panel, not just the attribute
      const open = !!panels.get(trigger)?.isConnected;
      // one panel (desktop) or accordion section (mobile) open at a time
      closePanels(block, trigger);
      setTrigger(trigger, !open);
      block.classList.toggle('panel-open', !!block.querySelector('.nav-trigger[aria-expanded="true"]'));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    const open = block.querySelector('.nav-trigger[aria-expanded="true"]');
    if (isDesktop.matches && open) {
      closePanels(block);
      open.focus();
    } else if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, hamburgerButton, false);
      hamburgerButton.focus();
    }
  });

  // reset state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    closePanels(block);
    block.querySelectorAll('.nav-category-trigger').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
    toggleMenu(nav, hamburgerButton, false);
  });
}
