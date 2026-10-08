// SLO 5 — red cell indices.
import { S, H, rng, gauss, gsap, fitCanvas, drawRBC, col, segmented, lerp, clamp, easeOut, easeInOut } from '../lib/dom.js';
import { defs, rbc } from '../lib/icons.js';
import { CASE, RANGES } from '../data.js';

// ================================================== RBC count / Hct / Hb
export function vials(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1696 740' }, host);
  const D = defs(svg);

  // ---- three definition columns ----
  const colW = 540;
  const cols = [
    { t: 'RBC count', q: 'How many?', d: ['Cells per volume of blood'], c: '#ff375f' },
    { t: 'Hematocrit (Hct)', q: 'How much space?', d: ['% of blood volume'], c: '#ffb340' },
    { t: 'Hemoglobin (Hb)', q: 'How much oxygen capacity?', d: ['Carries O₂ to tissues'], c: '#40c8e0' },
  ];
  const colG = cols.map((c, i) => {
    const x = i * (colW + 38);
    const g = S('g', { opacity: 0 }, svg);
    S('rect', { x, y: 0, width: colW, height: 300, rx: 30, class: 'fill-surface', stroke: 'var(--line)' }, g);
    S('text', { x: x + 34, y: 58, class: 't-xs', text: c.q.toUpperCase(), style: `fill:${c.c};letter-spacing:.12em;font-weight:700` }, g);
    S('text', { x: x + 34, y: 104, class: 't-lg', text: c.t }, g);
    c.d.forEach((line, k) => S('text', { x: x + 34, y: 150 + k * 32, class: 't-sm', text: line }, g));
    const ig = S('g', { transform: `translate(${x + 34} 210)` }, g);
    if (i === 0) {
      for (let k = 0; k < 9; k++) rbc(ig, 20 + k * 52, 34, 18, D, { tilt: k * 12 });
    } else if (i === 1) {
      S('rect', { x: 0, y: 14, width: 460, height: 40, rx: 20, fill: '#ffe08a', opacity: 0.35 }, ig);
      S('rect', { x: 0, y: 14, width: 460 * 0.45, height: 40, rx: 20, fill: '#e5243b' }, ig);
      S('text', { x: 460 * 0.45 + 14, y: 42, class: 't-sm', text: '45% cells', style: 'fill:var(--text)' }, ig);
    } else {
      for (let k = 0; k < 4; k++) {
        const hx = 40 + k * 120;
        S('circle', { cx: hx, cy: 34, r: 24, fill: '#ff375f', opacity: 0.85 }, ig);
        S('text', { x: hx + 30, y: 22, class: 't-xs', text: 'O₂', style: 'fill:#40c8e0;font-weight:700' }, ig);
      }
    }
    return g;
  });

  // ---- demo: related, not interchangeable ----
  const demoTitle = S('text', { x: 0, y: 380, class: 't-lg', text: 'Related — but not interchangeable', opacity: 0 }, svg);
  const scen = [
    { name: 'Reference', count: 12, r: 15, hct: 40, pale: false, note: '' },
    { name: 'Same count, larger cells', count: 12, r: 21, hct: 52, pale: false, note: '→ higher hematocrit', st: 1 },
    { name: 'Same count, less hemoglobin', count: 12, r: 15, hct: 40, pale: true, note: '→ lower hemoglobin', st: 2 },
  ];
  const demos = scen.map((s, i) => {
    const x = i * (colW + 38);
    const g = S('g', { opacity: 0 }, svg);
    S('text', { x, y: 440, class: 't-md', text: s.name, style: 'font-size:27px' }, g);
    // cell sample (fixed count)
    for (let k = 0; k < s.count; k++) {
      const cx = x + 30 + (k % 4) * 62, cy = 500 + Math.floor(k / 4) * 62;
      rbc(g, cx, cy, s.r, D, { pale: s.pale, tilt: k * 25 });
    }
    // centrifuged tube
    const tx = x + 330, ty = 470, th = 220, tw = 74;
    S('rect', { x: tx, y: ty, width: tw, height: th, rx: 22, fill: '#ffe08a', opacity: 0.28 }, g);
    const packed = S('rect', { x: tx, y: ty + th, width: tw, height: 0, rx: 22, fill: s.pale ? '#f08a98' : '#e5243b' }, g);
    S('rect', { x: tx, y: ty, width: tw, height: th, rx: 22, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    const lab = S('text', { x: tx + tw + 16, y: ty + th - (s.hct / 100) * th + 8, class: 't-md t-mono', text: `${s.hct}%`, style: 'font-size:26px' }, g);
    S('text', { x: tx + tw + 16, y: ty + th - (s.hct / 100) * th + 36, class: 't-xs', text: 'Hct' }, g);
    if (s.note) S('text', { x, y: 728, class: 't-md', text: s.note, style: `font-size:26px;fill:${s.pale ? '#40c8e0' : '#ffb340'}` }, g);
    return { g, packed, s, ty, th };
  });
  S('text', { x: 1696, y: 380, 'text-anchor': 'end', class: 't-xs', text: 'illustrative', opacity: 0.8 }, svg);

  function setStep(s) {
    colG.forEach((g, i) => gsap.to(g, { opacity: 1, duration: 0.7, delay: i * 0.12 }));
    gsap.to(demoTitle, { opacity: s >= 1 ? 1 : 0, duration: 0.6 });
    demos.forEach((d, i) => {
      const on = s >= 1 && (i === 0 || s >= d.s.st);
      gsap.to(d.g, { opacity: on ? 1 : 0, duration: 0.7 });
      const hh = on ? (d.s.hct / 100) * d.th : 0;
      gsap.to(d.packed, { attr: { y: d.ty + d.th - hh, height: hh }, duration: 1.3, ease: 'power3.out', delay: 0.2 });
    });
  }
  return { enter(s) { setStep(s); }, step(s) { setStep(s); } };
}

// ============================================ blood film + size ladder (RDW)
export function film(slide, api) {
  const cv = slide.querySelector('[data-viz] canvas');
  let ctx, w, h;
  const rand = rng(31);
  const N = 96;
  const fx = 330, fy = 320, FR = 300;
  // place cells with rejection sampling
  const cells = [];
  let tries = 0;
  while (cells.length < N && tries++ < 8000) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (FR - 30);
    const x = fx + Math.cos(a) * r, y = fy + Math.sin(a) * r;
    if (cells.some((c) => Math.hypot(c.x - x, c.y - y) < 54)) continue;
    const gN = gauss(rand), gH = gauss(rand);
    cells.push({
      x, y, rot: rand() * 6,
      rN: 26 * (1 + 0.035 * clamp(gN, -2.5, 2.5)),
      rH: 26 * Math.cbrt(CASE.mcv / 90) * (1 + 0.13 * clamp(gH, -2.5, 2.5)),
      ph: rand() * 6,
    });
  }
  const order = (key) => [...cells].sort((a, b) => a[key] - b[key]);
  let mode = 0, mix = 0, ladder = 0;
  let ladderT0 = 0;
  const seg = segmented(slide.querySelector('[data-ctl]'), [
    { label: 'Normal film', color: 'var(--green)' },
    { label: 'Her blood film', color: 'var(--red)' },
  ], (i) => { mode = i; });
  let step = 0;
  function resize(s) { ({ ctx, w, h } = fitCanvas(cv, s)); }
  function text(str, x, y, { size = 24, weight = 600, color = '--text', align = 'left' } = {}) {
    ctx.font = `${weight} ${size}px Inter`;
    ctx.fillStyle = col(color);
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  }
  let time = 0;
  function frame(t, dt) {
    if (!ctx) return;
    time += dt;
    mix += ((mode === 1 ? 1 : 0) - mix) * (1 - Math.exp(-2.5 * dt));
    const wantL = step >= 2 ? 1 : 0;
    ladder += (wantL - ladder) * (1 - Math.exp(-1.6 * dt));
    ctx.clearRect(0, 0, w, h);

    // microscope field
    ctx.save();
    ctx.beginPath();
    ctx.arc(fx, fy, FR, 0, Math.PI * 2);
    const bg = ctx.createRadialGradient(fx, fy, FR * 0.2, fx, fy, FR);
    bg.addColorStop(0, '#f6efe9');
    bg.addColorStop(0.85, '#e9dfd8');
    bg.addColorStop(1, '#b9aaa2');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.clip();
    for (const c of cells) {
      const r = lerp(c.rN, c.rH, mix);
      const hb = lerp(1, 0.5, mix);
      const pal = lerp(0.34, 0.6, mix);
      drawRBC(ctx, c.x, c.y, r, { hb, pallor: pal, rot: c.rot });
    }
    ctx.restore();
    ctx.lineWidth = 10;
    ctx.strokeStyle = col('--surface-3');
    ctx.beginPath();
    ctx.arc(fx, fy, FR + 5, 0, Math.PI * 2);
    ctx.stroke();
    text(mode === 1 ? 'Microcytic · hypochromic · anisocytosis' : 'Uniform · normochromic', fx, fy + FR + 52, { size: 24, color: '--text-2', align: 'center' });

    // right panel: numbers
    const px = 760;
    const R = RANGES;
    text('MCV · AVERAGE SIZE', px, 40, { size: 18, weight: 700, color: '--text-3' });
    text(mode === 1 ? `${CASE.mcv} fL` : `${R.mcv.lo}–${R.mcv.hi} fL`, px, 112, { size: 72, weight: 760, color: mode === 1 ? '--blue' : '--text' });
    text(mode === 1 ? '↓ smaller' : 'reference', px, 152, { size: 22, color: '--text-3' });
    const px2 = 1250;
    text('RDW · VARIATION IN SIZE', px2, 40, { size: 18, weight: 700, color: '--text-3' });
    text(mode === 1 ? `${CASE.rdw}%` : `${R.rdw.lo}–${R.rdw.hi}%`, px2, 112, { size: 72, weight: 760, color: mode === 1 ? '--amber' : '--text' });
    text(mode === 1 ? '↑ anisocytosis' : 'reference', px2, 152, { size: 22, color: '--text-3' });

    // size ladder: same cells, sorted smallest → largest
    const ly = 400;
    text('SAME CELLS, SORTED BY SIZE', px, ly - 110, { size: 18, weight: 700, color: '--text-3' });
    const sorted = order(mix > 0.5 ? 'rH' : 'rN');
    const span = w - px - 20;
    const n = sorted.length;
    let minR = Infinity, maxR = 0, sum = 0;
    sorted.forEach((c, i) => {
      const r = lerp(c.rN, c.rH, mix);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r); sum += r;
      const k = clamp(ladder * 1.6 - (i / n) * 0.6);
      const e = easeInOut(k);
      const tx = px + 14 + (i / (n - 1)) * (span - 28);
      const x = lerp(c.x, tx, e);
      const y = lerp(c.y, ly + (i % 2) * 10, e);
      const s = lerp(1, 0.58, e);
      if (k > 0.001) drawRBC(ctx, x, y, r * s, { hb: lerp(1, 0.5, mix), pallor: lerp(0.34, 0.6, mix), alpha: Math.min(1, k * 3) });
    });
    if (ladder > 0.6) {
      ctx.globalAlpha = clamp((ladder - 0.6) / 0.4);
      ctx.strokeStyle = col('--text-3');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 14, ly + 58); ctx.lineTo(w - 34, ly + 58);
      ctx.stroke();
      text('smallest', px + 14, ly + 92, { size: 20, color: '--text-3' });
      text('largest', w - 34, ly + 92, { size: 20, color: '--text-3', align: 'right' });
      const spread = ((maxR - minR) / (sum / n)) * 100;
      text(mode === 1 ? 'Wide spread → high RDW' : 'Narrow spread → normal RDW', px, ly + 160, { size: 34, weight: 700, color: mode === 1 ? '--amber' : '--green' });
      ctx.globalAlpha = 1;
    }
  }
  function setStep(s) {
    step = s;
    seg.set(s >= 1 ? 1 : 0);
  }
  return { resize, frame, enter(s) { setStep(s); }, step(s) { setStep(s); } };
}

// ============================================================ CBC dashboard
export function cbc(slide) {
  const table = slide.querySelector('[data-table]');
  const qs = slide.querySelector('[data-qs]');
  const rows = [
    { k: 'rbc', p: 'RBC count', f: 'red blood cells', u: '×10⁶/µL', dom: [3, 6.5], dir: '↓' },
    { k: 'hb', p: 'Hb', f: 'hemoglobin', u: 'g/dL', dom: [6, 18], dir: '↓' },
    { k: 'hct', p: 'Hct', f: 'hematocrit', u: '%', dom: [20, 55], dir: '↓' },
    { k: 'mcv', p: 'MCV', f: 'mean corpuscular volume', u: 'fL', dom: [55, 110], dir: '↓' },
    { k: 'mch', p: 'MCH', f: 'mean corpuscular Hb', u: 'pg', dom: [15, 38], dir: '↓' },
    { k: 'mchc', p: 'MCHC', f: 'mean corpuscular Hb concentration', u: 'g/dL', dom: [24, 40], dir: '↓' },
    { k: 'rdw', p: 'RDW', f: 'red cell distribution width', u: '%', dom: [9, 22], dir: '↑' },
  ];
  const head = H('div', { class: 'r head' }, table);
  ['Parameter', 'Her result', 'Reference', 'Position vs reference', ''].forEach((t) => H('div', { text: t }, head));
  const els = rows.map((r) => {
    const R = RANGES[r.k];
    const el = H('div', { class: 'r' }, table);
    H('div', { class: 'p', html: `${r.p}<small>${r.f}</small>` }, el);
    H('div', { class: 'res num', html: `${CASE[r.k]}<small>${r.u}</small>` }, el);
    H('div', { class: 'ref num', text: `${R.lo}–${R.hi}` }, el);
    const g = H('div', { class: 'gauge' }, el);
    const pct = (v) => ((v - r.dom[0]) / (r.dom[1] - r.dom[0])) * 100;
    H('div', { class: 'band', style: `left:${pct(R.lo)}%;width:${pct(R.hi) - pct(R.lo)}%` }, g);
    const mk = H('div', { class: 'mk', style: `left:${pct((R.lo + R.hi) / 2)}%;--c:${r.dir === '↑' ? 'var(--amber)' : 'var(--red)'}` }, g);
    H('div', { class: `ar ${r.dir === '↑' ? 'up' : 'down'}`, text: r.dir }, el);
    return { el, mk, target: pct(CASE[r.k]), mid: pct((R.lo + R.hi) / 2), k: r.k };
  });
  const QS = [
    { q: 'Hb / Hct → Is there anemia?', a: 'Yes — ↓ Hb + ↓ Hct', keys: ['hb', 'hct'], c: 'var(--red)' },
    { q: 'MCV → What size are the cells?', a: 'Microcytic', keys: ['mcv'], c: 'var(--blue)' },
    { q: 'MCH / MCHC → How much hemoglobin?', a: 'Hypochromic', keys: ['mch', 'mchc'], c: 'var(--pink)' },
    { q: 'RDW → How different are their sizes?', a: 'Anisocytosis', keys: ['rdw'], c: 'var(--amber)' },
  ];
  const qEls = QS.map((q, i) => {
    const el = H('div', { class: 'q', 'data-step': i + 1, 'data-anim': 'right' }, qs);
    el.innerHTML = `<div class="qq">${q.q}</div><div class="qa" style="color:${q.c}">${q.a}</div>`;
    return el;
  });
  function setStep(s) {
    els.forEach((e) => { e.mk.style.left = `${e.target}%`; });
    const q = QS[s - 1];
    table.classList.toggle('focusing', !!q && s <= 4);
    els.forEach((e) => e.el.classList.toggle('lit', !!q && s <= 4 && q.keys.includes(e.k)));
  }
  return {
    enter(s) {
      els.forEach((e) => { e.mk.style.transition = 'none'; e.mk.style.left = `${e.mid}%`; });
      requestAnimationFrame(() => requestAnimationFrame(() => { els.forEach((e) => { e.mk.style.transition = ''; }); setStep(s); }));
      setTimeout(() => setStep(s), 60);
    },
    step(s) { setStep(s); },
  };
}

// ================================================================ MCV × RDW
export function rdwmap(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1080 770' }, host);
  const X0 = 110, X1 = 1050, Y0 = 30, Y1 = 660;
  const xd = [50, 120], yd = [8, 24];
  const X = (v) => X0 + ((v - xd[0]) / (xd[1] - xd[0])) * (X1 - X0);
  const Y = (v) => Y1 - ((v - yd[0]) / (yd[1] - yd[0])) * (Y1 - Y0);
  const R = RANGES;
  // reference bands
  S('rect', { x: X(R.mcv.lo), y: Y0, width: X(R.mcv.hi) - X(R.mcv.lo), height: Y1 - Y0, fill: '#30d158', opacity: 0.08 }, svg);
  S('rect', { x: X0, y: Y(R.rdw.hi), width: X1 - X0, height: Y1 - Y(R.rdw.hi), fill: '#30d158', opacity: 0.08 }, svg);
  // axes
  S('line', { x1: X0, y1: Y1, x2: X1, y2: Y1, stroke: 'var(--line-2)', 'stroke-width': 2 }, svg);
  S('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: 'var(--line-2)', 'stroke-width': 2 }, svg);
  for (let v = 50; v <= 120; v += 10) {
    S('text', { x: X(v), y: Y1 + 34, 'text-anchor': 'middle', class: 't-xs t-mono', text: v }, svg);
  }
  for (let v = 8; v <= 24; v += 4) S('text', { x: X0 - 16, y: Y(v) + 7, 'text-anchor': 'end', class: 't-xs t-mono', text: v }, svg);
  S('text', { x: (X0 + X1) / 2, y: Y1 + 80, 'text-anchor': 'middle', class: 't-md', text: 'MCV (fL) — average size →', style: 'font-size:25px' }, svg);
  S('text', { x: 24, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', class: 't-md', text: 'RDW (%) — variation →', transform: `rotate(-90 24 ${(Y0 + Y1) / 2})`, style: 'font-size:25px' }, svg);
  // dashed reference lines
  [R.mcv.lo, R.mcv.hi].forEach((v) => S('line', { x1: X(v), y1: Y0, x2: X(v), y2: Y1, stroke: '#30d158', 'stroke-dasharray': '6 8', opacity: 0.6 }, svg));
  S('line', { x1: X0, y1: Y(R.rdw.hi), x2: X1, y2: Y(R.rdw.hi), stroke: '#30d158', 'stroke-dasharray': '6 8', opacity: 0.6 }, svg);
  S('text', { x: X((R.mcv.lo + R.mcv.hi) / 2), y: Y1 - 18, 'text-anchor': 'middle', class: 't-xs', text: 'normal MCV', style: 'fill:#30d158' }, svg);

  // quadrant labels
  const quad = (x, y, l1, l2, c) => {
    const g = S('g', { opacity: 0 }, svg);
    S('text', { x, y, 'text-anchor': 'middle', class: 't-md', text: l1, style: `fill:${c};font-size:26px` }, g);
    S('text', { x, y: y + 32, 'text-anchor': 'middle', class: 't-sm', text: l2 }, g);
    return g;
  };
  const q1 = quad(X(65), Y(21.5), '↓ MCV + ↑ RDW', 'commonly iron-deficiency anemia', '#ff375f');
  const q2 = quad(X(65), Y(11.4), '↓ MCV + normal RDW', 'can be seen in thalassemia trait', '#40c8e0');
  const q3 = quad(X(110), Y(21.5), '↑ MCV + ↑ RDW', 'B12 / folate deficiency', '#bf5af2');

  // patient
  const gP = S('g', { opacity: 0 }, svg);
  const px = X(CASE.mcv), py = Y(CASE.rdw);
  const pulse = S('circle', { cx: px, cy: py, r: 20, fill: 'none', stroke: '#ff375f', 'stroke-width': 3 }, gP);
  S('circle', { cx: px, cy: py, r: 14, fill: '#ff375f' }, gP);
  S('text', { x: px + 28, y: py + 70, class: 't-md', text: `Her cells · MCV ${CASE.mcv} fL · RDW ${CASE.rdw}%`, style: 'font-size:25px;font-weight:700' }, gP);

  function setStep(s) {
    [q1, q2, q3].forEach((g, i) => gsap.to(g, { opacity: s >= 1 ? 1 : 0, duration: 0.6, delay: i * 0.12 }));
    gsap.to(gP, { opacity: s >= 2 ? 1 : 0, duration: 0.6 });
    gsap.to(q1, { scale: s >= 2 ? 1.06 : 1, svgOrigin: `${X(65)} ${Y(21.5)}`, duration: 0.8 });
  }
  let time = 0;
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      time += dt;
      const u = (time % 1.6) / 1.6;
      pulse.setAttribute('r', 16 + u * 30);
      pulse.setAttribute('opacity', 1 - u);
    },
  };
}
