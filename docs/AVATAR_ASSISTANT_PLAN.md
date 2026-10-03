# Avatar Assistant — scope plan

**Status:** scope only, 2026-10-03. Nothing is built. Build when Brian says build.

The site's assistant, with a face. The same brain that answers on Home —
same knowledge about Brian, same links, same guardrails — spoken by the
RabinAI Face, which listens, reacts, and talks back.

**One brain, two front doors:** type to it on Home, or talk to it on the face
page. Not a second assistant.

Builds on `docs/RABINAI_FACE_PLAN.md`; everything there still holds unless
this plan says otherwise.

---

## 1. Lineage

This is an **embodied conversational agent** (ECA). The pattern is old and
well studied:

- **Cassell et al., REA (MIT, ~2000)** and *Embodied Conversational Agents*
  (2000): a real-estate agent with a body that used gaze, nods and gesture
  for turn-taking. The durable finding: visible *listening* behaviour —
  backchannels, gaze, leaning in — makes spoken interaction feel natural far
  more than a better voice does.
- **Backchannels** (Yngve 1970): the face's nods and "mm-hm" are already
  built (RABINAI_FACE_PLAN §11).
- **Turn-taking in spoken dialogue systems**: who speaks when, and barge-in
  (interrupting the system). The hardest part of voice UX; see §6.
- Modern product versions (Soul Machines, Hume's EVI, the "digital human"
  vendors) go photoreal. This plan deliberately does not (§10).

What's new here is small: an abstract face on an existing grounded assistant,
with the face's own safety layer on top.

## 2. What exists already

| Piece | Where | State |
| --- | --- | --- |
| The face: tracking, expressions, listening, ears, voice, mouth | `rabinforest/src/face/`, `RabinAIFace.js` | built |
| The assistant: knowledge about Brian, links, evals, rate limits | `bfoster-services` `POST /ai/gemini-assistant` | live on Home |
| Assistant streaming (SSE deltas) when the box answers | same route, `{ stream: true }` | live |
| Box with Gemini fallback, `engine` reported | same route | live |
| Kokoro voice with persona `face`, OpenAI fallback | `POST /ai/readaloud` | built (not pushed) |
| Face safety: questions about the visitor declined, answers about bodies gated | `server/face.js` | built (not pushed) |

The assistant returns `{ text, links, engine }` (or SSE `delta`s then a final
`{ done, text, links }`). The avatar needs nothing it doesn't already produce,
only a different presentation.

## 3. The design in one picture

```
 visitor speaks (or types)                 bfoster-services
 ─────────────────────────                 ──────────────────────────────────────
 ears → words ──► face.js checkQuestion ──► /ai/gemini-assistant { prompt, history,
                  (about them? canned)         conversationId, stream: true, spoken: true }
                                             │  box streams deltas (Gemini if asleep)
 page ◄── deltas ────────────────────────────┘
   │  sentence splitter: as soon as sentence 1 is complete ─►  face.js gate ─► /ai/readaloud (face)
   │  sentence 2 while sentence 1 plays ...                    (queued, played in order)
   │
   ├─ face: thinking → speaking (mouth follows audio) → listening again
   ├─ caption: the words as spoken
   └─ link cards under the face (the assistant's `links`)
```

## 4. Server changes (bfoster-services)

1. **`spoken: true` on `/ai/gemini-assistant`.** Changes the steering, in the
   **system prompt** (never appended to the user's text — models copy question
   text into tool arguments): "This answer will be spoken aloud by a small
   orb. One or two short sentences, under 35 words. Plain spoken English: no
   lists, no markdown, no URLs read out — the links are shown on screen." The
   knowledge, links and guardrails are unchanged.
2. **The face's gates apply in spoken mode:** `checkQuestion` before the
   assistant (questions about the visitor never reach it), `gateAnswer` on
   each sentence before it is spoken. A gated sentence is skipped and the
   canned line used if nothing survives.
3. **Contact / email: disabled in spoken mode.** The assistant can email Brian
   on a visitor's behalf, extracting an email or phone number from the
   conversation. By voice that's wrong twice: speech recognition mangles
   addresses, and an email can't be unsent. In spoken mode it never sends;
   it says "I'll put Brian's contact page on screen" and shows a Contact card.
   (A typed, confirmed contact flow can come later, if wanted.)
4. **Logging** — Brian's call, open question 1. The assistant stores every
   conversation in Firestore (`conversationLogs`). The face page currently
   promises "keeps none of the words". Both can't be true.
5. `/ai/face/reply` stays for the face's own small talk if the assistant is
   off, or is retired — open question 4.

## 5. Page changes (rabinforest)

1. **Questions go to the assistant**, with `history` (short memory, §7) and
   `stream: true`.
2. **Speak while it streams.** Split deltas into sentences; send each finished
   sentence to read-aloud and queue the audio. First word as soon as sentence
   1 exists, not after the whole answer.
3. **Link cards** under the face, from `links`. The Hearing card's caption
   shows the spoken words.
4. **A typed box** under the face ("or type a question"): for no-mic
   visitors, for quiet places, and as the accessible path.
5. **Tap to stop:** while it speaks, tapping the orb (or a Stop key) ends the
   audio and the turn. See §6 for why not voice barge-in yet.
6. **Thinking face** covers the wait, as now; one brow up.
7. Page title and copy become "Talk to RabinAI"; Home gets a "Talk to it
   instead" link; Header nav when it launches.

## 6. Turn-taking

- **Now:** the ears pause while it speaks and resume 400ms after, so it never
  hears itself. Simple and reliable, but the visitor can't interrupt by voice.
- **v1 interrupt: tap to stop.** Honest, works everywhere.
- **Later, voice barge-in:** needs the mic open while it speaks, which means
  echo cancellation (getUserMedia `echoCancellation`) and voice-activity
  detection on our own audio graph — the browser's speech recognition owns
  its mic and can't be told to ignore our voice. Real work; not v1.
- It still **never speaks first** (RABINAI_FACE_PLAN). It's an assistant you
  address, not one that addresses you.

## 7. Memory

- Last **5 turns**, in the tab only. Sent as `history`, like Home.
- **Forgets** after 2 minutes idle or when the face goes idle (nobody in
  front of it), and on reload. Nothing carries between visits.
- This **reverses** RABINAI_FACE_PLAN's "one question, one answer, no memory"
  (narrowed 2026-10-03). The reason it's acceptable now: the brain is the
  existing assistant, with its existing cost limits and guardrails, so the
  risk isn't new — the face adds a body, not an open model.

## 8. Latency

| Step | Now (face reply) | Avatar, non-streamed | Avatar, streamed |
| --- | --- | --- | --- |
| speech → words | ~0.5s | ~0.5s | ~0.5s |
| answer | ~3s (tiny prompt) | **unmeasured** (assistant does more) | first sentence only |
| voice | ~1.8s | ~1.8s per answer | ~1.5s for sentence 1 |
| **first word** | **~5s** | likely 6–9s | target **~4s** |

Measure the assistant's spoken-mode time-to-first-sentence on the box before
promising anything. Gemini fallback doesn't stream (route note), so a sleeping
box means a full wait: the caption says so.

## 9. Evals

Extend `eval/assistant-eval.js` with a **spoken** suite, run on the weakest
model the box may serve (gpt-oss-20b today), unpiped:
- ≤2 sentences, no markdown, no URLs in the spoken text
- the expected links still returned (spoken mode must not lose grounding)
- the same golden questions as Home: same facts, shorter form
- contact intent in spoken mode → no email sent, Contact card offered
- questions about the visitor → canned, assistant never called

## 10. Anti-goals

- **Not a digital human.** The face stays the abstract orb.
- **No voice cloning of Brian**, and it never claims to be Brian.
- **No sending email (or anything) by voice.**
- **No always-on listening:** the mic only while Hearing is switched on.
- **No vision into the brain:** the assistant gets words, never pixels
  (VISION_MODEL_PLAN §6 unchanged).
- **No speaking first.**
- **No long memory:** 5 turns, one visit.

## 11. Phases and cost

| Phase | What | Rough cost |
| --- | --- | --- |
| A | `spoken: true` + face gates + contact disabled; page sends questions to the assistant, speaks the answer, shows link cards | 1 evening |
| B | Streaming: speak sentence 1 while the rest arrives | 1 evening |
| C | Typed box + tap to stop | half an evening |
| D | 5-turn memory, idle forgetting | half an evening |
| E | Spoken eval suite; measure first-word latency on the box | 1 evening |
| F | Launch: copy, Home link, nav, noindex off | small, after Brian has used it |

Each phase works on its own. A alone is already "the assistant with a face".

## 12. Open questions for Brian

1. **Logging.** Home logs conversations to Firestore. For the avatar: (a) log
   the same way and change the face page's copy to say so ("questions and
   answers are kept so Brian can improve it"), or (b) don't log in spoken
   mode and keep "keeps none of the words". Recommendation: **(a)** — you'll
   want transcripts to judge it, and it's the same assistant — *with* the
   copy changed. Never audio either way.
2. **Where does it live?** Recommendation: the face page becomes "Talk to
   RabinAI"; Home links to it. Alternative: the face embedded on Home beside
   the chat.
3. **Memory length:** 5 turns, forgotten on idle — or less?
4. **The face's own small talk** (`/ai/face/reply`): retire it once the
   assistant answers, or keep it as the fallback when the assistant is down?
   Recommendation: keep as fallback; it's cheap and already gated.
5. **Contact by voice:** disabled with a Contact card (recommended), or a
   typed, on-screen-confirmed flow?
