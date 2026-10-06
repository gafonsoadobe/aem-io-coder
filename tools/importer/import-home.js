/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsIntroParser from './parsers/columns-intro.js';
import cardsProductParser from './parsers/cards-product.js';
import accordionMoreParser from './parsers/accordion-more.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import columnsBannerParser from './parsers/columns-banner.js';
import columnsDarkParser from './parsers/columns-dark.js';

// TRANSFORMER IMPORTS
import agibankCleanupTransformer from './transformers/agibank-cleanup.js';
import agibankSectionsTransformer from './transformers/agibank-sections.js';
import agibankLinksTransformer from './transformers/agibank-links.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-intro': columnsIntroParser,
  'cards-product': cardsProductParser,
  'accordion-more': accordionMoreParser,
  'columns-feature': columnsFeatureParser,
  'columns-banner': columnsBannerParser,
  'columns-dark': columnsDarkParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "home",
  "description": "Landing page: promo carousel, split intro panel, product cards, feature columns and banner panels",
  "urls": [
    "https://agibank.com.br/"
  ],
  "blocks": [
    {
      "name": "carousel-hero",
      "instances": [
        "main > section.hide-captcha > section:nth-of-type(1)"
      ]
    },
    {
      "name": "columns-intro",
      "instances": [
        "main > section.hide-captcha > section:nth-of-type(2)"
      ]
    },
    {
      "name": "cards-product",
      "instances": [
        "main > section.hide-captcha > section:nth-of-type(3)"
      ]
    },
    {
      "name": "accordion-more",
      "instances": [
        "#more-products"
      ]
    },
    {
      "name": "columns-feature",
      "instances": [
        "main > section.hide-captcha > section:nth-of-type(5)",
        "main > section.hide-captcha > section:nth-of-type(6)"
      ]
    },
    {
      "name": "columns-banner",
      "instances": [
        "main > section.hide-captcha > section:nth-of-type(7)"
      ]
    },
    {
      "name": "columns-dark",
      "instances": [
        "main > section.hide-captcha > section:nth-of-type(8)"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "hero-carousel",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(1)"
      ],
      "style": null,
      "blocks": [
        "carousel-hero"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "intro-split-panel",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(2)"
      ],
      "style": null,
      "blocks": [
        "columns-intro"
      ],
      "defaultContent": []
    },
    {
      "id": "3",
      "name": "product-highlights",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(3)"
      ],
      "style": null,
      "blocks": [
        "cards-product"
      ],
      "defaultContent": []
    },
    {
      "id": "4",
      "name": "more-products",
      "selector": [
        "#more-products"
      ],
      "style": null,
      "blocks": [
        "accordion-more"
      ],
      "defaultContent": []
    },
    {
      "id": "5",
      "name": "digital-sempre",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(5)"
      ],
      "style": null,
      "blocks": [
        "columns-feature"
      ],
      "defaultContent": []
    },
    {
      "id": "6",
      "name": "fisico-quando-quiser",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(6)"
      ],
      "style": null,
      "blocks": [
        "columns-feature"
      ],
      "defaultContent": []
    },
    {
      "id": "7",
      "name": "about-banner",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(7)"
      ],
      "style": null,
      "blocks": [
        "columns-banner"
      ],
      "defaultContent": []
    },
    {
      "id": "8",
      "name": "careers-banner",
      "selector": [
        "main > section.hide-captcha > section:nth-of-type(8)"
      ],
      "style": null,
      "blocks": [
        "columns-dark"
      ],
      "defaultContent": []
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  agibankCleanupTransformer,
  agibankSectionsTransformer,
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
