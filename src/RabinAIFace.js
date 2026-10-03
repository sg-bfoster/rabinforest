import React, { useEffect, useRef, useState } from 'react';
import { Hero, ScreenBody } from './components/Hero';
import { createBehaviour } from './face/behaviour';

// RabinAI Face, phase 1 — a glowing form that keeps eye contact and reacts to
// your expressions. Silent: it never speaks in this phase, and it never will
// speak first (docs/RABINAI_FACE_PLAN.md).
//
// Two-step consent, step one only: the camera turns on for face tracking,
// which runs entirely in this tab. No frame, image or video leaves the page.
// Step two (letting it ask about what you hold up) is a later phase and a
// separate yes.
//
// Three.js and MediaPipe are dynamic imports so the rest of the site never
// downloads them, and the camera code is not even fetched until you agree.

// Dev only (`npm run dev`, then ?demo): a scripted visitor fed through the same
// behaviour rules, for tuning the form without sitting in front of a camera.
// import.meta.env.DEV is false in a production build, so this is compiled out.
// ?demo cycles through everything; ?demo=smile (or brows, squint, talk, tilt, away) holds one.
// ?demo=listen talks for 3s, pauses 1.5s, repeat: watch for the ear and the nods.
// ?demo=wink and ?demo=tongue loop those.
// ?debug (dev only, with the camera on) lists the live expression scores, for
// tuning thresholds against a real face instead of guessing.
const DEBUG = import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('debug');
const DEBUG_SHAPES = ['jawOpen', 'mouthSmileLeft', 'mouthSmileRight', 'browInnerUp', 'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeSquintLeft', 'eyeSquintRight', 'tongueOut'];
const DEMO_PARAM = import.meta.env.DEV && typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('demo') : null;
const DEMO = DEMO_PARAM !== null;
const DEMO_HOLD = { smile: 5, brows: 11, squint: 8.5, talk: 14, tilt: 16.5, away: 19 };
function demoFace(now) {
  // Wink: the visitor's left eye shuts for 0.4s every 2.5s. Tongue: out 2s, in 1s.
  if (DEMO_PARAM === 'wink') {
    const k = (now / 1000) % 2.5;
    return { x: 0.5, y: 0.5, roll: 0, shapes: { eyeBlinkLeft: k < 0.4 ? 0.9 : 0, eyeBlinkRight: 0 } };
  }
  if (DEMO_PARAM === 'tongue') {
    const k = (now / 1000) % 3;
    return { x: 0.5, y: 0.5, roll: 0, shapes: { tongueOut: k < 2 ? 0.7 : 0, jawOpen: k < 2 ? 0.25 : 0 } };
  }
  if (DEMO_PARAM === 'listen') {
    const k = (now / 1000) % 4.5;
    return { x: 0.5, y: 0.5, roll: 0, shapes: { jawOpen: k < 3 ? 0.4 : 0 } };
  }
  const t = DEMO_HOLD[DEMO_PARAM] ?? (now / 1000) % 21;
  const sway = { x: 0.5 + 0.25 * Math.sin(now / 1500), y: 0.5 };
  if (t < 3) return { ...sway, shapes: {} };
  if (t < 7) return { ...sway, shapes: { mouthSmileLeft: 0.9, mouthSmileRight: 0.9 } };
  if (t < 8) return { ...sway, shapes: {} };
  if (t < 10) return { ...sway, shapes: { eyeSquintLeft: 0.7, eyeSquintRight: 0.7, eyeBlinkLeft: 0.4, eyeBlinkRight: 0.4 } };
  if (t < 13) return { ...sway, shapes: { browInnerUp: 0.8, browOuterUpLeft: 0.8, browOuterUpRight: 0.8 } };
  if (t < 16) return { ...sway, shapes: { jawOpen: 0.4 } };
  if (t < 18) return { x: 0.5, y: 0.5, roll: 0.45 * Math.sin(now / 900), shapes: {} };   // head rocking side to side
  return null;                                   // walks away: idle
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function RabinAIFace() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const trackerRef = useRef(null);
  // 'off' | 'starting' | 'on' | 'denied' | 'error'
  const [camera, setCamera] = useState('off');
  const [showPreview, setShowPreview] = useState(false);
  const [noFace, setNoFace] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const lastFaceRef = useRef(null);
  const [debugRows, setDebugRows] = useState(null);

  // The form runs from the moment the page opens — idle, looking around — so
  // declining the camera still leaves something alive on the page.
  useEffect(() => {
    let raf = 0, alive = true, form = null, last = performance.now(), lastFaceSeen = 0, flagged = false;
    const reduced = prefersReducedMotion();
    const behaviour = createBehaviour({ reducedMotion: reduced });
    const canvas = canvasRef.current;

    import('./face/renderer').then(({ createFormRenderer }) => {
      if (!alive) return;
      try { form = createFormRenderer(canvas, { reducedMotion: reduced }); }
      catch (err) { console.warn('[face] WebGL unavailable', err); setRenderFailed(true); return; }
      const onResize = () => form.resize();
      window.addEventListener('resize', onResize);
      const ro = new ResizeObserver(onResize);
      ro.observe(canvas);

      const tick = (now) => {
        if (!alive) return;
        const dt = Math.min((now - last) / 1000, 0.1);   // a hidden tab resumes without a lurch
        last = now;
        let face = null;
        // import.meta.env.DEV at the call site, not only in DEMO: a literal false
        // here is what lets the build drop demoFace altogether.
        try { face = import.meta.env.DEV && DEMO ? demoFace(now) : trackerRef.current?.read() ?? null; } catch (err) { console.warn('[face] detect', err); }
        if (face) lastFaceSeen = now;
        lastFaceRef.current = face;
        // "Can't see you" hint after 3s of camera with no face, so a dark room
        // or a covered lens doesn't look like the page ignoring them.
        const missing = !!trackerRef.current && now - lastFaceSeen > 3000;
        if (missing !== flagged) { flagged = missing; setNoFace(missing); }
        form.render(behaviour.update(dt, now, { face }), now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      form.cleanup = () => { window.removeEventListener('resize', onResize); ro.disconnect(); };
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      form?.cleanup?.();
      form?.dispose();
    };
  }, []);

  // ?debug: refresh the score readout five times a second (not every frame:
  // re-rendering React at 120Hz to print numbers would cost more than the face).
  useEffect(() => {
    if (!(import.meta.env.DEV && DEBUG)) return undefined;
    const id = setInterval(() => {
      const f = lastFaceRef.current;
      setDebugRows(f ? DEBUG_SHAPES.map((k) => [k, f.shapes?.[k] ?? 0]).concat([['roll', f.roll ?? 0]]) : []);
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Leaving the page turns the camera off. Always.
  useEffect(() => () => { trackerRef.current?.stop(); trackerRef.current = null; }, []);

  async function turnOn() {
    setCamera('starting');
    try {
      const { startTracker } = await import('./face/tracker');
      trackerRef.current = await startTracker(videoRef.current);
      setCamera('on');
    } catch (err) {
      console.warn('[face] camera', err);
      trackerRef.current = null;
      setCamera(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'error');
    }
  }

  function turnOff() {
    trackerRef.current?.stop();
    trackerRef.current = null;
    setCamera('off');
    setNoFace(false);
  }

  return (
    <>
      <Hero>
        <h1 className="hero-h1">It looks back.</h1>
        <p className="hero-sub hero-sub--page">
          A small RabinAI presence that keeps eye contact, blinks with you now
          and then, and answers a smile with one of its own. Your camera feeds a
          face-tracking model running in this tab; everything it does after that
          is ordinary code, not AI.
        </p>
      </Hero>

      <ScreenBody width="links">
        <div className="rabinai-face">
          <div className="rabinai-face-stage">
            {renderFailed ? (
              <p className="rabinai-face-fallback">This browser can't draw it — WebGL is off or unavailable.</p>
            ) : (
              <canvas ref={canvasRef} className="rabinai-face-canvas" aria-label="A glowing RabinAI form with two eyes" role="img" />
            )}
            <video
              ref={videoRef}
              className={`rabinai-face-preview${camera === 'on' && showPreview ? ' is-shown' : ''}`}
              muted
              playsInline
              aria-hidden="true"
            />
            {import.meta.env.DEV && DEBUG && debugRows && (
              <pre className="rabinai-face-debug">
                {debugRows.length ? debugRows.map(([k, v]) => `${k.padEnd(16)} ${v.toFixed(2)}`).join('\n') : 'no face'}
              </pre>
            )}
            {camera === 'on' && noFace && (
              <div className="rabinai-face-hint" role="status">I can't see you — is there enough light?</div>
            )}
          </div>

          <div className="rabinai-face-bar">
            {camera === 'on' ? (
              <>
                <span className="rabinai-face-live"><span className="rabinai-face-dot" aria-hidden="true" />Camera on · nothing leaves this page</span>
                <div className="rabinai-face-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? 'Hide what it sees' : 'Show what it sees'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={turnOff}>Turn camera off</button>
                </div>
              </>
            ) : (
              <>
                <p className="rabinai-face-consent">
                  {camera === 'denied'
                    ? 'The camera was blocked. Allow it in the address bar and try again — or just watch it look around.'
                    : camera === 'error'
                      ? "The face tracker couldn't start in this browser. It will keep looking around on its own."
                      : 'Face tracking runs in your browser. No video or images leave this page, and nothing is recorded.'}
                </p>
                <button type="button" className="btn btn-primary" onClick={turnOn} disabled={camera === 'starting' || renderFailed}>
                  {camera === 'starting' ? 'Starting…' : 'Let it see you'}
                </button>
              </>
            )}
          </div>
        </div>
      </ScreenBody>
    </>
  );
}
