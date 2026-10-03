# Handoff — RabinAI Face (and the Avatar Assistant plan)

**From:** a Claude session that started in `elder-app`, 2026-10-02/03.
**Delete this file** once the next session has read it and the push question
below is settled.

## Read these first

1. `docs/RABINAI_FACE_PLAN.md` — the face. **§0** (no camera pixel ever reaches
   the box), the **Decided** list at the top, and **§11** (what got built).
2. `docs/AVATAR_ASSISTANT_PLAN.md` — the next step: the Home assistant, spoken
   by the face. Scope only; **5 open questions for Brian in §12**.

## State: everything committed, nothing pushed

| Repo | Ahead of origin | Note |
| --- | --- | --- |
| rabinforest | **22** | 21 are this work; `b7f3b9c` (per-page schema) predates it |
| bfoster-services | **3** | `e96f88e` `/ai/face/reply`, `5bdf8a7` readaloud personas, `7612c44` assistant spoken mode. **Pushing deploys Heroku production.** |

**Push order if/when Brian says push:** bfoster-services first (the live page
calls `/ai/face/reply`, `persona: 'face'` and `spoken: true`), then rabinforest. The page is
**unlisted** (no nav link, `noindex`, not in the sitemap), so nothing public
changes until it's linked.

## Run it locally

```sh
cd ~/GitHub/bfoster-services && KOKORO_URL=https://tts.rabinai.com/v1 node server.js   # :8081
cd ~/GitHub/rabinforest && npm run dev                                                  # :3000
# http://localhost:3000/playground/rabinai-face
```

- Local `bfoster-services/.env` has **no `KOKORO_URL`** (only Heroku does), so
  without the prefix above it speaks with the OpenAI fallback voice. The
  prefix is per-process; `.env` was not edited.
- `node server.js` doesn't reload: restart after backend edits.
- The backend's host gate 403s any request without an allowed `Origin`;
  test with `-H 'Origin: http://localhost:3000'`.

## What it is (v0.4.133)

`/playground/rabinai-face`: an abstract glowing orb (Three.js shader) with
eyes, brows and a mouth that keeps eye contact and reacts to the visitor.

**Models** — 5 in normal use:
- Browser: **MediaPipe Face Landmarker** (478 points + 52 blendshapes) and
  **Hand Landmarker** (pointing fingertip); **Web Speech API** for words
  (Google's servers in Chrome unless the on-device pack is downloaded — the UI
  says which).
- Box: **gpt-oss-20b** (LM Studio) answers; **Kokoro** speaks.
- Fallbacks when the box is asleep/slow: **Gemini** answers, **OpenAI
  gpt-4o-mini-tts** (`shimmer` + acting directions) speaks.
- No vision model sees the visitor. Qwen2.5-VL is deliberately unused (§0).

**Not AI, on purpose:** all behaviour (`src/face/behaviour.js`), direction
matching (`src/face/commands.js`), safety gates (`bfoster-services/server/face.js`),
the tongue colour check, the renderer.

## Files

| File | What |
| --- | --- |
| `src/RabinAIFace.js` | the page: render loop, Sight/Hearing cards, answer flow, voice playback, dev hooks |
| `src/face/behaviour.js` | every reaction, as rules; `act()` for spoken directions; `mouthFor()`, `browsFor()` |
| `src/face/renderer.js` | Three.js body, eye/brow/mouth shaders |
| `src/face/tracker.js` | camera, face + hand landmarkers, head roll/yaw, tongue colour |
| `src/face/ears.js` | Web Speech API wrapper, on-device detection, pause/resume |
| `src/face/commands.js` | spoken directions + question detection (patterns) |
| `bfoster-services/server/face.js` | `checkQuestion`, `gateAnswer`, `FACE_SYSTEM`; tested by `eval/unit-face.js` (in `test:unit`) |
| `bfoster-services/server/ai.js` | `POST /ai/face/reply`; `VOICE_PERSONAS` + `persona` on `/ai/readaloud` |

## Decisions Brian made (don't re-litigate)

- Keep VISION_MODEL_PLAN §6: no image ever goes to the box.
- Abstract presence, not a human face. Lives in rabinforest.
- It only responds; never speaks first.
- It answers one spoken question, bounded (now proposed to become a 5-turn
  conversation in the avatar plan — that's still open).
- Its **own voice**, not the narrator's: Kokoro `af_bella(2)+af_sky(1)` @1.08,
  playback +5% pitch. (Revised the earlier "one voice" decision.)
- Speech recognition option 1: the browser's, on-device when offered,
  disclosed honestly otherwise.

## Untested — Brian's to check

- The **voice** (no one has listened to the face persona yet).
- **Tongue**: `tongueColour` threshold 0.35 is a guess; MediaPipe's own
  `tongueOut` never moved for Brian. Check with `?debug`.
- **Head turn** fix (`2f83ff5`): confirm it turns the right way. `?debug` shows
  `faceX` (should rise as you move to your left) and `headYaw`.
- **One-brow raise** mirroring, real-voice **directions** ("nod" as a single
  word may be missed), real **fingertip** following, phone layout, VoiceOver.

## Dev tools (all stripped from production builds)

- `?debug` — live blendshape scores, `faceX`, `headYaw`, `tongueColour`.
- `?demo` (cycle) or `?demo=smile|brows|squint|talk|tilt|listen|wink|tongue|ooh|angry|finger|away`.
- `window.__face.ask('why is the sky blue')` — runs the whole answer path without a mic.
- Background tabs don't run `requestAnimationFrame`; to check a pose, import
  `/src/face/renderer.js` in the page and render single frames to a canvas.

## Gotchas learned the hard way

- The camera image is **not mirrored**: the visitor's left is the image's right.
- Gaze-follow must use **head yaw + eyes-in-head**; eyes alone point the wrong
  way when the head turns (that was the bug).
- MediaPipe reads a squint as a half-shut `eyeBlink`; a wink is asymmetric
  blink, not a blink; a real smile also narrows the eyes.
- Kokoro voice names mean nothing to OpenAI — use `persona`, never pass a
  Kokoro name as `voice` (the fallback would 500).
- The ears must pause while it speaks or it answers itself.
- Web Audio must be created inside a click (the mic switch) or it's muted.
- `/ai/face/reply` box timeout is 7s (one slow turn took 12.9s at 12s).

## Next

**Phase A is built** (2026-10-03, v0.4.134 + bfoster-services `7612c44`,
both committed, neither pushed); see AVATAR_ASSISTANT_PLAN §13. Brian answered
§12: the recommendations, and 5 turns of memory. Next is phase B (stream:
speak sentence 1 while the rest arrives), which is also the fix for the box's
slow first word.

---

**Unrelated, from the same session** (not this repo): elder-app is pushed
and clean. Still open there: rotate the **Textbelt key** (printed into the
session by mistake), delete the unused `TWILIO_*` lines from elder-app's root
`.env`, and something unknown rewrote elder-app's `server/.env` on
2026-10-02 10:12 (DB switched to `momma`, Gemini lines dropped; both fixed).
