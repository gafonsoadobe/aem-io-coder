# cards-product

Custom **cards** block.

## Authoring (Document Authoring)

Model: `standalone`

One row per card: icon cell (optional, may be empty) + body cell (heading, text, optional CTA link in its own paragraph).
Paragraphs starting with `*` are rendered as small footnotes.

## Supported variations

No authored variations. The layout is picked automatically from the content structure:

| Structure | Class added by JS | Rendering |
|-----------|-------------------|-----------|
| Icon + text + CTA, block opens its section (homepage) | `cards-product-alternate` | Tall slanted product cards, alternating brand blues |
| Icon + text + CTA, after a section heading (product pages) | none | Tall slanted product cards, single blue |
| No CTA in any card | `cards-product-benefits` | Short slanted advantage tiles (icon + title [+ text]) |
| No icons, with CTA | `cards-product-feature` | Rounded, centered cards in a horizontal carousel with prev/next buttons |

## Universal Editor fields

N/A (Document Authoring project)
