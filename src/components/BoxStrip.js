import React, { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

/**
 * A one-line console under the nav: what the box is running, and what it is
 * doing about it.
 *
 * Always present, because "which model is answering" is the most interesting
 * fact this site has and it used to be invisible until you asked. During a
 * swap it narrates the phase and counts it up — a swap is ~110s end to end
 * (unload, ~12s load, ~85s prime), and a minute of silence reads as broken.
 *
 * Console styling on purpose: it is machine output, and the imagery page has
 * already proved that showing the machine working is more compelling than
 * hiding it.
 */
const shortModel = (id) => (id ? String(id).split('/').pop() : null);

const PHASE_LABEL = {
  unloading: 'unloading current model',
  loading: 'loading model from disk',
  verifying: 'loading model from disk',
};

/** One console line describing the box right now. */
function line(status, elapsed) {
  if (!status) return { tone: 'idle', text: 'connecting to the box…' };

  const model = shortModel(status.model);
  const target = shortModel(status.swapTo);

  if (status.swap === 'switching') {
    const phase = PHASE_LABEL[status.swapPhase] || 'switching';
    return {
      tone: 'busy',
      text: `${phase}${target ? ` → ${target}` : ''}${elapsed != null ? `  ${elapsed}s` : ''}  · answers routed to Gemini`,
    };
  }
  if (status.engine === 'warming') {
    const typical = Math.round((status.warmingTypicalMs ?? 85_000) / 1000);
    const over = elapsed != null && elapsed > typical;
    return {
      tone: 'busy',
      text: `priming knowledge base${elapsed != null ? `  ${elapsed}s / ~${typical}s` : ''}` +
        (over ? '  · running long, a render may be sharing the GPU' : '  · answers routed to Gemini'),
    };
  }
  if (status.engine === 'offline') {
    return { tone: 'off', text: 'box offline · Gemini is answering' };
  }
  if (status.engine === 'cold') {
    return { tone: 'warn', text: `${model} loaded · prefix cold, first answer will be slow` };
  }
  if (status.images === 'rendering') {
    return { tone: 'busy', text: `${model} · rendering an image, answers may fall back` };
  }
  if (status.language === 'answering') {
    return { tone: 'live', text: `${model} · answering` };
  }
  // A request the box was supposed to answer just went to Gemini instead.
  //
  // 'warm' stays true through this: it describes the cached system prefix, not
  // whether a given request fits its deadline. Conversation history is appended
  // AFTER that prefix and re-prefilled every turn, so a long thread can push a
  // genuinely primed box past its budget. Reporting only 'warm, prefix cached'
  // through a turn the visitor watched stall and answer from the cloud is the
  // fake-readiness this strip exists to refuse.
  if (status.lastFallback) {
    const why = status.lastFallback.reason === 'deadline'
      ? 'missed its deadline — Gemini answered'
      : 'could not answer — Gemini answered';
    return { tone: 'warn', text: `${model} · warm, but the box ${why}` };
  }
  return { tone: 'ok', text: `${model} · warm, prefix cached` };
}

export default function BoxStrip() {
  const [status, setStatus] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const startedRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.RABINAI_STATUS);
        if (res.ok && alive) setStatus(await res.json());
      } catch { /* a failed poll is not news */ }
    };
    tick();
    let id = setInterval(() => {
      if (document.visibilityState === 'visible') tick();
    }, 5000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // Elapsed tracks the CURRENT phase, so the number describes what it sits next to.
  const phaseKey = status?.swap === 'switching' ? `swap:${status.swapPhase}`
    : status?.engine === 'warming' ? 'priming' : null;
  useEffect(() => {
    if (!phaseKey) { startedRef.current = null; setElapsed(null); return; }
    const serverStart = phaseKey === 'priming' ? status?.warmingSince : status?.swapPhaseAt;
    startedRef.current = serverStart || startedRef.current || Date.now();
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.round((Date.now() - startedRef.current) / 1000))),
      1000,
    );
    return () => clearInterval(id);
  }, [phaseKey, status?.warmingSince, status?.swapPhaseAt]);

  const { tone, text } = line(status, elapsed);

  return (
    <div className={`box-strip box-strip--${tone}`} role="status" aria-live="polite">
      <span className="box-strip-inner">
        <span className="box-strip-dot" aria-hidden="true" />
        <span className="box-strip-label">rabinai</span>
        <span className="box-strip-text">{text}</span>
      </span>
    </div>
  );
}
