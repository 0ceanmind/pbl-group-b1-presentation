// SLO 4 — synthesis & breakdown of red cells, anemia and polycythemia.
import { S, H, Flow, PathSampler, rng, gsap, fitCanvas, drawRBC, col, segmented, lerp, clamp, easeOut, easeInOut } from '../lib/dom.js';
import { defs, rbc, macrophage } from '../lib/icons.js';
import { CASE, RANGES, O2_PER_G_HB } from '../data.js';

// ============================================================ erythropoiesis
export function erythro(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1696 500' }, host);
  const D = defs(svg);
  const cy = 250;
  const xs = [100, 345, 590, 835, 1080, 1325, 1580];
  const stages = [
    { name: ['Hematopoietic', 'stem cell'], r: 56, cyto: '#40c8e0', nuc: 40, nucC: '#1f7f99' },
    { name: ['Pro-', 'erythroblast'], r: 62, cyto: '#5a63d8', nuc: 44, nucC: '#2c1d6b' },
    { name: ['Basophil', 'erythroblast'], r: 55, cyto: '#5f73e6', nuc: 34, nucC: '#2a1a5e' },
    { name: ['Polychromatophil', 'erythroblast'], r: 48, cyto: '#a86fbf', nuc: 25, nucC: '#2a1650' },
    { name: ['Orthochromatic', 'erythroblast'], r: 42, cyto: '#e2607a', nuc: 15, nucC: '#1b0c33' },
    { name: ['Reticulocyte', ''], r: 41, cyto: '#ec4d68', nuc: 0 },
    { name: ['Erythrocyte', ''], r: 40, rbc: true },
  ];
  // Hb accumulation bar
  const gBar = S('g', { opacity: 0 }, svg);
  const lg = S('linearGradient', { id: `${D.id}-hb`, x1: 0, x2: 1 }, D.d);
  [['0%', '#5a63d8'], ['45%', '#a86fbf'], ['70%', '#e2607a'], ['100%', '#e5243b']].forEach(([o, c]) => S('stop', { offset: o, 'stop-color': c }, lg));
  S('rect', { x: 345, y: 444, width: 1235, height: 12, rx: 6, fill: `url(#${D.id}-hb)` }, gBar);
  S('text', { x: 345, y: 488, class: 't-sm', text: 'Hemoglobin ↑ · nucleus extruded' }, gBar);

  // chevrons
  for (let i = 0; i < xs.length - 1; i++) {
    const x = (xs[i] + xs[i + 1]) / 2;
    S('path', { d: `M ${x - 8} ${cy - 14} L ${x + 6} ${cy} L ${x - 8} ${cy + 14}`, fill: 'none', stroke: 'var(--text-4)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  }
  // iron rail
  const gIron = S('g', { opacity: 0 }, svg);
  S('text', { x: 345, y: 30, class: 't-sm', text: 'Iron → heme → hemoglobin', style: 'fill:#ffb340' }, gIron);
  const ironPaths = [2, 3, 4].map((i) => S('path', { d: `M ${xs[i] - 60} 52 C ${xs[i] - 30} 70, ${xs[i]} 120, ${xs[i]} ${cy - 30}`, fill: 'none', stroke: 'none' }, gIron));
  const ironFlows = ironPaths.map((p, i) => new Flow({ parent: gIron, path: p, count: 5, r: 7, fill: '#ffb340', speed: 0.35, seed: i + 9 }));

  const cells = stages.map((st, i) => {
    const g = S('g', { transform: `translate(${xs[i]} ${cy})`, opacity: 0 }, svg);
    const body = S('g', {}, g);
    let cyto = null, nuc = null, reti = null;
    if (st.rbc) {
      cyto = S('ellipse', { rx: st.r, ry: st.r * 0.9, fill: D.url('rbc') }, body);
    } else {
      cyto = S('circle', { r: st.r, fill: st.cyto, opacity: 0.92 }, body);
      S('circle', { r: st.r, fill: D.url('glow'), opacity: 0.25 }, body);
      if (st.nuc) {
        nuc = S('circle', { cx: i === 4 ? st.r * 0.38 : 4, cy: -2, r: st.nuc, fill: st.nucC }, body);
        if (i <= 1) [[-10, -8], [12, 6]].forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 5, fill: '#6f5bd6', opacity: 0.7 }, body));
      }
      if (i === 5) {
        reti = S('g', { opacity: 0.6 }, body);
        [[-14, -10], [8, -16], [16, 6], [-6, 14], [-18, 6], [4, 0]].forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 2.6, fill: '#5a63d8' }, reti));
      }
    }
    S('text', { x: 0, y: 128, 'text-anchor': 'middle', class: 't-md', text: st.name[0], style: 'font-size:24px' }, g);
    if (st.name[1]) S('text', { x: 0, y: 158, 'text-anchor': 'middle', class: 't-sm', text: st.name[1] }, g);
    return { g, body, cyto, nuc, st };
  });
  // extruded nucleus
  const exNuc = S('circle', { cx: xs[4] + 16, cy: cy - 2, r: 15, fill: '#1b0c33', opacity: 0 }, svg);

  let deficient = false;
  let step = 0;
  const seg = segmented(slide.querySelector('[data-ctl]'), [
    { label: 'Iron available', color: 'var(--iron)' },
    { label: 'Iron deficient', color: 'var(--blue)' },
  ], (i) => { deficient = i === 1; applyIron(); });

  function applyIron() {
    // late stages: smaller and paler when iron is short (illustrative)
    cells.forEach((c, i) => {
      const k = deficient ? [0, 0, 0, 0.1, 0.16, 0.2, 0.22][i] : 0;
      gsap.to(c.body, { scale: 1 - k, svgOrigin: '0 0', duration: 1.2, ease: 'power3.out' });
      if (i >= 3) gsap.to(c.cyto, { opacity: deficient ? 0.5 : 0.92, duration: 1.2 });
      if (i === 6) c.cyto.setAttribute('fill', deficient ? D.url('rbcPale') : D.url('rbc'));
    });
    ironFlows.forEach((f) => f.setCount(deficient ? 1 : 5));
  }
  function setStep(s) {
    step = s;
    cells.forEach((c, i) => gsap.to(c.g, { opacity: 1, duration: 0.7, delay: s === 0 ? i * 0.12 : 0 }));
    gsap.to(gBar, { opacity: s >= 1 ? 1 : 0, duration: 0.7 });
    gsap.to(gIron, { opacity: s >= 2 ? 1 : 0, duration: 0.7 });
    seg.set(s >= 3 ? 1 : 0);
  }
  let time = 0;
  return {
    enter(s) { cells.forEach((c) => c.g.setAttribute('opacity', 0)); setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      time += dt;
      ironFlows.forEach((f) => f.update(dt));
      // nucleus extrusion loop at the orthochromatic stage
      const u = (time % 3.4) / 3.4;
      const f = easeInOut(clamp((u - 0.2) / 0.6));
      exNuc.setAttribute('cx', xs[4] + 16 + f * 120);
      exNuc.setAttribute('cy', cy - 2 - f * 60);
      exNuc.setAttribute('opacity', u < 0.2 ? 0 : u > 0.85 ? (1 - u) / 0.15 : 0.9);
      cells.forEach((c, i) => {
        if (i === 0 || i === 1) c.body.setAttribute('opacity', 0.92 + Math.sin(time * 2 + i) * 0.08);
      });
    },
  };
}

// ======================================================== EPO feedback loop
export function epo(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 940 790' }, host);
  const D = defs(svg);
  const cx = 470, cy = 400, R = 280;
  const ang = (a) => [cx + Math.cos((a * Math.PI) / 180) * R, cy + Math.sin((a * Math.PI) / 180) * R];
  const arc = (a0, a1) => {
    const [x0, y0] = ang(a0), [x1, y1] = ang(a1);
    const large = ((a1 - a0 + 360) % 360) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
  };
  const nodesDef = [
    { a: -90, t: 'Hemoglobin ↓', s: `${CASE.hb} g/dL`, c: '#ff375f' },
    { a: -18, t: 'O₂ delivery ↓', s: 'tissue hypoxia', c: '#40c8e0' },
    { a: 54, t: 'Kidney', s: '↑ erythropoietin', c: '#bf5af2' },
    { a: 126, t: 'Bone marrow', s: 'stimulated', c: '#ff9f0a' },
    { a: 198, t: 'Iron lacking', s: 'poorly hemoglobinized', c: '#0a84ff' },
  ];
  const arcs = [];
  for (let i = 0; i < 5; i++) {
    const a0 = nodesDef[i].a + 26, a1 = nodesDef[(i + 1) % 5].a - 26 + (i === 4 ? 360 : 0);
    const broken = i === 4;
    const p = S('path', { d: arc(a0, a1), fill: 'none', stroke: broken ? '#ff375f' : 'var(--line-2)', 'stroke-width': broken ? 4 : 3, 'stroke-dasharray': broken ? '10 10' : 'none', opacity: 0 }, svg);
    arcs.push(p);
  }
  // break mark
  const [bx, by] = ang(-126);
  const brk = S('g', { opacity: 0, transform: `translate(${bx} ${by})` }, svg);
  S('circle', { r: 30, fill: 'var(--bg)', stroke: '#ff375f', 'stroke-width': 3 }, brk);
  S('path', { d: 'M -11 -11 L 11 11 M 11 -11 L -11 11', stroke: '#ff375f', 'stroke-width': 5, 'stroke-linecap': 'round' }, brk);
  const brkT = S('text', { x: bx - 40, y: by - 50, 'text-anchor': 'middle', class: 't-sm', text: 'Hb cannot recover', style: 'fill:#ff375f;font-weight:650', opacity: 0 }, svg);

  const nodes = nodesDef.map((n) => {
    const [x, y] = ang(n.a);
    const g = S('g', { opacity: 0, transform: `translate(${x} ${y})` }, svg);
    S('circle', { r: 64, fill: n.c, 'fill-opacity': 0.14, stroke: n.c, 'stroke-width': 3 }, g);
    S('circle', { r: 64, fill: D.url('glow'), opacity: 0.12 }, g);
    const c = Math.cos((n.a * Math.PI) / 180);
    const lx = c > 0.3 && n.a < 0 ? 84 : 0;
    const anchor = lx > 0 ? 'start' : 'middle';
    const ly = lx === 0 ? (n.a === -90 ? -84 : 100) : -4;
    S('text', { x: lx, y: ly, 'text-anchor': anchor, class: 't-md', text: n.t, style: `font-size:29px` }, g);
    S('text', { x: lx, y: ly + 32, 'text-anchor': anchor, class: 't-sm', text: n.s }, g);
    return g;
  });
  // icons in nodes
  const icon = (i, fn) => fn(nodes[i]);
  icon(0, (g) => rbc(g, 0, 0, 30, D, { pale: true }));
  icon(1, (g) => { S('text', { x: 0, y: 12, 'text-anchor': 'middle', class: 't-md', text: 'O₂', style: 'fill:#40c8e0;font-size:34px' }, g); });
  icon(2, (g) => { S('path', { d: 'M -14 -30 C -40 -30, -40 30, -10 30 C 4 30, 4 14, -4 4 C -10 -4, -2 -12, 4 -10 C 14 -6, 20 -30, -14 -30 Z', fill: '#bf5af2', opacity: 0.85 }, g); });
  icon(3, (g) => { [[-14, -10, 14], [12, -8, 12], [0, 14, 13]].forEach(([x, y, r]) => S('circle', { cx: x, cy: y, r, fill: '#ff9f0a', opacity: 0.85 }, g)); });
  icon(4, (g) => { S('text', { x: 0, y: 12, 'text-anchor': 'middle', class: 't-md', text: 'Fe', style: 'fill:#0a84ff;font-size:34px' }, g); });
  S('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', class: 't-md', text: 'Feedback loop', style: 'fill:var(--text-3)' }, svg);
  S('text', { x: cx, y: cy + 28, 'text-anchor': 'middle', class: 't-sm', text: 'erythropoietin ↔ oxygen', style: 'fill:var(--text-4)' }, svg);

  const gFl = S('g', {}, svg);
  const flows = arcs.slice(0, 4).map((p, i) => new Flow({ parent: gFl, path: p, count: 3, r: 7, fill: nodesDef[i + 1].c, speed: 0.35, seed: i + 2 }));

  // O2 capacity chart (HTML card)
  const o2 = slide.querySelector('[data-o2]');
  const o2svg = S('svg', { viewBox: '0 0 620 200' }, o2);
  const maxV = 22, bw = 360;
  const cap = (hb) => +(hb * O2_PER_G_HB).toFixed(1);
  const herCap = cap(CASE.hb);
  const rows = [
    { k: `Normal range (Hb ${RANGES.hb.lo}–${RANGES.hb.hi})`, v: cap(RANGES.hb.lo), v2: cap(RANGES.hb.hi), lab: `${cap(RANGES.hb.lo).toFixed(0)}–${cap(RANGES.hb.hi).toFixed(0)}`, c: '#30d158' },
    { k: `Her blood (Hb ${CASE.hb})`, v: herCap, lab: `≈${herCap}`, c: '#ff375f' },
  ];
  const o2bars = rows.map((r, i) => {
    const y = 20 + i * 92;
    S('text', { x: 0, y: y + 22, class: 't-sm', text: r.k, style: 'fill:var(--text);font-size:23px' }, o2svg);
    S('rect', { x: 0, y: y + 36, width: bw, height: 28, rx: 14, class: 'fill-surface' }, o2svg);
    let e = null;
    if (r.v2) e = S('rect', { x: 0, y: y + 36, width: 0, height: 28, rx: 14, fill: r.c, opacity: 0.4 }, o2svg);
    const b = S('rect', { x: 0, y: y + 36, width: 0, height: 28, rx: 14, fill: r.c }, o2svg);
    S('text', { x: bw + 18, y: y + 60, class: 't-md t-mono', text: `${r.lab} mL O₂/dL`, style: 'font-size:24px' }, o2svg);
    return { b, e, v: r.v, v2: r.v2 };
  });

  function setStep(s) {
    nodes.forEach((g, i) => gsap.to(g, { opacity: (i < 3 || s >= 1) ? 1 : 0, duration: 0.7, delay: s === 0 ? i * 0.15 : 0 }));
    arcs.forEach((a, i) => gsap.to(a, { opacity: (i < 2 || s >= 1) ? (i === 4 ? 1 : 0.8) : 0, duration: 0.7 }));
    flows.forEach((f, i) => { f.visible = (i < 2 || s >= 1) ? 1 : 0; });
    gsap.to(brk, { opacity: s >= 1 ? 1 : 0, duration: 0.7, delay: 0.3 });
    gsap.to(brkT, { opacity: s >= 1 ? 1 : 0, duration: 0.7, delay: 0.5 });
    o2bars.forEach((b, i) => {
      gsap.to(b.b, { attr: { width: s >= 2 ? (b.v / maxV) * bw : 0 }, duration: 1.3, delay: 0.3 + i * 0.2, ease: 'power3.out' });
      if (b.e) gsap.to(b.e, { attr: { width: s >= 2 ? (b.v2 / maxV) * bw : 0 }, duration: 1.3, delay: 0.3, ease: 'power3.out' });
    });
  }
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) { flows.forEach((f) => f.update(dt)); },
  };
}

// ============================================================ life cycle
export function lifecycle(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1120 830' }, host);
  const D = defs(svg);
  const cx = 560, cy = 380, R = 270;
  const P = (a) => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
  const [mx, my] = P(Math.PI); // marrow (left)
  const [sx, sy] = P(0); // spleen (right)
  const top = S('path', { d: `M ${mx} ${my} A ${R} ${R} 0 0 1 ${sx} ${sy}`, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 3 }, svg);
  const bottom = S('path', { d: `M ${sx} ${sy} A ${R} ${R} 0 0 1 ${mx} ${my}`, fill: 'none', stroke: '#ffb340', 'stroke-width': 3, 'stroke-dasharray': '4 10', opacity: 0.25 }, svg);
  const topS = new PathSampler(top);

  // stations
  const station = (x, y, title, sub, color, anchor = 'middle', dx = 0, dy = 0) => {
    const g = S('g', {}, svg);
    S('circle', { cx: x, cy: y, r: 58, fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 3 }, g);
    S('text', { x: x + dx, y: y + dy, 'text-anchor': anchor, class: 't-md', text: title, style: 'font-size:28px' }, g);
    S('text', { x: x + dx, y: y + dy + 32, 'text-anchor': anchor, class: 't-sm', text: sub }, g);
    return g;
  };
  const gM = station(mx, my, 'Bone marrow', 'new red cells', '#ff375f', 'middle', 0, 100);
  [[-14, -8, 13], [12, -10, 12], [0, 14, 12]].forEach(([x, y, r]) => S('circle', { cx: mx + x, cy: my + y, r, fill: '#ff375f', opacity: 0.8 }, gM));
  const gS = station(sx, sy, 'Spleen', 'red pulp', '#bf5af2', 'middle', 0, 100);
  macrophage(gS, sx, sy, 34, D, 3);
  // ferritin store + bile exits
  const [fx, fy] = [cx, cy + R];
  const gF = station(fx, fy, 'Liver', 'stored as ferritin', '#ffb340', 'middle', 0, 96);
  const ferBranch = S('path', { d: `M ${cx + 40} ${cy + R - 4} L ${cx + 4} ${cy + R}`, fill: 'none' }, svg);
  const bileP = S('path', { d: `M ${sx} ${sy + 60} C ${sx + 10} ${sy + 160}, ${sx + 60} ${sy + 220}, ${sx + 150} ${sy + 300}`, fill: 'none', stroke: '#ffd60a', 'stroke-width': 3, 'stroke-dasharray': '4 10', opacity: 0 }, svg);
  const gB = S('g', { opacity: 0 }, svg);
  S('text', { x: sx + 150, y: sy + 340, 'text-anchor': 'middle', class: 't-md', text: 'Bilirubin → bile', style: 'fill:#ffd60a;font-size:26px' }, gB);

  // day counter
  const dayT = S('text', { x: cx, y: cy - 10, 'text-anchor': 'middle', class: 't-lg t-mono', text: 'Day 0', style: 'font-size:64px' }, svg);
  const daySub = S('text', { x: cx, y: cy + 36, 'text-anchor': 'middle', class: 't-sm', text: 'in circulation' }, svg);

  // travelling cell
  const cell = S('g', {}, svg);
  const cellBody = S('ellipse', { rx: 30, ry: 26, fill: D.url('rbc') }, cell);
  const frags = Array.from({ length: 7 }, () => S('circle', { r: 7, fill: '#b5596a', opacity: 0 }, svg));
  const gFe = S('g', {}, svg);
  const feFlow = new Flow({ parent: gFe, path: bottom, count: 10, r: 8, fill: '#ffb340', speed: 0.14, seed: 4 });
  const bileFlow = new Flow({ parent: gFe, path: bileP, count: 5, r: 7, fill: '#ffd60a', speed: 0.3, seed: 5 });

  let step = 0;
  function setStep(s) {
    step = s;
    gsap.to(bottom, { opacity: s >= 2 ? 0.8 : 0.2, duration: 0.6 });
    feFlow.visible = s >= 2 ? 1 : 0;
    gsap.to(gF, { opacity: s >= 2 ? 1 : 0.25, duration: 0.6 });
    gsap.to(bileP, { opacity: s >= 3 ? 0.8 : 0, duration: 0.6 });
    gsap.to(gB, { opacity: s >= 3 ? 1 : 0, duration: 0.6 });
    bileFlow.visible = s >= 3 ? 1 : 0;
    gsap.to(gS, { opacity: s >= 1 ? 1 : 0.5, duration: 0.6 });
  }
  let time = 0;
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      time += dt;
      const T = 7.5;
      const u = (time % T) / T;
      const travel = clamp(u / 0.8);
      const day = Math.round(travel * 120);
      dayT.textContent = `Day ${day}`;
      daySub.textContent = travel < 1 ? 'in circulation' : 'retired';
      const [x, y] = topS.at(easeInOut(travel));
      cell.setAttribute('transform', `translate(${x} ${y}) rotate(${travel * 360})`);
      // ageing: darker, stiffer (less wobble)
      const age = travel;
      const wob = (1 - age) * 0.18;
      cellBody.setAttribute('rx', 30 * (1 + Math.sin(time * 6) * wob * 0.3));
      cellBody.setAttribute('ry', 26 * (1 - Math.sin(time * 6) * wob * 0.3));
      cellBody.setAttribute('fill', age > 0.7 ? D.url('rbcPale') : D.url('rbc'));
      cell.setAttribute('opacity', u < 0.8 ? 1 : 0);
      frags.forEach((f, i) => {
        const k = clamp((u - 0.8) / 0.2);
        const a = (i / frags.length) * Math.PI * 2;
        f.setAttribute('cx', sx + Math.cos(a) * 40 * k * (1 - k) * 3);
        f.setAttribute('cy', sy + Math.sin(a) * 40 * k * (1 - k) * 3);
        f.setAttribute('opacity', u >= 0.8 ? 1 - k : 0);
      });
      feFlow.update(dt);
      bileFlow.update(dt);
    },
  };
}

// ============================================================ anemia types
export function anemia(slide, api) {
  const cards = [...slide.querySelectorAll('.ac')];
  const rand = rng(8);
  const items = cards.map((card) => {
    const cv = card.querySelector('canvas');
    return { card, cv, k: card.dataset.k, ctx: null, w: 0, h: 0, seeds: Array.from({ length: 12 }, () => [rand(), rand(), rand()]) };
  });
  function resize(s) { items.forEach((it) => { Object.assign(it, fitCanvas(it.cv, s)); }); }
  function setStep(s) {
    slide.classList.toggle('focus', s >= 1);
    cards.forEach((c) => c.classList.toggle('lit', s >= 1));
  }
  function draw(it, t) {
    const { ctx, w, h, k, seeds } = it;
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2;
    const bob = (i) => Math.sin(t * 1.4 + i) * 3;
    if (k === 'acute') {
      // diluted: few cells in a pale plasma channel
      ctx.fillStyle = 'rgba(255,214,10,0.10)';
      ctx.beginPath(); ctx.roundRect(8, cy - 34, w - 16, 68, 34); ctx.fill();
      [0.2, 0.55, 0.85].forEach((x, i) => drawRBC(ctx, ((x * w + t * 30) % (w - 40)) + 20, cy + bob(i), 18));
    } else if (k === 'chronic') {
      [0.22, 0.5, 0.78].forEach((x, i) => drawRBC(ctx, x * w, cy + bob(i), [17, 13, 15][i], { hb: 0.45, pallor: 0.6 }));
    } else if (k === 'aplastic') {
      ctx.fillStyle = 'rgba(255,231,163,0.22)';
      [[0.25, 30], [0.55, 26], [0.82, 22]].forEach(([x, r]) => { ctx.beginPath(); ctx.arc(x * w, cy, r, 0, 7); ctx.fill(); });
      drawRBC(ctx, 0.4 * w, cy + 22 + bob(1), 12, { alpha: 0.7 });
    } else if (k === 'mega') {
      [0.3, 0.7].forEach((x, i) => drawRBC(ctx, x * w, cy + bob(i), 30, { sx: 1.25, sy: 0.95, pallor: 0.2 }));
    } else if (k === 'sphero') {
      [0.25, 0.5, 0.75].forEach((x, i) => {
        const g = ctx.createRadialGradient(x * w - 5, cy - 6, 2, x * w, cy, 17);
        g.addColorStop(0, '#ff7b8e'); g.addColorStop(1, '#a3122e');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x * w, cy + bob(i), 16, 0, 7); ctx.fill();
      });
    } else if (k === 'sickle') {
      [0.3, 0.68].forEach((x, i) => {
        ctx.save(); ctx.translate(x * w, cy + bob(i)); ctx.rotate(-0.4 + i * 0.8);
        ctx.fillStyle = '#d6263e';
        ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI * 0.15, Math.PI * 0.85); ctx.arc(0, -12, 22, Math.PI * 0.8, Math.PI * 0.2, true); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    } else if (k === 'rh') {
      drawRBC(ctx, w * 0.5, cy, 26);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 0.5;
        const r = 48 + Math.sin(t * 2 + i) * 4;
        const x = w * 0.5 + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.75;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = '#bf5af2'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -2); ctx.lineTo(-7, -10); ctx.moveTo(0, -2); ctx.lineTo(7, -10); ctx.stroke();
        ctx.restore();
      }
    } else if (k === 'tf') {
      [0.3, 0.7].forEach((x, i) => {
        ctx.save(); ctx.translate(x * w, cy + bob(i));
        ctx.strokeStyle = '#40c8e0'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(64,200,224,0.15)';
        ctx.beginPath(); ctx.roundRect(-34, -17, 68, 34, 17); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,179,64,0.5)'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(-14, 0, 7, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(14, 0, 7, 0, 7); ctx.stroke();
        ctx.restore();
      });
    }
  }
  return {
    resize,
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t) { items.forEach((it) => draw(it, t)); },
  };
}

// ==================================================== too thin / too thick
export function vessel(slide, api) {
  const cv = slide.querySelector('[data-viz] canvas');
  let ctx, w, h;
  const rand = rng(12);
  const MAXN = 150;
  const cells = Array.from({ length: MAXN }, (_, i) => ({ x: rand(), y: rand(), r: rand(), tilt: rand(), ph: rand() * 6, rank: rand() }));
  const MODES = [
    { name: 'Normal', hct: 42, speed: 1, color: 'var(--green)' },
    { name: 'Anemia', hct: CASE.hct, speed: 2.0, color: 'var(--blue)' },
    { name: 'Polycythemia vera', hct: 65, speed: 0.4, color: 'var(--amber)' },
  ];
  let mode = 0;
  let density = 0.38, speed = 1;
  const descs = [...slide.querySelectorAll('.md')];

  // charts
  const chHost = slide.querySelector('[data-charts]');
  const svg = S('svg', { viewBox: '0 0 740 740' }, chHost);
  const charts = [
    { title: 'Blood viscosity', unit: '× water', max: 10, rows: [['Severe anemia', 1.5, null, '≈1.5'], ['Normal', 3, null, '≈3'], ['Polycythemia vera', 10, null, 'up to ≈10']] },
    { title: 'Cardiac output', unit: '× normal', max: 4, rows: [['Severe anemia', 3, 4, '3–4×'], ['Normal', 1, null, '1×'], ['Polycythemia vera', 1, null, '≈ normal']] },
    { title: 'Hematocrit', unit: '%', max: 70, rows: [['Her blood', CASE.hct, null, `${CASE.hct}%`], ['Normal (women)', RANGES.hct.lo, RANGES.hct.hi, `${RANGES.hct.lo}–${RANGES.hct.hi}%`], ['Polycythemia vera', 60, 70, '60–70%']] },
  ];
  const colors = ['#0a84ff', '#30d158', '#ffb340'];
  const bars = [];
  charts.forEach((c, ci) => {
    const y0 = ci * 250;
    S('text', { x: 0, y: y0 + 26, class: 't-md', text: c.title, style: 'font-size:28px' }, svg);
    S('text', { x: 740, y: y0 + 26, 'text-anchor': 'end', class: 't-xs', text: c.unit }, svg);
    c.rows.forEach(([k, v, v2, lab], ri) => {
      const y = y0 + 52 + ri * 60;
      const bw = 360;
      S('text', { x: 0, y: y + 27, class: 't-sm', text: k, style: 'font-size:21px' }, svg);
      S('rect', { x: 240, y: y + 8, width: bw, height: 26, rx: 13, class: 'fill-surface' }, svg);
      let ext = null;
      if (v2) ext = S('rect', { x: 240, y: y + 8, width: 0, height: 26, rx: 13, fill: colors[ri], opacity: 0.35 }, svg);
      const b = S('rect', { x: 240, y: y + 8, width: 0, height: 26, rx: 13, fill: colors[ri] }, svg);
      const t = S('text', { x: 240 + bw + 14, y: y + 29, class: 't-sm t-mono', text: lab, style: 'font-size:21px;fill:var(--text);font-weight:650' }, svg);
      bars.push({ b, ext, v, v2, max: c.max, bw, ri, t });
    });
  });
  function setMode(i) {
    mode = i;
    descs.forEach((d, k) => d.classList.toggle('on', k === i));
    bars.forEach((r) => {
      const on = r.ri === i;
      gsap.to(r.b, { attr: { width: (r.v / r.max) * r.bw }, opacity: on ? 1 : 0.28, duration: 1, ease: 'power3.out' });
      if (r.ext) gsap.to(r.ext, { attr: { width: (r.v2 / r.max) * r.bw }, opacity: on ? 0.4 : 0.12, duration: 1 });
      gsap.to(r.t, { opacity: on ? 1 : 0.45, duration: 0.6 });
    });
  }
  const seg = segmented(slide.querySelector('[data-ctl]'), MODES.map((m) => ({ label: m.name, color: m.color })), (i) => setMode(i));
  function resize(s) { ({ ctx, w, h } = fitCanvas(cv, s)); }
  let off = 0;
  function frame(t, dt) {
    if (!ctx) return;
    const m = MODES[mode];
    density += (m.hct / 100 - density) * (1 - Math.exp(-2 * dt));
    speed += (m.speed - speed) * (1 - Math.exp(-2 * dt));
    off += dt * 120 * speed;
    ctx.clearRect(0, 0, w, h);
    const top = 34, bot = h - 34;
    // vessel lumen
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(255,214,150,0.10)');
    g.addColorStop(0.5, 'rgba(255,214,150,0.16)');
    g.addColorStop(1, 'rgba(255,214,150,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, w, bot - top);
    ctx.fillStyle = '#d9a3c9';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, top - 10, w, 10);
    ctx.fillRect(0, bot, w, 10);
    ctx.globalAlpha = 1;
    // cells: count ∝ hematocrit (illustrative), drawn in depth order
    const n = Math.round(MAXN * clamp(density / 0.7));
    for (let i = 0; i < MAXN; i++) {
      const c = cells[i];
      if (c.rank > n / MAXN) continue;
      const lane = top + 22 + c.y * (bot - top - 44);
      // parabolic profile: faster in the centre
      const prof = 1 - Math.pow((c.y - 0.5) * 2, 2) * 0.6;
      const x = ((c.x * (w + 80) + off * prof) % (w + 80)) - 40;
      const sq = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.8 * speed + c.ph));
      drawRBC(ctx, x, lane, 20 + c.r * 4, { sy: sq, rot: c.tilt * 0.6 - 0.3 });
    }
    ctx.fillStyle = col('--text-3');
    ctx.font = '650 18px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`Hematocrit ${mode === 2 ? '60–70' : mode === 0 ? `${RANGES.hct.lo}–${RANGES.hct.hi}` : MODES[mode].hct}%`, w - 20, 24);
    ctx.textAlign = 'left';
    ctx.fillText(mode === 1 ? 'faster flow · high cardiac output' : mode === 2 ? 'sluggish flow' : 'normal flow', 20, 24);
  }
  return {
    resize,
    frame,
    enter(s) { seg.set([0, 1, 2][Math.min(2, s)]); },
    step(s) { seg.set([0, 1, 2][Math.min(2, s)]); },
  };
}

// ============================================================ polycythemia
export function poly(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 730 760' }, host);
  S('text', { x: 0, y: 34, class: 't-lg', text: 'Red cell count' }, svg);
  S('text', { x: 0, y: 72, class: 't-sm', text: 'million per mm³ (= ×10⁶/µL)', style: 'fill:var(--text-3)' }, svg);
  const rows = [
    { k: 'Her blood', v: CASE.rbc, lab: `${CASE.rbc}`, c: '#ff375f', st: 0 },
    { k: 'Normal women', v: 4.7, lab: '≈4.7', c: '#8e8e93', st: 0 },
    { k: 'Normal men', v: 5.2, lab: '≈5.2', c: '#8e8e93', st: 0 },
    { k: 'Secondary', v: 6, v2: 7, lab: '6–7', c: '#40c8e0', st: 1 },
    { k: 'Vera', v: 7, v2: 8, lab: '7–8', c: '#ffb340', st: 2 },
  ];
  const x0 = 220, bw = 420, max = 8;
  const bars = rows.map((r, i) => {
    const y = 120 + i * 118;
    const g = S('g', { opacity: 0 }, svg);
    S('text', { x: 0, y: y + 34, class: 't-md', text: r.k, style: 'font-size:26px' }, g);
    S('rect', { x: x0, y: y + 10, width: bw, height: 36, rx: 18, class: 'fill-surface' }, g);
    let ext = null;
    if (r.v2) ext = S('rect', { x: x0, y: y + 10, width: 0, height: 36, rx: 18, fill: r.c, opacity: 0.4 }, g);
    const b = S('rect', { x: x0, y: y + 10, width: 0, height: 36, rx: 18, fill: r.c }, g);
    S('text', { x: x0 + ((r.v2 || r.v) / max) * bw + 14, y: y + 38, class: 't-md t-mono', text: r.lab, style: 'font-size:26px' }, g);
    return { g, b, ext, r };
  });
  S('text', { x: 0, y: 740, class: 't-xs', text: 'Normal values: Guyton & Hall averages · her value from the case', style: '' }, svg);
  function setStep(s) {
    bars.forEach((o) => {
      const on = s >= o.r.st;
      gsap.to(o.g, { opacity: on ? 1 : 0, duration: 0.6 });
      gsap.to(o.b, { attr: { width: on ? (o.r.v / max) * bw : 0 }, duration: 1.2, ease: 'power3.out' });
      if (o.ext) gsap.to(o.ext, { attr: { width: on ? (o.r.v2 / max) * bw : 0 }, duration: 1.2, ease: 'power3.out' });
    });
  }
  return { enter(s) { setStep(s); }, step(s) { setStep(s); } };
}
