import { toClassName } from '../../scripts/aem.js';

let tabsCount = 0;

/**
 * Activates a tab and its panel, deactivating the others.
 * @param {Element} block tabs block
 * @param {HTMLButtonElement} button tab to activate
 * @param {boolean} focus move focus to the tab
 */
function activate(block, button, focus = false) {
  block.querySelectorAll(':scope > .tabs-list > [role=tab]').forEach((tab) => {
    const selected = tab === button;
    tab.setAttribute('aria-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
    const panel = block.querySelector(`#${tab.getAttribute('aria-controls')}`);
    if (panel) panel.setAttribute('aria-hidden', !selected);
  });
  if (focus) button.focus();
}

/**
 * Tabs block.
 * Content contract: each row is one tab.
 *   cell 1: tab label
 *   cell 2: panel content (rich text, links, form fragment link…)
 *   cell 3 (optional): panel media (picture) — rendered as a second column
 * @param {Element} block The block element
 */
export default function decorate(block) {
  tabsCount += 1;
  const prefix = `tabs-${tabsCount}`;
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const used = new Set();
  [...block.children].forEach((row, i) => {
    const [labelCell, ...contentCells] = [...row.children];
    if (!labelCell) {
      row.remove();
      return;
    }
    let id = `${prefix}-${toClassName(labelCell.textContent) || i}`;
    if (used.has(id)) id = `${id}-${i}`;
    used.add(id);

    // panel
    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${id}-tab`);
    panel.tabIndex = 0;
    contentCells.forEach((cell) => {
      const onlyPicture = cell.children.length === 1 && cell.querySelector(':scope > picture, :scope > p > picture');
      cell.className = onlyPicture ? 'tabs-panel-media' : 'tabs-panel-content';
      panel.append(cell);
    });
    if (panel.children.length > 1) panel.classList.add('tabs-panel-split');

    // tab button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `${id}-tab`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    const paragraphs = labelCell.querySelectorAll(':scope > p');
    if (paragraphs.length === 1 && labelCell.children.length === 1) {
      button.append(...paragraphs[0].childNodes);
    } else {
      button.append(...labelCell.childNodes);
    }
    button.addEventListener('click', () => activate(block, button));
    tablist.append(button);

    row.replaceWith(panel);
  });

  // arrow-key navigation (WAI-ARIA tabs pattern)
  tablist.addEventListener('keydown', (e) => {
    const tabs = [...tablist.children];
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') [next] = tabs;
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      activate(block, next, true);
    }
  });

  block.prepend(tablist);
  // a single tab needs no tab strip
  if (tablist.children.length < 2) tablist.hidden = true;
  if (tablist.firstElementChild) activate(block, tablist.firstElementChild);
}
