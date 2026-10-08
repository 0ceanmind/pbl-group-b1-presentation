// SLO 1 — hematopoiesis lineage diagram.
import { S, Flow, drawIn, gsap } from '../lib/dom.js';
import { defs, rbc, wbc, platelet, pill } from '../lib/icons.js';

export function hemato(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 960 760' }, host);
  const D = defs(svg);

  const hx = 170, hy = 380;
  const ends = [
    { y: 130, name: 'Erythrocytes', color: '#ff375f' },
    { y: 380, name: 'Leukocytes', color: '#c9b8ff' },
    { y: 630, name: 'Platelets', color: '#cfa8f5' },
  ];

  // branches
  const gBr = S('g', {}, svg);
  const branches = ends.map((e) => S('path', {
    d: `M ${hx + 60} ${hy} C ${hx + 260} ${hy}, ${520} ${e.y}, ${700} ${e.y}`,
    fill: 'none', stroke: e.color, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.55,
  }, gBr));

  // flows
  const gFlow = S('g', { opacity: 0 }, svg);
  const flows = branches.map((p, i) => new Flow({ parent: gFlow, path: p, count: 6, r: 9, fill: ends[i].color, speed: 0.16, seed: i + 3 }));

  // HSC
  const gH = S('g', {}, svg);
  const halo = S('circle', { cx: hx, cy: hy, r: 92, fill: 'none', stroke: '#40c8e0', 'stroke-width': 3, opacity: 0.5 }, gH);
  const halo2 = S('circle', { cx: hx, cy: hy, r: 92, fill: 'none', stroke: '#40c8e0', 'stroke-width': 2, opacity: 0.3 }, gH);
  S('circle', { cx: hx, cy: hy, r: 70, fill: D.url('hsc') }, gH);
  S('circle', { cx: hx + 6, cy: hy - 4, r: 38, fill: '#1f7f99', opacity: 0.85 }, gH);
  S('text', { x: hx, y: hy + 140, 'text-anchor': 'middle', class: 't-md', text: 'Hematopoietic' }, gH);
  S('text', { x: hx, y: hy + 174, 'text-anchor': 'middle', class: 't-md', text: 'stem cell' }, gH);
  S('text', { x: hx, y: hy + 208, 'text-anchor': 'middle', class: 't-xs', text: 'multipotent · proliferates' }, gH);

  // endpoints
  const gEnds = ends.map((e, i) => {
    const g = S('g', { opacity: 0 }, svg);
    const x = 770;
    if (i === 0) {
      rbc(g, x, e.y - 20, 34, D, { tilt: -10 });
      rbc(g, x + 70, e.y + 18, 30, D, { tilt: 15 });
      rbc(g, x + 20, e.y + 50, 26, D, { tilt: 5 });
    } else if (i === 1) {
      wbc(g, x + 10, e.y - 12, 34, D);
      wbc(g, x + 78, e.y + 26, 28, D);
    } else {
      [[0, -10, 14, 20], [40, 14, 12, -30], [70, -16, 11, 60], [24, 36, 10, 10], [86, 30, 9, 80]].forEach(([dx, dy, r, rot]) => platelet(g, x + dx, e.y + dy, r, rot));
    }
    S('text', { x: x + 40, y: e.y + (i === 0 ? 112 : 100), 'text-anchor': 'middle', class: 't-md', text: e.name }, g);
    return g;
  });

  // regulators
  const gReg = S('g', { opacity: 0 }, svg);
  const regs = [
    pill(gReg, hx, hy - 150, 'SCF', '#40c8e0'),
    pill(gReg, 470, 470, 'Cytokines', '#bf5af2'),
    pill(gReg, 470, 175, 'Erythropoietin', '#ff375f'),
  ];

  const prog = S('text', { x: 470, y: 720, 'text-anchor': 'middle', class: 't-xs', text: 'continuous production', opacity: 0 }, svg);

  // timelines
  let built = false;
  function build() {
    if (built) return;
    built = true;
    branches.forEach((b, i) => drawIn(b, 1.1, i * 0.12));
    gEnds.forEach((g, i) => gsap.to(g, { opacity: 1, duration: 0.8, delay: 0.7 + i * 0.12 }));
  }
  function setStep(s) {
    if (s >= 1) build();
    else {
      built = false;
      branches.forEach((b) => { gsap.killTweensOf(b.style); b.style.strokeDashoffset = b.getTotalLength(); b.style.strokeDasharray = `${b.getTotalLength()} ${b.getTotalLength()}`; });
      gEnds.forEach((g) => gsap.to(g, { opacity: 0, duration: 0.4 }));
    }
    gsap.to(gFlow, { opacity: s >= 2 ? 1 : 0, duration: 0.8 });
    gsap.to(prog, { opacity: s >= 2 ? 1 : 0, duration: 0.8 });
    gsap.to(gReg, { opacity: s >= 3 ? 1 : 0, duration: 0.8 });
  }
  // initial: hide branches
  branches.forEach((b) => { const L = b.getTotalLength(); b.style.strokeDasharray = `${L} ${L}`; b.style.strokeDashoffset = L; });

  let time = 0;
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      time += dt;
      const p = (time % 2.4) / 2.4;
      halo.setAttribute('r', 72 + p * 46);
      halo.setAttribute('opacity', (1 - p) * 0.6);
      const p2 = ((time + 1.2) % 2.4) / 2.4;
      halo2.setAttribute('r', 72 + p2 * 46);
      halo2.setAttribute('opacity', (1 - p2) * 0.45);
      flows.forEach((f) => f.update(dt));
      regs.forEach((r, i) => {
        const base = r.getAttribute('transform').replace(/translate\(([^)]+)\)/, '$1').split(' ').map(Number);
        if (!r._b) r._b = base;
        r.setAttribute('transform', `translate(${r._b[0]} ${r._b[1] + Math.sin(time * 1.2 + i * 2) * 6})`);
      });
    },
  };
}
