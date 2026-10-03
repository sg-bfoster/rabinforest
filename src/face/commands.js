/**
 * RabinAI Face — what a heard phrase asks it to do. Plain patterns, no model.
 *
 * Same rule as the rest of the face: AI for perception (here, the browser's
 * speech recognition turns sound into words), code for behaviour. These
 * patterns are the whole vocabulary: readable, and impossible to talk into
 * doing anything that isn't listed.
 *
 * parse(text) -> { act: string | null, question: boolean }
 *   act       one of the names behaviour.act() understands
 *   question  it sounds like a question (lean in and lend an ear)
 *
 * Directions are from the VIEWER'S side: "look left" looks toward the left
 * of your screen, which is what people mean when they point at a screen.
 */

const ACTS = [
  // Order matters: more specific phrases first ("shake your head" before "head").
  ['shake', /\b(shake (your |its |the )?head|say no|shake it)\b/],
  ['nod', /\b(nod|say yes)\b/],
  ['tongue', /\b(stick|put|poke) (out )?(your |a )?tongue|\btongue out\b|\bblep\b/],
  ['wink', /\bwink\b/],
  ['smile', /\b(smile|be happy|look happy|grin)\b/],
  ['grumpy', /\b(look|be|get) (grumpy|angry|mad|cross)\b|\bfrown\b/],
  ['surprised', /\b(look|be|act) (surprised|shocked|amazed)\b/],
  ['ooh', /\bmake an? o\b|\bo face\b|\bsay (oh|ooh)\b|\bpucker\b/],
  ['close', /\b(close|shut) (your |its )?eyes\b|\bgo to sleep\b/],
  ['tilt', /\btilt (your |its )?head\b|\bcock (your |its )?head\b/],
  ['look-left', /\blook (to (the|your) )?left\b/],
  ['look-right', /\blook (to (the|your) )?right\b/],
  ['look-up', /\blook up\b/],
  ['look-down', /\blook down\b/],
];

// How a question usually starts in English, plus tag questions ("…, right?").
// Recognition rarely adds "?", so the first word is the best early signal —
// and early is the point: it should lean in WHILE you ask, not after.
const QUESTION_START = /^(what|why|how|who|whom|whose|where|when|which|can|could|would|will|won't|do|does|did|don't|doesn't|are|aren't|is|isn't|am|was|were|should|shall|have|has|may|might)\b/;
const QUESTION_TAG = /(\?|\b(right|isn't it|aren't you|don't you|do you|can you|or not))\s*$/;

export function parse(text) {
  const t = String(text ?? '').toLowerCase().replace(/[.,!]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { act: null, question: false };
  const hit = ACTS.find(([, re]) => re.test(t));
  return {
    act: hit ? hit[0] : null,
    question: QUESTION_START.test(t) || QUESTION_TAG.test(t),
  };
}
