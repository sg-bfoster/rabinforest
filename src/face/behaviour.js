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
 *          yaw = their head turn, -1..1 (+ = turned to their left),
 *          shapes = { blendshapeName: score }
 *          speak = 0..1 loudness of its OWN voice (phase 3, Kokoro); omit until then
 *          heard = { speaking, question } from the microphone (ears.js), if it's on
 *          thinking = true while an answer is on its way (the box is working)
 *          point = { gx, gy, near } something to follow instead of the face (a
 *                  fingertip or the pointer), already in gaze terms (-1..1)
 *          asleep = true until it's woken (the page's Wake): eyes drift shut and stay shut
 *   act(name, now) plays a direction it was given out loud (commands.js)
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
/**
 * The brows for a mood, per side (left = the brow on the viewer's left).
 * raise: up/down; arch: how curved; slant: + drops the inner end (grumpy),
 * - lifts it (worried). Like the mouth, derived from the form's own mood.
 * The one asymmetric move is the quizzical brow: one side up, for thinking
 * or when the visitor raises one brow at it.
 */
export function browsFor(s) {
  const raise = s.happy * 0.25 + s.widen * 1.1 - s.squint * 0.55 - (s.angry ?? 0) * 0.6 + (s.worry ?? 0) * 0.3;
  const arch = 0.35 + s.widen * 0.45 + s.happy * 0.2 - (s.angry ?? 0) * 0.35;
  const slant = s.slant ?? 0;
  const q = s.quizzical ?? 0, side = s.quizSide ?? 1;
  const one = (isLeft) => ({
    raise: raise + (side === (isLeft ? -1 : 1) ? q * 1.0 : -q * 0.15) - (isLeft ? (s.winkLeft ?? 0) : (s.winkRight ?? 0)) * 0.45,
    arch: arch + (side === (isLeft ? -1 : 1) ? q * 0.25 : 0),
    slant,
  });
  return { left: one(true), right: one(false) };
}

export function mouthFor(s) {
  // A gentle smile at rest (0.4), not a flat line (0.15): a straight mouth
  // under wide eyes reads as deadpan, and deadpan on a face reads as unfriendly.
  let curve = 0.4, width = 0.16, open = 0, tilt = 0;
  curve += s.happy * 0.6;
  width += s.happy * 0.08;
  open += Math.max(0, s.happy - 0.35) * 1.0;
  width -= s.widen * 0.15;
  open += s.widen * 1.2;
  curve -= s.widen * 1.15;          // the top arches UP too, so it closes into an oval, not a cup (1.15 since the resting curve rose to 0.4)
  curve -= s.squint * 0.25;
  width -= s.squint * 0.04;
  tilt += s.squint * 0.35;
  width -= s.lean * 0.05;
  if (s.idle) { width -= 0.03; curve -= 0.05; }
  // Tongue out: mouth a little open and narrower, so the tongue has a gap to come through.
  // Angry: a downturned pout. Worried: a smaller, gentler frown.
  curve -= (s.angry ?? 0) * 0.65 + (s.worry ?? 0) * 0.25;
  width -= (s.angry ?? 0) * 0.04 + (s.worry ?? 0) * 0.03;
  // O face: lips rounded into an O. Narrow, open, and the top arched so it
  // closes into a circle, with fuller lips. Overrides the smile curve: you
  // can't round your lips and grin at once.
  let lips = 0;
  if (s.ooh > 0.02) {
    const k = s.ooh;
    width = width + (0.085 - width) * k;
    open = Math.max(open, 0.95 * k);
    curve = curve + (-0.75 - curve) * k;
    lips = k;
  }
  if (s.tongue > 0.02) { open = Math.max(open, 0.32 * s.tongue); width = Math.min(width, 0.17); curve = Math.max(curve, 0.1); }
  // A wink pulls the mouth up on the winking side: the smirk.
  tilt += (s.winkRight - s.winkLeft) * 0.35;
  curve += Math.max(s.winkLeft, s.winkRight) * 0.2;
  // Surprise is a round "oh" too. The narrow curve-and-depth mouth it used to
  // make came out as a pinched shape with ticks at its corners, more of a
  // grimace than a gasp; the clean ring is the friendly version.
  // Only for real surprise (widen past ~0.45; raised eyebrows alone reach 0.6
  // at their strongest). Mapping all of widen to the ring made an "o" appear
  // for every small lift of the brows.
  lips = Math.max(lips, clamp((s.widen - 0.42) * 4, 0, 0.85));
  return { curve: clamp(curve, -0.8, 0.8), width: clamp(width, 0.06, 0.26), open: clamp(open, 0, 1), tilt, lips };
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
    winkLeft: 0, winkRight: 0,   // one eye shut, by SCREEN side (left = the eye on the viewer's left), 0..1
    tongue: 0,                   // tongue out, 0..1
    ooh: 0,                      // O face, lips rounded, 0..1
    angry: 0,                    // grumpy pout: lids slant down to the middle, frown, 0..1
    worry: 0,                    // concerned: lids slant UP to the middle, 0..1
    slant: 0,                    // for the renderer: angry - worry
    converge: 0,                 // cross-eyed, for a finger right up close, 0..1
    quizzical: 0, quizSide: 1,   // one brow up (thinking, or theirs raised); side -1 = viewer's left
    mouthLips: 0,                // lip fullness for the renderer, 0..1
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
  let winkSeenSide = 0, winkSeenSince = -1, winkAt = -1, winkSide = 0, winkStart = -1, winkCooldown = 0;
  let winkByVisitor = false, winkLetGo = -1;   // answering THEIR wink: hold it as long as they do
  let tongueSince = -1, tongueAt = -1, tongueT = 0;
  let oohSince = -1, oohT = 0;
  let lastSpokeAt = -Infinity;       // when its own voice was last audible
  let angrySince = -1, angryT = 0, worryT = 0;
  let visitorBlinkWas = false, lastBlinkAt = -Infinity;
  let avertSince = -1, followUntil = 0, followX = 0;
  let talkLevel = 0;
  // Listening: who's talking, when it last nodded, which way it turns its 'ear'.
  let talkingSince = -1, lastTalkAt = -Infinity, nextBackchannel = 0, pauseNodDone = true;
  let nodStart = -1, nodCount = 0, listen = 0, earSide = 1, basePitch = 0;
  let wanderX = 0, wanderY = 0, nextWander = 0;
  let tiltTarget = 0;
  let smX = null, movedAt = -Infinity, curiousUntil = 0, curiousTilt = 0, nextCuriousOk = 0;
  // Directions it was asked to follow: name -> time the move ends.
  const acts = {};
  let shakeStart = -1, nodAmp = 0.15, wasQuestion = false, baseYaw = 0;
  let pointSince = -1, convergeT = 0;
  let wasAsleep = false, wokeAt = -Infinity, flutter = [];
  let oneBrowSince = -1, oneBrowSide = 0, quizT = 0;

  function blink(now) {
    if (blinkStart >= 0) return;
    blinkStart = now; lastBlinkAt = now;
    nextBlink = now + rand(2000, 6000);
  }

  function nod(now, times, amp = 0.15) { if (nodStart < 0) { nodStart = now; nodCount = times; nodAmp = amp; } }

  const ACT_MS = {
    smile: 2200, grumpy: 2000, surprised: 1600, ooh: 1800, tongue: 1800, close: 2000, tilt: 1800,
    'look-left': 1500, 'look-right': 1500, 'look-up': 1500, 'look-down': 1500, ponder: 900,
  };
  /** Do what it was asked. Unknown names do nothing. */
  function act(name, now) {
    if (name === 'nod') { nodStart = -1; nod(now, 2, 0.22); return; }       // a clear, deliberate yes
    if (name === 'shake') { shakeStart = now; return; }
    if (name === 'wink') { winkSide = 1; winkStart = now; winkByVisitor = false; winkLetGo = -1; winkCooldown = now + 1500; return; }
    if (ACT_MS[name]) acts[name] = now + ACT_MS[name];
  }
  const doing = (name, now) => (acts[name] ?? 0) > now;

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
    const bl = sh.eyeBlinkLeft ?? 0, br = sh.eyeBlinkRight ?? 0;  // the VISITOR's left and right eye
    const asym = Math.abs(bl - br) > 0.35;                       // one eye shut, the other open: a wink
    const theyBlink = bl > 0.5 && br > 0.5;                      // both, or it's a wink, not a blink
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
      // WHERE THEY'RE LOOKING = head turn + eyes-in-head. The eye scores alone
      // were the bug: turn your head left while still watching the screen and
      // your eyes rotate RIGHT in their sockets to stay on it, so it "followed"
      // a glance to the right that never happened. Head and eyes cancel then,
      // as they should. (+ = toward their left, for both terms.)
      const eyesInHead = (((sh.eyeLookOutLeft ?? 0) + (sh.eyeLookInRight ?? 0))
        - ((sh.eyeLookInLeft ?? 0) + (sh.eyeLookOutRight ?? 0))) / 2;
      const theirLook = eyesInHead + (f.yaw ?? 0) * 1.2;
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

    // --- They wink -> it winks back, a beat later, with a smirk. ---
    // Mirror sides: your left eye is on your left as you look at it, so it
    // answers with the eye on the viewer's left. One eye shut and the other
    // open, held 120ms (a blink is both eyes; a twitch is shorter).
    const seen = bl > 0.55 && br < 0.3 ? -1 : br > 0.55 && bl < 0.3 ? 1 : 0;
    if (seen && seen === winkSeenSide) {
      if (now - winkSeenSince > 120 && winkAt < 0 && winkStart < 0 && now >= winkCooldown) {
        winkAt = now + rand(250, 400); winkSide = seen;
      }
    } else { winkSeenSide = seen; winkSeenSince = now; }
    if (winkAt >= 0 && now >= winkAt) { winkStart = now; winkAt = -1; winkByVisitor = true; winkLetGo = -1; winkCooldown = now + 1500; }
    let wk = 0;
    if (winkStart >= 0) {
      // Shut fast (120ms), hold at least 250ms, open slower (200ms). Answering
      // THEIR wink, it holds for as long as they do and opens a beat after
      // they open: opening first reads as not paying attention. The bar to
      // keep holding is lower than the bar to start (0.4 vs 0.55/0.3), so
      // flicker in the scores mid-wink doesn't open it early. Capped at 5s in
      // case the tracker gets stuck reading a shut eye.
      const e = now - winkStart;
      const theirs = winkSide < 0 ? bl : br, other = winkSide < 0 ? br : bl;
      const held = winkByVisitor && e < 5000 && theirs > 0.4 && other < 0.4;
      if (held) winkLetGo = -1;
      else if (winkLetGo < 0) winkLetGo = now + (winkByVisitor ? 150 : 0);
      const openFrom = winkLetGo < 0 ? Infinity : Math.max(winkStart + 370, winkLetGo);
      if (e < 120) wk = e / 120;
      else if (now < openFrom) wk = 1;
      else {
        wk = 1 - (now - openFrom) / 200;
        if (wk <= 0) { wk = 0; winkStart = -1; winkCooldown = Math.max(winkCooldown, now + 600); }
      }
    }
    s.winkLeft = winkSide < 0 ? wk : 0;
    s.winkRight = winkSide > 0 ? wk : 0;

    // --- Tongue out -> it sticks its tongue out too. Held 250ms, answered
    //     ~300ms later, and it squeezes its eyes a little: the playful "blep".
    //     MediaPipe's tongueOut score is weak on most faces, hence the colour
    //     check; ?debug shows both.
    // Either MediaPipe's own score, or the colour check in tracker.js (the
    // share of tongue-coloured pixels between the lips), whichever is sure.
    const tg = Math.max(sh.tongueOut ?? 0, (sh.tongueColour ?? 0) > 0.35 ? 1 : 0);
    if (tg > 0.3) {
      if (tongueSince < 0) tongueSince = now;
      if (now - tongueSince > 250 && tongueAt < 0) tongueAt = now + 300;
    } else { tongueSince = -1; tongueAt = -1; }
    tongueT = tongueAt >= 0 && now >= tongueAt ? 1 : 0;
    if (tongueT) t.happy = Math.max(t.happy, 0.45);

    // --- They frown -> it frowns back, then softens. ---
    // Brows pulled down (browDown*) is the anger signal MediaPipe reads best;
    // a sneer or pressed, turned-down mouth adds to it. Held 300ms, answered at
    // ~70% as a grumpy POUT, not a glare. After ~2.5s of it, the form stops
    // matching and turns concerned instead: briefly matching says "I see you",
    // glaring back at an angry person indefinitely just escalates.
    const browDown = ((sh.browDownLeft ?? 0) + (sh.browDownRight ?? 0)) / 2;
    const mouthMad = Math.max(((sh.mouthFrownLeft ?? 0) + (sh.mouthFrownRight ?? 0)) / 2,
      ((sh.noseSneerLeft ?? 0) + (sh.noseSneerRight ?? 0)) / 2, ((sh.mouthPressLeft ?? 0) + (sh.mouthPressRight ?? 0)) / 2);
    const anger = browDown + mouthMad * 0.3;
    if (anger > 0.4 && smile < 0.3) {
      if (angrySince < 0) angrySince = now;
      const held = now - angrySince;
      const soften = clamp((held - 2500) / 800, 0, 1);       // 0 = matching, 1 = concerned
      const match = held > 300 ? clamp(anger * 0.9, 0, 0.7) : 0;
      angryT = match * (1 - soften * 0.75);
      worryT = soften * 0.6;
    } else { angrySince = -1; angryT = 0; worryT = 0; }

    // --- O face -> it makes one back. MediaPipe reads rounded lips well:
    //     mouthFunnel is the open "oh", mouthPucker the tighter "ooh"/kiss.
    //     Held 200ms, then it answers at about 85% of theirs.
    const funnel = sh.mouthFunnel ?? 0, pucker = sh.mouthPucker ?? 0;
    const round = Math.max(funnel, pucker * 0.8);
    if (round > 0.3) {
      if (oohSince < 0) oohSince = now;
      if (now - oohSince > 200) oohT = clamp(0.4 + round * 0.6, 0, 1) * 0.85;
    } else { oohSince = -1; oohT = 0; }

    // --- They squint -> it squints back, a beat later and a little less. ---
    // MediaPipe reports narrowed eyes as eyeSquint* AND as a partly closed
    // eyeBlink*, often more strongly the second way, so either counts. Held for
    // 300ms first: a real blink is ~150ms and must not read as a squint.
    // Not while smiling — a real smile narrows the eyes too, and the smile
    // already has its answer (the crescent).
    const sq = ((sh.eyeSquintLeft ?? 0) + (sh.eyeSquintRight ?? 0)) / 2;
    const half = ((sh.eyeBlinkLeft ?? 0) + (sh.eyeBlinkRight ?? 0)) / 2;
    const narrow = Math.max(sq, half < 0.65 ? half : 0);
    if (narrow > 0.35 && smile < 0.3 && !asym) {
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
    // An O face opens the jaw too; rounded lips held still are not talking.
    const rounded = Math.max(sh.mouthFunnel ?? 0, (sh.mouthPucker ?? 0) * 0.8) > 0.3;
    talkLevel = approach(talkLevel, (sh.jawOpen ?? 0) > 0.2 && !rounded ? 1 : 0, 3, dt);
    t.lean = talkLevel > 0.5 ? 0.6 : 0;
    if (input?.heard?.speaking) t.lean = Math.max(t.lean, 0.6);
    if (input?.heard?.question) t.lean = 0.85;

    // --- Listening: lend an ear, and nod. ---
    // Backchannels, in the conversation-analysis sense (Yngve 1970): the small
    // nods a listener gives WHILE someone talks, and the "mm-hm" nod at their
    // pauses. That is what "I'm following you" looks like.
    // It SEES you talking (jaw movement); it has no microphone. So the nods mean
    // "I see you're speaking", not "I heard what you said".
    // From the camera (jaw) or, if it's on, the microphone. A question gets
    // the full ear: it leans in further and stays turned until they finish.
    const heard = input?.heard ?? null;
    const question = !!heard?.question;
    const talking = (hasFace && talkLevel > 0.5) || !!heard?.speaking || question;
    if (talking) {
      if (talkingSince < 0) {
        talkingSince = now;
        earSide = Math.random() < 0.5 ? -1 : 1;              // which ear it offers
        nextBackchannel = now + rand(2500, 4500);
      }
      lastTalkAt = now;
      pauseNodDone = false;
      if (now >= nextBackchannel) { nod(now, 1); nextBackchannel = now + rand(3000, 5500); }
    } else if (talkLevel < 0.25 && talkingSince >= 0 && now - lastTalkAt > 250) {
      // They stopped. Only nod if they'd been talking a while: a nod after a
      // half-second "um" reads as impatience.
      if (!pauseNodDone && lastTalkAt - talkingSince > 1200 && !wasQuestion) nod(now, 2);
      pauseNodDone = true;
      talkingSince = -1;
    }
    // A question just ended -> a thoughtful "hmm": eyes up, one slow nod. It
    // can't answer yet (that is phase 3, the box), but it can look like it
    // took the question in.
    if (wasQuestion && !question) { act('ponder', now); nodStart = -1; nod(now, 1, 0.1); }
    wasQuestion = question;
    listen = approach(listen, talking ? 1 : 0, question ? 4 : 2.5, dt);
    // Turning the head offers an ear, but the EYES stay on them: shift the
    // pupils against the turn so the gaze still lands on the visitor.
    const earTurn = earSide * 0.22 * listen;
    t.gazeX = clamp(t.gazeX - earTurn * 2.2, -1, 1);

    t.bright = idle ? 0.5 : hasFace ? 1 : 0.8;

    // --- Asleep, and waking up. Asleep it dims and nothing else plays. Woken,
    //     it does what anyone does: a double flutter of the eyes, brows up, a
    //     small smile, then it looks for you. ~1.5s, then ordinary behaviour.
    const asleep = !!input?.asleep;
    if (wasAsleep && !asleep) { wokeAt = now; flutter = [now + 450, now + 700]; nextBlink = now + rand(2500, 4500); }
    if (flutter.length && now >= flutter[0] && blinkStart < 0) { flutter.shift(); blink(now); }
    wasAsleep = asleep;
    if (asleep) {
      t.bright = 0.32;
      t.happy = 0; t.widen = 0; t.squint = 0; t.lean = 0;
      t.gazeX = 0; t.gazeY = -0.25;                    // eyes (behind the lids) settle down
    } else {
      const w = now - wokeAt;
      if (w < 900) t.widen = Math.max(t.widen, 0.45 * (1 - w / 900));
      if (w > 250 && w < 1600) t.happy = Math.max(t.happy, 0.3);
    }
    if (!hasFace) { t.happy = 0; t.widen = 0; t.squint = 0; t.lean = input?.heard?.question ? 0.85 : input?.heard?.speaking ? 0.6 : 0; }

    // --- Something to follow: a pointing fingertip, or the pointer. ---
    // Smooth pursuit, not saccades: eyes track a moving target in one glide,
    // so the darting and glancing-away above are simply replaced. A new target
    // gets a brief perk of interest; a finger right up at the lens makes it go
    // cross-eyed, which is what everyone does to a finger on their nose.
    const pt = input?.point ?? null;
    if (pt) {
      if (pointSince < 0) pointSince = now;
      t.gazeX = clamp(pt.gx, -1, 1);
      t.gazeY = clamp(pt.gy, -1, 1);
      if (now - pointSince < 600) t.widen = Math.max(t.widen, 0.3);
      convergeT = clamp(((pt.near ?? 0) - 0.25) * 3, 0, 1);
    } else { pointSince = -1; convergeT = 0; }

    // --- Directions it was given. These win over mirroring while they play:
    //     asked to look left, it looks left even though you're in the middle.
    if (doing('smile', now)) t.happy = 0.75;
    if (doing('grumpy', now)) { angryT = 0.65; worryT = 0; }
    if (doing('surprised', now)) t.widen = 0.6;
    if (doing('ooh', now)) oohT = 0.8;
    if (doing('tongue', now)) { tongueT = 1; t.happy = Math.max(t.happy, 0.45); }
    if (doing('tilt', now)) tiltTarget = 0.25;
    if (doing('look-left', now)) { t.gazeX = -0.9; t.gazeY = 0; }
    if (doing('look-right', now)) { t.gazeX = 0.9; t.gazeY = 0; }
    if (doing('look-up', now)) { t.gazeX = 0; t.gazeY = 0.75; }
    if (doing('look-down', now)) { t.gazeX = 0; t.gazeY = -0.75; }
    if (doing('ponder', now)) { t.gazeY = 0.55; t.gazeX = 0.35; }
    // Thinking: eyes up and to one side, drifting a little, a slight squint.
    // Held for as long as the answer takes, so a 3s wait reads as thought.
    // --- They raise ONE brow -> it raises one back, mirrored side. The outer
    //     brow scores are per side; one well up, the other not, held 300ms.
    const bL = sh.browOuterUpLeft ?? 0, bR = sh.browOuterUpRight ?? 0;  // the VISITOR's left/right
    const oneSide = bL - bR > 0.3 ? -1 : bR - bL > 0.3 ? 1 : 0;         // your left = viewer's left
    if (oneSide && oneSide === oneBrowSide) {
      if (now - oneBrowSince > 300) { quizT = 0.8; s.quizSide = oneSide; }
    } else { oneBrowSide = oneSide; oneBrowSince = now; quizT = 0; }
    // Thinking (an answer on its way) or the "hmm" after a question: one brow up.
    if (input?.thinking || doing('ponder', now)) { quizT = 0.75; if (!oneSide) s.quizSide = 1; }
    if (input?.thinking) {
      t.gazeX = 0.35 + Math.sin(now / 700) * 0.12; t.gazeY = 0.5 + Math.sin(now / 1100) * 0.06;
      t.squint = Math.max(t.squint, 0.18);
    }
    const anyAct = Object.values(acts).some((until) => until > now);

    // --- Smoothing. Eyes are quick, the body follows slower: that lag is
    //     what makes it read as one creature rather than a sticker. ---
    const eyeRate = reducedMotion ? 6 : 14;
    s.gazeX = approach(s.gazeX, t.gazeX, eyeRate, dt);
    s.gazeY = approach(s.gazeY, t.gazeY, eyeRate, dt);
    // Plus their head turn, mirrored at ~30%, like the tilt: turn to your left
    // and it turns toward the screen's left with you. Not while following a
    // finger or a direction, which are about where IT should look.
    const mirrorYaw = hasFace && !pt && !anyAct ? -clamp(f.yaw ?? 0, -1, 1) * 0.3 : 0;
    baseYaw = approach(baseYaw, (t.gazeX + earTurn * 2.2) * 0.35 + earTurn + mirrorYaw, 3, dt);
    basePitch = approach(basePitch, -t.gazeY * 0.2, 3, dt);
    // A nod is a quick dip and return, ~380ms each, the second one smaller.
    let nodOff = 0;
    if (nodStart >= 0) {
      const p = (now - nodStart) / 380;
      if (p >= nodCount) nodStart = -1;
      else nodOff = (reducedMotion ? nodAmp / 2 : nodAmp) * Math.sin(Math.PI * (p % 1)) * (p < 1 ? 1 : 0.65);
    }
    s.pitch = basePitch + nodOff;                     // + tips the top toward you: a nod
    // Shaking its head: three swings, fading out, ~1.35s.
    let shakeOff = 0;
    if (shakeStart >= 0) {
      const e = now - shakeStart;
      if (e > 1350) shakeStart = -1;
      else shakeOff = (reducedMotion ? 0.12 : 0.3) * Math.sin((2 * Math.PI * e) / 450) * (1 - e / 1350);
    }
    s.yaw = baseYaw + shakeOff;                       // like the nod: an offset on a smoothed base, never fed back
    // Asleep: eyes drift shut, slowly, like dozing off, and no blink can pop
    // them open. Woken, they ease open below and the flutter above plays.
    if (input?.asleep) { blinkStart = -1; s.open = approach(s.open, 0.03, 2.5, dt); }
    // Eyes shut on request; afterwards ease them open (a blink is the only
    // other thing that ever sets openness, and it may be seconds away).
    else if (doing('close', now)) s.open = Math.min(s.open, 0.05);
    else if (blinkStart < 0) s.open = approach(s.open, 1, 10, dt);
    const tiltWithEar = -earSide * 0.1 * listen;      // the head tips with the turn
    s.roll = approach(s.roll, (reducedMotion ? tiltTarget * 0.5 : tiltTarget) + tiltWithEar, 2.5, dt);
    s.happy = approach(s.happy, t.happy, 5, dt);
    s.widen = approach(s.widen, t.widen, 6, dt);
    s.squint = approach(s.squint, t.squint, 6, dt);
    // With no face, only a direction it was given can hold these up.
    const on = hasFace || anyAct;
    s.tongue = approach(s.tongue, on ? tongueT : 0, 7, dt);
    s.ooh = approach(s.ooh, on ? oohT : 0, 7, dt);
    s.angry = approach(s.angry, on ? angryT : 0, 5, dt);
    s.worry = approach(s.worry, on ? worryT : 0, 3, dt);
    s.slant = s.angry - s.worry;
    s.converge = approach(s.converge, convergeT, 6, dt);
    s.quizzical = approach(s.quizzical, quizT, 6, dt);
    s.lean = approach(s.lean, t.lean, 2.5, dt);
    s.bright = approach(s.bright, t.bright, 1.5, dt);
    // Mouth reads from the SMOOTHED mood, so it moves with the eyes instead
    // of ahead of them; only speech (fast by nature) is eased separately.
    // While it is TALKING its mouth belongs to the words. The reactions that
    // reshape the mouth (the surprised "oh", and copying a visitor's rounded
    // lips) are held off until it has finished: Brian saw the "o" mouth pop up
    // mid-sentence (2026-10-05), set off by his own eyebrows and mouth moving
    // while he listened. The eyes and brows still react.
    const speak = clamp(input?.speak ?? 0, 0, 1);
    if (speak > 0.03) lastSpokeAt = now;
    const itsTalking = now - lastSpokeAt < 350;
    const m = mouthFor(itsTalking ? { ...s, widen: 0, ooh: 0 } : s);
    s.mouthCurve = m.curve;
    s.mouthWidth = m.width;
    s.mouthTilt = m.tilt;
    s.mouthLips = m.lips;
    s.mouthOpen = approach(s.mouthOpen, clamp(m.open + speak * 0.7, 0, 1), speak ? 18 : 8, dt);
    return s;
  }

  return { update, act, state: s };
}
