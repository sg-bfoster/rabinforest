import React, { useEffect, useRef, useState } from 'react';
import { Hero, ScreenBody } from './components/Hero';

// Still Moving — four scenes the box rendered as eight stills each, crossfaded
// and drifted by the browser. Nothing here is an animated file; see
// bfoster-services/docs/RABINAI_IMAGERY_ANIMATION_PLAN.md for why generation
// was declined but presentation shipped.

const SCENES = [
  { key: 'ramen', title: 'Ramen shop', note: 'rain, reflections, neon' },
  { key: 'campfire', title: 'Campfire', note: 'flame, embers' },
  { key: 'waterfall', title: 'Waterfall', note: 'falling water, spray' },
  { key: 'truck', title: 'Rusted truck', note: 'static subject — texture only' },
];

const FRAME_COUNT = 8;
const srcsFor = (key) =>
  Array.from({ length: FRAME_COUNT }, (_, i) => `/scene/${key}-${i}.webp`);

// Named presets, not raw milliseconds. "Fade 700ms / Hold 1300ms" asks the
// visitor to already know what a good value is, and the two interact — the
// pair is really one idea, "how fast does it move".
const PACES = {
  slow:   { label: 'Slow',   fade: 1200, hold: 600 },
  steady: { label: 'Steady', fade: 850,  hold: 375 },
  quick:  { label: 'Quick',  fade: 500,  hold: 150 },
};
const DRIFTS = {
  none:   { label: 'None',   zoom: 0,  zoomSecs: 24 },
  gentle: { label: 'Gentle', zoom: 9,  zoomSecs: 24 },
  strong: { label: 'Strong', zoom: 20, zoomSecs: 18 },
};

function Segmented({ name, label, options, value, onChange }) {
  return (
    <div className="still-moving-ctl">
      <span className="still-moving-ctl-label">{label}</span>
      <div className="seg">
        {Object.entries(options).map(([key, opt]) => (
          <label key={key} className="seg-opt">
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * The viewer: eight ordinary stills crossfaded by the browser.
 *
 * Only the INCOMING layer animates. Fading the outgoing layer out at the same
 * time is the obvious implementation and it is wrong: at the midpoint both sit
 * near 0.5, so the stage background shows through the pair and the transition
 * visibly dips toward black. Leaving the outgoing frame fully opaque
 * underneath makes the blend a true a·new + (1-a)·old with nothing behind it.
 */
function Viewer({ scene, fade, hold, zoom, zoomSecs, paused }) {
  const layers = [useRef(null), useRef(null)];
  const timer = useRef(null);
  // Live settings in a ref so a slider change lands on the NEXT step instead
  // of tearing down and restarting the loop mid-fade.
  const cfg = useRef({});
  cfg.current = { fade, hold, paused };

  useEffect(() => {
    const srcs = srcsFor(scene.key);

    // Only the scene being watched is fetched — switching costs one set of
    // eight, not all thirty-two up front.
    srcs.forEach((s) => { const im = new Image(); im.src = s; });

    // Both layers back to frame 0/1 of the NEW scene, or the old scene's
    // last frame stays painted underneath and bleeds through the first fade.
    const [a, b] = layers.map((l) => l.current);
    if (a && b) {
      a.style.transition = 'none'; b.style.transition = 'none';
      a.src = srcs[0]; b.src = srcs[1];
      a.style.opacity = '1'; b.style.opacity = '0';
      a.style.zIndex = '1'; b.style.zIndex = '0';
    }

    let front = 0;
    let idx = 0;

    const step = () => {
      const { fade: f, hold: h, paused: p } = cfg.current;

      // A hidden tab still fires setTimeout (throttled to ~1s) but suspends
      // requestAnimationFrame entirely. Stepping anyway would advance the
      // frame index while the opacity swap never ran, so coming back to the
      // tab showed a jump. Idle here instead and resume on return.
      if (p || document.hidden) {
        timer.current = setTimeout(step, 400);
        return;
      }

      const back = 1 - front;
      const incoming = layers[back].current;
      const outgoing = layers[front].current;
      if (!incoming || !outgoing) {
        timer.current = setTimeout(step, 400);
        return;
      }

      idx = (idx + 1) % srcs.length;

      // Put the incoming frame on top at zero opacity, then fade it up. Only
      // its opacity is touched; the outgoing layer stays fully opaque
      // underneath. Two fixed z values, never a growing counter — the stage
      // isolates them, but unbounded z-index is how these escaped the card
      // and painted over the header.
      incoming.style.transition = 'none';
      incoming.style.zIndex = '2';
      outgoing.style.zIndex = '1';
      incoming.style.opacity = '0';
      incoming.src = srcs[idx];
      void incoming.offsetWidth; // flush, so the transition:none actually applies

      requestAnimationFrame(() => {
        incoming.style.transition = `opacity ${f}ms ease-in-out`;
        incoming.style.opacity = '1';
      });

      front = back;
      timer.current = setTimeout(step, f + h);
    };

    timer.current = setTimeout(step, 400);
    return () => clearTimeout(timer.current);
  }, [scene.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const anim = zoom === 0 ? 'none' : `sceneBreathe ${zoomSecs}s ease-in-out infinite alternate`;

  return (
    <div className="still-moving-stage" style={{ '--scene-zoom': 1 + zoom / 100 }}>
      {[0, 1].map((i) => (
        <img
          key={i}
          ref={layers[i]}
          src={srcsFor(scene.key)[i]}
          alt={i === 0 ? `${scene.title}, generated on the box` : ''}
          aria-hidden={i === 1 ? 'true' : undefined}
          style={{
            opacity: i === 0 ? 1 : 0,
            zIndex: i === 0 ? 1 : 0,
            animation: anim,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      ))}
    </div>
  );
}

export default function StillMoving() {
  const [activeKey, setActiveKey] = useState(SCENES[0].key);
  // Settings live here, not in the viewer, so a chosen pace survives switching
  // scenes instead of snapping back to the defaults.
  const [pace, setPace] = useState('steady');
  const [drift, setDrift] = useState('gentle');
  const [paused, setPaused] = useState(false);

  const scene = SCENES.find((s) => s.key === activeKey);
  const { fade, hold } = PACES[pace];
  const { zoom, zoomSecs } = DRIFTS[drift];

  // width="links" is the same column Explore uses — sized so the layout clears
  // the floating links panel instead of running underneath it.
  return (
    <>
      <Hero>
        <h1 className="hero-h1">It moves, and nothing was animated.</h1>
        <p className="hero-sub hero-sub--page">
          Each scene is eight ordinary still images the box rendered from one
          prompt, re-imagining itself slightly each pass. No video and no
          animated file — your browser fades between the stills and drifts the
          zoom, so every frame you see is being composited on your machine, right
          now. Pause one and it is just a picture again.
        </p>
      </Hero>

      <ScreenBody width="links">
        <div className="still-moving">
          <div className="still-moving-viewer">
            <Viewer
              scene={scene}
              fade={fade}
              hold={hold}
              zoom={zoom}
              zoomSecs={zoomSecs}
              paused={paused}
            />

            <div className="still-moving-rail" role="tablist" aria-label="Choose a scene">
              {SCENES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={s.key === activeKey}
                  className={`still-moving-thumb${s.key === activeKey ? ' is-active' : ''}`}
                  onClick={() => setActiveKey(s.key)}
                  title={s.title}
                >
                  <img src={`/scene/${s.key}-thumb.webp`} alt={s.title} />
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="still-moving-bar">
            <div className="still-moving-caprow">
              <span>
                <b>{scene.title}</b>{' '}
                <span className="still-moving-note-inline">{scene.note}</span>
              </span>
              <button
                type="button"
                className="btn btn-secondary still-moving-toggle"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
              >
                {paused ? 'Play' : 'Pause'}
              </button>
            </div>

            <div className="still-moving-controls">
              <Segmented name="sd-pace" label="Pace" options={PACES} value={pace} onChange={setPace} />
              <Segmented name="sd-drift" label="Drift" options={DRIFTS} value={drift} onChange={setDrift} />
            </div>
          </div>

          <p className="still-moving-note">
            One scene at a time means one set of eight images — about 450&nbsp;KB,
            against 2,045&nbsp;KB for the baked animated WebP of the same frames.
            The thumbnails are 41&nbsp;KB for all four. Generating each set still
            took ~2.5 minutes of GPU, which is why this suits a pre-rendered
            showcase and not a button.
          </p>
          <p className="still-moving-note">
            The truck is the control. Rain, flame and falling water all have
            something that plausibly moves, so the eye forgives the wobble and
            reads it as motion. A parked truck does not — whatever you see there
            is the model re-imagining rust and paint, with nothing to hide behind.
          </p>
        </div>
      </ScreenBody>
    </>
  );
}
