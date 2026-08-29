/**
 * Build-time feature flags.
 *
 * Deliberately plain constants, not env vars or remote config: these are read
 * at a glance, they cannot drift between environments, and flipping one is a
 * commit with a diff you can point at.
 *
 * A flag here means the code is finished but not turned on yet. Delete the
 * flag once a feature is permanently on — a flag that has been `true` for six
 * months is just noise pretending to be a switch.
 */
export const FEATURES = {
  /**
   * Read-aloud button on assistant answers (POST /ai/readaloud).
   *
   * OFF while narration waits on Kokoro. The path works end to end on the
   * OpenAI fallback — chunked, ~2.3s to first audio — but on that engine every
   * click spends real money for a feature nobody asked for yet, and the box
   * that makes it cheap and fast is not serving TTS yet (home-ai-box guide
   * §10a). Flip to true once KOKORO_URL is set and answering.
   *
   * The backend endpoint stays live either way: it is origin-gated, and it is
   * what you will test against when turning this on.
   */
  readAloud: false,

  /**
   * Chat Bots: let the visitor choose which model fills the local seat.
   *
   * OFF until gpt-oss-20b is actually downloaded on the box. The server
   * allowlist already resolves the key safely, but offering a choice that
   * always 503s is worse than offering no choice — the box answering "asleep"
   * for one option and not the other reads as a broken site, not a toggle.
   *
   * Flip to true once /v1/models on the box lists both.
   */
  localModelToggle: false,

  /**
   * RabinAI Imagery: the box draws a visitor's prompt live, step by step
   * (POST /ai/imagery/generate, SSE).
   *
   * ON in local dev (`npm run dev`) so the page can be designed and
   * exercised against a local backend without deploying; OFF in every
   * build, so production cannot show it even if this ships early. Stage 4
   * replaces this with `true` after the bad-prompt pass — see
   * bfoster-services/docs/RABINAI_IMAGERY_PLAN.md. The server has its own
   * independent gate (RABINAI_IMAGERY=on) either way.
   */
  rabinaiImagery: true,
};
