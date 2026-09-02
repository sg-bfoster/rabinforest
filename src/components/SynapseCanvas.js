import React, { useEffect, useRef } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const N = 46;
const LINK = 170;

const SynapseCanvas = () => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    const animate = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
    let w = 0;
    let h = 0;
    let nodes = [];
    let pulses = [];
    let raf = 0;
    let ro;

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth;
      h = el.clientHeight;
      if (!w || !h) return;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 0.7 + Math.random() * 1.5,
        tw: Math.random() * Math.PI * 2,
      }));
      pulses = [];
    };

    const draw = (t) => {
      if (el.clientWidth !== w || el.clientHeight !== h) seed();
      if (!w || !h) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (animate) {
          n.x += n.vx;
          n.y += n.vy;
        }
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK) continue;
          ctx.strokeStyle = `rgba(180,208,232,${(0.16 * (1 - d / LINK)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        const tw = animate ? 0.55 + 0.45 * Math.sin(t / 1400 + n.tw) : 0.8;
        ctx.fillStyle = `rgba(214,232,247,${(0.5 * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (animate) {
        if (pulses.length < 7 && Math.random() < 0.03) {
          const a = nodes[(Math.random() * nodes.length) | 0];
          const near = nodes.filter((n) => n !== a && Math.hypot(n.x - a.x, n.y - a.y) < LINK);
          if (near.length) pulses.push({ a, b: near[(Math.random() * near.length) | 0], p: 0 });
        }
        for (const s of pulses) {
          s.p += 0.012;
          const x = s.a.x + (s.b.x - s.a.x) * s.p;
          const y = s.a.y + (s.b.y - s.a.y) * s.p;
          const fade = Math.sin(Math.PI * Math.min(s.p, 1));
          const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
          g.addColorStop(0, `rgba(226,240,252,${(0.85 * fade).toFixed(3)})`);
          g.addColorStop(1, 'rgba(140,190,230,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        pulses = pulses.filter((s) => s.p < 1);
      }
      raf = requestAnimationFrame(draw);
    };

    seed();
    ro = new ResizeObserver(seed);
    ro.observe(el);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
};

export default SynapseCanvas;
