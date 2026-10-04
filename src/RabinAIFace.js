import React, { useEffect, useRef, useState } from 'react';
import { Hero, ScreenBody } from './components/Hero';
import { createBehaviour } from './face/behaviour';
import { parse } from './face/commands';
import { earsMode, earsSupported } from './face/ears';
import API_BASE_URL from './config/api';

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

// One conversation id per page load, so Brian's conversation logs keep a
// visit's questions together (and can tell them from Home's `conv_` ids).
const newConversationId = () => `face_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

/** A link card's label: what a visitor would call the place, not the raw URL. */
function linkLabel(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'rabinforest.com' && u.pathname.startsWith('/contact')) return 'Contact Brian';
    if (/\/resume\b/.test(u.pathname)) return "Brian's résumé";
    const path = u.pathname.replace(/\/$/, '');
    return path ? `${host}${path}` : host;
  } catch { return url; }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// --- Pieces of the senses panel ------------------------------------------

const TRY_CHIPS = [['Nod', 'nod'], ['Wink', 'wink'], ['Smile', 'smile'], ['Look left', 'look-left'],
  ['Shake your head', 'shake'], ['Make an O', 'ooh']];

/** Who answered and who spoke, honestly: the box when it could, the cloud when it couldn't. */
function replyBy(r) {
  if (!r) return '';
  const mind = r.engine === 'rabinai' ? 'answered by the box' : r.engine === 'gemini' ? 'answered by Gemini (the box was busy)'
    : r.engine === 'canned' || r.engine === 'limit' ? 'a built-in answer' : '';
  const voice = r.voice === 'kokoro' ? 'voice: Kokoro, on the box' : r.voice ? 'voice: the cloud' : '';
  return [mind, voice].filter(Boolean).join(' · ');
}

/** Who actually turns speech into words in this browser, for the badge. */
function speechVendor() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Edg\//.test(ua)) return 'Microsoft';
  if (/Chrome|CriOS/.test(ua)) return 'Google';
  if (/Safari/.test(ua)) return 'Apple';
  return "the browser";
}

const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const EyeIcon = () => (<svg {...svg}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>);
const EarIcon = () => (<svg {...svg}><path d="M6 9a6 6 0 1 1 12 0c0 3.2-2.4 4.6-3.6 5.8-1 1-1.2 2.2-1.6 3.4A3 3 0 0 1 7 18" /><path d="M10 9a2 2 0 1 1 4 0c0 1.2-1 1.7-1.5 2.3" /></svg>);
const CameraIcon = () => (<svg {...svg}><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>);

/**
 * One sense: what it does, where its data goes, and a real on/off switch.
 * The badge is the privacy fact in three words; the details say it in full.
 */
function SenseCard({ icon, title, blurb, on, busy, disabled, onToggle, badge, problem, details, children }) {
  const id = `sense-${title.toLowerCase()}`;
  return (
    <section className={`sense-card${on ? ' is-on' : ''}`} aria-labelledby={`${id}-title`}>
      <div className="sense-head">
        <span className="sense-icon">{icon}</span>
        <h2 id={`${id}-title`} className="sense-title">{title}</h2>
        <span className="sense-state" aria-hidden="true">{busy ? 'Starting' : on ? 'On' : 'Off'}</span>
        <button
          type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-title`}
          className={`sense-switch${on ? ' is-on' : ''}${busy ? ' is-busy' : ''}`}
          onClick={onToggle} disabled={disabled || busy}
        >
          <span className="sense-switch-knob" />
        </button>
      </div>
      <p className="sense-blurb">{blurb}</p>
      <span className={`sense-badge sense-badge--${badge.tone}`}>{badge.text}</span>
      {busy && <p className="sense-live">Asking your browser…</p>}
      {problem && <p className="sense-problem" role="status">{problem}</p>}
      {children}
      <details className="sense-details">
        <summary>Where does it go?</summary>
        <p>{details}</p>
      </details>
    </section>
  );
}

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
  // Answering: one question in, one short spoken answer out (plan §11).
  const [reply, setReply] = useState(null);           // { say, engine, voice, links } of the last answer
  const conversationIdRef = useRef(null);
  const [answering, setAnswering] = useState('');     // '' | 'thinking' | 'speaking'
  const thinkingRef = useRef(false);
  const speakLevelRef = useRef(0);                     // 0..1 loudness of its own voice, read each frame
  const audioRef = useRef(null);                       // { ctx, analyser, buf, el }
  const busyRef = useRef(false);
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
        // Its own voice, if it's speaking: loudness drives the mouth.
        const a = audioRef.current;
        if (a?.playing) {
          a.analyser.getFloatTimeDomainData(a.buf);
          let sum = 0;
          for (let i = 0; i < a.buf.length; i++) sum += a.buf[i] * a.buf[i];
          speakLevelRef.current = Math.min(1, Math.sqrt(sum / a.buf.length) * 6);
        } else speakLevelRef.current = 0;
        // Eyes closed while Sight is off (and while it's starting): it opens
        // them when it can actually see. The dev demo is a visitor, so awake.
        const asleep = !(import.meta.env.DEV && DEMO) && !trackerRef.current;
        form.render(behaviour.update(dt, now, {
          face, heard: heardRef.current, point, thinking: thinkingRef.current, speak: speakLevelRef.current, asleep,
        }), now);
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
      // faceX/headYaw too: if it ever looks the wrong way, these say whether
      // the camera is mirrored (faceX should RISE as you move to your left).
      setDebugRows(f ? [['faceX', f.x ?? 0], ['headYaw', f.yaw ?? 0], ['roll', f.roll ?? 0]].concat(DEBUG_SHAPES.map((k) => [k, f.shapes?.[k] ?? 0])) : []);
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
    try { audioRef.current?.el.pause(); audioRef.current?.ctx.close(); } catch { /* already closed */ }
  }, []);

  async function micOn() {
    setMic('starting');
    ensureAudio();
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
          // A finished question that wasn't a direction gets an answer.
          if (isFinal && question && !act) answer(text.trim());
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

  // Its voice runs through Web Audio so the mouth can follow the loudness.
  // Created from the mic switch's click: browsers keep audio muted otherwise.
  function ensureAudio() {
    if (audioRef.current) { audioRef.current.ctx.resume?.(); return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const el = new Audio();
      const src = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser); analyser.connect(ctx.destination);
      audioRef.current = { ctx, el, analyser, buf: new Float32Array(analyser.fftSize), playing: false };
    } catch (err) { console.warn('[face] audio', err); }
  }

  /**
   * The site's assistant, answering through the face: the same brain as Home,
   * in spoken mode, so the server gates the question, never emails anyone,
   * and returns at most two speakable sentences plus links for cards.
   *
   * Streamed (AVATAR_ASSISTANT_PLAN phase B): when the box answers, each whole
   * sentence arrives as a `say` frame and goes straight to onSay, so the first
   * one can be voiced while the second is still being written. Gemini and the
   * canned lines come back whole instead. -> { say, links, engine } or null.
   */
  async function askAssistant(question, onSay) {
    conversationIdRef.current ??= newConversationId();
    const r = await fetch(`${API_BASE_URL}/ai/gemini-assistant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: question.slice(0, 200), conversationId: conversationIdRef.current, spoken: true, stream: true }),
    });
    if (!r.headers.get('content-type')?.includes('text/event-stream')) {
      const data = await r.json().catch(() => null);
      if (r.status === 429 && data?.say) return { say: data.say, links: [], engine: 'limit' };
      if (!r.ok || typeof data?.response !== 'string') return null;
      let parsed = null;
      try { parsed = JSON.parse(data.response); } catch { /* not JSON: use it as words */ }
      const say = (parsed ? parsed.text : data.response)?.trim();
      return say ? { say, links: Array.isArray(parsed?.links) ? parsed.links : [], engine: data.engine } : null;
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', final = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }
        if (evt.say) onSay(evt.say, evt.engine);       // `waiting` heartbeats are ignored
        if (evt.done) final = { say: (evt.text ?? '').trim(), links: Array.isArray(evt.links) ? evt.links : [], engine: evt.engine };
      }
    }
    return final?.say ? final : null;
  }

  /** The face's own small talk: the fallback when the assistant can't answer (§12 q4). */
  async function askFace(question) {
    const r = await fetch(`${API_BASE_URL}/ai/face/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.slice(0, 200) }),
    });
    const said = await r.json().catch(() => null);
    return said?.say ? { say: said.say, links: [], engine: said.engine } : null;
  }

  /** Play one clip through the analysed <audio>, so the mouth follows it. */
  async function playClip(a, url) {
    a.el.src = url;
    // A touch higher and quicker on playback, pitch NOT preserved: it sounds
    // small, like the orb, without tipping into a chipmunk.
    a.el.preservesPitch = false; a.el.mozPreservesPitch = false; a.el.webkitPreservesPitch = false;
    a.el.playbackRate = 1.05;
    a.playing = true;
    // Never wait forever: a blocked or stalled play() must not leave it stuck
    // 'busy' and deaf. One sentence is well under 20s.
    await new Promise((resolve) => {
      const cap = setTimeout(resolve, 20_000);
      const done = () => { clearTimeout(cap); resolve(); };
      a.el.onended = done; a.el.onerror = done; a.el.play().catch(done);
    });
    a.playing = false;
  }

  /**
   * Its voice, a sentence at a time. Each sentence's audio is requested the
   * moment the sentence exists, so sentence 2's voice is being made while
   * sentence 1 plays; they still play strictly in order.
   *   add(text, engine)   a sentence to say
   *   close()             nothing more is coming
   *   play(onStart)       resolves once everything added has been said
   */
  function createVoice(a) {
    const items = [];
    let closed = false, wake = null;
    const tts = async (text) => {
      const res = await fetch(`${API_BASE_URL}/ai/readaloud`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Its own voice, not the narrator's: see VOICE_PERSONAS in bfoster-services.
        body: JSON.stringify({ prompt: text, persona: 'face' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return { url: URL.createObjectURL(await res.blob()), engine: res.headers.get('X-TTS-Engine') };
    };
    return {
      add(text, engine) {
        const clip = a ? tts(text).catch((err) => { console.warn('[face] speak', err); return null; }) : Promise.resolve(null);
        items.push({ text, engine, clip });
        wake?.();
      },
      close() { closed = true; wake?.(); },
      async play(onStart) {
        for (let i = 0; ; i++) {
          while (i >= items.length) {
            if (closed) return;
            await new Promise((resolve) => { wake = resolve; });
            wake = null;
          }
          const item = items[i];
          const clip = await item.clip;
          onStart(item, clip);
          if (clip) { await playClip(a, clip.url); URL.revokeObjectURL(clip.url); }
        }
      },
    };
  }

  /**
   * One question -> a short spoken answer. Words go to the server (never audio
   * or images); the answer comes back gated, a sentence at a time when the box
   * streams it, Kokoro speaks each as soon as it can, and the ears are paused
   * meanwhile so it never hears, and answers, itself.
   */
  async function answer(question) {
    if (busyRef.current) return;                       // one at a time
    busyRef.current = true;
    thinkingRef.current = true;
    setAnswering('thinking');

    const voice = createVoice(audioRef.current);
    const said = [];
    let ttsEngine = null;
    // Keep thinking until the first voice is ready; only then stop and speak.
    const speaking = voice.play((item, clip) => {
      if (!said.length) { earsRef.current?.pause(); thinkingRef.current = false; setAnswering('speaking'); }
      said.push(item.text);
      if (clip?.engine) ttsEngine = clip.engine;
      setReply({ say: said.join(' '), engine: item.engine, voice: ttsEngine, links: [] });
    });

    let streamed = 0, whole = null;
    try {
      whole = await askAssistant(question, (sentence, engine) => { streamed++; voice.add(sentence, engine); });
    } catch (err) { console.warn('[face] assistant', err); }
    if (!whole && !streamed) {
      try { whole = await askFace(question); } catch (err) { console.warn('[face] reply', err); }
    }
    if (!whole && !streamed) whole = { say: "I couldn't think of an answer just then.", links: [], engine: 'none' };
    if (!streamed) voice.add(whole.say, whole.engine);  // Gemini, canned, fallback: one clip
    voice.close();
    await speaking;

    // Links once it has finished talking, under the words it said.
    const links = whole?.links ?? [];
    setReply((r) => (r ? { ...r, links } : r));
    thinkingRef.current = false;
    setAnswering('');
    // A beat before listening again, so the tail of its own voice isn't heard.
    setTimeout(() => { earsRef.current?.resume(); busyRef.current = false; }, 400);
  }

  // Dev only: window.__face.ask('why is the sky blue') runs the whole answer
  // path (reply, voice, mouth, caption) without talking to it.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__face = { ask: (q) => { ensureAudio(); return answer(q); } };
    return () => { delete window.__face; };
  });

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
    : `Your browser sends what you say to ${speechVendor()}'s speech service, which sends back the words. This page never sees the audio.`;
  // The assistant logs conversations, here as on Home (AVATAR_ASSISTANT_PLAN §12 q1).
  const keptWords = 'The questions you ask, and its answers, are kept so Brian can improve it. Audio never is.';
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
          is ordinary code, not AI. Switch on Hearing and it becomes the site's
          assistant with a face: ask it about Brian's work and it answers out loud.
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
              <canvas ref={canvasRef} className="rabinai-face-canvas" aria-label={`A glowing RabinAI form with two eyes${camera === 'on' ? '' : ', closed'}`} role="img" />
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
            {/* What's on, at a glance, right by the face. */}
            {(camera === 'on' || mic === 'on') && (
              <div className="rabinai-face-pills" aria-hidden="true">
                {camera === 'on' && <span className="face-pill"><EyeIcon /> Seeing</span>}
                {mic === 'on' && <span className="face-pill"><EarIcon /> Listening</span>}
              </div>
            )}
            {camera === 'on' && (
              <button type="button" className={`face-preview-btn${showPreview ? ' is-on' : ''}`}
                aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}
                title={showPreview ? 'Hide what it sees' : 'Show what it sees'}>
                <CameraIcon /><span className="sr-only">{showPreview ? 'Hide what it sees' : 'Show what it sees'}</span>
              </button>
            )}
          </div>

          <div className="rabinai-senses">
            <SenseCard
              icon={<EyeIcon />}
              title="Sight"
              blurb="Eye contact, and it answers your expressions. Point a finger and it follows."
              on={camera === 'on'}
              busy={camera === 'starting'}
              disabled={renderFailed}
              onToggle={() => (camera === 'on' ? turnOff() : turnOn())}
              badge={{ tone: 'ok', text: 'Stays on this device' }}
              problem={camera === 'denied'
                ? 'Camera blocked. Allow it from the address bar, then switch it on again.'
                : camera === 'error' ? "The tracker couldn't start in this browser." : ''}
              details={<>
                Your camera feeds a face- and hand-tracking model running in this tab.
                Frames are never uploaded, saved or recorded. The model files download
                once, from Google's model servers.
              </>}
            >
              {camera === 'on' && (
                <p className="sense-live">{noFace ? "Can't see you yet — is there enough light?" : 'Watching you. Try a smile, a wink, or raised eyebrows.'}</p>
              )}
            </SenseCard>

            {micMode && micMode !== 'none' && earsSupported() && (
              <SenseCard
                icon={<EarIcon />}
                title="Hearing"
                blurb="Follows simple directions. Ask it about Brian and his work, or anything else, and it answers out loud."
                on={mic === 'on'}
                busy={mic === 'starting'}
                onToggle={() => (mic === 'on' ? micOff() : micOn())}
                badge={micMode === 'local'
                  ? { tone: 'ok', text: 'Stays on this device' }
                  : { tone: 'warn', text: `Uses ${speechVendor()}'s speech service` }}
                problem={mic === 'denied'
                  ? 'Microphone blocked. Allow it from the address bar, then switch it on again.'
                  : mic === 'error' ? "Speech recognition couldn't start in this browser." : ''}
                details={<>
                  {micWhere} {keptWords}
                  {micMode === 'downloadable' && (
                    <span className="sense-local">
                      This browser can do it on your device instead.{' '}
                      <button type="button" className="btn btn-secondary sense-small" onClick={goLocal} disabled={installing}>
                        {installing ? 'Downloading…' : 'Keep speech on this device'}
                      </button>
                    </span>
                  )}
                </>}
              >
                {(answering || reply) && (
                  <p className="sense-reply" aria-live="polite">
                    {answering === 'thinking' ? 'Thinking…' : <>
                      <span className="sense-reply-say">“{reply?.say}”</span>
                      <span className="sense-reply-by">{replyBy(reply)}</span>
                    </>}
                  </p>
                )}
                {/* Links are shown, never read out: the spoken answer points here. */}
                {!answering && reply?.links?.length > 0 && (
                  <ul className="face-links" aria-label="Links from its answer">
                    {reply.links.map((url) => (
                      <li key={url}>
                        <a className="face-link" href={url} target="_blank" rel="noopener noreferrer">
                          <span className="face-link-label">{linkLabel(url)}</span>
                          <span className="face-link-arrow" aria-hidden="true">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {mic === 'on' && (
                  <p className="sense-live" aria-live="polite">
                    {heardText
                      ? <>Heard “{heardText}”{ACT_WORDS[heardAct] ? <> <span className="sense-did">→ {ACT_WORDS[heardAct]}</span></> : null}</>
                      : 'Listening. Ask it a question, or say one of these:'}
                  </p>
                )}
                {/* Tappable too: the same moves, for anyone without a mic. */}
                <div className="sense-chips" role="group" aria-label="Directions it knows">
                  {mic !== 'on' && <span className="sense-chips-label">Try one:</span>}
                  {TRY_CHIPS.map(([label, act]) => (
                    <button key={act} type="button" className="sense-chip"
                      onClick={() => { behaviourRef.current?.act(act, performance.now()); setHeardAct(act); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </SenseCard>
            )}
          </div>
        </div>
      </ScreenBody>
    </>
  );
}
