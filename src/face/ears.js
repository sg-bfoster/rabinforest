/**
 * RabinAI Face — ears. The browser's own speech recognition (Web Speech API).
 *
 * WHERE THE AUDIO GOES, honestly, because the page has to say it:
 *   - 'local': recognition runs on this device (newer Chrome can, once its
 *     language pack is installed). Nothing is sent.
 *   - 'cloud': the browser sends the audio to its speech service to be turned
 *     into words — Google's in Chrome, Apple's in Safari. This page keeps none
 *     of it and never sees the audio, only the words that come back.
 * earsMode() finds out which BEFORE the visitor is asked, so the consent copy
 * can be exact rather than reassuring.
 */

const Rec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const LANG = 'en-US';

export const earsSupported = () => !!Rec;

/**
 * 'local' | 'downloadable' | 'cloud' | 'none'. Never asks for the microphone.
 * 'downloadable': cloud for now, but this browser can do it on-device after a
 * one-time language-pack download (installLocal()).
 */
export async function earsMode() {
  if (!Rec) return 'none';
  // On-device recognition is newer than the API itself: feature-detect it and
  // treat anything unexpected as "not available" rather than guessing.
  try {
    if (typeof Rec.available === 'function') {
      const status = await Rec.available({ langs: [LANG], processLocally: true });
      if (status === 'available') return 'local';
      if (status === 'downloadable' || status === 'downloading') return 'downloadable';
    }
  } catch { /* older shape or not supported: fall through */ }
  return 'cloud';
}

/**
 * Download the on-device language pack (Chrome). Must run from a click.
 * Resolves true once recognition can run locally.
 */
export async function installLocal() {
  if (!Rec || typeof Rec.install !== 'function') return false;
  try {
    const ok = await Rec.install({ langs: [LANG], processLocally: true });
    if (ok === false) return false;
    return (await earsMode()) === 'local';
  } catch (err) {
    console.warn('[ears] install', err);
    return false;
  }
}

/**
 * Start listening. Callbacks:
 *   onWords(text, isFinal, index)  every interim and final transcript; index identifies the phrase
 *   onSpeaking(bool)        roughly: is someone talking right now
 *   onStop(reason)          ended for good ('denied' | 'error' | 'stopped')
 * Returns { stop() }.
 */
export function startEars({ mode, onWords, onSpeaking, onStop }) {
  const rec = new Rec();
  rec.lang = LANG;
  rec.continuous = true;
  rec.interimResults = true;
  if (mode === 'local') { try { rec.processLocally = true; } catch { /* ignore */ } }

  let alive = true, quietTimer = 0;
  const speaking = (on) => {
    clearTimeout(quietTimer);
    if (on) { onSpeaking?.(true); quietTimer = setTimeout(() => onSpeaking?.(false), 900); }
    else onSpeaking?.(false);
  };

  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      onWords?.(r[0]?.transcript ?? '', r.isFinal, i);
    }
    speaking(true);
  };
  rec.onspeechend = () => speaking(false);
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { alive = false; onStop?.('denied'); }
    else if (e.error === 'no-speech' || e.error === 'aborted') { /* quiet; onend restarts */ }
    else { console.warn('[ears]', e.error); }
  };
  // Continuous recognition still ends on its own after silence or a time cap.
  // Restart it for as long as the visitor has it switched on.
  rec.onend = () => {
    if (!alive) return;
    try { rec.start(); } catch { alive = false; onStop?.('error'); }
  };
  rec.start();

  return {
    stop() {
      alive = false;
      clearTimeout(quietTimer);
      try { rec.abort(); } catch { /* already stopped */ }
      onSpeaking?.(false);
      onStop?.('stopped');
    },
  };
}
