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
 * Smooth-scroll to the top, then run `onArrived`.
 *
 * Used when Clear should ride the existing page up and only THEN unmount the
 * thread. Deleting first shrinks the document and the viewport snaps — which
 * is the jump. `scrollend` fires when the animation finishes; iOS Safari
 * older than 16.4 never emits it, so we also watch scrollTop and give up
 * after 1.5s.
 */
export const scrollToPageTopThen = (onArrived) => {
  const scroller = document.scrollingElement || document.documentElement;
  const y = () => scroller.scrollTop || window.scrollY || 0;
  if (y() < 2) {
    onArrived();
    return;
  }

  const startedY = y();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener('scrollend', finish);
    window.removeEventListener('scroll', onScroll);
    clearInterval(poll);
    clearTimeout(nudge);
    clearTimeout(stuck);
    onArrived();
  };
  const onScroll = () => {
    if (y() < 2) finish();
  };

  window.addEventListener('scrollend', finish, { once: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  const poll = setInterval(onScroll, 50);
  // iOS sometimes eats smooth scrollTo. If nothing moved, jump, then arrive.
  const nudge = setTimeout(() => {
    if (finished || y() < startedY - 8) return;
    scroller.scrollTo(0, 0);
    window.scrollTo(0, 0);
    finish();
  }, 400);
  const stuck = setTimeout(finish, 5000);

  scroller.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
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
