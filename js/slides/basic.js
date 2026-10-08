// Lightweight controllers: case ECG, roadmap links, divider ambience, references.
import { fitCanvas, rng, col, H } from '../lib/dom.js';
import { REFERENCES } from '../data.js';

// ---------------------------------------------------------------- case ----
export function caseSlide(slide, api) {
  const cv = slide.querySelector('canvas.ecg');
  let ctx, w, h;
  let x = 0;
  const pts = [];
  // Stylised (illustrative) fast sinus rhythm: P-QRS-T repeating every ~0.5 s of trace
  function beat(u) {
    const g = (c, s, a) => a * Math.exp(-((u - c) ** 2) / (2 * s * s));
    return g(0.12, 0.022, 0.12) - g(0.245, 0.008, 0.16) + g(0.27, 0.01, 1) - g(0.297, 0.01, 0.32) + g(0.47, 0.04, 0.24);
  }
  const period = 210; // px per beat → visually "fast"
  function resize(s) { ({ ctx, w, h } = fitCanvas(cv, s)); }
  function frame(t, dt) {
    if (!ctx) return;
    const speed = 420;
    x += speed * dt;
    ctx.clearRect(0, 0, w, h);
    const head = x % (w + 240);
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    const red = col('--red');
    // draw the trace up to the head, fading behind it
    const tail = 1100;
    for (let i = 0; i < tail; i += 3) {
      const px = head - i;
      if (px < 0) break;
      const u = ((px % period) + period) % period / period;
      const y = h * 0.62 - beat(u) * h * 0.52;
      pts.push([px, y, 1 - i / tail]);
    }
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1, a] = pts[i];
      ctx.strokeStyle = red;
      ctx.globalAlpha = Math.max(0, a) * 0.9;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (pts.length) {
      const [hx, hy] = pts[0];
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22);
      g.addColorStop(0, red);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    pts.length = 0;
  }
  return { resize, frame };
}

// ------------------------------------------------------------- roadmap ----
export function road(slide, api) {
  slide.querySelectorAll('[data-go]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = document.getElementById(b.dataset.go);
      const i = api.slides.indexOf(target);
      if (i >= 0) api.go(i, 0);
    });
  });
  return {};
}

// ------------------------------------------------------- divider ambient ----
export function divider(slide, api) {
  const cv = slide.querySelector('canvas.ambient');
  let ctx, w, h;
  const rand = rng(slide.id.length * 977 + 13);
  const cells = Array.from({ length: 34 }, () => ({
    x: rand(), y: rand(), z: 0.25 + rand() * 0.75, r: 20 + rand() * 70, v: 0.004 + rand() * 0.012, ph: rand() * 6.28, rot: rand() * 6.28,
  }));
  function resize(s) { ({ ctx, w, h } = fitCanvas(cv, s, 1.5)); }
  function frame(t) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const light = api.theme === 'light';
    for (const c of cells) {
      c.x += c.v * 0.016 * c.z;
      if (c.x > 1.15) c.x = -0.15;
      const px = c.x * w;
      const py = c.y * h + Math.sin(t * 0.4 + c.ph) * 18 * c.z;
      const r = c.r * c.z;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(c.rot + t * 0.05);
      ctx.scale(1, 0.55 + 0.4 * Math.abs(Math.sin(t * 0.2 + c.ph)));
      const a = (light ? 0.10 : 0.16) * c.z;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(255,120,140,${a * 0.5})`);
      g.addColorStop(0.45, `rgba(255,60,90,${a * 0.7})`);
      g.addColorStop(0.8, `rgba(230,30,60,${a})`);
      g.addColorStop(1, 'rgba(230,30,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  return { resize, frame };
}

// ---------------------------------------------------------- references ----
export function buildReferences() {
  const host = document.querySelector('[data-refs]');
  if (!host) return;
  host.innerHTML = '';
  const groups = [['From the Group B-1 research', REFERENCES.group], ['Used to verify figures and reference intervals', REFERENCES.extra]];
  let n = 1;
  for (const [title, list] of groups) {
    H('h5', { text: title }, host);
    for (const r of list) {
      const d = H('div', { class: 'rf' }, host);
      H('div', { class: 'i', text: String(n++).padStart(2, '0') }, d);
      H('div', { class: 't', html: `${r.text}${r.url ? `<span class="u">${r.url}</span>` : ''}` }, d);
    }
  }
}
