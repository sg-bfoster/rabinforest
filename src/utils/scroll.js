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
