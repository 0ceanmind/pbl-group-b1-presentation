// SLO 2 — spleen histology: capsule, trabeculae, white pulp, red pulp.
import { S, Flow, rng, gsap } from '../lib/dom.js';
import { defs, macrophage } from '../lib/icons.js';

export function spleen(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1000 800' }, host);
  const D = defs(svg);
  const cx = 520, cy = 410, R = 360;
  const rand = rng(21);

  const clip = S('clipPath', { id: `${D.id}-clip` }, D.d);
  S('circle', { cx, cy, r: R - 8 }, clip);

  // --------------------------------------------------------------- red pulp
  const gRed = S('g', { 'clip-path': `url(#${D.id}-clip)` }, svg);
  S('circle', { cx, cy, r: R, style: 'fill: color-mix(in srgb, #d2203c 26%, var(--bg))' }, gRed);
  // scattered red cells in the cords
  for (let i = 0; i < 230; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R;
    S('ellipse', { cx: cx + Math.cos(a) * r, cy: cy + Math.sin(a) * r, rx: 5, ry: 4.3, fill: '#e8364d', opacity: 0.55 + rand() * 0.3 }, gRed);
  }
  // sinusoids (meandering channels)
  const sinPaths = [];
  for (let i = 0; i < 9; i++) {
    const y0 = cy - R + 60 + i * 80 + (rand() - 0.5) * 30;
    let d = `M ${cx - R - 20} ${y0}`;
    for (let x = cx - R + 60; x <= cx + R + 80; x += 140) d += ` S ${x - 50} ${y0 + (rand() - 0.5) * 120} ${x} ${y0 + (rand() - 0.5) * 60}`;
    S('path', { d, fill: 'none', stroke: '#ff9fb0', 'stroke-width': 18, opacity: 0.22, 'stroke-linecap': 'round' }, gRed);
    sinPaths.push(S('path', { d, fill: 'none', stroke: '#ffc2cc', 'stroke-width': 2, opacity: 0.35 }, gRed));
  }
  const gFlow = S('g', {}, gRed);
  const flows = sinPaths.map((p, i) => new Flow({ parent: gFlow, path: p, count: 9, r: 6.5, fill: '#ff4a62', speed: 0.05 + rand() * 0.03, seed: i + 30, shape: 'rbc', fadeEnds: 0.02 }));

  // macrophage eating an old red cell (red pulp)
  const gMac = S('g', {}, gRed);
  macrophage(gMac, 760, 610, 46, D, 2);
  S('circle', { cx: 770, cy: 600, r: 16, fill: '#7b4d8f' }, gMac);
  const victim = S('ellipse', { cx: 820, cy: 560, rx: 10, ry: 8.5, fill: '#b56270' }, gMac);

  // ------------------------------------------------------------- white pulp
  const gWhite = S('g', { 'clip-path': `url(#${D.id}-clip)` }, svg);
  const nodules = [[400, 300, 84], [660, 330, 72], [470, 565, 70], [255, 500, 54]];
  nodules.forEach(([x, y, r], n) => {
    S('circle', { cx: x, cy: y, r: r + 12, fill: '#efeaff', opacity: 0.25 }, gWhite);
    S('circle', { cx: x, cy: y, r, fill: '#e7e2fb', opacity: 0.92 }, gWhite);
    for (let i = 0; i < r * 1.2; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * (r - 6);
      S('circle', { cx: x + Math.cos(a) * rr, cy: y + Math.sin(a) * rr, r: 5.2, fill: '#5b4fc4', opacity: 0.85 }, gWhite);
    }
    S('circle', { cx: x + r * 0.18, cy: y - r * 0.1, r: 12, fill: '#ff3b4f', stroke: '#fff', 'stroke-width': 3 }, gWhite);
  });

  // ------------------------------------------------ capsule + trabeculae
  const gTrab = S('g', {}, svg);
  const trabs = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2 + 0.2;
    const r1 = R, r2 = R * (0.42 + rand() * 0.2);
    const mid = (r1 + r2) / 2;
    const x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
    const x2 = cx + Math.cos(a + 0.12) * r2, y2 = cy + Math.sin(a + 0.12) * r2;
    const xm = cx + Math.cos(a - 0.1) * mid, ym = cy + Math.sin(a - 0.1) * mid;
    trabs.push(S('path', { d: `M ${x1} ${y1} Q ${xm} ${ym} ${x2} ${y2}`, fill: 'none', stroke: '#b9a6ff', 'stroke-width': 13, 'stroke-linecap': 'round', opacity: 0.95 }, gTrab));
    const xb = cx + Math.cos(a + 0.35) * (r2 + 40), yb = cy + Math.sin(a + 0.35) * (r2 + 40);
    trabs.push(S('path', { d: `M ${xm} ${ym} Q ${(xm + xb) / 2} ${(ym + yb) / 2 + 10} ${xb} ${yb}`, fill: 'none', stroke: '#b9a6ff', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.85 }, gTrab));
  }
  S('circle', { cx, cy, r: R, fill: 'none', stroke: '#b9a6ff', 'stroke-width': 22 }, gTrab);

  // ---------------------------------------------------------------- labels
  const lab = (x, y, text, color, anchor = 'start') => {
    const g = S('g', { opacity: 0 }, svg);
    S('text', { x, y, 'text-anchor': anchor, class: 't-md', text, style: `fill:${color}; paint-order: stroke; stroke: var(--bg); stroke-width: 6px` }, g);
    return g;
  };
  const labels = {
    1: [lab(cx, cy - R - 34, 'Capsule', '#b9a6ff', 'middle'), lab(cx + 175, cy - 225, 'Trabecula', '#b9a6ff')],
    2: [lab(400, 196, 'White pulp', 'var(--text)', 'middle'), lab(660, 430, 'Central artery', '#ff8a9a', 'middle')],
    3: [lab(860, 520, 'Red pulp', '#ff6b80', 'middle'), lab(640, 700, 'Macrophage', '#e3a9d4', 'middle'), lab(200, 690, 'Sinusoids', '#ffc2cc', 'middle')],
  };

  const layers = { 1: gTrab, 2: gWhite, 3: gRed };
  function setStep(s) {
    for (const k of [1, 2, 3]) {
      const on = s === 0 || s === k;
      gsap.to(layers[k], { opacity: on ? 1 : 0.22, duration: 0.8, ease: 'power2.out' });
      labels[k].forEach((g) => gsap.to(g, { opacity: s === k ? 1 : 0, duration: 0.6 }));
    }
    if (s >= 1) gsap.to(gWhite, { opacity: s === 2 ? 1 : 0.22, duration: 0.8 });
  }

  let time = 0;
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      time += dt;
      flows.forEach((f) => f.update(dt));
      const u = (time % 4) / 4;
      const f = Math.min(1, u / 0.6);
      victim.setAttribute('cx', 820 - f * 50);
      victim.setAttribute('cy', 560 + f * 45);
      victim.setAttribute('opacity', u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.25));
      const sc = u < 0.6 ? 1 : 1 - (u - 0.6) * 0.8;
      victim.setAttribute('rx', 10 * sc);
      victim.setAttribute('ry', 8.5 * sc);
    },
  };
}
