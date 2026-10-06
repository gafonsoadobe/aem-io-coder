/*
 * Video block — poster image with a centered play button (and optional label);
 * the video (YouTube, Vimeo or a direct MP4) is embedded on click.
 * Content contract (one row, cells in any order):
 *   - a link to the video (required)
 *   - an optional poster picture
 *   - optional label text shown next to the play button (e.g. "Vamos juntos.")
 * Tolerated class token: `autoplay` — muted, looping, autoplaying background video.
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getVideoSource(link) {
  if (link.includes('youtube') || link.includes('youtu.be')) return 'youtube';
  if (link.includes('vimeo')) return 'vimeo';
  return 'video';
}

function iframeWrapper(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-embed';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';
  iframe.allowFullscreen = true;
  wrapper.append(iframe);
  return wrapper;
}

function embedYoutube(url, autoplay, background) {
  const params = new URLSearchParams({ rel: '0' });
  if (autoplay || background) {
    params.set('autoplay', autoplay ? '1' : '0');
    params.set('mute', background ? '1' : '0');
    params.set('controls', background ? '0' : '1');
    params.set('loop', background ? '1' : '0');
    params.set('playsinline', background ? '1' : '0');
  }
  let vid = new URLSearchParams(url.search).get('v');
  if (url.hostname.includes('youtu.be')) [, vid] = url.pathname.split('/');
  if (!vid && url.pathname.startsWith('/embed/')) [, , vid] = url.pathname.split('/');
  if (vid && background) params.set('playlist', vid);
  return iframeWrapper(`https://www.youtube.com/embed/${encodeURIComponent(vid || '')}?${params}`, 'Content from YouTube');
}

function embedVimeo(url, autoplay, background) {
  const id = url.pathname.split('/').filter(Boolean).pop();
  const params = new URLSearchParams();
  if (autoplay || background) {
    params.set('autoplay', autoplay ? '1' : '0');
    params.set('background', background ? '1' : '0');
  }
  const query = params.toString() ? `?${params}` : '';
  return iframeWrapper(`https://player.vimeo.com/video/${id}${query}`, 'Content from Vimeo');
}

function videoElement(src, autoplay, background) {
  const video = document.createElement('video');
  video.controls = !background;
  video.playsInline = true;
  if (background) {
    video.muted = true;
    video.loop = true;
  }
  if (autoplay) video.autoplay = true;
  const source = document.createElement('source');
  source.src = src;
  source.type = `video/${src.split('?')[0].split('.').pop()}`;
  video.append(source);
  return video;
}

function loadEmbed(block, link, autoplay, background) {
  if (block.dataset.embedLoaded === 'true') return;
  const url = new URL(link, window.location.href);
  const source = getVideoSource(link);
  let el;
  if (source === 'youtube') el = embedYoutube(url, autoplay, background);
  else if (source === 'vimeo') el = embedVimeo(url, autoplay, background);
  else el = videoElement(url.href, autoplay, background);
  block.append(el);
  block.dataset.embedLoaded = 'true';
}

export default function decorate(block) {
  const anchor = block.querySelector('a[href]');
  const placeholder = block.querySelector('picture');
  if (!anchor) {
    // nothing to play — keep a poster, if any, as a static image
    if (placeholder) block.replaceChildren(placeholder);
    return;
  }
  const link = anchor.href;
  anchor.remove();
  if (placeholder) placeholder.remove();
  // any remaining text becomes the play button label
  const label = block.textContent.trim();
  block.textContent = '';
  block.dataset.embedLoaded = 'false';

  const autoplay = block.classList.contains('autoplay');

  if (placeholder && !autoplay) {
    block.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    wrapper.append(placeholder);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-play';
    button.setAttribute('aria-label', label ? `Play video: ${label}` : 'Play video');
    const icon = document.createElement('span');
    icon.className = 'video-play-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    if (label) {
      const text = document.createElement('span');
      text.className = 'video-play-label';
      text.textContent = label;
      button.append(text);
    }
    wrapper.append(button);
    button.addEventListener('click', () => {
      wrapper.remove();
      loadEmbed(block, link, true, false);
    });
    block.append(wrapper);
    return;
  }

  // no poster (or autoplay): load when scrolled into view
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      loadEmbed(block, link, autoplay && !prefersReducedMotion.matches, autoplay);
    }
  });
  observer.observe(block);
}
