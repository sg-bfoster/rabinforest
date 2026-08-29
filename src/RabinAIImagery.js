import React, { useRef, useState } from 'react';
import API_BASE_URL from './config/api';

/**
 * RabinAI Imagery — the box draws your prompt, and you watch it work.
 *
 * The console is the feature: real step frames from the machine (queued,
 * step k/8, decoding) streamed over SSE while an SDXL Lightning checkpoint
 * renders on the mini PC. The image arrives as base64 in the final event
 * and lives only in this tab — nothing is saved, nothing has a URL.
 *
 * Honest states, per the plan: when the box is asleep or the queue is
 * full, the page says so plainly. There is no cloud fallback on purpose —
 * "my machine is off right now" is part of the story.
 */

const IDLE_HINT = 'a lighthouse on a rocky coast at dusk, warm lamplight';

const RabinAIImagery = () => {
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | running | done | error
  const [frames, setFrames] = useState([]);
  const [image, setImage] = useState(null);
  const [meta, setMeta] = useState(null);     // { ms, seed }
  const [errorMsg, setErrorMsg] = useState('');
  const consoleRef = useRef(null);

  const pushFrame = (line) => {
    setFrames((prev) => [...prev, line]);
    // Keep the newest line visible as the console grows.
    requestAnimationFrame(() => {
      const el = consoleRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const generate = async (e) => {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || phase === 'running') return;

    setPhase('running');
    setFrames([]);
    setImage(null);
    setMeta(null);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/ai/imagery/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });

      // Non-SSE replies are the refusals: moderation 400, busy 503,
      // daily cap 429. All carry { error } with a plain message.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `The machine did not answer (HTTP ${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let event = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('event: ')) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          let d;
          try { d = JSON.parse(line.slice(6)); } catch { continue; }
          if (event === 'step') {
            pushFrame(`[${((d.ms || 0) / 1000).toFixed(1).padStart(5)}s] ${d.label}`);
          } else if (event === 'done') {
            setImage(d.image);
            setMeta({ ms: d.ms, seed: d.seed });
            setPhase('done');
          } else if (event === 'error') {
            throw new Error(d.message || 'The machine could not finish this one.');
          }
        }
      }
      // Stream ended without a done event and without an error event —
      // treat silence as failure rather than leaving the console spinning.
      setPhase((current) => (current === 'running' ? 'error' : current));
      setErrorMsg((current) => current || 'The stream ended early. Nothing was saved.');
    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      <h2 className="screen-h2">Drawn in the basement.</h2>
      <p className="screen-sub">
        Type a prompt and RabinAI — the mini PC that answers this site's
        assistant — paints it live. What you're watching in the console is
        the actual machine working, step by step, over an encrypted tunnel
        into the house. About half a minute per image. Nothing is saved:
        the picture exists in this tab and nowhere else.
      </p>

      <form onSubmit={generate}>
        <div className="chat-input-row">
          <input
            className="input"
            type="text"
            value={prompt}
            maxLength={400}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={IDLE_HINT}
            aria-label="Image prompt"
            disabled={phase === 'running'}
          />
          <button type="submit" className="btn btn-primary" disabled={phase === 'running' || !prompt.trim()}>
            {phase === 'running' ? 'Painting…' : 'Generate'}
          </button>
        </div>
      </form>

      {phase !== 'idle' && (
        <div className="imagery-console" ref={consoleRef} aria-live="polite">
          {frames.map((line, i) => (
            <div key={i} className="imagery-console-line">{line}</div>
          ))}
          {phase === 'running' && (
            <div className="imagery-console-line">
              <span className="stream-cursor">▍</span>
            </div>
          )}
          {phase === 'error' && (
            <div className="imagery-console-line imagery-console-error">{errorMsg}</div>
          )}
        </div>
      )}

      {image && (
        <figure className="imagery-result">
          <img src={image} alt={prompt} />
          <figcaption>
            {(meta.ms / 1000).toFixed(1)}s on the box · seed {meta.seed} ·{' '}
            <a href={image} download="rabinai-imagery.png">save it</a> — this
            page won't remember it.
          </figcaption>
        </figure>
      )}
    </div>
  );
};

export default RabinAIImagery;
