/**
 * RabinAI Face — the form itself. A glowing body with two eyes, in Three.js.
 *
 * Abstract on purpose (docs/RABINAI_FACE_PLAN.md §3a): nobody expects an orb
 * to look human, so small errors read as personality, not as wrongness. The
 * eyes do the emotional work — openness, crescent smile, widening, pupils —
 * all in one small fragment shader, so a whole expression is four uniforms.
 *
 * createFormRenderer(canvas, { reducedMotion }) -> { render(state, now), resize(), dispose() }
 * `state` comes from behaviour.js; this file only draws it.
 */
import * as THREE from 'three';
import { browsFor } from './behaviour';

// Palette from styles/tokens.css: --hero, --cool, --glow.
const DEEP = new THREE.Color('#0d2a40');
const COOL = new THREE.Color('#2f6d99');
const GLOW = new THREE.Color('#cfe2f2');

// The body's shape: a pill. Rounded top and bottom, straight sides, a little
// narrower than it is tall. Still a presence, not a head (§3a): no jaw, no
// cheekbones, no chin. Three's CapsuleGeometry gives exact normals, which the
// rim glow depends on.
const PILL_R = 0.82;      // radius: half the width, and the size of each rounded end
const PILL_LEN = 0.4;     // the straight middle section
const EYE_SIZE = 0.54;    // each eye's square; the shape inside is drawn by EYE_FRAG
const MOUTH_SCALE = 1.35; // the mouth's plane, against its original 0.62 x 0.42 (Brian, 2026-10-04: "bigger")

/**
 * Where a feature sits: on the pill's front surface at this x,y, lifted a
 * hair. Features placed by hand floated in front of a narrowed body, and,
 * turned, the far eye hung past the silhouette.
 */
function onSurface(x, y, lift = 0.015) {
  const overshoot = Math.max(0, Math.abs(y) - PILL_LEN / 2);   // how far into a rounded end
  const z = Math.sqrt(Math.max(0, PILL_R * PILL_R - x * x - overshoot * overshoot));
  return [x, y, z + lift];
}

const BODY_VERT = /* glsl */ `
  uniform float uTime, uStretch, uWobble;
  varying vec3 vNormal, vView;
  // Cheap smooth noise: sums of sines. Enough for a slow, living surface.
  float wob(vec3 p, float t) {
    return sin(p.x * 2.1 + t * 0.9) * sin(p.y * 2.7 + t * 0.7) * sin(p.z * 1.9 + t * 1.1);
  }
  void main() {
    vec3 p = position;
    p += normal * wob(p, uTime) * uWobble;
    p.y *= 1.0 + uStretch * 0.08;
    p.y += 0.02 * sin(uTime * 1.3);            // breathing
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const BODY_FRAG = /* glsl */ `
  uniform vec3 uDeep, uCool, uGlow;
  uniform float uBright, uWarm;
  varying vec3 vNormal, vView;
  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.2);
    vec3 c = mix(uDeep, uCool, facing * 0.8) + uGlow * rim * 0.9;
    // Grumpy: the rim warms toward a soft ember. A tint, not a red alarm.
    c += vec3(0.35, -0.05, -0.2) * rim * uWarm;
    gl_FragColor = vec4(c * (0.55 + 0.6 * uBright), 1.0);
  }
`;

// A soft halo behind the body, additive.
const HALO_FRAG = /* glsl */ `
  uniform vec3 uGlow;
  uniform float uBright;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.35, d) * 0.35 * uBright;
    gl_FragColor = vec4(uGlow * a, a);
  }
`;
const UV_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// One eye. uv centred to -1..1. Openness squashes it, happy carves a crescent
// out of the bottom, widen makes it taller, the pupil slides with the gaze.
const EYE_FRAG = /* glsl */ `
  uniform float uOpen, uHappy, uWiden, uSquint, uSlant, uSide, uBright;
  uniform vec2 uPupil;
  uniform vec3 uGlow;
  varying vec2 vUv;
  float ellipse(vec2 p, vec2 r) { return length(p / r); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float ry = 0.62 * (1.0 + uWiden * 0.35) * (1.0 - uSquint * 0.55) * max(uOpen, 0.04);
    // A squint raises the lower lid more than it lowers the upper, so the
    // narrowed eye sits a little higher.
    p.y -= uSquint * 0.1;
    float e = ellipse(p, vec2(0.48 * (1.0 + uSquint * 0.1), ry));
    float eye = 1.0 - smoothstep(0.92, 1.0, e);
    // And the upper lid comes down FLAT across the top, over part of the
    // pupil. Narrowing alone just reads as smaller eyes; the flat lid is what
    // says "squint".
    float lid = ry * (1.0 - uSquint * 0.75);
    eye *= 1.0 - smoothstep(lid - 0.03, lid + 0.01, p.y) * step(0.01, uSquint);
    // Crescent: a disc rises from below and eats the lower half of the eye.
    // Only when it's actually smiling: at rest the disc still reached up to
    // -0.7, and a wide (surprised) eye goes lower than that, so its bottom
    // was sliced flat.
    float cut = length(p - vec2(0.0, mix(-1.6, -0.42, uHappy))) ;
    float cutOn = smoothstep(0.0, 0.1, uHappy);
    eye *= mix(1.0, smoothstep(0.86, 0.94, cut), cutOn);
    // Slanted lid: + (angry) drops the INNER corner, toward the nose; -
    // (worried) raises it. uSide is -1 for the eye on the viewer's left.
    if (abs(uSlant) > 0.01) {
      float inner = p.x * -uSide;
      float lidY = ry * (0.9 - 0.3 * abs(uSlant)) - uSlant * 0.6 * inner;
      eye *= 1.0 - smoothstep(lidY - 0.03, lidY + 0.01, p.y);
    }
    // Pupil fades out as the eye becomes a crescent (^ ^ has no pupils).
    vec2 pp = p - uPupil * vec2(0.22, 0.2);
    float pupil = (1.0 - smoothstep(0.17, 0.21, length(pp / vec2(1.0, max(uOpen, 0.2))))) * (1.0 - uHappy);
    // Shut: a squashed ellipse with a pupil painted over it breaks into dashes,
    // so near zero openness hand over to one clean closed-lid curve (a soft
    // smile shape, like sleeping). Asleep (Sight off), "close your eyes", and
    // the bottom of every blink all pass through here.
    float shut = 1.0 - smoothstep(0.04, 0.2, uOpen);
    pupil *= 1.0 - shut;
    eye *= 1.0 - shut;
    float arcY = 0.22 * p.x * p.x - 0.06;
    float along = 1.0 - smoothstep(0.38, 0.48, abs(p.x));
    eye = max(eye, (1.0 - smoothstep(0.035, 0.065, abs(p.y - arcY))) * along * shut);
    vec3 col = mix(uGlow * (1.1 + 0.3 * uBright), vec3(0.03, 0.08, 0.13), pupil);
    float glow = (1.0 - smoothstep(0.9, 1.35, e)) * 0.25 * (1.0 - uHappy * 0.5) * mix(1.0, step(0.86, cut), cutOn) * (1.0 - shut * 0.8);
    float a = max(eye, glow);
    gl_FragColor = vec4(col * max(eye, glow * 1.5), a);
  }
`;

// The mouth: one stroke along a curve, which can open into a filled shape.
// Lower edge = the curve pulled down by uOpenM, tapering to the corners, so
// the same four numbers make a line, a smile, a grin or a small round "o".
// A brow: one glowing stroke along a curve, tapering at the ends. uSlant
// drops the INNER end (toward the nose) when positive: grumpy; lifts it when
// negative: worried. uSide is -1 for the brow on the viewer's left.
const BROW_FRAG = /* glsl */ `
  uniform float uArch, uSlant, uSide, uBright;
  uniform vec3 uGlow;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float w = 0.72;
    float xc = clamp(p.x, -w, w);
    float u = xc / w;
    float inner = u * -uSide;
    float y = uArch * 0.4 * (1.0 - u * u) - uSlant * 0.42 * inner - 0.1;
    float d = length(vec2(p.x - xc, p.y - y));
    float thick = 0.12 * (1.0 - 0.5 * abs(u));
    float a = 1.0 - smoothstep(thick * 0.55, thick, d);
    gl_FragColor = vec4(uGlow * (0.95 + 0.3 * uBright), a * 0.95);
  }
`;

const MOUTH_FRAG = /* glsl */ `
  uniform float uCurve, uWidth, uOpenM, uTilt, uTongue, uLips, uBright;
  uniform vec3 uGlow;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float w = uWidth * 3.0;                       // half-width in plane units
    float xc = clamp(p.x, -w, w);
    float u = xc / w;                             // -1..1 across the mouth
    float top = uCurve * 0.35 * (u * u - 0.35) + uTilt * 0.25 * u;
    // sqrt, not a parabola: a round-bottomed opening, so a narrow open mouth
    // is an oval "o" and a wide one a D-shaped grin, not a V.
    float depth = uOpenM * 0.6 * sqrt(max(1.0 - u * u, 0.0));
    float bot = top - depth;
    float stroke = 0.065 + uLips * 0.06;           // fuller lips for the O face
    // Distance to the upper line, with round caps at the corners.
    float dTop = length(vec2(p.x - xc, p.y - top));
    float line = 1.0 - smoothstep(stroke * 0.6, stroke, dTop);
    // Open: the inside, between the two curves, dark with a bright rim.
    float inside = step(abs(p.x), w) * smoothstep(bot - 0.01, bot + 0.02, p.y) * (1.0 - smoothstep(top - 0.01, top + 0.01, p.y));
    float dBot = length(vec2(p.x - xc, p.y - bot));
    float rim = (1.0 - smoothstep(stroke * 0.6, stroke, dBot)) * step(0.02, uOpenM);
    float a = max(max(line, rim), inside * step(0.02, uOpenM));
    vec3 lit = uGlow * (1.05 + 0.3 * uBright);
    vec3 col = mix(lit, vec3(0.02, 0.07, 0.12), inside * (1.0 - max(line, rim)));
    // O face: a real ring, taller than wide. The curve-and-depth shape above
    // always has corners, so at its roundest it was still a lens, not an O.
    // Fades in over the lower part of uLips so it never shows as both at once.
    if (uLips > 0.01) {
      float k = smoothstep(0.15, 0.55, uLips);
      vec2 rr = vec2(0.21, 0.29) * (0.75 + 0.35 * uLips);
      float e = length((p - vec2(0.0, -0.06)) / rr);
      float ringW = stroke * 1.15 / rr.y;
      float ring = 1.0 - smoothstep(ringW * 0.55, ringW, abs(e - 1.0));
      float hole = 1.0 - smoothstep(0.96, 1.0, e);
      vec3 ocol = mix(lit, vec3(0.02, 0.07, 0.12), hole * (1.0 - ring));
      col = mix(col, ocol, k);
      a = mix(a, max(ring, hole), k);
    }
    // Tongue: a soft rounded shape hanging from the middle of the top lip,
    // with a groove down the centre. The same glow as the outlines (it was
    // pink, the one warm colour on the form, and didn't match); the groove is
    // a shade of the body's blue so it still reads as a tongue.
    if (uTongue > 0.01) {
      // It hangs OUT: from inside the open mouth to well past the lower lip.
      float top0 = uCurve * 0.35 * (-0.35);
      float bot0 = top0 - uOpenM * 0.6;
      float len = 0.5 * uTongue;
      vec2 tc = vec2(0.0, bot0 - len * 0.35);
      float tq = length((p - tc) / vec2(0.21, max(len * 0.65, 0.001)));
      float tongue = (1.0 - smoothstep(0.9, 1.0, tq)) * step(p.y, top0 + 0.01);
      float groove = 1.0 - smoothstep(0.008, 0.02, abs(p.x)) * 1.0;
      vec3 tcol = mix(lit, vec3(0.18, 0.43, 0.6), groove * step(p.y, top0 - 0.04));
      col = mix(col, tcol, tongue);
      a = max(a, tongue);
    }
    gl_FragColor = vec4(col, a);
  }
`;

export function createFormRenderer(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  const head = new THREE.Group();
  scene.add(head);

  const bodyU = {
    uTime: { value: 0 }, uStretch: { value: 0 }, uWobble: { value: reducedMotion ? 0.012 : 0.035 },
    uBright: { value: 0.6 }, uWarm: { value: 0 }, uDeep: { value: DEEP }, uCool: { value: COOL }, uGlow: { value: GLOW },
  };
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(PILL_R, PILL_LEN, 32, 96),
    new THREE.ShaderMaterial({ uniforms: bodyU, vertexShader: BODY_VERT, fragmentShader: BODY_FRAG }),
  );
  head.add(body);

  const haloU = { uGlow: { value: GLOW }, uBright: { value: 0.6 } };
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.ShaderMaterial({
      uniforms: haloU, vertexShader: UV_VERT, fragmentShader: HALO_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  halo.position.z = -0.6;
  scene.add(halo);

  const eyes = [-1, 1].map((side) => {
    const u = {
      uOpen: { value: 1 }, uHappy: { value: 0 }, uWiden: { value: 0 }, uSquint: { value: 0 },
      uSlant: { value: 0 }, uSide: { value: side }, uBright: { value: 0.6 },
      uPupil: { value: new THREE.Vector2() }, uGlow: { value: GLOW },
    };
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(EYE_SIZE, EYE_SIZE),
      // No depth test, drawn after the body: the wobbling surface bulges up to
      // 0.035 outward and, with the head turned, would otherwise slice through
      // an eye and leave it looking half-shut on one side.
      new THREE.ShaderMaterial({ uniforms: u, vertexShader: UV_VERT, fragmentShader: EYE_FRAG, transparent: true, depthWrite: false, depthTest: false }),
    );
    m.renderOrder = 1;
    // Sit on the sphere's front, angled to its surface.
    m.position.set(...onSurface(side * 0.26, 0.12));
    m.rotation.y = side * 0.3;
    m.rotation.x = -0.1;
    head.add(m);
    return { m, u, side };
  });

  // Brows: above each eye, drawn on top like the eyes.
  const brows = [-1, 1].map((side) => {
    const u = { uArch: { value: 0.35 }, uSlant: { value: 0 }, uSide: { value: side }, uBright: { value: 0.6 }, uGlow: { value: GLOW } };
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.28),
      new THREE.ShaderMaterial({ uniforms: u, vertexShader: UV_VERT, fragmentShader: BROW_FRAG, transparent: true, depthWrite: false, depthTest: false }),
    );
    m.renderOrder = 1;
    m.position.set(...onSurface(side * 0.26, 0.42));
    m.rotation.y = side * 0.3;
    m.rotation.x = -0.25;
    head.add(m);
    return { m, u, side };
  });

  const mouthU = {
    uCurve: { value: 0.15 }, uWidth: { value: 0.16 }, uOpenM: { value: 0 }, uTilt: { value: 0 }, uTongue: { value: 0 }, uLips: { value: 0 },
    uBright: { value: 0.6 }, uGlow: { value: GLOW },
  };
  const mouth = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62 * MOUTH_SCALE, 0.42 * MOUTH_SCALE),
    // Same reason as the eyes: drawn on top, or the wobble slices it.
    new THREE.ShaderMaterial({ uniforms: mouthU, vertexShader: UV_VERT, fragmentShader: MOUTH_FRAG, transparent: true, depthWrite: false, depthTest: false }),
  );
  mouth.renderOrder = 1;
  mouth.position.set(...onSurface(0, -0.33));       // a touch lower, so the bigger mouth keeps clear of the eyes
  mouth.rotation.x = 0.3;                         // follows the sphere's curve below centre
  head.add(mouth);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the form the same size on a tall phone as on a wide desktop.
    camera.position.z = camera.aspect < 1 ? 5 / Math.max(camera.aspect, 0.55) : 5;
    camera.updateProjectionMatrix();
  }
  resize();

  function render(s, now) {
    const t = now / 1000;
    bodyU.uTime.value = t;
    bodyU.uStretch.value = s.widen;
    bodyU.uBright.value = s.bright + s.happy * 0.25;
    bodyU.uWarm.value = s.angry ?? 0;
    haloU.uBright.value = s.bright + s.happy * 0.3 + s.lean * 0.15 * (0.5 + 0.5 * Math.sin(t * 4));

    head.rotation.y = s.yaw;
    head.rotation.x = s.pitch;
    head.rotation.z = s.roll;
    head.position.y = s.happy * 0.06 + (s.idle && !reducedMotion ? Math.sin(t * 0.5) * 0.05 : 0);
    head.position.z = s.lean * 0.25;
    if (s.idle && !reducedMotion) head.position.x = Math.sin(t * 0.33) * 0.08;
    else head.position.x *= 0.95;

    for (const e of eyes) {
      // A winking eye is drawn as the smile crescent, shut: ^ reads as a wink.
      const wink = e.side < 0 ? (s.winkLeft ?? 0) : (s.winkRight ?? 0);
      e.u.uOpen.value = s.open;
      e.u.uHappy.value = Math.max(s.happy, wink);
      e.u.uWiden.value = s.widen;
      e.u.uSquint.value = s.squint;
      e.u.uSlant.value = s.slant ?? 0;
      e.u.uBright.value = s.bright;
      // Cross-eyed: each pupil slides toward the nose (-side).
      e.u.uPupil.value.set(s.gazeX - e.side * (s.converge ?? 0) * 0.7, s.gazeY);
      // A little parallax: the eyes themselves drift toward the gaze too.
      e.m.position.x = e.side * 0.3 + s.gazeX * 0.04;
      e.m.position.y = 0.12 + s.gazeY * 0.03;
    }
    const bs = browsFor(s);
    for (const b of brows) {
      const p = b.side < 0 ? bs.left : bs.right;
      b.u.uArch.value = p.arch;
      b.u.uSlant.value = p.slant;
      b.u.uBright.value = s.bright;
      b.m.position.y = 0.42 + p.raise * 0.13;
      b.m.position.x = b.side * 0.3 + s.gazeX * 0.03;
    }
    mouthU.uCurve.value = s.mouthCurve ?? 0.15;
    mouthU.uWidth.value = s.mouthWidth ?? 0.16;
    mouthU.uOpenM.value = s.mouthOpen ?? 0;
    mouthU.uTilt.value = s.mouthTilt ?? 0;
    mouthU.uTongue.value = s.tongue ?? 0;
    mouthU.uLips.value = s.mouthLips ?? 0;
    mouthU.uBright.value = s.bright;
    mouth.position.x = s.gazeX * 0.03;           // a hint of the same parallax as the eyes
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    renderer.dispose();
  }

  return { render, resize, dispose };
}
