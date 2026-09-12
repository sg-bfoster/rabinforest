/**
 * Scroll an element so it sits just below the sticky nav + status strip.
 *
 * `--chrome-height` is nav + strip with no gap. The strip grows with the
 * model name, so measuring `.site-chrome` at scroll time (plus 12px of air)
 * is what keeps the first line from tucking under it.
 *
 * `block: 'end'` pins are the other direction — those use CSS
 * `scroll-margin-bottom` against the fixed footer, not this helper.
 */
export const scrollBelowChrome = (el, { behavior = 'smooth', block = 'start' } = {}) => {
  if (!el) return;
  if (block !== 'end') {
    const chrome = document.querySelector('.site-chrome');
    const top = (chrome ? Math.round(chrome.getBoundingClientRect().height) : 71) + 12;
    el.style.scrollMarginTop = `${top}px`;
  }
  el.scrollIntoView({ behavior, block });
};

/**
 * Jump the window to the top. Instant, not smooth: iOS cancels a smooth
 * scrollTo when the document then shrinks (Clear unmounts a thread), and
 * often ignores `behavior: 'smooth'` once the click handler has returned.
 *
 * Call this after that unmount has committed (useLayoutEffect), not in the
 * same tick as the setState.
 */
export const scrollToPageTop = () => {
  const el = document.scrollingElement || document.documentElement;
  el.scrollTo(0, 0);
  window.scrollTo(0, 0);
};
