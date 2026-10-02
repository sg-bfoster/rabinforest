# RabinAI Face — scope plan

**Status:** scope only, 2026-10-02. Nothing is built. Build when Brian says build.

**Decided (Brian, 2026-10-02):**
- **VISION_MODEL_PLAN §6 stands.** No camera pixel reaches the box. v1 notices
  by label only.
- **An abstract RabinAI presence, not a human face** (§3a). No uncanny valley
  to fall into, and it belongs to the brand instead of imitating a person.
- **Lives in rabinforest**, as a new route alongside `LookAtIt.js`.
- **One RabinAI voice:** the same Kokoro `af_heart` as read-aloud.
- **It only responds; it never speaks first.** It looks, reacts and waits.
  The visitor holding something up (or answering) is the only thing that
  makes it talk.

A RabinAI presence on the page that looks back at the visitor, reacts to their expressions,
and — the RabinAI part — notices what they hold up and asks about it, out loud,
in the box's voice.

---

## 0. The constraint this plan is shaped around

`bfoster-services/docs/VISION_MODEL_PLAN.md` §6:

> **NO UPLOAD.** The box describes ONLY images it just drew. Accepting
> arbitrary images means someone eventually sends something illegal for a
> machine in Brian's basement to process … this one is not negotiable for a
> portfolio piece.

A webcam frame is the most arbitrary image there is. So the obvious design —
stream snapshots to Qwen2.5-VL on the box — is **ruled out by an existing
decision**, not by this plan. Everything below keeps that rule intact:

**No camera pixel ever reaches the box.** The browser looks; the box only ever
receives *words*.

Reversing §6 was considered and declined (2026-10-02). If richer noticing is
ever wanted, frames go to Gemini, never to the box — and that would be a new
decision, not a tweak.

---

## 1. The idea in one picture

```
 BROWSER (every frame, ~30/s, nothing leaves)          BOX (only when something happens)
 ─────────────────────────────────────────────         ─────────────────────────────────
 webcam ──► MediaPipe Face Landmarker                   
              • 52 expression values (blendshapes)      
              • head pose, gaze target                  
         ──► MediaPipe Object Detector                  
              • "cup, 0.82, held up near face"  ──────► text event ──► LLM: one short question
                                                                       ──► code safety gate
 3D face ◄── deterministic behaviour rules                              ──► Kokoro: speak it
   • eye contact, blinks, glances                       ◄────────────── audio + the question text
   • reacts (doesn't copy) to expressions
   • "thinking" face while waiting
   • mouth driven by the audio's loudness
```

Two loops at two speeds, which is the same split elder-app uses: **AI for
perception, code for behaviour.**

- **Fast loop (browser):** perception models are small neural nets running
  on the visitor's device. Everything the face *does* is hand-written rules.
  No server, no cost, works with the box off.
- **Slow loop (box):** fires on events, not on a timer stream. Receives a
  short text description of the event, never an image.

## 2. Lineage — none of this is invented here

| Piece | Established pattern it comes from |
| --- | --- |
| Face → avatar | ARKit/Animoji blendshapes; VTuber rigs (VSeeFace); Kalidokit (MediaPipe → VRM); MediaPipe's own Three.js avatar demo |
| Looks-back gaze | Eye-contact / gaze-following in social robotics (Kismet, Jibo): track the face, aim eyes and head, add saccades |
| React, don't mirror | Social robotics again: delayed, partial mimicry reads as empathy; exact mirroring reads as mockery or as broken |
| Cheap detector gates expensive model | Cascade detection; Frigate NVR (object detector on every frame, GenAI description only per event) |
| Pattern-based output gate | `bfoster-services/server/imagery/moderate.js` — "the trigger is a readable pattern list, never the AI's judgment" |
| Box with cloud fallback | Every RabinAI feature today (`X-TTS-Engine`, Gemini fallback) |

## 3a. The form: abstract, not human

Not a human face, so nothing to get almost-right. A RabinAI presence: a soft
glowing form (orb or rounded blob) with **two eyes and a mouth-line**, rendered
in Three.js with a shader, in the RabinAI palette.

Why this works better than a human face:
- **Eyes carry nearly all of it.** Gaze, blinks, squints and lids do the
  emotional work in character animation (Pixar's lamp, WALL·E, BB-8 have no
  face at all). Two eyes that hold your gaze read as alive.
- **No uncanny valley.** Nobody expects an orb to look human, so small errors
  read as personality, not as wrongness.
- **Cheap to render, easy on phones.** One mesh and a shader, not a rigged head
  with 52 morph targets.
- **It's RabinAI, not a stand-in person.** The same presence can live on other
  pages later (thinking during a render, speaking read-aloud).

How the 52 blendshapes map onto it — a handful, not all 52:

| Visitor signal | Form's response |
| --- | --- |
| `mouthSmile*` | eyes curve into crescents; form brightens and lifts slightly |
| `browInnerUp`, `browOuterUp*` | eyes widen, form stretches upward |
| `eyeBlink*` | form blinks (sometimes with them, see §3) |
| `jawOpen` (visitor talking) | form leans in, glow pulses gently — "listening" |
| head pose | whole form tilts and turns toward them |
| no face | dims, drifts, eyes wander — idle |
| own speech (Kokoro audio) | mouth-line opens with loudness; glow pulses with it |

Inspiration to look at before designing it: Apple's Siri orb, Pi's breathing
dot, BB-8's head, the "Eyes" in Cozmo/Vector robots.

## 3. What the face does (deterministic, browser only)

All of this is ordinary code over the 52 blendshape values and the head pose.

- **Eye contact.** Aim eyes, then head (lagging, damped), at the visitor's face
  position in frame. Micro-saccades every 0.5–2s. Glance away every 8–20s and
  come back — constant staring is the uncanny part.
- **Blink** on its own schedule (2–6s, randomised), and occasionally *with* the
  visitor (when their `eyeBlink*` fires), which reads as attention.
- **React, not mirror.**
  - Visitor smiles ≥ 0.5s → face smiles back after 300–600ms, at ~70% strength.
  - Brows up → brows up, smaller.
  - Visitor looks away → face follows their gaze briefly, then returns.
  - No face for 5s → idle: looks around, small breathing motion.
- **Thinking state** while the slow loop is out: eyes up-left, slight squint,
  head tilt. A 2–4s wait then reads as consideration, not lag.
- **Talking:** the mouth-line and glow follow a Web Audio `AnalyserNode` on
  Kokoro's audio (loudness → opening and pulse). An abstract form needs no
  visemes at all.

## 4. What the box does (text in, words and audio out)

### Triggers — the only times the slow loop fires

It only responds (decided 2026-10-02), so there are just two, and the visitor
causes both. No "arrived" greeting and no unprompted comments on the room:
an arrival gets eye contact and a reaction, not words.

| Trigger | Detected by (browser) | What the box receives |
| --- | --- | --- |
| Object held up | Object Detector class ∉ {person} with box overlapping a hand (Hand Landmarker) and near the face, held ≥ 1s | `{"event":"held_up","label":"cup","confidence":0.82}` |
| Visitor answers | Browser speech recognition (Web Speech API), opt-in | `{"event":"reply","text":"…"}` (capped at 200 chars) |

The detector knows the 80 COCO classes (cup, book, phone, banana, scissors,
teddy bear, laptop…). That is a real limit: a vinyl record or a cat-shaped mug
comes through as its nearest class or not at all. **That limit is also the
safety property** — see §5.

### Pipeline per event

1. `POST /ai/face/notice` (bfoster-services) with the event JSON. No image field
   exists in the schema; the route rejects any body over 2KB.
2. LLM on the box (the resident assistant model) writes **one** short, curious
   question, as JSON: `{"about":"cup","question":"Is that coffee or tea?"}`.
3. **Safety gate in code** (§5). Fail → a canned line for that event.
4. Kokoro speaks it via the existing `/ai/readaloud` path; `X-TTS-Engine` comes
   back as today.
5. Box off or busy → Gemini writes the question (text only), OpenAI TTS speaks
   it — the same fallback the page already discloses.

## 5. Safety rules — code, not prompt

1. **The box never sees pixels.** No image field, no upload route, body ≤ 2KB.
   §6 of VISION_MODEL_PLAN stands.
2. **It talks about things, never about people.** `person` is not a label the
   box is ever sent. The model's JSON `about` must equal the label it was given
; anything else is rejected.
3. **Pattern gate on every question before it is spoken.** A readable deny-list
   in the style of `moderate.js`: bodies, faces, age, weight, skin, ethnicity,
   gender, attractiveness, health, and second-person appearance phrasings
   ("you look", "your face", "your hair"). Over-blocks on purpose; a miss
   becomes a canned line ("What's that you've got there?"), never silence that
   looks broken.
4. **Consent is two-step.** Camera on → face tracking only, nothing leaves the
   browser, and the page says exactly that. Voice questions are a second,
   explicit opt-in, and even then only words leave.
5. **Nothing stored.** Events are not persisted; logs record the event type,
   the label and whether the gate passed — never reply text from the visitor.
6. **Visible when it's "noticing".** The face shows a looking state, and a
   small caption shows the exact words sent ("you held up: cup").
7. **Rate limits.** ≤ 1 box call per visitor per 8s, ≤ 20 per session; a global
   queue so ten visitors can't starve the assistant. Over the limit → the face
   just reacts, no question.

## 6. Capacity on the box

- Text-only means **no VLM**, so the "any two of three" residency rule is not
  touched: this rides on the already-resident assistant model plus Kokoro.
  SDXL renders are unaffected. (A VLM design would have kept Qwen2.5-VL loaded
  for the length of every visit and locked out renders.)
- Prompt is tiny (~300 tokens incl. system prompt) and the system prompt is a
  stable prefix, so it hits the prefix cache (0.1s, build-log 2026-09-13). The
  cost is generation: ~20 tokens at ~25–30 tok/s ≈ 1s, plus Kokoro.
- Expected question latency: **~1.5–3s** box-warm. The thinking face covers it.

## 7. Cost

| | Estimate |
| --- | --- |
| Run cost, box path | ~$0 (electricity) |
| Run cost, fallback | Gemini text + OpenAI TTS per question; pennies per visitor, capped by §5.7 |
| Build: silent face (§3, §3a) | ~a weekend: one shader-driven form, eyes, MediaPipe |
| Build: notice-and-ask (§4–5) | 2–3 weekends; backend is small because readaloud + fallback exist |
| Build: art | Smaller than a human face would be — one form and a pair of eyes — but tuning how the eyes *feel* is still most of the polish |

## 8. Anti-goals

- **Not photoreal.** Uncanny valley, and a realistic animated face needs a GPU
  per visitor (LivePortrait-class) that neither the box nor a static site has.
- **Not exact mirroring.** Copying reads as mockery or as a bug.
- **No image to the box, ever** (unless §0 is reversed on purpose).
- **No comments on people.** Not "you look happy", not "nice shirt" — clothing
  is on the person; v1 keeps to held objects.
- **No open conversation.** One question, at most one follow-up, then back to
  just looking. The same reasoning that removed elder-app's open chat: open
  chat is where unbounded cost and unbounded output live.
- **Never speaks first.** No greeting, no remarks on the room. Silence until
  the visitor shows it something.
- **No recording, no gallery, no "share your session".**
- **Not a product for kids**, and the consent copy shouldn't pretend otherwise:
  expect them anyway, which is why §5 is code.

## 9. Phases

1. **Silent face.** The §3a form, MediaPipe Face Landmarker, §3 rules, idle state
   with camera declined. Ships alone; it's already a page.
2. **Notices.** Object + hand detection in browser, the caption ("you held up:
   cup"), but canned questions only — no box yet. Proves triggers feel right.
3. **Asks.** `/ai/face/notice`, box LLM, safety gate, Kokoro, fallback.
4. **Listens** (opt-in): Web Speech API reply → one follow-up.
5. **Polish:** tune the eyes and glow, phone performance pass.

Each phase is usable on its own; stop wherever it stops being worth it.

## 10. Open questions for Brian

1. ~~**Keep VISION_MODEL_PLAN §6?**~~ **Decided 2026-10-02: yes, §6 stands.** The note below is kept for if it is ever revisited. If you want richer
   noticing than 80 labels ("that's a signed baseball"), the least-bad route is
   frames to **Gemini** (Google's safety stack and legal posture, not your
   basement), *never* to the box — and it costs per frame. My recommendation:
   ship label-only and see if anyone misses the richness.
2. ~~**Stylised how?**~~ **Decided 2026-10-02: abstract RabinAI presence (§3a).** Original question: Cartoon, sculpted/clay, abstract (a glowing orb with eyes)?
   An abstract "RabinAI" presence dodges the uncanny valley entirely and might
   suit the brand better than a human face.
3. ~~**Where does it live?**~~ **Decided 2026-10-02: rabinforest**, a new route next to `LookAtIt.js`.
4. ~~**Voice?**~~ **Decided 2026-10-02: the same Kokoro `af_heart` as read-aloud.** RabinAI has one voice.
5. ~~**Should it ever speak first?**~~ **Decided 2026-10-02: no, it only responds.** The "arrived" and "room glance" triggers are cut (§4).

All five answered; nothing open blocks phase 1.
