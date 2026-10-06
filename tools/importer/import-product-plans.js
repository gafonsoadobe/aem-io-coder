/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroProductParser from './parsers/hero-product.js';
import cardsProductParser from './parsers/cards-product.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import cardsStepsParser from './parsers/cards-steps.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import columnsBannerParser from './parsers/columns-banner.js';
import tableParser from './parsers/table.js';

// TRANSFORMER IMPORTS
import agibankCleanupTransformer from './transformers/agibank-cleanup.js';
import agibankSliceSectionsTransformer from './transformers/agibank-slice-sections.js';
import agibankLinksTransformer from './transformers/agibank-links.js';

// PARSER REGISTRY
const parsers = {
  'hero-product': heroProductParser,
  'cards-product': cardsProductParser,
  'columns-feature': columnsFeatureParser,
  'cards-steps': cardsStepsParser,
  'accordion-faq': accordionFaqParser,
  'columns-banner': columnsBannerParser,
  'table': tableParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "product-plans",
  "description": "Hero with lead form, benefit list, plan comparison cards and partner logo strip",
  "urls": [
    "https://agibank.com.br/agi-mais"
  ],
  "blocks": [
    {
      "name": "hero-product",
      "instances": [
        "main section[data-slice-type=\"banner_hero\"]"
      ]
    },
    {
      "name": "cards-product",
      "instances": [
        "main section[data-slice-type=\"vantagens\"]",
        "main section[data-slice-type=\"cards_produtos\"]",
        "main section[data-slice-type=\"feature_cards_carousel\"]"
      ]
    },
    {
      "name": "columns-feature",
      "instances": [
        "main section[data-slice-type=\"intro_cta_with_image\"]",
        "main section[data-slice-type=\"download_app\"]",
        "main section[class=\"flex flex-col items-center\"]:not([data-slice-type])"
      ]
    },
    {
      "name": "cards-steps",
      "instances": [
        "main section[data-slice-type=\"benefit_cards\"]"
      ]
    },
    {
      "name": "accordion-faq",
      "instances": [
        "main section[data-slice-type=\"faq\"]"
      ]
    },
    {
      "name": "columns-banner",
      "instances": [
        "main section[data-slice-type=\"media_left_cta\"]"
      ]
    },
    {
      "name": "table",
      "instances": [
        "main section[data-slice-type=\"table\"]"
      ]
    }
  ],
  "sections": []
};

// TRANSFORMER REGISTRY
const transformers = [
  agibankCleanupTransformer,
  agibankSliceSectionsTransformer,
  agibankLinksTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * All instances are resolved up front, before any parser mutates the DOM.
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page, in document order
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      let elements = [];
      try {
        elements = document.querySelectorAll(selector);
      } catch (e) {
        console.warn(`Invalid selector for ${blockDef.name}: ${selector}`);
      }
      elements.forEach((element) => {
        if (!pageBlocks.some((b) => b.element === element)) {
          pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
        }
      });
    });
  });
  pageBlocks.sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export default {
  /**
   * Scroll through the page so lazy sections (e.g. "Conheça outras opções" cards)
   * render, then wait until loading skeletons are gone.
   */
  onLoad: async ({ document }) => {
    const win = document.defaultView;
    const step = win.innerHeight || 800;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      win.scrollTo(0, y);
      // eslint-disable-next-line no-await-in-loop
      await sleep(250);
    }
    const start = Date.now();
    while (document.querySelector('main .animate-pulse') && Date.now() - start < 6000) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(250);
    }
    win.scrollTo(0, 0);
    await sleep(300);
  },

  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
