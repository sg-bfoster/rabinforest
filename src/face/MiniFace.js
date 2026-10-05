import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PLAYGROUND_RABINAI_FACE } from '../playgroundRoutes';

/**
 * The RabinAI face, small, on the Assistant page: the same ball that lives on
 * the Avatar page, sitting beside the newest reply as the one who is
 * answering, and a way into the full thing.
 *
 * It asks for NOTHING. No camera, no microphone, no audio graph: this page is
 * where hiring managers land, and a permission prompt or a broken read-aloud
 * here would cost far more than the ball earns. So:
 *   - it looks at the pointer (and straight ahead when the pointer rests)
 *   - `thinking` raises a brow while an answer is on its way or still arriving
 *   - `speaking` moves its mouth while that reply is read aloud. The movement
 *     is a made-up talking rhythm, not the audio's loudness: reading the real
 *     level would mean routing the page's <audio> through Web Audio, and that
 *     is the one thing on this page that must not be put at risk.
 *   - clicking it goes to the Avatar page, where it sees, hears and talks.
 *
 * It is mounted afresh beside each new reply and disposed with the old one
 * (see dispose in renderer.js). Three.js loads only when
 * the browser is idle, the loop stops while the ball is scrolled out of view,
 * and if WebGL is missing it renders nothing at all.
 */
const FACING = { x: 0.5, y: 0.5, roll: 0, yaw: 0, shapes: {} };   // "someone is here": awake, bright, eye contact
const POINTER_REST_MS = 2500;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function MiniFace({ thinking = false, speaking = false }) {
  const canvasRef = useRef(null);
  const live = useRef({ thinking, speaking });
  const [failed, setFailed] = useState(false);
  live.current = { thinking, speaking };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let alive = true, raf = 0, form = null, behaviour = null, last = performance.now(), visible = true;
    let pointer = null, ro = null;
    const reduced = reducedMotion();

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      pointer = {
        gx: clamp((e.clientX - cx) / (window.innerWidth * 0.3)),
        gy: clamp((cy - e.clientY) / (window.innerHeight * 0.3)),
        near: 0, at: performance.now(),
      };
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);

    const start = async () => {
      try {
        const [{ createFormRenderer }, { createBehaviour }] = await Promise.all([
          import('./renderer'), import('./behaviour'),
        ]);
        if (!alive) return;
        form = createFormRenderer(canvas, { reducedMotion: reduced });
        behaviour = createBehaviour({ reducedMotion: reduced });
        window.addEventListener('pointermove', onMove, { passive: true });
        ro = new ResizeObserver(() => form.resize());   // it is smaller on a phone
        ro.observe(canvas);
        const tick = (now) => {
          if (!alive) return;
          raf = requestAnimationFrame(tick);
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;
          if (!visible) return;
          const { thinking: t, speaking: s } = live.current;
          // A talking rhythm: two beats of different lengths, so it does not
          // look like a metronome. 0 when silent.
          const speak = s ? 0.2 + 0.8 * Math.abs(Math.sin(now / 105)) * (0.45 + 0.55 * Math.abs(Math.sin(now / 370 + 1.3))) : 0;
          const point = pointer && now - pointer.at < POINTER_REST_MS ? pointer : null;
          form.render(behaviour.update(dt, now, { face: FACING, point, thinking: t, speak }), now);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        console.warn('[mini-face]', err);
        if (alive) setFailed(true);
      }
    };
    // After the page is up: the ball must never compete with the assistant's own first paint.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 2500 })
      : setTimeout(start, 800);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(idle); else clearTimeout(idle);
      window.removeEventListener('pointermove', onMove);
      io.disconnect();
      ro?.disconnect();
      form?.dispose?.();
    };
  }, []);

  if (failed) return null;
  return (
    <NavLink to={PLAYGROUND_RABINAI_FACE} className="mini-face" title="Talk to it out loud" aria-label="Meet the RabinAI avatar: talk to it out loud">
      <canvas ref={canvasRef} className="mini-face-canvas" aria-hidden="true" />
    </NavLink>
  );
}
