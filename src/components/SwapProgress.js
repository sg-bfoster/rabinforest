import React, { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

/**
 * Narrates a model swap: which model is arriving, and which of the three
 * phases is running.
 *
 * A swap is not one thing. Measured on this box: unloading is a few seconds,
 * loading from disk is ~12s, and the prefix prime that follows is ~50s. A
 * single "switching" spinner for a minute reads as broken; naming the phase
 * and counting it up reads as a machine doing work.
 *
 * Renders nothing at all when the box is steady — this is an interruption
 * notice, not a permanent widget.
 */
const STEPS = [
  { key: 'unloading', label: 'Unloading the current model', typical: '~5s' },
  { key: 'loading', label: 'Loading the new model from disk', typical: '~12s' },
  { key: 'priming', label: 'Priming the knowledge base', typical: '~50s' },
];

const shortModel = (id) => (id ? String(id).split('/').pop() : null);

/** Which step is live, given the two independent signals the server sends. */
const activeStep = (status) => {
  if (!status) return null;
  if (status.swap === 'switching') {
    // 'verifying' is instant and invisible; treat it as still loading.
    return status.swapPhase === 'unloading' ? 'unloading' : 'loading';
  }
  if (status.engine === 'warming') return 'priming';
  return null;
};

export default function SwapProgress() {
  const [status, setStatus] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.RABINAI_STATUS);
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setStatus(data);
      } catch {
        /* a failed poll is not worth surfacing here */
      }
    };
    tick();
    // Faster than the header chip: this exists to watch a transition, and at
    // 5s a stale frame is indistinguishable from a stuck one.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') tick();
    }, 2000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const step = activeStep(status);

  // Elapsed is measured from when THIS phase began, not from the whole swap,
  // so each line's number means something.
  useEffect(() => {
    if (!step) {
      startedRef.current = null;
      setElapsed(0);
      return;
    }
    const serverStart =
      step === 'priming' ? status?.warmingSince : status?.swapPhaseAt;
    startedRef.current = serverStart || startedRef.current || Date.now();
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.round((Date.now() - startedRef.current) / 1000))),
      1000,
    );
    return () => clearInterval(id);
  }, [step, status?.warmingSince, status?.swapPhaseAt]);

  if (!step) return null;

  const target = shortModel(status?.swapTo) || shortModel(status?.model);
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="swap-progress" role="status" aria-live="polite">
      <div className="swap-progress-head">
        <span className="swap-progress-dot" aria-hidden="true" />
        <strong>
          {status?.swap === 'switching' ? 'Changing model' : 'Warming up'}
          {target ? ` — ${target}` : ''}
        </strong>
        <span className="swap-progress-note">Gemini is answering meanwhile</span>
      </div>
      <ol className="swap-progress-steps">
        {STEPS.map((s, i) => {
          const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo';
          return (
            <li key={s.key} className={`swap-step is-${state}`}>
              <span className="swap-step-mark" aria-hidden="true">
                {state === 'done' ? '✓' : state === 'active' ? '●' : '○'}
              </span>
              <span className="swap-step-label">{s.label}</span>
              <span className="swap-step-time">
                {state === 'active' ? `${elapsed}s` : s.typical}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
