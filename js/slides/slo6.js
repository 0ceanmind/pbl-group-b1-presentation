// SLO 6 — iron metabolism, iron studies; closing synthesis chain.
import { S, H, Flow, rng, gsap, segmented, lerp, clamp } from '../lib/dom.js';
import { defs, rbc, pill } from '../lib/icons.js';

// ========================================================= iron metabolism
export function ironpath(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1696 640' }, host);
  const D = defs(svg);
  const rand = rng(4);

  // lumen
  S('text', { x: 20, y: 120, class: 't-xs', text: 'DUODENAL LUMEN', style: 'letter-spacing:.12em' }, svg);
  // enterocyte
  const cell = S('g', {}, svg);
  S('rect', { x: 290, y: 150, width: 470, height: 420, rx: 60, fill: '#ff9f80', 'fill-opacity': 0.09, stroke: '#ff9f80', 'stroke-opacity': 0.6, 'stroke-width': 3 }, cell);
  for (let y = 170; y < 560; y += 22) S('rect', { x: 268, y, width: 24, height: 10, rx: 5, fill: '#ff9f80', opacity: 0.5 }, cell);
  S('ellipse', { cx: 600, cy: 470, rx: 70, ry: 48, fill: '#7c6bd6', opacity: 0.35 }, cell);
  S('text', { x: 525, y: 196, 'text-anchor': 'middle', class: 't-xs', text: 'INTESTINAL CELL (ENTEROCYTE)', style: 'letter-spacing:.1em' }, cell);
  // DMT1
  const dmt = S('g', {}, svg);
  S('rect', { x: 268, y: 270, width: 44, height: 86, rx: 16, fill: '#ffb340', 'fill-opacity': 0.25, stroke: '#ffb340', 'stroke-width': 3 }, dmt);
  S('text', { x: 290, y: 400, 'text-anchor': 'middle', class: 't-md', text: 'DMT1', style: 'fill:#ffb340;font-size:26px' }, dmt);
  S('text', { x: 150, y: 250, 'text-anchor': 'middle', class: 't-sm', html: 'Fe³⁺ → Fe²⁺', style: 'fill:var(--text)' }, svg);
  S('text', { x: 150, y: 280, 'text-anchor': 'middle', class: 't-xs', text: 'reduced' }, svg);
  // ferritin store inside enterocyte
  const gFerr = S('g', { opacity: 0.2 }, svg);
  const ferr = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ferr.push(S('circle', { cx: 450 + Math.cos(a) * 34, cy: 470 + Math.sin(a) * 26, r: 14, fill: '#ffb340', opacity: 0.85 }, gFerr));
  }
  S('text', { x: 450, y: 540, 'text-anchor': 'middle', class: 't-sm', text: 'Ferritin (storage)', style: 'fill:#ffb340' }, gFerr);
  // ferroportin
  const gFpn = S('g', { opacity: 0.2 }, svg);
  S('rect', { x: 738, y: 270, width: 44, height: 86, rx: 16, fill: '#66e3c4', 'fill-opacity': 0.25, stroke: '#66e3c4', 'stroke-width': 3 }, gFpn);
  S('text', { x: 760, y: 250, 'text-anchor': 'middle', class: 't-md', text: 'Ferroportin', style: 'fill:#66e3c4;font-size:26px' }, gFpn);
  const fpnBlock = S('g', { opacity: 0 }, gFpn);
  S('path', { d: 'M 735 300 q 12 -26 25 0 q 13 26 25 0', fill: 'none', stroke: '#bf5af2', 'stroke-width': 8, 'stroke-linecap': 'round' }, fpnBlock);

  // blood vessel
  const gBlood = S('g', { opacity: 0.2 }, svg);
  S('rect', { x: 840, y: 100, width: 220, height: 520, rx: 110, fill: '#e5243b', 'fill-opacity': 0.12, stroke: '#e5243b', 'stroke-opacity': 0.5, 'stroke-width': 3 }, gBlood);
  S('text', { x: 950, y: 150, 'text-anchor': 'middle', class: 't-xs', text: 'BLOOD', style: 'letter-spacing:.12em' }, gBlood);
  S('text', { x: 950, y: 420, 'text-anchor': 'middle', class: 't-md', text: 'Transferrin', style: 'fill:#40c8e0;font-size:26px' }, gBlood);
  // destinations
  const dest = (y, t1, t2, color) => {
    const g = S('g', { opacity: 0.2 }, svg);
    S('rect', { x: 1240, y, width: 450, height: 150, rx: 30, class: 'fill-surface', stroke: color, 'stroke-opacity': 0.6, 'stroke-width': 2 }, g);
    S('text', { x: 1274, y: y + 62, class: 't-md', text: t1, style: 'font-size:30px' }, g);
    S('text', { x: 1274, y: y + 104, class: 't-sm', text: t2 }, g);
    return g;
  };
  const gMarrow = dest(80, 'Bone marrow', 'iron for red cell production', '#ff375f');
  const gStore = dest(370, 'Tissue stores', 'stored mainly as ferritin', '#ffb340');
  const storeLevel = S('rect', { x: 1600, y: 400, width: 46, height: 90, rx: 10, fill: '#ffb340', opacity: 0 }, svg);

  // liver + hepcidin
  const gHep = S('g', { opacity: 0 }, svg);
  S('path', { d: 'M 520 20 C 540 -10, 680 -10, 700 30 C 715 60, 670 88, 610 84 C 560 82, 505 60, 520 20 Z', fill: '#a8473f' }, gHep);
  S('text', { x: 610, y: 52, 'text-anchor': 'middle', class: 't-sm', text: 'Liver', style: 'fill:#fff;font-weight:650' }, gHep);
  const hepArrow = S('path', { d: 'M 705 45 C 760 60, 772 140, 762 240', fill: 'none', stroke: '#bf5af2', 'stroke-width': 4 }, gHep);
  S('path', { d: 'M 746 244 L 778 244', stroke: '#bf5af2', 'stroke-width': 6, 'stroke-linecap': 'round' }, gHep);
  const hepLabel = S('text', { x: 722, y: 34, class: 't-md', text: 'Hepcidin', style: 'fill:#bf5af2;font-size:26px' }, gHep);
  const hepLevel = S('text', { x: 722, y: 66, class: 't-sm', text: 'acts on ferroportin' }, gHep);

  // blood loss
  const gLoss = S('g', { opacity: 0 }, svg);
  S('text', { x: 1080, y: 600, class: 't-md', text: 'Menstrual blood loss', style: 'fill:#ff375f;font-size:26px' }, gLoss);
  S('text', { x: 1080, y: 630, class: 't-sm', text: 'iron leaves with every bleed' }, gLoss);

  // paths & flows
  const P = (d) => S('path', { d, fill: 'none' }, svg);
  const pIn = P('M 30 330 C 120 300, 200 320, 290 313 L 420 330 C 470 335, 520 330, 560 320');
  const pStore = P('M 560 320 C 520 380, 470 420, 450 470');
  const pOut = P('M 560 320 C 640 310, 700 313, 760 313 L 900 313 C 940 313, 950 360, 950 380');
  const pMarrow = P('M 950 300 C 980 200, 1100 155, 1240 155');
  const pStores = P('M 950 440 C 1000 480, 1120 445, 1240 445');
  const pLoss = P('M 990 560 C 1000 600, 1010 620, 1020 650');
  const gF = S('g', {}, svg);
  const fIn = new Flow({ parent: gF, path: pIn, count: 7, r: 8, fill: '#ffb340', speed: 0.16, seed: 1 });
  const fStore = new Flow({ parent: gF, path: pStore, count: 3, r: 7, fill: '#ffb340', speed: 0.3, seed: 2 });
  const fOut = new Flow({ parent: gF, path: pOut, count: 6, r: 8, fill: '#ffb340', speed: 0.18, seed: 3 });
  const fMar = new Flow({ parent: gF, path: pMarrow, count: 5, r: 8, fill: '#40c8e0', speed: 0.2, seed: 4 });
  const fSto = new Flow({ parent: gF, path: pStores, count: 4, r: 8, fill: '#40c8e0', speed: 0.2, seed: 5 });
  const fLoss = new Flow({ parent: gF, path: pLoss, count: 6, r: 9, fill: '#ff375f', speed: 0.5, seed: 6 });
  const all = [fIn, fStore, fOut, fMar, fSto, fLoss];
  all.forEach((f) => { f.visible = 0; });

  let deficient = false;
  let step = 0;
  const seg = segmented(slide.querySelector('[data-ctl]'), [
    { label: 'Iron replete', color: 'var(--iron)' },
    { label: 'Iron deficient', color: 'var(--blue)' },
  ], (i) => { deficient = i === 1; applyMode(); });
  function applyMode() {
    // hepcidin high when replete (limits entry); low when deficient (more absorbed & released)
    hepLevel.textContent = deficient ? 'decreased → ferroportin active' : 'acts on ferroportin';
    gsap.to(fpnBlock, { opacity: step >= 3 && !deficient ? 1 : 0, duration: 0.6 });
    fIn.rate = deficient ? 1.8 : 1;
    fOut.rate = deficient ? 1.8 : step >= 3 ? 0.6 : 1;
    gsap.to(hepArrow, { opacity: deficient ? 0.3 : 1, duration: 0.6 });
    ferr.forEach((f, i) => gsap.to(f, { opacity: deficient && step >= 4 ? (i < 2 ? 0.85 : 0.08) : 0.85, duration: 0.8 }));
    gsap.to(storeLevel, { attr: { y: deficient && step >= 4 ? 470 : 400, height: deficient && step >= 4 ? 20 : 90 }, opacity: step >= 2 ? 0.8 : 0, duration: 1 });
  }
  function setStep(s) {
    step = s;
    fIn.visible = 1;
    fStore.visible = s >= 1 ? 1 : 0;
    fOut.visible = s >= 1 ? 1 : 0;
    fMar.visible = s >= 2 ? 1 : 0;
    fSto.visible = s >= 2 ? 1 : 0;
    fLoss.visible = s >= 4 ? 1 : 0;
    gsap.to(gFerr, { opacity: s >= 1 ? 1 : 0.2, duration: 0.6 });
    gsap.to(gFpn, { opacity: s >= 1 ? 1 : 0.2, duration: 0.6 });
    gsap.to(gBlood, { opacity: s >= 1 ? 1 : 0.2, duration: 0.6 });
    gsap.to([gMarrow, gStore], { opacity: s >= 2 ? 1 : 0.2, duration: 0.6 });
    gsap.to(gHep, { opacity: s >= 3 ? 1 : 0, duration: 0.6 });
    gsap.to(gLoss, { opacity: s >= 4 ? 1 : 0, duration: 0.6 });
    seg.set(s >= 4 ? 1 : 0);
    applyMode();
  }
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) { all.forEach((f) => f.update(dt)); },
  };
}

// ============================================================ iron studies
export function ironstudies(slide) {
  const tiles = slide.querySelector('[data-tiles]');
  const T = [
    { k: 'Ferritin', a: '↓', m: 'Iron stores are depleted', c: 'var(--blue)' },
    { k: 'Serum iron', a: '↓', m: 'Less iron circulating', c: 'var(--blue)' },
    { k: 'TIBC', a: '↑', m: 'More free iron-binding capacity', c: 'var(--amber)' },
    { k: 'Transferrin saturation', a: '↓', m: 'Fewer transferrin sites carry iron', c: 'var(--blue)' },
  ];
  T.forEach((t, i) => {
    const el = H('div', { class: 'card', 'data-step': 1, style: `transition-delay:${i * 0.08}s;min-height:200px` }, tiles);
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3 style="font-size:32px;max-width:280px">${t.k}</h3><span style="font-size:64px;font-weight:800;line-height:.9;color:${t.c}">${t.a}</span></div><p style="margin-top:14px">${t.m}</p>`;
  });

  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 820 640' }, host);
  const rand = rng(9);
  const panel = (x0, title, n, fill) => {
    const g = S('g', { opacity: 0 }, svg);
    S('text', { x: x0, y: 30, class: 't-md', text: title, style: 'font-size:27px' }, g);
    const cols = 4;
    const items = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + (i % cols) * 92, y = 64 + Math.floor(i / cols) * 60;
      const tg = S('g', { transform: `translate(${x} ${y})` }, g);
      S('rect', { x: 0, y: 0, width: 78, height: 40, rx: 20, fill: '#40c8e0', 'fill-opacity': 0.18, stroke: '#40c8e0', 'stroke-width': 2.5 }, tg);
      const s1 = S('circle', { cx: 22, cy: 20, r: 9, fill: '#ffb340' }, tg);
      const s2 = S('circle', { cx: 56, cy: 20, r: 9, fill: '#ffb340' }, tg);
      items.push(s1, s2);
    }
    const pct = S('text', { x: x0, y: 64 + Math.ceil(n / cols) * 60 + 30, class: 't-md t-mono', text: '', style: 'font-size:26px' }, g);
    return { g, items, fill, pct, n };
  };
  const normal = panel(0, 'Typical', 20, 0.33);
  const her = panel(430, 'Iron deficiency', 28, 0.1);
  S('text', { x: 0, y: 600, class: 't-xs', text: 'Illustrative: each capsule = transferrin with two iron-binding sites', style: '' }, svg);
  const st = [normal, her].map((p) => ({ p, on: p.items.map(() => rand() < p.fill) }));

  function setStep(s) {
    [normal, her].forEach((p) => gsap.to(p.g, { opacity: s >= 2 ? 1 : 0, duration: 0.7 }));
  }
  let acc = 0;
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      acc += dt;
      if (acc > 0.35) {
        acc = 0;
        // binding dynamics: flip a random site, keeping the overall fraction
        st.forEach(({ p, on }) => {
          const i = Math.floor(rand() * on.length);
          const filled = on.filter(Boolean).length / on.length;
          if (on[i] && filled > p.fill) on[i] = false;
          else if (!on[i] && filled < p.fill + 0.04) on[i] = true;
        });
      }
      st.forEach(({ p, on }) => {
        let n = 0;
        p.items.forEach((el, i) => {
          const o = Number(el.getAttribute('opacity') ?? 1);
          const target = on[i] ? 1 : 0.06;
          el.setAttribute('opacity', (o + (target - o) * Math.min(1, dt * 6)).toFixed(2));
          if (on[i]) n++;
        });
        p.pct.textContent = `${Math.round((n / on.length) * 100)}% of sites filled · ${p.n} carriers`;
      });
    },
  };
}

// =========================================================== synthesis chain
export function chain(slide) {
  const host = slide.querySelector('[data-chain]');
  const nodes = [
    { slo: 'The case', t: 'Heavy, prolonged menstrual bleeding', p: 'For several months; diet with limited iron-rich foods.' },
    { slo: 'SLO 6', t: 'Iron loss exceeds absorption', p: 'Blood loss means iron loss.' },
    { slo: 'SLO 6', t: 'Iron stores depleted', p: '↓ ferritin · ↓ serum iron · ↑ TIBC · ↓ saturation' },
    { slo: 'SLO 3', t: 'Recycling can’t compensate', p: 'Spleen and liver recycle iron, but losses continue.' },
    { slo: 'SLO 6', t: 'Less Fe²⁺ for heme', p: 'Ferrochelatase lacks iron → ↓ heme → ↓ hemoglobin.' },
    { slo: 'SLO 5', t: 'Small, pale, unequal cells', p: '↓ MCV · ↓ MCH · ↓ MCHC · ↑ RDW' },
    { slo: 'SLO 1 · 4', t: 'Marrow can’t respond', p: 'Erythropoietin rises, but reticulocytes are only 0.7%.' },
    { slo: 'The case', t: '↓ Oxygen-carrying capacity', p: 'Fatigue, dizziness, dyspnea, palpitations, pallor, tachycardia.' },
  ];
  const grid = H('div', { class: 'nodes' }, host);
  const els = nodes.map((n, i) => {
    const el = H('div', { class: 'node', 'data-step': i === 0 ? 0 : i, 'data-anim': 'scale' }, grid);
    el.innerHTML = `<div class="slo">${n.slo}</div><h4>${n.t}</h4><p>${n.p}</p>`;
    return el;
  });
  const svg = S('svg', { class: 'links' }, host);
  const paths = [];
  function layout() {
    svg.innerHTML = '';
    paths.length = 0;
    const rect = (el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    for (let i = 0; i < els.length - 1; i++) {
      const a = rect(els[i]), b = rect(els[i + 1]);
      let d;
      if (Math.abs(a.y - b.y) < 10) d = `M ${a.x + a.w + 6} ${a.y + a.h / 2} L ${b.x - 8} ${b.y + b.h / 2}`;
      else d = `M ${a.x + a.w / 2} ${a.y + a.h + 6} C ${a.x + a.w / 2} ${a.y + a.h + 60}, ${b.x + b.w / 2} ${b.y - 60}, ${b.x + b.w / 2} ${b.y - 8}`;
      const p = S('path', { d, fill: 'none', stroke: '#ff375f', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
      const L = p.getTotalLength();
      p.style.strokeDasharray = `${L} ${L}`;
      p.style.strokeDashoffset = L;
      paths.push({ p, L });
    }
  }
  let step = 0;
  function setStep(s) {
    step = s;
    paths.forEach((o, i) => gsap.to(o.p.style, { strokeDashoffset: s >= i + 1 ? 0 : o.L, duration: 0.8, ease: 'power2.inOut' }));
  }
  return {
    enter(s) { layout(); setStep(s); },
    step(s) { setStep(s); },
    resize() { if (paths.length) { layout(); setStep(step); } },
  };
}
