import React, { useEffect, useRef, useState } from 'react';
import API_BASE_URL from './config/api';

/**
 * ASK THE BOX WHAT IT SEES — the loop closing on the visitor's own picture.
 *
 * SDXL drew it. Qwen2.5-VL looks at it. The read-aloud route speaks the
 * answer. Three models, one mini PC, one flow — and it is THEIR image, which
 * is the whole reason this sits under the render rather than beside a grid of
 * curated samples. (It replaced a "Find It" panel that did exactly that:
 * technically working, and correctly described by Brian as tacked on.)
 *
 * The image is never uploaded. The render handed back a short-lived token and
 * the bytes stayed on the server; this asks about the token. No URL exists,
 * nothing is stored, and there is no path here that accepts an image.
 */

const REASONS = {
  unavailable: 'The vision model is not loaded right now — it runs on demand, so it is not always there.',
  rendering: 'The box is drawing something else. Give it a moment.',
  expired: 'The box has already let go of this one. Draw another and ask straight away.',
  timeout: 'It took too long looking and gave up. It is one mini PC.',
};
const FALLBACK = 'Something went wrong asking the box to look.';
/** Normal states of an on-demand box, not faults — see the styling note. */
const CALM = new Set(['unavailable', 'rendering', 'expired']);

const LookAtIt = ({ token, canSpeak }) => {
  const [phase, setPhase] = useState('idle'); // idle | looking | done | error
  const [text, setText] = useState('');
  const [ms, setMs] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [calm, setCalm] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState(null); // which engine actually spoke
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  // A new render means a new subject. Without this the last picture's
  // description sits under the new one, which is a confident lie.
  useEffect(() => {
    setPhase('idle');
    setText('');
    setMs(null);
    setErrorMsg('');
    setVoice(null);
  }, [token]);

  // Never leave audio playing into a page that has moved on.
  useEffect(() => () => {
    if (audioRef.current) audioRef.current.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const look = async () => {
    if (phase === 'looking') return;
    setPhase('looking');
    setErrorMsg('');
    setCalm(false);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/imagery/describe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(REASONS[data.error] || FALLBACK);
        setCalm(CALM.has(data.error));
        setPhase('error');
        return;
      }
      setText(data.text);
      setMs(data.ms);
      setPhase('done');
    } catch {
      setErrorMsg(FALLBACK);
      setCalm(false);
      setPhase('error');
    }
  };

  const speak = async () => {
    if (speaking || !text) return;
    setSpeaking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/readaloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text.slice(0, 4096) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // The server says which engine spoke — kokoro when the box can, the
      // cloud until then. Reporting it is the same habit the assistant keeps:
      // "local" should be checkable, not asserted.
      setVoice(res.headers.get('X-TTS-Engine') || null);
      const url = URL.createObjectURL(await res.blob());
      urlRef.current = url;
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <section className="look" aria-labelledby="look-title">
      <div className="look-head">
        <h3 id="look-title" className="look-title">Ask the box what it sees</h3>
      </div>
      <p className="look-sub">
        The same machine that drew this can look at it. A vision model reads the
        picture and says what is in it — no idea what you asked for, only what
        came out.
      </p>

      <div className="look-actions">
        <button type="button" className="btn btn-primary" onClick={look} disabled={phase === 'looking'}>
          {phase === 'looking' ? 'Looking…' : 'Describe it'}
        </button>
        {phase === 'done' && canSpeak && (
          <button type="button" className="btn" onClick={speak} disabled={speaking}>
            {speaking ? 'Reading…' : 'Read it aloud'}
          </button>
        )}
      </div>

      <div aria-live="polite">
        {phase === 'done' && <p className="look-text">{text}</p>}
        {phase === 'done' && (
          <p className="look-tags">
            <span className="look-tag">described on the box · {(ms / 1000).toFixed(1)}s</span>
            {voice && <span className="look-tag">spoken by {voice}</span>}
          </p>
        )}
        {phase === 'error' && (
          <p className={calm ? 'look-note' : 'look-error'}>{errorMsg}</p>
        )}
      </div>
    </section>
  );
};

export default LookAtIt;
