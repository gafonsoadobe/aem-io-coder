/**
 * Universal Editor helpers, loaded only when the page is served from *.ue.da.live.
 * Blocks keep the editor instrumentation themselves (see moveInstrumentation in
 * scripts.js); this file reacts to editor events so the selected content is visible.
 */

/** After an image is replaced in the editor, drop the stale responsive sources. */
function handleContentPatch({ detail: { patch, request } }) {
  let element = document.querySelector(`[data-aue-resource="${request.target.resource}"]`);
  if (element && element.getAttribute('data-aue-prop') !== patch.name) {
    element = element.querySelector(`[data-aue-prop="${patch.name}"]`);
  }
  if (element?.getAttribute('data-aue-type') !== 'media') return;

  const picture = element.tagName === 'IMG' ? element.closest('picture') : element;
  picture?.querySelectorAll('source').forEach((source) => source.remove());
  picture?.querySelector('img')?.removeAttribute('srcset');
}

/** Shows the selected carousel slide and opens the selected "show more" item. */
function handleSelect({ detail }) {
  const resource = detail?.resource;
  if (!resource) return;
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);
  if (!element) return;

  const slide = element.closest('.carousel-hero-slide');
  if (slide) {
    const block = slide.closest('.carousel-hero');
    const index = parseInt(slide.dataset.slideIndex, 10);
    block?.querySelectorAll('.carousel-hero-indicator button')[index]?.click();
  }

  const item = element.closest('details.accordion-more-item');
  if (item) item.open = true;
}

export default function ue() {
  document.body.addEventListener('aue:content-patch', handleContentPatch);
  document.body.addEventListener('aue:ui-select', handleSelect);
}
