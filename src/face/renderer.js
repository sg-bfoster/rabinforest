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
// These reach the screen in linear light (three converts the hex, and the
// shaders write the value out as it is), so each displays darker than its hex
// reads: DEEP shows as about #2b1e5e.
//
// Purple since 2026-10-05 (Brian: "change the avatar to more of a purplish
// look"). It was the site's navy: DEEP #4c6294, COOL #6c84b4, GLOW #cfe2f2,
// BEARD #b3c0dc.
const DEEP = new THREE.Color('#7261a3');   // the ball: a deep violet
const COOL = new THREE.Color('#8f7ac2');   // a shade lighter, toward its edge
const GLOW = new THREE.Color('#e8e4f5');   // eyes, brows, mouth, rim: a pale lavender
const BEARD = new THREE.Color('#d4cceb');  // the beard shade: a soft lilac

// The body's shape: an egg-shaped head, from the picture Brian sent on
// 2026-10-05 ("can you work with this?"): a broad dome, sides that run nearly
// straight to mouth level, then in to a soft chin. Still line art in the
// site's blue; the nod to him is the head shape and the beard, which is drawn
// in the body shader as soft stippled shading rather than an outline.
//
// It is a unit sphere, sculpted once at load. Normals come from the sculpted
// shape itself by finite differences (computeVertexNormals would crease along
// the sphere's UV seam, and the rim glow is all normal-driven).
const HEAD_W = 1;         // half-width. 1 with LOWER 1 is a perfect ball, which Brian chose (2026-10-05) after 0.84 and 0.93
const LOWER = 1;          // how much longer the lower half runs than the upper; above 1 makes an egg
const CHIN = 0;           // 0 = a round chin (Brian, 2026-10-05: "round the chin more"); 0.06 drew it to a soft point
const LIFT_Y = (LOWER + CHIN - 1) / 2;   // shift up so the head is centred on its own height
const HEAD_HALF_H = (1 + LOWER + CHIN) / 2;
const EYE_SIZE = 0.66;    // each eye's square; the shape inside is drawn by EYE_FRAG (0.54 until 2026-10-05: "bigger")
const MOUTH_SCALE = 1.7;  // the mouth's plane, against its original 0.62 x 0.42 (1.35 until 2026-10-05: "bigger")

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** A point on the unit sphere -> the same point on the head. */
function sculpt(x, y, z) {
  // A sphere already closes to a point at the bottom, so narrowing it further
  // makes a teardrop (the first two tries). The picture's jaw is FULLER than a
  // sphere's at mouth level, so the lower face is widened there instead.
  // CUTE, NOT HUMAN. Cheekbones, a nose and cheek lines were tried on
  // 2026-10-05 and Brian's verdict was "ugly and creepy": realistic anatomy on
  // a glowing blue head is the uncanny valley. What reads as friendly is the
  // opposite: a round, soft shape with nothing on it but big eyes and a smile.
  // It went egg, then rounder, then a plain ball, and the ball is the one he
  // liked. HEAD_W, LOWER and CHIN are left as dials in case it changes again.
  const sx = HEAD_W;
  let ny = y < 0 ? y * LOWER : y;
  ny -= CHIN * smooth(-0.7, -1.0, y) ** 2;
  return [x * sx, ny + LIFT_Y, z];
}

/**
 * Where a feature sits: the point on the head that this x,y on the plain
 * sphere became, lifted a hair. So features are placed in the sphere's own
 * simple coordinates and follow whatever sculpt() does to the surface.
 */
function onSurface(x0, y0, lift = 0.015) {
  const z0 = Math.sqrt(Math.max(0, 1 - x0 * x0 - y0 * y0));
  const [x, y, z] = sculpt(x0, y0, z0);
  return [x, y, z + lift];
}

function sculptedHead(segments) {
  const g = new THREE.SphereGeometry(1, segments, segments);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const d = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const P = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), n = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const at = (v, out) => out.set(...sculpt(v.x, v.y, v.z));
  const eps = 0.01;
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    t1.crossVectors(d, Math.abs(d.y) > 0.9 ? X : Y).normalize();
    t2.crossVectors(d, t1);
    at(d, P);
    at(t1.clone().multiplyScalar(eps).add(d).normalize(), A);
    at(t2.clone().multiplyScalar(eps).add(d).normalize(), B);
    n.crossVectors(A.sub(P), B.sub(P)).normalize();
    if (n.dot(d) < 0) n.negate();
    pos.setXYZ(i, P.x, P.y, P.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  g.computeBoundingSphere();
  return g;
}

const BODY_VERT = /* glsl */ `
  uniform float uTime, uStretch, uWobble;
  varying vec3 vNormal, vView, vPos;
  // Cheap smooth noise: sums of sines. Enough for a slow, living surface.
  float wob(vec3 p, float t) {
    return sin(p.x * 2.1 + t * 0.9) * sin(p.y * 2.7 + t * 0.7) * sin(p.z * 1.9 + t * 1.1);
  }
  void main() {
    vec3 p = position;
    vPos = position;                            // undeformed, so the beard doesn't swim with the wobble
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
  uniform vec3 uDeep, uCool, uGlow, uBeard;
  uniform float uBright, uWarm;
  varying vec3 vNormal, vView, vPos;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 4.0);
    // Flat navy, a shade lighter toward the edge, with a thin bright rim: the
    // picture's look, flatter than the old glowing orb.
    vec3 c = mix(uCool, uDeep, smoothstep(0.0, 0.45, facing)) + uGlow * rim * 0.7;
    // The beard: stippled lighter blue over the jaw and chin, fading up into
    // the navy. It starts below the mouth in the middle and climbs the cheeks
    // at the sides, which leaves a clear patch around the mouth. No outline.
    float n = 0.55 * hash(floor(vPos * 85.0)) + 0.45 * hash(floor(vPos * 170.0));
    float ax = abs(vPos.x);
    // The beard, as in Brian's picture: a SOFT airbrushed shade over the jaw
    // and chin, fading smoothly up into the navy, with a wide clear area
    // around the mouth. Only a whisper of grain: heavy stipple read as fuzz or
    // grime, and a stippled moustache band made a muzzle. No moustache, no
    // outline, nothing drawn on the face but eyes, brows and mouth.
    float top = -0.16 - 0.56 * exp(-pow(ax / 0.38, 2.0));
    float beard = smoothstep(top + 0.12, top - 0.3, vPos.y) * smoothstep(-0.45, -0.05, vPos.z);
    vec3 hair = uBeard * (0.94 + 0.08 * n) * (0.8 + 0.2 * facing);
    c = mix(c, hair, beard * 0.78);
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
    // Big pupils with a catchlight. A small pupil in a wide white is a stare,
    // which is where "creepy" came from; a large one with a sparkle is the
    // oldest trick there is for a friendly cartoon eye.
    vec2 pp = p - uPupil * vec2(0.13, 0.14);
    float pr = length(pp / vec2(1.0, max(uOpen, 0.2)));
    // The pupil stays fully dark while the smile's crescent rises over it,
    // and goes only at the end, when the eye is nearly ^. Fading it gradually
    // left a pale, blind-looking disc at a half smile.
    float pupil = (1.0 - smoothstep(0.31, 0.35, pr)) * (1.0 - smoothstep(0.62, 0.74, uHappy));
    float sparkle = max(1.0 - smoothstep(0.085, 0.115, length(pp - vec2(-0.12, 0.15))),
                        1.0 - smoothstep(0.03, 0.05, length(pp - vec2(0.13, -0.12)))) * pupil;
    // Shut: a squashed ellipse with a pupil painted over it breaks into dashes,
    // so near zero openness hand over to one clean closed-lid curve (a soft
    // smile shape, like sleeping). Asleep (Sight off), "close your eyes", and
    // the bottom of every blink all pass through here.
    float shut = 1.0 - smoothstep(0.04, 0.2, uOpen);
    pupil *= 1.0 - shut;
    sparkle *= 1.0 - shut;
    eye *= 1.0 - shut;
    float arcY = 0.22 * p.x * p.x - 0.06;
    float along = 1.0 - smoothstep(0.38, 0.48, abs(p.x));
    eye = max(eye, (1.0 - smoothstep(0.035, 0.065, abs(p.y - arcY))) * along * shut);
    vec3 col = mix(uGlow * (1.1 + 0.3 * uBright), vec3(0.03, 0.08, 0.13), pupil);
    col = mix(col, vec3(1.0), sparkle);
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
    uBeard: { value: BEARD },
  };
  const body = new THREE.Mesh(
    sculptedHead(112),
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
    m.position.set(...onSurface(side * 0.36, -0.1));
    m.rotation.y = side * 0.34;
    m.rotation.x = 0.05;
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
    m.position.set(...onSurface(side * 0.36, 0.25));  // clear of the big eyes
    m.rotation.y = side * 0.34;
    m.rotation.x = -0.2;
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
  mouth.position.set(...onSurface(0, -0.56));       // low on the face, inside the beard's clear patch
  mouth.rotation.x = 0.45;                        // follows the head's curve, well below centre
  head.add(mouth);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the pill to the stage: FILL of its width or its height, whichever
    // runs out first, so it is as big as the panel allows and sits in the
    // middle of it. (It used to keep a fixed distance tuned for a 4:3 stage;
    // in the tall panel it now lives in, that left it small, with half the
    // panel empty.) The rest is headroom for leaning in, stretching when
    // surprised, and the slow idle drift.
    const FILL = 0.74;
    const tall = 2 * HEAD_HALF_H, wide = 2 * HEAD_W;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max(tall / FILL, wide / FILL / camera.aspect) / (2 * tanHalf);
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
    // NOT forceContextLoss(): React re-runs an effect on the same <canvas> in
    // development, and a canvas whose context was deliberately lost can never
    // draw again. A detached canvas's context is collected with it; if a long
    // conversation ever piles up more than the browser allows (about 16), it
    // drops the oldest, which are exactly these.
  }

  return { render, resize, dispose };
}
