import React, { useEffect, useRef, useState } from 'react';
import { Hero, ScreenBody } from './components/Hero';
import { createBehaviour } from './face/behaviour';
import { parse } from './face/commands';
import { earsMode, earsSupported } from './face/ears';

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
// ?demo=finger circles a fingertip (cross-eyed for 2s in every 8);
// ?demo=wink, ?demo=tongue and ?demo=ooh loop those; ?demo=angry glares for 5s
// (watch it match, then soften to concerned), relaxes 2s, repeats.
// ?debug (dev only, with the camera on) lists the live expression scores, for
// tuning thresholds against a real face instead of guessing.
const DEBUG = import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('debug');
const DEBUG_SHAPES = ['jawOpen', 'mouthSmileLeft', 'mouthSmileRight', 'browInnerUp', 'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeSquintLeft', 'eyeSquintRight', 'mouthFunnel', 'mouthPucker', 'browDownLeft', 'browDownRight', 'tongueOut', 'tongueColour'];
const DEMO_PARAM = import.meta.env.DEV && typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('demo') : null;
const DEMO = DEMO_PARAM !== null;
const DEMO_HOLD = { smile: 5, brows: 11, squint: 8.5, talk: 14, tilt: 16.5, away: 19 };
function demoFace(now) {
  // Wink: the visitor's left eye shuts for 0.4s every 2.5s. Tongue: out 2s, in 1s.
  if (DEMO_PARAM === 'angry') {
    const k = (now / 1000) % 7;
    return { x: 0.5, y: 0.5, roll: 0, shapes: k < 5 ? { browDownLeft: 0.7, browDownRight: 0.7, mouthFrownLeft: 0.5, mouthFrownRight: 0.5 } : {} };
  }
  if (DEMO_PARAM === 'ooh') {
    const k = (now / 1000) % 3;
    return { x: 0.5, y: 0.5, roll: 0, shapes: { mouthFunnel: k < 2 ? 0.7 : 0, jawOpen: k < 2 ? 0.3 : 0 } };
  }
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
  // Ears (the second, separate consent): 'off' | 'starting' | 'on' | 'denied' | 'error'
  const [mic, setMic] = useState('off');
  const [micMode, setMicMode] = useState(null);       // 'local' | 'downloadable' | 'cloud' | 'none', known before asking
  const [installing, setInstalling] = useState(false);
  const [heardText, setHeardText] = useState('');     // the exact words, shown under the stage
  const [heardAct, setHeardAct] = useState('');
  const earsRef = useRef(null);
  const behaviourRef = useRef(null);
  // What the render loop reads each frame: is someone talking, are they asking.
  const heardRef = useRef({ speaking: false, question: false });
  // The pointer (mouse or touch) over the stage, in gaze terms, and when it last moved.
  const pointerRef = useRef(null);
  const stageRef = useRef(null);
  const [debugRows, setDebugRows] = useState(null);

  // The form runs from the moment the page opens — idle, looking around — so
  // declining the camera still leaves something alive on the page.
  useEffect(() => {
    let raf = 0, alive = true, form = null, last = performance.now(), lastFaceSeen = 0, flagged = false;
    const reduced = prefersReducedMotion();
    const behaviour = createBehaviour({ reducedMotion: reduced });
    behaviourRef.current = behaviour;
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
        // What to follow instead of the face, if anything. The pointer is the
        // more deliberate gesture, so it wins; it lets go 1.2s after it stops.
        let point = null;
        const p = pointerRef.current;
        if (p && now - p.at < 1200) point = p;
        else if (import.meta.env.DEV && DEMO_PARAM === 'finger') {
          const a = now / 1200;
          point = { gx: Math.cos(a) * 0.8, gy: Math.sin(a * 2) * 0.4, near: (now / 1000) % 8 > 6 ? 0.6 : 0 };
        } else {
          // A fingertip from the camera maps like the face: the image isn't
          // mirrored, so the visitor's right is the image's left.
          const h = trackerRef.current?.readHand?.();
          if (h) point = { gx: (0.5 - h.x) * 2.2, gy: (0.5 - h.y) * 2.0, near: h.size };
        }
        form.render(behaviour.update(dt, now, { face, heard: heardRef.current, point }), now);
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

  // Where speech would be recognised, found out BEFORE asking, so the consent
  // line can say exactly where the audio goes.
  useEffect(() => { earsMode().then(setMicMode).catch(() => setMicMode('none')); }, []);

  // Leaving the page turns the camera and the microphone off. Always.
  useEffect(() => () => {
    trackerRef.current?.stop(); trackerRef.current = null;
    earsRef.current?.stop(); earsRef.current = null;
  }, []);

  async function micOn() {
    setMic('starting');
    try {
      const { startEars } = await import('./face/ears');
      let firedFor = -1, questionTimer = 0;
      earsRef.current = startEars({
        mode: micMode === 'local' ? 'local' : 'cloud',
        onWords(text, isFinal, index) {
          const { act, question } = parse(text);
          // One move per phrase: interim results repeat, and "nod" must not
          // nod five times while the sentence is still arriving.
          if (act && firedFor !== index) {
            firedFor = index;
            behaviourRef.current?.act(act, performance.now());
            setHeardAct(act);
          }
          // Lean in WHILE a question is being asked; let go just after it ends.
          clearTimeout(questionTimer);
          if (question && !isFinal) heardRef.current = { ...heardRef.current, question: true };
          else if (isFinal) questionTimer = setTimeout(() => { heardRef.current = { ...heardRef.current, question: false }; }, 250);
          setHeardText(text.trim());
          if (isFinal && !act) setHeardAct(question ? 'question' : '');
        },
        onSpeaking(on) { heardRef.current = { ...heardRef.current, speaking: on }; },
        onStop(reason) {
          if (reason === 'denied') setMic('denied');
          else if (reason === 'error') setMic('error');
          earsRef.current = null;
          heardRef.current = { speaking: false, question: false };
        },
      });
      setMic('on');
    } catch (err) {
      console.warn('[face] ears', err);
      earsRef.current = null;
      setMic('error');
    }
  }

  // Chrome can keep speech on the device after a one-time download. Offer it
  // rather than defaulting visitors to the cloud.
  async function goLocal() {
    setInstalling(true);
    const { installLocal } = await import('./face/ears');
    const ok = await installLocal();
    setInstalling(false);
    if (ok) {
      setMicMode('local');
      if (earsRef.current) { micOff(); }               // restart on-device next time they switch it on
    }
  }

  function micOff() {
    earsRef.current?.stop();
    earsRef.current = null;
    heardRef.current = { speaking: false, question: false };
    setMic('off');
    setHeardText(''); setHeardAct('');
  }

  // Exact words for where the audio goes. Not reassurance: whichever is true.
  const micWhere = micMode === 'local'
    ? 'Speech is turned into words on this device. No audio leaves it.'
    : "Your browser's speech service turns what you say into words: in Chrome the audio goes to Google, in Safari to Apple. This page never sees the audio and keeps none of the words.";
  const ACT_WORDS = {
    nod: 'nodding', shake: 'shaking its head', smile: 'smiling', wink: 'winking', grumpy: 'looking grumpy',
    surprised: 'looking surprised', ooh: 'making an O', tongue: 'sticking its tongue out', close: 'closing its eyes',
    tilt: 'tilting its head', 'look-left': 'looking left', 'look-right': 'looking right', 'look-up': 'looking up',
    'look-down': 'looking down', question: 'listening to your question',
  };

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
          <div
            className="rabinai-face-stage"
            ref={stageRef}
            // Mouse or finger on the stage: the eyes follow it. Screen coords,
            // so no mirroring: point right and it looks right.
            onPointerMove={(e) => {
              const r = stageRef.current?.getBoundingClientRect();
              if (!r) return;
              pointerRef.current = {
                gx: ((e.clientX - r.left) / r.width - 0.5) * 2,
                gy: (0.5 - (e.clientY - r.top) / r.height) * 2,
                near: 0, at: performance.now(),
              };
            }}
            onPointerLeave={() => { pointerRef.current = null; }}
          >
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

          {/* The ears: a second, separate yes, with its own honest line. */}
          {micMode && micMode !== 'none' && earsSupported() && (
            <div className="rabinai-face-bar">
              {mic === 'on' ? (
                <>
                  <span className="rabinai-face-live">
                    <span className="rabinai-face-dot" aria-hidden="true" />
                    {micMode === 'local' ? 'Microphone on · words stay on this device' : "Microphone on · your browser's speech service"}
                  </span>
                  <div className="rabinai-face-actions">
                    <button type="button" className="btn btn-secondary" onClick={micOff}>Turn microphone off</button>
                  </div>
                  <p className="rabinai-face-heard" aria-live="polite">
                    {heardText ? <>Heard: “{heardText}”{ACT_WORDS[heardAct] ? <> → {ACT_WORDS[heardAct]}</> : null}</> : 'Try “nod”, “wink”, “look left”, or ask it something.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="rabinai-face-consent">
                    {mic === 'denied'
                      ? 'The microphone was blocked. Allow it in the address bar to try again.'
                      : mic === 'error'
                        ? "Speech recognition couldn't start in this browser."
                        : <>Let it hear you and it follows simple directions — “nod”, “wink”, “look left” — and leans in when you ask it something. {micWhere}</>}
                    {micMode === 'downloadable' && mic !== 'denied' && (
                      <> <button type="button" className="rabinai-face-link" onClick={goLocal} disabled={installing}>
                        {installing ? 'Downloading…' : 'Keep it on this device instead (one-time download)'}
                      </button></>
                    )}
                  </p>
                  <button type="button" className="btn btn-primary" onClick={micOn} disabled={mic === 'starting'}>
                    {mic === 'starting' ? 'Starting…' : 'Let it hear you'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </ScreenBody>
    </>
  );
}
