import React, { useMemo, useSyncExternalStore } from 'react';

// Seeded RNG (mulberry32) so the forest is stable across renders.
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const subscribeReducedMotion = (callback) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
};

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

const W = 728;
const H = 96;
const CELL = 8;
const SQ = 4;
const OFF = (CELL - SQ) / 2;
const GROUND_ROW = 10;

const PixelForest = ({ density = 14 }) => {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => true,
  );
  const motion = !reducedMotion;

  const content = useMemo(() => {
    const rand = rng(7);
    const ink = 'var(--color-text)';
    const accent = 'var(--color-accent)';
    const cols = Math.floor(W / CELL);
    const cells = new Map();
    const put = (c, r, v) => {
      if (c >= 0 && c < cols && r >= 0) {
        const k = c + ':' + r;
        if (!cells.has(k) || v.red) cells.set(k, v);
      }
    };
    const slotC = (cols - 4) / density;
    for (let i = 0; i < density; i++) {
      const cC = Math.round(2 + slotC * (i + 0.5) + (rand() - 0.5) * slotC * 0.3);
      const big = i % 2 === 0;
      const canopy = big ? 6 + Math.round(rand() * 2) : 4 + Math.round(rand());
      const trunk = 1;
      const apex = GROUND_ROW - trunk - canopy;
      for (let r = 0; r < canopy; r++) {
        const half = Math.floor(r * 0.5);
        for (let c = cC - half; c <= cC + half; c++) {
          const red = rand() < 0.09;
          put(c, apex + r, { red, pulse: red || rand() < 0.08 });
        }
      }
      put(cC, GROUND_ROW - 1, { red: false, pulse: false });
    }

    const els = [
      <rect
        key="ground"
        x={0}
        y={GROUND_ROW * CELL + OFF}
        width={W}
        height={SQ}
        style={{ fill: ink }}
      />,
    ];
    let idx = 0;
    cells.forEach((v, k) => {
      const [c, r] = k.split(':').map(Number);
      els.push(
        <rect
          key={'q' + idx++}
          x={c * CELL + OFF}
          y={r * CELL + OFF}
          width={SQ}
          height={SQ}
          style={{ fill: v.red ? accent : ink }}
        >
          {motion && v.pulse && (
            <animate
              attributeName="opacity"
              values={v.red ? '1;0.25;1' : '1;0.45;1'}
              dur={(2 + rand() * 4).toFixed(1) + 's'}
              begin={(rand() * 4).toFixed(1) + 's'}
              repeatCount="indefinite"
            />
          )}
        </rect>,
      );
    });
    if (motion) {
      els.push(
        <rect
          key="sig"
          y={GROUND_ROW * CELL + OFF - 1}
          width={SQ + 2}
          height={SQ + 2}
          style={{ fill: accent }}
        >
          <animate attributeName="x" values={'0;' + (W - SQ)} dur="12s" repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.05;0.95;1"
            dur="12s"
            repeatCount="indefinite"
          />
        </rect>,
      );
    }
    return els;
  }, [density, motion]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Pixel drawing of a forest"
    >
      {content}
    </svg>
  );
};

export default PixelForest;
