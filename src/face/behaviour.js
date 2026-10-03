/**
 * RabinAI Face — what the form DOES, as plain rules.
 *
 * Perception is a neural net (MediaPipe, in tracker.js). Behaviour is this
 * file: timers, thresholds and smoothing, no model and no network. Same split
 * as elder-app — AI for perception, code for behaviour — so every reaction can
 * be read, tuned and explained. See docs/RABINAI_FACE_PLAN.md §3.
 *
 * React, don't mirror. Exact copying reads as mockery or as a bug; delayed,
 * partial mimicry reads as attention. So a smile is answered 300-600ms later
 * at ~70% strength, not copied frame for frame.
 *
 * update(dt, now, input) -> state
 *   input: { face: null | { x, y, roll, shapes } }  x,y in 0..1 camera-image coords,
 *          roll = their head tilt in radians (negative = toward their right shoulder),
 *          shapes = { blendshapeName: score }
 *          speak = 0..1 loudness of its OWN voice (phase 3, Kokoro); omit until then
 *   state: everything the renderer needs, already smoothed.
 */

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** Frame-rate independent ease toward a target. rate ~ "per second". */
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

const BLINK_MS = 150;            // whole blink, close + open
const IDLE_AFTER_MS = 5000;      // no face this long -> idle drift

/**
 * The mouth for a mood. Each expression nudges a neutral, slightly friendly
 * line; they add, so a smile while surprised is a wide open "oh!".
 *   happy  -> curves up and widens; past ~0.4 it opens into a grin
 *   widen  -> surprise: narrows into a small round "o"
 *   squint -> flatter, shorter, lopsided: the skeptical look
 *   lean   -> listening: small and closed
 *   idle   -> small and neutral
 */
export function mouthFor(s) {
  let curve = 0.15, width = 0.16, open = 0, tilt = 0;
  curve += s.happy * 0.6;
  width += s.happy * 0.08;
  open += Math.max(0, s.happy - 0.35) * 1.0;
  width -= s.widen * 0.15;
  open += s.widen * 1.2;
  curve -= s.widen * 0.9;           // the top arches UP too, so it closes into an oval, not a cup
  curve -= s.squint * 0.25;
  width -= s.squint * 0.04;
  tilt += s.squint * 0.35;
  width -= s.lean * 0.05;
  if (s.idle) { width -= 0.03; curve -= 0.05; }
  return { curve: clamp(curve, -0.4, 0.8), width: clamp(width, 0.06, 0.26), open: clamp(open, 0, 1), tilt };
}

export function createBehaviour({ reducedMotion = false } = {}) {
  const s = {
    gazeX: 0, gazeY: 0,          // pupil offset, -1..1
    yaw: 0, pitch: 0,            // whole-form turn, radians-ish
    roll: 0,                     // head tilt, radians; negative = top leans to the screen's right
    open: 1,                     // eye openness 0..1 (blinks)
    happy: 0,                    // eye crescent 0..1
    widen: 0,                    // eyes wider, form stretches up, 0..1
    squint: 0,                   // eyes narrowed, 0..1
    lean: 0,                     // leans in when the visitor talks, 0..1
    bright: 0.6,                 // glow; dims when idle
    // The mouth, derived from the form's own mood above — never copied from
    // the visitor's mouth. See mouthFor().
    mouthCurve: 0.15,            // + = ends up (smile), - = ends down
    mouthWidth: 0.16,            // half-width, in eye-plane units
    mouthOpen: 0,                // 0 = a line, 1 = fully open
    mouthTilt: 0,                // lopsided: + raises its right corner
    idle: true,
  };

  // Targets the smoothing chases.
  const t = { gazeX: 0, gazeY: 0, happy: 0, widen: 0, squint: 0, lean: 0, bright: 0.6 };

  let nextBlink = 0, blinkStart = -1;
  let nextSaccade = 0, saccX = 0, saccY = 0;
  let nextGlance = 0, glanceUntil = 0, glanceX = 0, glanceY = 0;
  let lastFaceAt = -Infinity;
  let smileSince = -1, smileAnswerAt = -1, smileStoppedAt = -1;
  let browSince = -1;
  let narrowSince = -1;
  let visitorBlinkWas = false, lastBlinkAt = -Infinity;
  let avertSince = -1, followUntil = 0, followX = 0;
  let talkLevel = 0;
  let wanderX = 0, wanderY = 0, nextWander = 0;
  let tiltTarget = 0;
  let smX = null, movedAt = -Infinity, curiousUntil = 0, curiousTilt = 0, nextCuriousOk = 0;

  function blink(now) {
    if (blinkStart >= 0) return;
    blinkStart = now; lastBlinkAt = now;
    nextBlink = now + rand(2000, 6000);
  }

  function update(dt, now, input) {
    const f = input?.face ?? null;
    const sh = f?.shapes ?? {};
    if (f) lastFaceAt = now;
    const hasFace = !!f;
    const idle = now - lastFaceAt > IDLE_AFTER_MS;
    s.idle = idle;

    // --- Blinks: its own schedule, and sometimes WITH the visitor. ---
    if (!nextBlink) nextBlink = now + rand(1500, 4000);
    if (now >= nextBlink) blink(now);
    const theyBlink = ((sh.eyeBlinkLeft ?? 0) + (sh.eyeBlinkRight ?? 0)) / 2 > 0.5;
    if (theyBlink && !visitorBlinkWas && narrowSince < 0 && now - lastBlinkAt > 1000 && Math.random() < 0.3) {
      blinkStart = -1; nextBlink = now + 80;     // a beat after theirs reads as attention
    }
    visitorBlinkWas = theyBlink;
    if (blinkStart >= 0) {
      const p = (now - blinkStart) / BLINK_MS;
      // Close fast (40%), open slower (60%): that is how eyelids move.
      s.open = p < 0.4 ? 1 - p / 0.4 : p < 1 ? (p - 0.4) / 0.6 : 1;
      if (p >= 1) { blinkStart = -1; s.open = 1; }
    }

    // --- Where to look. ---
    if (hasFace) {
      // Toward the visitor. The camera image is not mirrored: a visitor who
      // moves to THEIR left shows up on the image's right, and the form, which
      // faces them, has to look to the screen's left to keep eye contact.
      let gx = clamp((0.5 - f.x) * 2.2, -1, 1);
      let gy = clamp((0.5 - f.y) * 2.0, -1, 1);

      // Micro-saccades: tiny darts every 0.5-2s. A dead-still gaze is a stare.
      if (now >= nextSaccade) {
        const amp = reducedMotion ? 0.02 : 0.07;
        saccX = rand(-amp, amp); saccY = rand(-amp, amp);
        nextSaccade = now + rand(500, 2000);
      }
      gx += saccX; gy += saccY;

      // They look away -> it follows their gaze briefly, then comes back.
      const theirLook = (((sh.eyeLookOutLeft ?? 0) + (sh.eyeLookInRight ?? 0))
        - ((sh.eyeLookInLeft ?? 0) + (sh.eyeLookOutRight ?? 0))) / 2;
      if (Math.abs(theirLook) > 0.35) {
        if (avertSince < 0) avertSince = now;
        if (now - avertSince > 700 && now > followUntil) {
          followUntil = now + 1000; followX = theirLook > 0 ? -0.8 : 0.8;
        }
      } else avertSince = -1;
      if (now < followUntil) { gx = followX; gy = 0.1; }

      // Glance away on its own every 8-20s. Constant staring is the uncanny part.
      if (!nextGlance) nextGlance = now + rand(8000, 20000);
      if (now >= nextGlance) {
        glanceUntil = now + rand(600, 1200);
        glanceX = rand(0.5, 0.9) * (Math.random() < 0.5 ? -1 : 1); glanceY = rand(-0.4, 0.3);
        nextGlance = now + rand(8000, 20000);
      }
      if (now < glanceUntil && now >= followUntil) { gx = glanceX; gy = glanceY; }

      t.gazeX = gx; t.gazeY = gy;
    } else {
      // Nobody there: look around, slowly.
      if (now >= nextWander) {
        wanderX = rand(-0.7, 0.7); wanderY = rand(-0.4, 0.4);
        nextWander = now + rand(1800, 4000);
      }
      t.gazeX = idle ? wanderX : t.gazeX * 0.98;
      t.gazeY = idle ? wanderY : t.gazeY * 0.98;
    }

    // --- Head tilt. Two reasons to tilt, never more than ~20 degrees. ---
    // 1. Theirs, mirrored: tilt toward your right shoulder and its top leans to
    //    YOUR right too, as a mirror (or a person copying you) would. 60% of the
    //    angle, and the slow ease below puts it a beat behind — react, not copy.
    // 2. Curious: they moved and then went still -> sometimes it cocks its head,
    //    the dog-hearing-a-noise tilt. Held ~1.5s, then lets go.
    if (hasFace) {
      // Speed of a SMOOTHED position. The camera updates ~30/s while this runs
      // at the display rate, so raw x arrives in steps, and landmark jitter
      // divided by a 1/120s frame would read as constant motion.
      const before = smX ?? f.x;
      smX = approach(before, f.x, 6, dt);
      const speed = Math.abs(smX - before) / Math.max(dt, 1e-3);
      if (speed > 0.2) movedAt = now;                        // moving across the frame
      const stillFor = now - movedAt;
      if (stillFor > 350 && stillFor < 500 && now >= nextCuriousOk && Math.random() < 0.5) {
        curiousTilt = rand(0.14, 0.22) * (Math.random() < 0.5 ? -1 : 1);
        curiousUntil = now + rand(1200, 1800);
        nextCuriousOk = now + rand(5000, 9000);              // a tic if it does it every time
      }
      const theirs = clamp((f.roll ?? 0) * 0.6, -0.35, 0.35);
      tiltTarget = now < curiousUntil && Math.abs(theirs) < 0.08 ? curiousTilt : theirs;
    } else {
      smX = null;
      tiltTarget = 0;
    }

    // --- Smile back: sustained 0.5s, answered after 300-600ms, at ~70%. ---
    const smile = ((sh.mouthSmileLeft ?? 0) + (sh.mouthSmileRight ?? 0)) / 2;
    if (smile > 0.45) {
      smileStoppedAt = -1;
      if (smileSince < 0) smileSince = now;
      if (now - smileSince > 500 && smileAnswerAt < 0) smileAnswerAt = now + rand(300, 600);
      if (smileAnswerAt >= 0 && now >= smileAnswerAt) t.happy = clamp(smile * 0.7, 0, 0.7);
    } else {
      smileSince = -1;
      if (smileStoppedAt < 0) smileStoppedAt = now;
      // Hold the smile a moment after theirs fades; dropping it instantly reads as cold.
      if (now - smileStoppedAt > 400) { t.happy = 0; smileAnswerAt = -1; }
    }

    // --- They squint -> it squints back, a beat later and a little less. ---
    // MediaPipe reports narrowed eyes as eyeSquint* AND as a partly closed
    // eyeBlink*, often more strongly the second way, so either counts. Held for
    // 300ms first: a real blink is ~150ms and must not read as a squint.
    // Not while smiling — a real smile narrows the eyes too, and the smile
    // already has its answer (the crescent).
    const sq = ((sh.eyeSquintLeft ?? 0) + (sh.eyeSquintRight ?? 0)) / 2;
    const half = ((sh.eyeBlinkLeft ?? 0) + (sh.eyeBlinkRight ?? 0)) / 2;
    const narrow = Math.max(sq, half < 0.65 ? half : 0);
    if (narrow > 0.35 && smile < 0.3) {
      if (narrowSince < 0) narrowSince = now;
      if (now - narrowSince > 300) t.squint = clamp((narrow - 0.25) * 1.5, 0, 0.7);
    } else { narrowSince = -1; t.squint = 0; }

    // --- Brows up -> eyes widen, smaller and a beat later. ---
    const brow = ((sh.browInnerUp ?? 0) + ((sh.browOuterUpLeft ?? 0) + (sh.browOuterUpRight ?? 0)) / 2) / 2;
    if (brow > 0.4) {
      if (browSince < 0) browSince = now;
      t.widen = now - browSince > 200 ? clamp(brow * 0.6, 0, 0.6) : t.widen;
    } else { browSince = -1; t.widen = 0; }

    // --- They're talking -> lean in and listen. jawOpen flickers while
    //     speaking, so average it rather than react to each frame. ---
    talkLevel = approach(talkLevel, (sh.jawOpen ?? 0) > 0.2 ? 1 : 0, 3, dt);
    t.lean = talkLevel > 0.5 ? 0.6 : 0;

    t.bright = idle ? 0.5 : hasFace ? 1 : 0.8;
    if (!hasFace) { t.happy = 0; t.widen = 0; t.squint = 0; t.lean = 0; }

    // --- Smoothing. Eyes are quick, the body follows slower: that lag is
    //     what makes it read as one creature rather than a sticker. ---
    const eyeRate = reducedMotion ? 6 : 14;
    s.gazeX = approach(s.gazeX, t.gazeX, eyeRate, dt);
    s.gazeY = approach(s.gazeY, t.gazeY, eyeRate, dt);
    s.yaw = approach(s.yaw, t.gazeX * 0.35, 3, dt);
    s.pitch = approach(s.pitch, -t.gazeY * 0.2, 3, dt);
    s.roll = approach(s.roll, reducedMotion ? tiltTarget * 0.5 : tiltTarget, 2.5, dt);
    s.happy = approach(s.happy, t.happy, 5, dt);
    s.widen = approach(s.widen, t.widen, 6, dt);
    s.squint = approach(s.squint, t.squint, 6, dt);
    s.lean = approach(s.lean, t.lean, 2.5, dt);
    s.bright = approach(s.bright, t.bright, 1.5, dt);
    // Mouth reads from the SMOOTHED mood, so it moves with the eyes instead
    // of ahead of them; only speech (fast by nature) is eased separately.
    const m = mouthFor(s);
    const speak = clamp(input?.speak ?? 0, 0, 1);
    s.mouthCurve = m.curve;
    s.mouthWidth = m.width;
    s.mouthTilt = m.tilt;
    s.mouthOpen = approach(s.mouthOpen, clamp(m.open + speak * 0.7, 0, 1), speak ? 18 : 8, dt);
    return s;
  }

  return { update, state: s };
}
