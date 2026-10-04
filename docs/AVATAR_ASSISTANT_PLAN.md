# Avatar Assistant — scope plan

**Status:** phases A and B built 2026-10-03 (A: v0.4.134; B: v0.4.144); the
typed box (half of C) and the nav/sitemap listing (most of F) 2026-10-04.
Memory (D, at 3 turns) and tap to stop (the rest of C) 2026-10-04. Committed,
not pushed. Not built: the spoken eval suite (E). See §13–§15.

**Decided (Brian, 2026-10-03: "build phase A, 5 turns"):** the §12
recommendations, plus 5 turns of memory.
- **Logging (q1):** log like Home; the page now says questions and answers are
  kept, audio never.
- **Where (q2):** the face page becomes "Talk to RabinAI"; Home links to it
  (copy and link land in phase F).
- **Memory (q3):** 5 turns, forgotten on idle (phase D).
- **Small talk (q4):** `/ai/face/reply` stays, as the fallback when the
  assistant can't answer.
- **Contact by voice (q5):** disabled, Contact card instead.

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

## 13. What phase A built (2026-10-03)

**Server** (`bfoster-services` `7612c44`): `spoken: true` on
`/ai/gemini-assistant`.
- `face.checkQuestion` first: about-the-visitor questions return the canned
  line, `engine: 'canned'`, no model call.
- Never emails. Contact intent gets the Contact-page instruction, and
  `face.spokenReply` replaces any "I've sent Brian an email" claim with a fixed
  line plus the Contact link: code, not prompt.
- Reply gated like the face's own (no HTML/markdown/URLs, ≤2 sentences, links
  http(s) only, max 4). Face limiter on spoken requests only.
- `face.SPOKEN_STEER` sits on the END of the system prompt and only in what the
  models read; the box's primed-prefix check stays on Home's prompt, so a face
  question reuses Home's warm cache rather than drifting it.
- Non-streamed (phase B streams). Response: `{ response: '{"text","links","gated"}', engine, model, spoken: true }`.

**Page** (v0.4.134): questions go to the assistant (one `face_…`
conversationId per page load), fall back to `/ai/face/reply`, then to "I
couldn't think of an answer". Links render as cards under its words, never
read out. Hearing's "Where does it go?" now says words are kept and audio
never is. No memory yet (phase D): each question goes without history.

**Measured locally, not on production:** the box answered once in 8.3s and
timed out once at its 20s grant (Gemini covered in ~1s); Gemini alone
answered in ~1-2s. So first word is plausibly 10s+ on the box until phase B,
and phase E should measure it properly before anyone promises a number.

**Not yet checked by a person:** the page in a browser with a real voice
question, link cards on a phone, and how the answers SOUND.

## 14. What phase B built (2026-10-03)

**Server:** `{ spoken: true, stream: true }` streams. `face.createSpokenStream`
turns the box's text deltas into whole sentences, gates each one (same rules as
§13), and the route sends each as a `say` frame the moment it is complete; the
done frame carries what was said, plus links. Gemini and canned answers still
come whole. A `say` frame commits content, so after sentence 1 there is no
failover: a box that dies mid-answer leaves one whole sentence, never a
fragment.

**Page:** a small voice queue (`createVoice`). Each sentence's Kokoro audio is
requested the moment the sentence arrives and the clips play strictly in order,
so sentence 2's voice is being made while sentence 1 plays.

**Measured locally (box warm):** sentence 1's voice requested at 5.2-6.1s
against an answer stream that ran to 10.0-10.8s: about 4-5s sooner to the first
word. gpt-oss often writes ONE long sentence regardless of the steering, which
caps the gain; a run-on now ends at its last clause break as a full stop rather
than mid-word.

**Not yet:** listened to by a person; measured on production (phase E).

## 15. Since phase B (2026-10-04)

- **Typed question box** (v0.4.164): under the wake button, always there.
  Typing to a sleeping face wakes it "quiet": eyes open, voice on, camera and
  microphone never requested. "Let it see and hear you" adds the senses.
  This is the path for browsers with no speech recognition, for quiet places,
  and for anyone who can't or won't use a mic.
- **Browser checks** (v0.4.163): says what this browser can't do before waking.
- **Leaving turns it off** (v0.4.162): hidden tab or another page stops the
  camera, mic and voice.
- **Listed** (v0.4.160): "Avatar" in the nav, in the sitemap, indexable.
- **Voice:** the "tin can" robot, picked by ear. **Look:** the blue pill; two
  attempts at styling it after Brian were dropped.
- Server: spoken mode names sites instead of describing them; "GA" is said as
  Georgia; outcomes are counted (who answered, and why not the box).
- **Memory, phase D** (v0.4.165): the last **3** exchanges (not §7's 5; Brian
  chose 3 to keep the box's re-read small), in the tab only. Forgotten after
  two quiet minutes and when it goes to sleep. Only real answers are
  remembered, as what it actually said; built-in lines and answers cut short
  by sleep are not. The server clamps to the same 3 (`face.clampHistory`).
- **Tap to stop, the rest of phase C** (v0.4.166): tap the face, press Escape,
  or use the Stop button, while it's thinking or talking. Thinking: the
  request is aborted, nothing is said, no fallback is asked. Talking: the clip
  stops and no further sentence plays. It stays awake and goes back to
  listening. A stopped answer is remembered as far as it got; one cut by sleep
  is not. Voice barge-in (§6) is still not built.

