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
};
