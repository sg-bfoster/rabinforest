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

// Palette from styles/tokens.css: --hero, --cool, --glow.
const DEEP = new THREE.Color('#0d2a40');
const COOL = new THREE.Color('#2f6d99');
const GLOW = new THREE.Color('#cfe2f2');

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
  uniform float uBright;
  varying vec3 vNormal, vView;
  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.2);
    vec3 c = mix(uDeep, uCool, facing * 0.8) + uGlow * rim * 0.9;
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
  uniform float uOpen, uHappy, uWiden, uSquint, uBright;
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
    float cut = length(p - vec2(0.0, mix(-1.6, -0.42, uHappy))) ;
    eye *= smoothstep(0.86, 0.94, cut);
    // Pupil fades out as the eye becomes a crescent (^ ^ has no pupils).
    vec2 pp = p - uPupil * vec2(0.22, 0.2);
    float pupil = (1.0 - smoothstep(0.17, 0.21, length(pp / vec2(1.0, max(uOpen, 0.2))))) * (1.0 - uHappy);
    vec3 col = mix(uGlow * (1.1 + 0.3 * uBright), vec3(0.03, 0.08, 0.13), pupil);
    float glow = (1.0 - smoothstep(0.9, 1.35, e)) * 0.25 * (1.0 - uHappy * 0.5) * step(0.86, cut);
    float a = max(eye, glow);
    gl_FragColor = vec4(col * max(eye, glow * 1.5), a);
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
    uBright: { value: 0.6 }, uDeep: { value: DEEP }, uCool: { value: COOL }, uGlow: { value: GLOW },
  };
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 96),
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
      uOpen: { value: 1 }, uHappy: { value: 0 }, uWiden: { value: 0 }, uSquint: { value: 0 }, uBright: { value: 0.6 },
      uPupil: { value: new THREE.Vector2() }, uGlow: { value: GLOW },
    };
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.46),
      // No depth test, drawn after the body: the wobbling surface bulges up to
      // 0.035 outward and, with the head turned, would otherwise slice through
      // an eye and leave it looking half-shut on one side.
      new THREE.ShaderMaterial({ uniforms: u, vertexShader: UV_VERT, fragmentShader: EYE_FRAG, transparent: true, depthWrite: false, depthTest: false }),
    );
    m.renderOrder = 1;
    // Sit on the sphere's front, angled to its surface.
    m.position.set(side * 0.3, 0.12, 0.99);
    m.rotation.y = side * 0.3;
    m.rotation.x = -0.1;
    head.add(m);
    return { m, u, side };
  });

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
    haloU.uBright.value = s.bright + s.happy * 0.3 + s.lean * 0.15 * (0.5 + 0.5 * Math.sin(t * 4));

    head.rotation.y = s.yaw;
    head.rotation.x = s.pitch;
    head.rotation.z = s.roll;
    head.position.y = s.happy * 0.06 + (s.idle && !reducedMotion ? Math.sin(t * 0.5) * 0.05 : 0);
    head.position.z = s.lean * 0.25;
    if (s.idle && !reducedMotion) head.position.x = Math.sin(t * 0.33) * 0.08;
    else head.position.x *= 0.95;

    for (const e of eyes) {
      e.u.uOpen.value = s.open;
      e.u.uHappy.value = s.happy;
      e.u.uWiden.value = s.widen;
      e.u.uSquint.value = s.squint;
      e.u.uBright.value = s.bright;
      e.u.uPupil.value.set(s.gazeX, s.gazeY);
      // A little parallax: the eyes themselves drift toward the gaze too.
      e.m.position.x = e.side * 0.3 + s.gazeX * 0.04;
      e.m.position.y = 0.12 + s.gazeY * 0.03;
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    renderer.dispose();
  }

  return { render, resize, dispose };
}
