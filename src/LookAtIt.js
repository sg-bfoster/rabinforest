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
  const [steps, setSteps] = useState([]); // what the box is doing, as it does it
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
    setSteps([]);
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
    setSteps([]);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/imagery/describe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.body) throw new Error('no stream');

      // Same SSE grammar the render speaks — step / done / error — so the
      // box can say what it is doing while it does it. Before this the panel
      // sat silent for up to fifteen seconds and then produced an answer,
      // which reads as a hang however good the answer is.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let settled = false;

      while (!settled) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        let event = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          let d;
          try { d = JSON.parse(line.slice(6)); } catch { continue; }

          if (event === 'step') {
            setSteps((prev) => [...prev, `${(d.ms / 1000).toFixed(1)}s · ${d.label}`]);
          } else if (event === 'done') {
            setText(d.text);
            setMs(d.ms);
            setPhase('done');
            settled = true;
          } else if (event === 'error') {
            setErrorMsg(REASONS[d.error] || FALLBACK);
            setCalm(CALM.has(d.error));
            setPhase('error');
            settled = true;
          }
        }
      }
      if (!settled) throw new Error('stream ended without an answer');
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
        {/* The box narrating itself. Kept visible after the answer arrives:
            "6.2s waking the vision model" is the most interesting thing on
            the panel — it is the machine admitting what it had to do. */}
        {steps.length > 0 && (
          <ul className="look-steps">
            {steps.map((line, i) => (
              <li key={i} className={i === steps.length - 1 && phase === 'looking' ? 'is-current' : ''}>
                {line}
              </li>
            ))}
          </ul>
        )}
        {phase === 'done' && <p className="look-text">{text}</p>}
        {phase === 'done' && (
          <p className="look-tags">
            <span className="look-tag">described on the box · {(ms / 1000).toFixed(1)}s</span>
            {voice && (
              <span className="look-tag">
                {voice === 'kokoro' ? 'spoken on the box' : `spoken by ${voice}`}
              </span>
            )}
          </p>
        )}
        {/* WHEN THE VOICE CAME FROM THE CLOUD, SAY WHY.
            The box speaks when it can; when it is asleep or busy, the cloud
            covers. That is the same arrangement the assistant has always had
            with Gemini, and the honest move is to name it rather than let a
            visitor assume every word came from the basement. Shown only on
            the fallback — when Kokoro spoke, the tag already says so and a
            note would be noise. */}
        {voice && voice !== 'kokoro' && (
          <p className="look-note">
            The box could not speak just then — it may be asleep or busy — so
            the cloud read it instead. Everything you see above still came
            from the machine: it drew the picture and described it.
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
