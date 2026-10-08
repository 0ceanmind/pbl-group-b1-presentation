// SLO 3 — recycling iron and red cells.
import { S, H, Flow, PathSampler, rng, gsap, fitCanvas, drawRBC, col, segmented, lerp, clamp, easeOut, easeInOut } from '../lib/dom.js';
import { defs, macrophage, pill } from '../lib/icons.js';

// ============================================================ squeeze test
export function squeeze(slide, api) {
  const cv = slide.querySelector('[data-viz] canvas');
  let ctx, w, h;
  let mode = 0; // 0 young, 1 old
  let t = 0;
  const seg = segmented(slide.querySelector('[data-ctl]'), [
    { label: 'Young cell · day 10', color: 'var(--red)' },
    { label: 'Aged cell · day 120', color: '#9a5a66' },
  ], (i) => { mode = i; t = 0; });
  const rand = rng(3);
  const bgDots = Array.from({ length: 140 }, () => [rand(), rand(), 2 + rand() * 4, rand()]);
  let frags = [];
  let annotate = false;

  function resize(s) { ({ ctx, w, h } = fitCanvas(cv, s)); }

  function wall(wx, cy, gap, thick) {
    const g1 = ctx.createLinearGradient(wx - thick / 2, 0, wx + thick / 2, 0);
    g1.addColorStop(0, 'rgba(185,166,255,0.55)');
    g1.addColorStop(0.5, 'rgba(210,196,255,0.9)');
    g1.addColorStop(1, 'rgba(185,166,255,0.55)');
    ctx.fillStyle = g1;
    const r = thick / 2;
    roundRect(wx - thick / 2, -20, thick, cy - gap / 2 + 20, r);
    roundRect(wx - thick / 2, cy + gap / 2, thick, h - cy - gap / 2 + 20, r);
  }
  function roundRect(x, y, ww, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.fill();
  }
  function dim(x1, x2, y, label) {
    ctx.strokeStyle = col('--text-3');
    ctx.fillStyle = col('--text-2');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.moveTo(x1, y - 8); ctx.lineTo(x1, y + 8);
    ctx.moveTo(x2, y - 8); ctx.lineTo(x2, y + 8);
    ctx.stroke();
    ctx.font = '600 22px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, y - 16);
  }
  function vdim(x, y1, y2, label) {
    ctx.strokeStyle = col('--text-3');
    ctx.fillStyle = col('--text-2');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y1); ctx.lineTo(x, y2);
    ctx.moveTo(x - 8, y1); ctx.lineTo(x + 8, y1);
    ctx.moveTo(x - 8, y2); ctx.lineTo(x + 8, y2);
    ctx.stroke();
    ctx.font = '600 22px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 16, (y1 + y2) / 2 + 8);
  }
  function blob(x, y, r, tt) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = r * (1 + 0.08 * Math.sin(a * 3 + tt) + 0.05 * Math.cos(a * 5 - tt * 1.3));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, '#f4d4ea');
    g.addColorStop(0.7, '#d197c0');
    g.addColorStop(1, '#a96b98');
    ctx.fillStyle = g;
    ctx.fill();
  }

  function frame(time, dt) {
    if (!ctx) return;
    t += dt;
    ctx.clearRect(0, 0, w, h);
    const cy = h * 0.5;
    const D = 150; // 8 µm cell
    const gap = D * 3 / 8; // 3 µm slit
    const wx = w * 0.5;
    const thick = 70;

    // red pulp texture
    for (const [x, y, r, a] of bgDots) {
      ctx.fillStyle = `rgba(232,54,77,${0.14 + a * 0.18})`;
      ctx.beginPath();
      ctx.arc(x * w, y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    wall(wx, cy, gap, thick);

    // macrophage near the slit entrance
    const macHome = { x: wx - 430, y: h - 92 };
    let mac = { ...macHome, r: 74 };

    const old = mode === 1;
    const T = old ? 6.2 : 4.6;
    const u = t % T;
    if (t > T * 6) t -= T * 4;
    const enterX = wx - thick / 2 - D / 2 - 6;
    let x, sx = 1, sy = 1, alpha = 1, rot = 0, show = true;
    if (!old) {
      if (u < 1.3) { x = lerp(w * 0.08, enterX, easeOut(u / 1.3)); }
      else if (u < 2.9) {
        const f = easeInOut((u - 1.3) / 1.6);
        x = lerp(enterX, wx + thick / 2 + D / 2 + 6, f);
        const inside = clamp(1 - Math.abs(x - wx) / (thick / 2 + D * 0.55));
        sy = lerp(1, (gap * 0.9) / D, inside);
        sx = 1 / Math.sqrt(sy);
      } else { x = lerp(wx + thick / 2 + D / 2 + 6, w * 0.92, easeOut((u - 2.9) / 1.7)); }
      alpha = u > T - 0.4 ? (T - u) / 0.4 : u < 0.3 ? u / 0.3 : 1;
      drawRBC(ctx, x, cy, D / 2, { sx, sy, alpha });
    } else {
      // stiff cell: gets stuck, ruptures, is engulfed
      if (u < 1.3) { x = lerp(w * 0.08, enterX, easeOut(u / 1.3)); }
      else if (u < 2.3) {
        const f = (u - 1.3) / 1.0;
        x = enterX + Math.sin(f * Math.PI) * 10 + Math.sin(f * 40) * 2.2 * f;
        sy = 1 - 0.12 * Math.sin(f * Math.PI);
        sx = 1 + 0.06 * Math.sin(f * Math.PI);
      } else { x = enterX; show = false; }
      if (show) drawRBC(ctx, x, cy, D / 2, { sx, sy, alpha: u < 0.3 ? u / 0.3 : 1, hb: 0.72, color: [168, 50, 70] });
      if (u >= 2.3) {
        if (!frags.length || frags.born !== Math.floor(t / T)) {
          frags = Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2 + rand() * 0.5;
            return { x: enterX, y: cy, vx: Math.cos(a) * (60 + rand() * 80), vy: Math.sin(a) * (60 + rand() * 80), r: 12 + rand() * 12, rot: rand() * 6 };
          });
          frags.born = Math.floor(t / T);
        }
        const k = u - 2.3;
        // macrophage advances and engulfs
        const reach = easeInOut(clamp((k - 0.5) / 1.4));
        mac = { x: lerp(macHome.x, enterX - 20, reach), y: lerp(macHome.y, cy + 20, reach), r: lerp(74, 118, reach) };
        // Hb cloud
        const cloud = clamp(1 - k / 1.6);
        if (cloud > 0) {
          const g = ctx.createRadialGradient(enterX, cy, 0, enterX, cy, 90 + k * 60);
          g.addColorStop(0, `rgba(214,38,62,${0.35 * cloud})`);
          g.addColorStop(1, 'rgba(214,38,62,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(enterX, cy, 90 + k * 60, 0, Math.PI * 2);
          ctx.fill();
        }
        blob(mac.x, mac.y, mac.r, time * 1.5);
        for (const f of frags) {
          const pull = easeInOut(clamp((k - 1.0) / 1.6));
          const fx = lerp(enterX + f.vx * Math.min(k, 0.8), mac.x + f.vx * 0.12, pull);
          const fy = lerp(cy + f.vy * Math.min(k, 0.8), mac.y + f.vy * 0.12, pull);
          const fr = f.r * (1 - pull * 0.55);
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(f.rot + k);
          ctx.fillStyle = `rgba(190,52,72,${1 - pull * 0.25})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, fr, fr * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (k > 2.6) {
          ctx.fillStyle = col('--text');
          ctx.font = '650 26px Inter';
          ctx.textAlign = 'center';
          ctx.globalAlpha = clamp((k - 2.6) / 0.4);
          ctx.fillText('Phagocytosis', mac.x, mac.y - mac.r - 22);
          ctx.globalAlpha = 1;
        }
      } else {
        blob(mac.x, mac.y, mac.r, time * 1.5);
      }
      if (u >= 1.5 && u < 2.4) {
        ctx.fillStyle = col('--amber');
        ctx.font = '700 26px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Too rigid to deform', enterX, cy - D / 2 - 30);
      }
    }
    if (!old || u < 2.3) {
      ctx.fillStyle = col('--text-3');
      ctx.font = '600 21px Inter';
      ctx.textAlign = 'center';
      ctx.textAlign = 'right';
      ctx.fillText('Macrophage', macHome.x - 92, macHome.y + 8);
    }

    // dimension guides
    vdim(wx + thick / 2 + 26, cy - gap / 2, cy + gap / 2, '≈3 µm');
    if (u < 1.25) dim(x - D / 2, x + D / 2, cy - D / 2 - 24, '≈8 µm');
    ctx.fillStyle = col('--text-3');
    ctx.font = '650 19px Inter';
    ctx.textAlign = 'center';
    ctx.textAlign = 'right';
    ctx.fillText('RED PULP', wx - thick / 2 - 30, 30);
    ctx.textAlign = 'left';
    ctx.fillText('SINUSOID', wx + thick / 2 + 30, 30);

    // pliability meter
    const pl = old ? 0.22 : 0.95;
    ctx.textAlign = 'left';
    ctx.fillStyle = col('--text-3');
    ctx.font = '650 18px Inter';
    ctx.fillText('MEMBRANE PLIABILITY', w - 330, h - 74);
    ctx.fillStyle = col('--surface-3');
    ctx.beginPath(); ctx.roundRect(w - 330, h - 58, 300, 14, 7); ctx.fill();
    ctx.fillStyle = old ? '#b5596a' : col('--green');
    ctx.beginPath(); ctx.roundRect(w - 330, h - 58, 300 * pl, 14, 7); ctx.fill();
    ctx.fillStyle = col('--text-4');
    ctx.font = '500 16px Inter';
    ctx.fillText('qualitative', w - 330, h - 20);
  }

  return {
    resize,
    frame,
    enter(s) { seg.set(s >= 1 ? 1 : 0); },
    step(s) { seg.set(s >= 1 ? 1 : 0); annotate = s >= 2; },
  };
}

// ======================================================= macrophage pipeline
export function macro(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1040 790' }, host);
  const D = defs(svg);
  const cx = 400, cy = 400;
  // membrane path with known right edge at y = cy
  const pts = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = 1 + 0.05 * Math.sin(3 * a) + 0.03 * Math.cos(5 * a);
    pts.push([cx + Math.cos(a) * 330 * r, cy + Math.sin(a) * 300 * r]);
  }
  const memD = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z';
  const edgeX = cx + 330 * 1.03;
  const gCell = S('g', {}, svg);
  S('path', { d: memD, fill: D.url('mac'), opacity: 0.22 }, gCell);
  S('path', { d: memD, fill: 'none', stroke: '#d9a3c9', 'stroke-width': 5 }, gCell);
  S('text', { x: cx - 120, y: cy - 230, class: 't-xs', text: 'RED PULP MACROPHAGE', style: 'letter-spacing:.12em' }, gCell);
  S('text', { x: 930, y: 140, class: 't-xs', 'text-anchor': 'middle', text: 'PLASMA', style: 'letter-spacing:.12em' }, gCell);

  // nodes
  const node = (x, y, label, color, sub) => {
    const g = S('g', { opacity: 0.18 }, svg);
    S('circle', { cx: x, cy: y, r: 62, fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 3 }, g);
    S('text', { x, y: y + 9, 'text-anchor': 'middle', class: 't-md', text: label, style: `fill:${color};font-size:25px` }, g);
    if (sub) S('text', { x, y: y + 98, 'text-anchor': 'middle', class: 't-sm', text: sub }, g);
    return g;
  };
  // phagosome
  const gPh = S('g', { opacity: 0.18 }, svg);
  S('circle', { cx: 210, cy, r: 82, fill: 'none', stroke: '#d9a3c9', 'stroke-width': 3, 'stroke-dasharray': '8 8' }, gPh);
  S('text', { x: 210, y: cy + 124, 'text-anchor': 'middle', class: 't-sm', text: 'Phagosome' }, gPh);
  const victim = S('ellipse', { cx: 40, cy, rx: 44, ry: 38, fill: D.url('rbc') }, svg);

  const gGlob = node(300, 610, 'Globin', '#30d158', 'amino acids');
  const gHO = node(450, cy, 'HO-1', '#ffb340', 'heme oxygenase-1');
  const gBil = node(560, 610, 'Bilirubin', '#ffd60a', 'from porphyrin');
  // ferroportin channel
  const gFpn = S('g', { opacity: 0.18 }, svg);
  S('rect', { x: edgeX - 24, y: cy - 46, width: 48, height: 92, rx: 18, fill: '#66e3c4', 'fill-opacity': 0.25, stroke: '#66e3c4', 'stroke-width': 3 }, gFpn);
  S('rect', { x: edgeX - 6, y: cy - 40, width: 12, height: 80, rx: 6, fill: '#66e3c4', opacity: 0.6 }, gFpn);
  S('text', { x: edgeX, y: cy - 66, 'text-anchor': 'middle', class: 't-md', text: 'Ferroportin', style: 'fill:#66e3c4' }, gFpn);
  // transferrin + marrow
  const gTf = S('g', { opacity: 0.18 }, svg);
  S('text', { x: 920, y: cy + 92, 'text-anchor': 'middle', class: 't-md', text: 'Transferrin', style: 'fill:#40c8e0' }, gTf);
  S('text', { x: 920, y: cy + 126, 'text-anchor': 'middle', class: 't-sm', text: '→ bone marrow' }, gTf);

  // paths
  const P = (d) => S('path', { d, fill: 'none', stroke: 'none' }, svg);
  const pGlob = P(`M 210 ${cy} Q 240 ${cy + 120} 300 610 L 300 760`);
  const pHeme = P(`M 210 ${cy} L 450 ${cy}`);
  const pFe = P(`M 450 ${cy} L ${edgeX} ${cy} L 900 ${cy} L 1040 ${cy}`);
  const pBil = P(`M 450 ${cy} Q 520 ${cy + 120} 560 610 L 600 790`);
  const gFl = S('g', {}, svg);
  const fGlob = new Flow({ parent: gFl, path: pGlob, count: 10, r: 6, fill: '#30d158', speed: 0.18, seed: 2 });
  const fHeme = new Flow({ parent: gFl, path: pHeme, count: 6, r: 8, fill: '#ff6b80', speed: 0.22, seed: 3 });
  const fFe = new Flow({ parent: gFl, path: pFe, count: 12, r: 9, fill: '#ffb340', speed: 0.12, seed: 4 });
  const fBil = new Flow({ parent: gFl, path: pBil, count: 8, r: 7, fill: '#ffd60a', speed: 0.16, seed: 5 });
  // transferrin carriers (outside)
  const tf = Array.from({ length: 3 }, (_, i) => {
    const g = S('g', {}, svg);
    S('rect', { x: -30, y: -16, width: 60, height: 32, rx: 16, fill: '#40c8e0', 'fill-opacity': 0.3, stroke: '#40c8e0', 'stroke-width': 2.5 }, g);
    S('circle', { cx: -13, cy: 0, r: 7, fill: '#ffb340' }, g);
    S('circle', { cx: 13, cy: 0, r: 7, fill: '#ffb340' }, g);
    return { g, u: i / 3 };
  });

  const groups = [gPh, gGlob, gHO, gFpn, gTf];
  let step = 0;
  function setStep(s) {
    step = s;
    groups.forEach((g, i) => {
      const on = i === 0 ? s >= 0 : i <= s || (i === 2 && s >= 2);
      gsap.to(g, { opacity: on ? 1 : 0.18, duration: 0.7 });
    });
    gsap.to(gBil, { opacity: s >= 2 ? 1 : 0.18, duration: 0.7 });
    fGlob.visible = s >= 1 ? 1 : 0;
    fHeme.visible = s >= 1 ? 1 : 0;
    fBil.visible = s >= 2 ? 1 : 0;
    fFe.visible = s >= 2 ? 1 : 0;
  }
  let time = 0;
  return {
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame(t, dt) {
      time += dt;
      // engulfment loop
      const u = (time % 3.2) / 3.2;
      const x = lerp(30, 210, easeOut(Math.min(1, u / 0.6)));
      victim.setAttribute('cx', x);
      const sc = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4 * 0.6;
      victim.setAttribute('rx', 44 * sc);
      victim.setAttribute('ry', 38 * sc);
      victim.setAttribute('opacity', u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
      [fGlob, fHeme, fFe, fBil].forEach((f) => f.update(dt));
      // ferroportin pass-through gating beyond the membrane only when step ≥ 3
      fFe.items.forEach((it) => {
        const [px] = fFe.sampler.at(it.u);
        if (px > edgeX && step < 3) it.el.setAttribute('opacity', 0);
        if (px > 880 && step < 4) it.el.setAttribute('opacity', 0);
      });
      tf.forEach((c) => {
        c.u = (c.u + dt * 0.08) % 1;
        const tx = lerp(850, 1030, c.u);
        c.g.setAttribute('transform', `translate(${tx} ${cy + 40 + Math.sin(time + c.u * 6) * 6})`);
        c.g.setAttribute('opacity', step >= 4 ? Math.sin(c.u * Math.PI) : 0);
      });
    },
  };
}

// ================================================================ hepcidin
export function hepcidin(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1020 780' }, host);
  const D = defs(svg);
  const memY = 430;
  const rand = rng(17);

  // regions
  S('rect', { x: 0, y: memY + 40, width: 1020, height: 340, rx: 40, fill: D.url('mac'), opacity: 0.12 }, svg);
  S('text', { x: 40, y: 740, class: 't-xs', text: 'MACROPHAGE — IRON RECYCLED FROM OLD RED CELLS', style: 'letter-spacing:.1em' }, svg);
  S('text', { x: 40, y: 380, class: 't-xs', text: 'PLASMA', style: 'letter-spacing:.12em' }, svg);
  // membrane bilayer
  const gMem = S('g', {}, svg);
  for (let x = 10; x < 1010; x += 18) {
    S('circle', { cx: x, cy: memY - 18, r: 7, fill: '#d9a3c9', opacity: 0.8 }, gMem);
    S('circle', { cx: x, cy: memY + 18, r: 7, fill: '#d9a3c9', opacity: 0.8 }, gMem);
    S('line', { x1: x, y1: memY - 11, x2: x, y2: memY + 11, stroke: '#d9a3c9', 'stroke-width': 2, opacity: 0.35 }, gMem);
  }
  // liver source
  const liverG = S('g', {}, svg);
  liverG.setAttribute('transform', 'translate(300 0)');
  S('path', { d: 'M 40 70 C 60 20, 220 10, 260 60 C 290 100, 230 150, 150 140 C 80 135, 30 120, 40 70 Z', fill: '#a8473f', opacity: 0.9 }, liverG);
  S('text', { x: 150, y: 92, 'text-anchor': 'middle', class: 't-md', text: 'Liver', style: 'fill:#fff' }, liverG);
  S('text', { x: 150, y: 178, 'text-anchor': 'middle', class: 't-sm', text: 'makes hepcidin', style: 'fill:#d8b4fe' }, liverG);
  const il6 = pill(svg, 720, 80, 'IL-6 ↑', '#ffb340', { size: 26, h: 54 });
  il6.setAttribute('opacity', 0);
  const il6Arrow = S('path', { d: 'M 660 80 L 590 80', stroke: '#ffb340', 'stroke-width': 4, opacity: 0 }, svg);

  // ferroportin channels
  const CH = 6;
  const chans = [];
  for (let i = 0; i < CH; i++) {
    const x = 140 + i * 150;
    const g = S('g', {}, svg);
    S('rect', { x: -24, y: -48, width: 48, height: 96, rx: 18, fill: '#66e3c4', 'fill-opacity': 0.28, stroke: '#66e3c4', 'stroke-width': 3 }, g);
    S('rect', { x: -6, y: -42, width: 12, height: 84, rx: 6, fill: '#66e3c4', opacity: 0.6 }, g);
    const hep = S('path', { d: 'M -14 -60 q 7 -20 14 0 q 7 20 14 0', fill: 'none', stroke: '#bf5af2', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0 }, g);
    chans.push({ g, x, hep, s: 0, target: 0, bindT: 0 });
  }
  S('text', { x: 140, y: memY + 90, 'text-anchor': 'middle', class: 't-sm', text: 'Ferroportin', style: 'fill:#66e3c4' }, svg);

  // free hepcidin peptides in plasma
  const peps = Array.from({ length: 14 }, () => {
    const el = S('path', { d: 'M -12 0 q 6 -16 12 0 q 6 16 12 0', fill: 'none', stroke: '#bf5af2', 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
    return { el, x: 120 + rand() * 860, y: 160 + rand() * 180, vx: (rand() - 0.5) * 40, vy: (rand() - 0.5) * 40, a: 0, on: false, r: rand() * 6 };
  });
  // iron particles
  const gFe = S('g', {}, svg);
  const pool = Array.from({ length: 48 }, () => {
    const el = S('circle', { r: 8, fill: '#ffb340' }, gFe);
    return { el, x: 60 + rand() * 900, y: memY + 90 + rand() * 230, ph: rand() * 6, on: false };
  });
  const movers = Array.from({ length: 30 }, () => ({ el: S('circle', { r: 8, fill: '#ffb340', opacity: 0 }, gFe), active: false }));

  // export meter
  const mx = 960, my0 = 160, mh = 210;
  S('rect', { x: mx - 14, y: my0, width: 28, height: mh, rx: 14, class: 'fill-surface' }, svg);
  const meter = S('rect', { x: mx - 14, y: my0 + mh, width: 28, height: 0, rx: 14, fill: '#ffb340' }, svg);
  S('text', { x: mx, y: my0 - 22, 'text-anchor': 'middle', class: 't-xs', text: 'IRON EXPORT', style: 'letter-spacing:.08em' }, svg);

  const MODES = [
    { hep: 5, blocked: 3, pool: 18, il6: 0 },
    { hep: 0, blocked: 0, pool: 12, il6: 0 },
    { hep: 14, blocked: 5, pool: 44, il6: 1 },
  ];
  let mode = 0;
  const order = [2, 4, 0, 5, 1, 3];
  const descs = [...slide.querySelectorAll('.md')];
  const seg = segmented(slide.querySelector('[data-ctl]'), [
    { label: 'Normal', color: 'var(--purple)' },
    { label: 'Iron deficiency', color: 'var(--mint)' },
    { label: 'Inflammation', color: 'var(--amber)' },
  ], (i) => setMode(i));
  function setMode(i) {
    mode = i;
    const m = MODES[i];
    descs.forEach((d, k) => d.classList.toggle('on', k === i));
    chans.forEach((c) => { c.target = 0; });
    for (let k = 0; k < m.blocked; k++) chans[order[k]].target = 1;
    peps.forEach((p, k) => { p.on = k < m.hep; });
    pool.forEach((p, k) => { p.on = k < m.pool; });
    gsap.to(il6, { opacity: m.il6, duration: 0.6 });
    gsap.to(il6Arrow, { opacity: m.il6, duration: 0.6 });
  }

  let spawn = 0;
  let exportRate = 0;
  let time = 0;
  return {
    enter(s) { seg.set(Math.min(2, s)); },
    step(s) { seg.set(Math.min(2, s)); },
    frame(t, dt) {
      time += dt;
      // channels: bind → internalize, or re-insert
      let open = 0;
      chans.forEach((c) => {
        const goal = c.target;
        c.s += (goal - c.s) * (1 - Math.exp(-1.6 * dt));
        const s = c.s;
        const bound = clamp(s * 3);
        const sink = clamp((s - 0.35) / 0.65);
        c.hep.setAttribute('opacity', bound * (1 - sink * 0.6));
        c.g.setAttribute('transform', `translate(${c.x} ${memY + sink * 150}) scale(${1 - sink * 0.35})`);
        c.g.setAttribute('opacity', 1 - sink * 0.85);
        if (s < 0.2) open++;
      });
      exportRate += (open / CH - exportRate) * (1 - Math.exp(-2 * dt));
      const er = clamp(exportRate);
      meter.setAttribute('y', my0 + mh * (1 - er));
      meter.setAttribute('height', mh * er);

      // free hepcidin drift
      peps.forEach((p) => {
        p.a += ((p.on ? 1 : 0) - p.a) * (1 - Math.exp(-2 * dt));
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 100 || p.x > 900) p.vx *= -1;
        if (p.y < 150 || p.y > memY - 70) p.vy *= -1;
        p.r += dt;
        p.el.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${Math.sin(p.r) * 30})`);
        p.el.setAttribute('opacity', p.a.toFixed(2));
      });

      // trapped iron pool jiggle
      pool.forEach((p) => {
        const o = Number(p.el.getAttribute('opacity') || 0);
        const target = p.on ? 1 : 0;
        p.el.setAttribute('opacity', (o + (target - o) * Math.min(1, dt * 3)).toFixed(2));
        p.el.setAttribute('cx', p.x + Math.sin(time * 1.3 + p.ph) * 6);
        p.el.setAttribute('cy', p.y + Math.cos(time * 1.1 + p.ph) * 6);
      });

      // export: iron leaves through open channels
      spawn += dt * open * 0.9;
      while (spawn > 1) {
        spawn -= 1;
        const opens = chans.filter((c) => c.s < 0.2);
        const m = movers.find((mm) => !mm.active);
        if (m && opens.length) {
          const c = opens[Math.floor(rand() * opens.length)];
          m.active = true; m.t = 0; m.x0 = c.x + (rand() - 0.5) * 140; m.y0 = memY + 120 + rand() * 120; m.cx = c.x; m.dx = (rand() - 0.5) * 120;
        }
      }
      movers.forEach((m) => {
        if (!m.active) return;
        m.t += dt / 2.2;
        if (m.t >= 1) { m.active = false; m.el.setAttribute('opacity', 0); return; }
        let x, y;
        if (m.t < 0.5) { const f = easeInOut(m.t / 0.5); x = lerp(m.x0, m.cx, f); y = lerp(m.y0, memY, f); }
        else { const f = (m.t - 0.5) / 0.5; x = m.cx + m.dx * f; y = lerp(memY, memY - 230, easeOut(f)); }
        m.el.setAttribute('cx', x);
        m.el.setAttribute('cy', y);
        m.el.setAttribute('opacity', m.t > 0.85 ? (1 - m.t) / 0.15 : 1);
      });
    },
  };
}

// ============================================================ liver's role
export function liverRole(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1696 590' }, host);
  defs(svg);
  const colX = [0, 440, 880, 1320];
  const W = 376;
  const box = (x, y, h, title, sub, color) => {
    const g = S('g', { opacity: 0 }, svg);
    S('rect', { x, y, width: W, height: h, rx: 26, class: 'fill-surface', stroke: color, 'stroke-opacity': 0.55, 'stroke-width': 2 }, g);
    S('rect', { x: x + 26, y: y + 26, width: 10, height: h - 52, rx: 5, fill: color }, g);
    S('text', { x: x + 56, y: y + 56, class: 't-md', text: title, style: 'font-size:29px' }, g);
    String(sub).split('\n').forEach((line, i) => S('text', { x: x + 56, y: y + 92 + i * 30, class: 't-sm', text: line }, g));
    return g;
  };
  const tag = (x, y, text, color) => S('text', { x, y, class: 't-xs', text, style: `fill:${color};letter-spacing:.14em;font-weight:700` }, svg);
  tag(0, 18, 'IRON', '#ffb340');
  tag(0, 362, 'PIGMENT', '#ffd60a');
  const y1 = 40, h1 = 140;
  const a = box(colX[0], y1, h1, 'Old red cell', 'Phagocytosed', '#ff375f');
  const b = box(colX[1], y1, h1, 'Macrophages', 'Kupffer · spleen · marrow', '#d9a3c9');
  const c = box(colX[2], y1, h1, 'Iron + transferrin', 'Carried in blood', '#40c8e0');
  const d1 = box(colX[3], 0, 118, 'Bone marrow', 'New red cells', '#ff375f');
  const d2 = box(colX[3], 134, 118, 'Liver', 'Stored as ferritin', '#ffb340');
  const y2 = 384, h2 = 150;
  const e = box(colX[0], y2, h2, 'Porphyrin', 'From heme', '#ffd60a');
  const f = box(colX[1], y2, h2, 'Bilirubin', 'Unconjugated · on albumin', '#ffd60a');
  const g = box(colX[2], y2, h2, 'Liver conjugates', 'UDP-glucuronosyltransferase', '#30d158');
  const hh = box(colX[3], y2, h2, 'Bile', 'Water-soluble · secreted', '#30d158');

  const P = (dd) => S('path', { d: dd, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 2, 'stroke-dasharray': '6 8', opacity: 0 }, svg);
  const conn = [
    P(`M ${W} ${y1 + 70} L ${colX[1]} ${y1 + 70}`),
    P(`M ${colX[1] + W} ${y1 + 70} L ${colX[2]} ${y1 + 70}`),
    P(`M ${colX[2] + W} ${y1 + 70} C ${colX[3] - 30} ${y1 + 70}, ${colX[3] - 40} 59, ${colX[3]} 59`),
    P(`M ${colX[2] + W} ${y1 + 70} C ${colX[3] - 30} ${y1 + 70}, ${colX[3] - 40} 193, ${colX[3]} 193`),
    P(`M ${W} ${y2 + 75} L ${colX[1]} ${y2 + 75}`),
    P(`M ${colX[1] + W} ${y2 + 75} L ${colX[2]} ${y2 + 75}`),
    P(`M ${colX[2] + W} ${y2 + 75} L ${colX[3]} ${y2 + 75}`),
  ];
  const gFl = S('g', {}, svg);
  const flows = conn.map((p, i) => new Flow({ parent: gFl, path: p, count: 4, r: 7, fill: i < 4 ? '#ffb340' : '#ffd60a', speed: 0.5, seed: i + 1 }));
  const groups = [[a, b], [c, d1, d2], [e, f], [g, hh]];
  const connBy = [[0], [1, 2, 3], [4], [5, 6]];
  function setStep(s) {
    groups.forEach((arr, i) => arr.forEach((el, j) => gsap.to(el, { opacity: i <= s ? 1 : 0, duration: 0.7, delay: i === s ? j * 0.15 : 0 })));
    connBy.forEach((arr, i) => arr.forEach((ci) => {
      const on = i <= s;
      gsap.to(conn[ci], { opacity: on ? 0.8 : 0, duration: 0.6 });
      flows[ci].visible = on ? 1 : 0;
    }));
  }
  return {
    enter(s) { setStep(Math.min(3, s)); },
    step(s) { setStep(Math.min(3, s)); },
    frame(t, dt) { flows.forEach((f) => f.update(dt)); },
  };
}

// ======================================================== iron balance
export function balance(slide) {
  const host = slide.querySelector('[data-viz]');
  const svg = S('svg', { viewBox: '0 0 1696 600' }, host);
  defs(svg);

  // ---- left: where body iron is (Guyton) ----
  const gL = S('g', { opacity: 0 }, svg);
  S('text', { x: 0, y: 30, class: 't-lg', text: 'Where the body’s 4–5 g of iron is' }, gL);
  S('text', { x: 0, y: 70, class: 't-sm', text: 'Share of total body iron', style: 'fill:var(--text-3)' }, gL);
  const rows = [
    { k: 'Hemoglobin', v: 65, c: '#ff375f', lab: '≈65%' },
    { k: 'Stores (mainly ferritin)', v: 15, v2: 30, c: '#ffb340', lab: '15–30%' },
    { k: 'Myoglobin', v: 4, c: '#ff9f80', lab: '≈4%' },
    { k: 'Heme enzymes', v: 1, c: '#d9a3c9', lab: '≈1%' },
    { k: 'Transferrin (plasma)', v: 0.1, c: '#40c8e0', lab: '≈0.1%' },
  ];
  const bx = 330, bw = 400, scale = bw / 65;
  const bars = rows.map((r, i) => {
    const y = 120 + i * 82;
    S('text', { x: 0, y: y + 28, class: 't-sm', text: r.k, style: 'fill:var(--text)' }, gL);
    S('rect', { x: bx, y: y + 6, width: bw, height: 32, rx: 16, class: 'fill-surface' }, gL);
    let ext = null;
    if (r.v2) ext = S('rect', { x: bx, y: y + 6, width: 0, height: 32, rx: 16, fill: r.c, opacity: 0.35 }, gL);
    const bar = S('rect', { x: bx, y: y + 6, width: 0, height: 32, rx: 16, fill: r.c }, gL);
    const t = S('text', { x: bx + 10, y: y + 32, class: 't-md t-mono', text: r.lab, style: 'font-size:26px' }, gL);
    return { r, bar, ext, t };
  });

  // ---- right: daily iron loss (Guyton) ----
  const gR = S('g', { opacity: 0 }, svg);
  const rx0 = 920;
  S('text', { x: rx0, y: 30, class: 't-lg', text: 'Average daily iron loss' }, gR);
  S('text', { x: rx0, y: 70, class: 't-sm', text: 'mg per day', style: 'fill:var(--text-3)' }, gR);
  const loss = [
    { k: 'Men', v: 0.6, c: '#8e8e93', lab: '0.6 mg' },
    { k: 'Women (menstruation)', v: 1.3, c: '#ff375f', lab: '1.3 mg' },
  ];
  const lw = 520 / 2.0;
  const lbars = loss.map((r, i) => {
    const y = 120 + i * 110;
    S('text', { x: rx0, y: y + 26, class: 't-sm', text: r.k, style: 'fill:var(--text)' }, gR);
    const bar = S('rect', { x: rx0, y: y + 40, width: 0, height: 40, rx: 20, fill: r.c }, gR);
    const t = S('text', { x: rx0 + 14, y: y + 70, class: 't-md t-mono', text: r.lab, style: 'font-size:26px' }, gR);
    return { r, bar, t };
  });
  const yH = 120 + 2 * 110;
  S('text', { x: rx0, y: yH + 26, class: 't-sm', text: 'Her heavy, prolonged bleeding', style: 'fill:var(--text)' }, gR);
  const her = S('rect', { x: rx0, y: yH + 40, width: 0, height: 40, rx: 20, fill: 'none', stroke: '#ff375f', 'stroke-width': 3, 'stroke-dasharray': '10 8' }, gR);
  const herT = S('text', { x: rx0, y: yH + 120, class: 't-sm', text: 'Above average · not quantified', style: 'fill:var(--text-3)' }, gR);
  herT.setAttribute('opacity', 0);

  function setStep(s) {
    gsap.to(gL, { opacity: s >= 1 ? 1 : 0, duration: 0.6 });
    bars.forEach((b, i) => {
      const w = s >= 1 ? Math.max(6, b.r.v * scale) : 0;
      gsap.to(b.bar, { attr: { width: w }, duration: 1.2, delay: i * 0.1, ease: 'power3.out' });
      if (b.ext) gsap.to(b.ext, { attr: { width: s >= 1 ? b.r.v2 * scale : 0 }, duration: 1.2, delay: i * 0.1, ease: 'power3.out' });
      const endX = bx + Math.max(6, (b.r.v2 || b.r.v) * scale) + 16;
      b.t.setAttribute('x', endX);
    });
    gsap.to(gR, { opacity: s >= 2 ? 1 : 0, duration: 0.6 });
    lbars.forEach((b, i) => {
      gsap.to(b.bar, { attr: { width: s >= 2 ? b.r.v * lw : 0 }, duration: 1.2, delay: i * 0.15, ease: 'power3.out' });
      b.t.setAttribute('x', rx0 + b.r.v * lw + 16);
    });
    gsap.to(her, { attr: { width: s >= 2 ? 1.95 * lw : 0 }, duration: 1.6, delay: 0.4, ease: 'power3.out' });
    gsap.to(herT, { opacity: s >= 2 ? 1 : 0, duration: 0.6, delay: 0.8 });
  }
  return { enter(s) { setStep(s); }, step(s) { setStep(s); } };
}
