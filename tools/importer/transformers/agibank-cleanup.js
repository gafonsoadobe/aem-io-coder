/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Agibank site-wide cleanup.
 * Source: https://agibank.com.br/ (Next.js + Tailwind)
 * All selectors verified in migration-work/cleaned.html.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / widgets that may interfere with block parsing
    WebImporter.DOMUtils.remove(element, [
      '#byRemovePortal', // Privacy Tools cookie management wrapper
      '#privacytools-banner-consent', // <div id="privacytools-banner-consent" class="cc-window cc-banner ...">
      '#dp_content_preference', // Privacy Tools preference container
      '#whatsapp-float-button', // <a id="whatsapp-float-button" class="... fixed bottom-24 right-3 ...">
      '.grecaptcha-badge', // reCAPTCHA badge
      '[data-slot^="dialog"]', // promo modal + overlay (portal outside main; seen live on all pages)
    ]);

    // Empty trailing 9th <section> inside main > section.hide-captcha (line ~422).
    // Removed before parsing; it sits after sections 1-8 so :nth-of-type of the
    // block selectors is unaffected.
    const trailing = element.querySelector('main > section.hide-captcha > section:nth-of-type(9)');
    if (trailing && !trailing.textContent.trim() && !trailing.querySelector('img, picture, video, a')) {
      trailing.remove();
    }
  }

  if (hookName === TransformHook.afterTransform) {
    // Site chrome: fixed header (wrapped in <div class="mb-20">) and footer
    WebImporter.DOMUtils.remove(element, [
      'header.fixed.top-0',
      'footer',
    ]);
    const headerWrapper = element.querySelector('main > div.mb-20');
    if (headerWrapper && !headerWrapper.textContent.trim() && !headerWrapper.querySelector('img, picture, table')) {
      headerWrapper.remove();
    }

    // Tracking beacons and non-authorable technical elements
    WebImporter.DOMUtils.remove(element, [
      '[id^="batBeacon"]', // Bing UET beacon <div id="batBeacon999383742309">
      'next-route-announcer',
      'iframe',
      'script',
      'noscript',
      'link',
      'style',
    ]);
  }
}
