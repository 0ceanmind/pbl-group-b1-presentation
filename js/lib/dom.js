// Small DOM / SVG / animation helpers shared by every slide controller.

export const NS = 'http://www.w3.org/2000/svg';
export const gsap = window.gsap;

export function S(tag, attrs = {}, parent) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) {
    if (attrs[k] == null) continue;
    if (k === 'text') el.textContent = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(el);
  return el;
}

export function H(tag, attrs = {}, parent) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (attrs[k] == null) continue;
    if (k === 'text') el.textContent = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
    else if (k === 'style') el.style.cssText = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(el);
  return el;
}

export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

// deterministic PRNG so layouts are identical on every run
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Apple-like segmented control. options: [{label, color?}]
export function segmented(host, options, onChange, initial = 0) {
  const wrap = H('div', { class: 'seg' }, host);
  const thumb = H('div', { class: 'thumb' }, wrap);
  const btns = options.map((o, i) => {
    const b = H('button', { type: 'button', html: (o.color ? `<span class="sw" style="color:${o.color}"></span>` : '') + o.label }, wrap);
    b.addEventListener('click', (e) => { e.stopPropagation(); set(i, true); });
    return b;
  });
  let cur = -1;
  function place() {
    const b = btns[cur];
    if (!b) return;
    thumb.style.left = b.offsetLeft + 'px';
    thumb.style.width = b.offsetWidth + 'px';
  }
  function set(i, user = false) {
    if (i === cur) return;
    cur = i;
    btns.forEach((b, k) => b.classList.toggle('on', k === i));
    place();
    if (onChange) onChange(i, user);
  }
  set(initial);
  // fonts can change widths after load
  document.fonts && document.fonts.ready.then(place);
  return { el: wrap, set, get value() { return cur; }, place };
}

// Pre-sampled SVG path for fast point lookups.
export class PathSampler {
  constructor(path, n = 300) {
    this.len = path.getTotalLength();
    this.pts = [];
    for (let i = 0; i <= n; i++) {
      const p = path.getPointAtLength((i / n) * this.len);
      this.pts.push([p.x, p.y]);
    }
    this.n = n;
  }
  at(u) {
    u = clamp(u, 0, 1) * this.n;
    const i = Math.min(this.n - 1, Math.floor(u));
    const f = u - i;
    const a = this.pts[i], b = this.pts[i + 1];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  }
}

// Particles that travel along one SVG path.
export class Flow {
  constructor({ parent, path, count = 12, r = 6, cls = '', fill, speed = 0.12, fadeEnds = 0.08, seed = 7, shape = 'circle', size }) {
    this.sampler = new PathSampler(path);
    this.g = S('g', { class: cls }, parent);
    this.items = [];
    this.speed = speed;
    this.rate = 1; // multiplier
    this.fadeEnds = fadeEnds;
    this.visible = 1;
    const rand = rng(seed);
    for (let i = 0; i < count; i++) {
      let el;
      if (shape === 'rbc') {
        el = S('ellipse', { rx: r, ry: r * 0.86, fill: fill || 'var(--red)' }, this.g);
      } else if (shape === 'rect') {
        el = S('rect', { width: size || r * 2, height: size || r * 2, rx: 3, fill: fill || 'var(--amber)' }, this.g);
      } else {
        el = S('circle', { r, fill: fill || 'var(--amber)' }, this.g);
      }
      this.items.push({ el, u: i / count + rand() * (0.6 / count), active: true });
    }
    this.shape = shape;
    this.size = size || r * 2;
  }
  setCount(n) { this.items.forEach((it, i) => { it.active = i < n; }); }
  update(dt) {
    const { items, sampler, fadeEnds } = this;
    for (const it of items) {
      it.u += dt * this.speed * this.rate;
      if (it.u > 1) it.u -= 1;
      const [x, y] = sampler.at(it.u);
      let o = 1;
      if (it.u < fadeEnds) o = it.u / fadeEnds;
      else if (it.u > 1 - fadeEnds) o = (1 - it.u) / fadeEnds;
      o *= it.active ? this.visible : 0;
      if (this.shape === 'rect') {
        it.el.setAttribute('x', x - this.size / 2);
        it.el.setAttribute('y', y - this.size / 2);
      } else {
        it.el.setAttribute('cx', x);
        it.el.setAttribute('cy', y);
      }
      it.el.setAttribute('opacity', o.toFixed(3));
    }
  }
}

// Count-up number animation for stat blocks.
export function countUp(el, to, { dur = 1.4, decimals = 0, from = 0 } = {}) {
  const o = { v: from };
  return gsap.to(o, {
    v: to,
    duration: dur,
    ease: 'power3.out',
    onUpdate: () => { el.textContent = o.v.toFixed(decimals); },
  });
}

// Draw a path progressively.
export function drawIn(path, dur = 1.2, delay = 0) {
  const L = path.getTotalLength();
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = L;
  return gsap.to(path.style, { strokeDashoffset: 0, duration: dur, delay, ease: 'power2.inOut' });
}

// Fit a <canvas> to its CSS box at the current stage scale.
export function fitCanvas(canvas, scale, maxDpr = 2) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const dpr = Math.min(maxDpr, (window.devicePixelRatio || 1) * scale);
  const W = Math.max(1, Math.round(w * dpr)), Hh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

// Theme-aware colour cache (refreshed on theme change).
const cache = {};
export function col(name) {
  if (!(name in cache)) cache[name] = css(name);
  return cache[name];
}
window.addEventListener('themechange', () => { for (const k in cache) delete cache[k]; });

// Draw a biconcave red cell (top view) on a 2D canvas.
export function drawRBC(ctx, x, y, r, { hb = 1, pallor = 0.36, alpha = 1, rot = 0, sx = 1, sy = 1, color } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.globalAlpha *= alpha;
  const base = color || [214, 38, 62];
  const pale = [246, 196, 202];
  const mix = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  const k = 1 - hb;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, mix(base, pale, Math.min(1, 0.72 + k * 0.3)));
  g.addColorStop(Math.max(0.05, pallor - 0.1), mix(base, pale, Math.min(1, 0.55 + k * 0.35)));
  g.addColorStop(Math.min(0.92, pallor + 0.22), mix(base, pale, Math.min(1, 0.05 + k * 0.55)));
  g.addColorStop(0.97, mix(base, [120, 10, 30], 0.25 - k * 0.15));
  g.addColorStop(1, mix(base, [120, 10, 30], 0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
