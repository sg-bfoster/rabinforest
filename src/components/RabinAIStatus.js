import React, { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

/**
 * RabinAIStatus — an ambient readout of what Brian's home inference box is doing.
 *
 * Polls the curated /ai/rabinai/status snapshot (engine warmth + whether it's
 * rendering an image) and shows it as a small chip next to the site logo. The
 * point is honesty: a cold box fails open to Gemini *instantly* (no wait), so
 * this isn't a progress bar for a delay — it's "here's what the real machine is
 * doing," so a Gemini-answered turn reads as expected rather than a glitch.
 * See bfoster-services/docs/RABINAI_STATUS_PLAN.md.
 */
const POLL_MS = 5000;

const STATE = {
  warm: {
    dot: 'ok',
    text: 'ready',
    hint: 'The home box is primed and answering questions directly.',
  },
  warming: {
    dot: 'warn',
    text: 'warming up',
    hint: 'The box is priming its cache — Gemini is covering answers until it takes over (about half a minute).',
  },
  cold: {
    dot: 'warn',
    text: 'priming',
    hint: 'The box is coming online — Gemini is covering answers in the meantime.',
  },
  offline: {
    dot: 'off',
    text: 'asleep',
    hint: 'The box is off right now — answers come from Google Gemini.',
  },
};

export default function RabinAIStatus() {
  const [status, setStatus] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const r = await fetch(API_ENDPOINTS.RABINAI_STATUS, { credentials: 'omit' });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        if (alive) setStatus(d);
      } catch {
        // Fail quiet: if the status endpoint itself is unreachable, show asleep
        // rather than an error — the assistant still works via failover.
        if (alive) setStatus({ engine: 'offline', images: 'idle' });
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timerRef.current);
    };
  }, []);

  if (!status) return null; // nothing until the first poll resolves

  const s = STATE[status.engine] || STATE.offline;
  const rendering = status.images === 'rendering';

  return (
    <div
      className={`rabinai-status rabinai-status-${s.dot}`}
      title={rendering ? `${s.hint} It's also drawing an image right now.` : s.hint}
      role="status"
      aria-live="polite"
      aria-label={`RabinAI ${s.text}${rendering ? ', drawing an image' : ''}`}
    >
      <span className="rabinai-status-dot" aria-hidden="true" />
      <span className="rabinai-status-text">
        <span className="rabinai-status-who">RabinAI </span>
        {s.text}
        {rendering ? ' · drawing' : ''}
      </span>
    </div>
  );
}
