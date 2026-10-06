/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Agibank slice-based section breaks (product pages).
 *
 * Product pages (e.g. https://agibank.com.br/conta-corrente) are a flat list of
 * Prismic slice components rendered as top-level `main > section` elements whose
 * order varies per page (verified in migration-work/cleaned.html: hero
 * `section.overflow-hidden.bg-primary-100`, `section.py-8.bg-white`, FAQ
 * `section.px-auto.my-16`, ... followed by an empty trailing `<section></section>`).
 *
 * In beforeTransform (before block parsers replace the section elements):
 *  - remove empty top-level sections (no text and no media)
 *  - insert an <hr> section break before every remaining top-level section
 *    except the first.
 * No Section Metadata is produced.
 */
const MEDIA_SELECTOR = 'img, picture, video, iframe, svg, table';

// Prismic slices rendered with centered blue intro copy on the source
const CENTERED_SLICES = ['vantagens', 'faq', 'what_is', 'cards_produtos', 'benefit_cards', 'feature_cards_carousel', 'comparison_cards', 'informacao_adicional_do_produto'];

function isEmptySection(section) {
  return !section.textContent.trim() && !section.querySelector(MEDIA_SELECTOR);
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    const main = element.matches && element.matches('main')
      ? element
      : element.querySelector('main');
    if (!main) return;

    // Some pages (e.g. /en, /fale-conosco/*) wrap their slices in a single
    // `section.hide-captcha`; use the wrapper's children as the slice list.
    const wrapper = main.querySelector(':scope > section.hide-captcha');
    const container = wrapper || main;
    const sections = [...container.children].filter((el) => el.tagName === 'SECTION');

    const visible = [];
    sections.forEach((section) => {
      if (isEmptySection(section)) {
        section.remove();
      } else {
        visible.push(section);
      }
    });

    const doc = container.ownerDocument;
    visible.forEach((section, i) => {
      // slices whose intro copy is centered blue on the source get a section style;
      // the metadata sits after the slice so block parsers replacing it keep it
      if (CENTERED_SLICES.includes(section.getAttribute('data-slice-type'))) {
        const meta = WebImporter.Blocks.createBlock(doc, {
          name: 'Section Metadata',
          cells: { style: 'centered' },
        });
        section.after(meta);
      }
      if (i === 0) return;
      const hr = doc.createElement('hr');
      section.before(hr);
    });
  }

  if (hookName === 'afterTransform') {
    // standalone CTA links in default content become EDS buttons (<strong><a>)
    const doc = element.ownerDocument;
    element.querySelectorAll('p > a[href]').forEach((a) => {
      const p = a.parentElement;
      if (a.closest('table, strong, em') || a.querySelector('img, picture')) return;
      if (p.textContent.trim() !== a.textContent.trim() || !a.textContent.trim()) return;
      const strong = doc.createElement('strong');
      a.replaceWith(strong);
      strong.append(a);
    });
  }
}
