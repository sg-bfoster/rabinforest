import React, { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

const POLL_MS = 5000;

const STATE = {
  warm: {
    dot: 'ok',
    short: 'awake',
    text: "RabinAI is awake — answering from a mini PC in Brian's house",
    hint: 'The home box is primed and answering questions directly.',
  },
  warming: {
    dot: 'warn',
    short: 'warming',
    text: 'RabinAI is warming up — Gemini is covering answers for about half a minute',
    hint: 'The box is priming its cache — Gemini is covering answers until it takes over (about half a minute).',
  },
  cold: {
    dot: 'warn',
    short: 'starting',
    text: 'RabinAI is coming online — Gemini is covering answers meanwhile',
    hint: 'The box is coming online — Gemini is covering answers in the meantime.',
  },
  offline: {
    dot: 'off',
    short: 'asleep',
    text: 'RabinAI is asleep — answers are coming from Google Gemini',
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
        if (alive) setStatus({ engine: 'offline', images: 'idle', language: 'idle' });
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timerRef.current);
    };
  }, []);

  if (!status) return null;

  const s = STATE[status.engine] || STATE.offline;
  const rendering = status.images === 'rendering';
  const answering = status.language === 'answering';
  const switching = status.swap === 'switching';

  // A render owns the iGPU, and the assistant shares it. Measured: a render
  // starves generation badly enough that an answer can miss its deadline and
  // fall to Gemini. So while drawing, the chip is amber and says "may fall
  // back" rather than green and "answering directly" — green there would be
  // claiming more than the machine can deliver, which is the one thing this
  // chip exists not to do.
  //
  // language: answering is a real /chat/completions in flight (or the short
  // linger so a 5s poll can see a ~2s turn). It does not name the caller.
  const view = switching
    ? {
        dot: 'warn',
        short: 'switching',
        text: 'RabinAI is changing models — Gemini is covering answers',
        hint: 'The box is unloading one model and loading another. Questions asked right now go to Gemini.',
      }
    : rendering
    ? {
        dot: 'busy',
        short: 'drawing',
        text: 'RabinAI is drawing an image — answers may fall back to Gemini until it finishes',
        hint: 'The box is rendering an image, which uses the same GPU the assistant runs on. Questions asked right now may be answered by Gemini instead.',
      }
    : answering
      ? {
          dot: 'reply',
          short: 'answering',
          text: 'RabinAI is answering a prompt from the box right now',
          hint: 'The home box is generating a reply. This is the machine, not Gemini.',
        }
      : s;

  return (
    <div
      className={`rabinai-status rabinai-status-${view.dot}`}
      title={view.hint}
      role="status"
      aria-live="polite"
      aria-label={view.text}
    >
      <span className="rabinai-status-dot" aria-hidden="true" />
      <span className="rabinai-status-text">
        <span className="rabinai-status-name">RabinAI</span>
        {view.short}
      </span>
    </div>
  );
}
