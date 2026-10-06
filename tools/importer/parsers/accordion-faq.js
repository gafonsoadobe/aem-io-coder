/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://agibank.com.br/conta-corrente
 *   main > section[class="px-auto my-16 overflow-hidden md:my-[60px]"]
 * Structure (blocks/accordion-faq): 2 columns, one row per item -> [question | answer].
 * Selectors verified in migration-work/block-context/accordion-faq/source.html:
 *   div.max-w-[768px] > div            -> FAQ item (iterated via the button's parent wrapper)
 *   item > button p                    -> question text
 *   item > button + div (panel)        -> answer; layout wrapper li.list-none > div is unwrapped,
 *                                         answer paragraphs / lists / links are kept as-is
 * Content outside the items (h2 "Ficou com dúvida? A gente te ajuda!", intro p, trailing
 * "Quer perguntar mais alguma coisa?" h2 / p / WhatsApp CTA) is kept as default content:
 * placed before the block when it precedes the items, after otherwise.
 */
function cleanText(node) {
  return node.textContent.replace(/\s+/g, ' ').trim();
}

function collectDefaultContent(element, items, document) {
  const before = [];
  const after = [];
  const nodes = [...element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a[href]')]
    .filter((n) => !items.some((it) => it.contains(n)));
  nodes.forEach((n) => {
    // eslint-disable-next-line no-bitwise
    const bucket = (n.compareDocumentPosition(items[0]) & 4) ? before : after;
    const tag = n.tagName.toLowerCase();
    if (tag === 'a') {
      if (n.closest('p, h1, h2, h3, h4, h5, h6')) return;
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
    if (/^h[1-6]$/.test(tag)) {
      n.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      const h = document.createElement(tag);
      h.textContent = cleanText(n);
      bucket.push(h);
    } else {
      bucket.push(n);
    }
  });
  return { before, after };
}

/** Unwraps the layout-only li.list-none > div wrapper(s) and returns the answer nodes. */
function answerNodes(panel) {
  let root = panel;
  // descend through single-child layout wrappers (div / list-none li)
  while (root.children.length === 1 && !root.matches('p, ul, ol')
    && ['DIV', 'LI'].includes(root.firstElementChild.tagName)) {
    root = root.firstElementChild;
  }
  let nodes = [...root.children].filter((n) => cleanText(n) || n.querySelector('img'));
  // several wrapper li's (one per answer block): flatten their contents
  if (nodes.length && nodes.every((n) => n.tagName === 'LI' && /list-none/.test(n.className || ''))) {
    nodes = nodes.flatMap((li) => {
      const inner = li.children.length === 1 && li.firstElementChild.tagName === 'DIV' ? li.firstElementChild : li;
      return [...inner.children].filter((n) => cleanText(n));
    });
  }
  // drop trailing layout <br>s inside answer paragraphs / list items
  nodes.forEach((n) => {
    [n, ...n.querySelectorAll('p, li')].forEach((el) => {
      while (el.lastChild && (el.lastChild.nodeName === 'BR'
        || (el.lastChild.nodeType === 3 && !el.lastChild.textContent.trim()))) {
        el.lastChild.remove();
      }
    });
  });
  if (!nodes.length && cleanText(root)) {
    const p = root.ownerDocument.createElement('p');
    p.textContent = cleanText(root);
    nodes = [p];
  }
  return nodes;
}

export default function parse(element, { document }) {
  // Iterate the item wrappers (button parents), not the buttons themselves
  let items = [...element.querySelectorAll('button')]
    .map((b) => b.parentElement)
    .filter((it, i, arr) => it && it !== element && arr.indexOf(it) === i);
  if (!items.length) {
    items = [...element.querySelectorAll('details')];
  }

  const cells = [];
  items.forEach((item) => {
    const button = item.querySelector(':scope > button, :scope > summary');
    if (!button) return;
    const question = cleanText(button.querySelector('p, h3, h4, span') || button);
    const panel = button.nextElementSibling;
    const answer = panel ? answerNodes(panel) : [];
    if (!question && !answer.length) return;
    cells.push([question, answer.length ? answer : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const { before, after } = collectDefaultContent(element, items, document);
  if (before.length) element.before(...before);
  if (after.length) element.after(...after);

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
