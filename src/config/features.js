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
   * ON as of 2026-09-17. Kokoro serves it from the box through
   * tts.rabinai.com, behind the same Access service token as llm and
   * rabinai-img. Verified before flipping, not after: production
   * /ai/readaloud answered 200 with X-TTS-Engine: kokoro, and a synthesis
   * straight through the tunnel returned 145KB of valid mp3 in 3.0s.
   *
   * This waited on the box on purpose. The path worked on the OpenAI fallback
   * for weeks, but shipping it then would have meant a button presented as
   * the machine's own voice that was really the cloud's — and every click
   * would have spent money on a feature nobody had asked for.
   *
   * The fallback REMAINS, deliberately: when the box is asleep or busy the
   * cloud covers, and LookAtIt.js reads X-TTS-Engine and says so rather than
   * letting a visitor assume. The page's claim is "the box speaks when it
   * can", which is checkable instead of asserted — that tag is how you check.
   */
  readAloud: true,

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
