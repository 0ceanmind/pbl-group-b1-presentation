// Keynote-style deck engine: fixed 1920×1080 stage, build steps, controllers.
import { registry } from './registry.js';

const W = 1920, H = 1080;
const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n', 'N']);
const PREV = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p', 'P']);

export function startDeck() {
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll(':scope > .slide')];
  const progress = document.getElementById('progress');
  const counter = document.getElementById('counter-text');
  const overview = document.getElementById('overview');
  const help = document.getElementById('help');
  const blackout = document.getElementById('blackout');
  const jumpEl = document.getElementById('jump');

  const state = { i: -1, step: 0, scale: 1 };
  const secEl = document.getElementById('sec');
  const byId = (id) => slides.findIndex((s) => s.id === id);
  const visited = new Set();
  // SLO sections: "SLO 3" → [slide indices]
  const sections = {};
  slides.forEach((s, k) => {
    const m = /^SLO (\d)$/.exec(s.dataset.section || '');
    if (m) (sections[m[1]] = sections[m[1]] || []).push(k);
  });
  const ctrl = new Array(slides.length).fill(null);
  const running = new Set();
  const leaveTimers = new Map();

  const api = {
    get scale() { return state.scale; },
    go: (i, s) => go(i, s),
    next: () => next(),
    prev: () => prev(),
    css: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    get theme() { return document.documentElement.dataset.theme || 'dark'; },
    slides,
    visited,
    goId: (id) => goId(id),
  };
  function goId(id) {
    const k = byId(id);
    if (k >= 0) go(k, 0);
  }

  // ---- steps -------------------------------------------------------------
  function maxSteps(i) {
    const s = slides[i];
    let m = Number(s.dataset.steps || 0);
    s.querySelectorAll('[data-step]').forEach((el) => { m = Math.max(m, Number(el.dataset.step)); });
    return m;
  }

  function applySteps(i, step, dir) {
    const s = slides[i];
    s.querySelectorAll('[data-step]').forEach((el) => {
      const k = Number(el.dataset.step);
      const until = el.dataset.until != null ? Number(el.dataset.until) : Infinity;
      el.classList.toggle('shown', step >= k && step < until);
    });
    s.querySelectorAll('[data-cur]').forEach((el) => {
      const k = Number(el.dataset.cur);
      el.classList.toggle('cur', step === k);
      el.classList.toggle('past', step > k);
      el.classList.toggle('future', step < k);
    });
    s.dataset.at = step;
    const c = ctrl[i];
    if (c && c.step) c.step(step, dir);
  }

  // ---- controllers -------------------------------------------------------
  function ensure(i) {
    if (i < 0 || i >= slides.length || ctrl[i]) return ctrl[i];
    const name = slides[i].dataset.ctrl;
    if (!name || !registry[name]) return null;
    try {
      ctrl[i] = registry[name](slides[i], api) || null;
      if (ctrl[i] && ctrl[i].resize) ctrl[i].resize(state.scale);
    } catch (err) {
      console.error('controller failed', name, err);
      ctrl[i] = {};
    }
    return ctrl[i];
  }

  // ---- navigation --------------------------------------------------------
  function go(i, step = 0, opts = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const max = maxSteps(i);
    step = Math.max(0, Math.min(max, step));
    if (i === state.i) {
      const dir = Math.sign(step - state.step);
      state.step = step;
      applySteps(i, step, dir);
      sync();
      return;
    }
    const prevI = state.i;
    const dir = prevI < 0 ? 1 : Math.sign(i - prevI);
    const from = slides[prevI];
    const to = slides[i];

    if (from) {
      from.classList.remove('is-active');
      from.classList.toggle('is-past', i > prevI);
      const c = ctrl[prevI];
      if (c) {
        clearTimeout(leaveTimers.get(prevI));
        leaveTimers.set(prevI, setTimeout(() => {
          if (state.i !== prevI) {
            running.delete(c);
            c.leave && c.leave();
          }
        }, 1100));
      }
    }

    slides.forEach((s, k) => {
      if (k !== i && k !== prevI) { s.classList.toggle('is-past', k < i); }
    });
    to.classList.remove('is-past');
    if (opts.instant) { to.classList.add('instant'); requestAnimationFrame(() => requestAnimationFrame(() => to.classList.remove('instant'))); }
    to.classList.add('is-active');
    stage.classList.toggle('hero-on', to.classList.contains('s-title'));

    state.i = i;
    state.step = step;
    const c = ensure(i);
    clearTimeout(leaveTimers.get(i));
    if (c) {
      running.add(c);
      c.enter && c.enter(step, dir);
    }
    applySteps(i, step, 0);
    // warm up neighbours so heavy scenes don't hitch on arrival
    setTimeout(() => { ensure(i + 1); }, 1300);
    sync();
  }

  function next() {
    if (state.step < maxSteps(state.i)) go(state.i, state.step + 1);
    else if (state.i < slides.length - 1) go(state.i + 1, 0);
  }
  function prev() {
    if (state.step > 0) go(state.i, state.step - 1);
    else if (state.i > 0) go(state.i - 1, maxSteps(state.i - 1));
  }

  function sync() {
    const n = slides.length;
    progress.style.width = `${((state.i + (maxSteps(state.i) ? state.step / (maxSteps(state.i) + 1) : 0)) / (n - 1)) * 100}%`;
    counter.textContent = `${String(state.i + 1).padStart(2, '0')} / ${n}`;
    const hash = `#/${state.i + 1}${state.step ? '.' + state.step : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    document.title = `${slides[state.i].dataset.title || 'Slide'} · PBL Group B-1`;
    const sm = /^SLO (\d)$/.exec(slides[state.i].dataset.section || '');
    if (sm) {
      const list = sections[sm[1]];
      if (slides[state.i].classList.contains('s-keys')) visited.add(sm[1]);
      secEl.innerHTML = `<span class="lbl">SLO ${sm[1]}</span>` + list.map((k) => `<i class="${k === state.i ? 'on' : k < state.i ? 'past' : ''}"></i>`).join('');
      secEl.style.display = '';
    } else {
      secEl.innerHTML = '';
      secEl.style.display = 'none';
    }
    overview.querySelectorAll('.ov-item').forEach((b, k) => b.classList.toggle('cur', k === state.i));
  }

  // ---- scaling -----------------------------------------------------------
  function resize() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    state.scale = s;
    document.documentElement.style.setProperty('--scale', s);
    ctrl.forEach((c) => c && c.resize && c.resize(s));
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- overlays ----------------------------------------------------------
  const grid = overview.querySelector('.ov-grid');
  slides.forEach((s, k) => {
    const b = document.createElement('button');
    b.className = 'ov-item';
    b.innerHTML = `<span class="ov-n">${String(k + 1).padStart(2, '0')}</span>${s.dataset.section ? `<span class="ov-s">${s.dataset.section}</span>` : ''}<span class="ov-t">${s.dataset.title || ''}</span>`;
    b.addEventListener('click', () => { toggle(overview, false); go(k, 0); });
    grid.appendChild(b);
  });
  function toggle(el, on) { el.classList.toggle('on', on ?? !el.classList.contains('on')); }

  function toggleTheme() {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('b1-theme', root.dataset.theme); } catch (e) { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent('themechange'));
  }
  try { const t = localStorage.getItem('b1-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }

  let flashTimer = 0;
  function flash(msg) {
    jumpEl.textContent = msg;
    jumpEl.classList.add('on');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => jumpEl.classList.remove('on'), 2600);
  }

  function fullscreen() {
    const d = document, el = d.documentElement;
    const active = d.fullscreenElement || d.webkitFullscreenElement;
    if (active) {
      (d.exitFullscreen || d.webkitExitFullscreen || (() => {})).call(d);
      return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    const blocked = () => flash('Full screen is blocked here — press F11');
    if (!req || d.fullscreenEnabled === false) { blocked(); return; }
    try {
      const p = req.call(el);
      if (p && p.catch) p.catch(blocked);
    } catch (err) { blocked(); }
  }

  // ---- input -------------------------------------------------------------
  // Shortcuts use the physical key (e.code), so they work on any keyboard
  // layout — e.g. with an Arabic layout active, F still means full screen.
  let jumpBuf = '';
  let jumpTimer = 0;
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const c = e.code || '';
    const letter = c.startsWith('Key') ? c.slice(3).toLowerCase() : (k && k.length === 1 ? k.toLowerCase() : '');
    const dm = /^(?:Digit|Numpad)([0-9])$/.exec(c);
    const digit = dm ? dm[1] : (/^[0-9]$/.test(k) ? k : null);
    const isHelp = k === '?' || k === '؟' || (c === 'Slash' && e.shiftKey);
    if (overview.classList.contains('on') || help.classList.contains('on')) {
      if (k === 'Escape' || letter === 'o' || letter === 'h' || isHelp) { toggle(overview, false); toggle(help, false); e.preventDefault(); }
      return;
    }
    // on the objectives hub, 1–6 open that objective directly
    if (slides[state.i].id === 'hub' && digit && /^[1-6]$/.test(digit) && !jumpBuf) {
      e.preventDefault();
      goId(`slo${digit}`);
      return;
    }
    if (digit !== null) {
      const k = digit;
      jumpBuf += k;
      jumpEl.textContent = `Go to slide ${jumpBuf}`;
      jumpEl.classList.add('on');
      clearTimeout(jumpTimer);
      jumpTimer = setTimeout(() => { jumpBuf = ''; jumpEl.classList.remove('on'); }, 2200);
      e.preventDefault();
      return;
    }
    if (k === 'Enter' && jumpBuf) {
      go(Number(jumpBuf) - 1, 0);
      jumpBuf = '';
      jumpEl.classList.remove('on');
      e.preventDefault();
      return;
    }
    if (NEXT.has(k) || c === 'Space' || letter === 'n') { e.preventDefault(); if (t && t.blur && t !== document.body) t.blur(); next(); }
    else if (PREV.has(k) || letter === 'p') { e.preventDefault(); if (t && t.blur && t !== document.body) t.blur(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(0, 0); }
    else if (k === 'End') { e.preventDefault(); go(slides.length - 1, 0); }
    else if (letter === 'f') { e.preventDefault(); fullscreen(); }
    else if (letter === 'h') { e.preventDefault(); goId('hub'); }
    else if (letter === 'o' || k === 'Escape') toggle(overview);
    else if (letter === 't') toggleTheme();
    else if (letter === 'b' || c === 'Period') toggle(blackout);
    else if (isHelp) toggle(help);
  }, true);

  document.getElementById('nav-prev').addEventListener('click', prev);
  document.getElementById('nav-next').addEventListener('click', next);
  document.getElementById('nav-grid').addEventListener('click', () => toggle(overview));
  document.getElementById('nav-hub').addEventListener('click', () => goId('hub'));
  // any element with data-go="<slide id>" jumps there; data-act runs a command
  stage.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a) {
      e.stopPropagation();
      if (a.dataset.act === 'full') fullscreen();
      else if (a.dataset.act === 'next') next();
      else if (a.dataset.act === 'help') toggle(help, true);
      return;
    }
    const b = e.target.closest('[data-go]');
    if (!b) return;
    e.stopPropagation();
    goId(b.dataset.go);
  });
  document.getElementById('nav-full').addEventListener('click', fullscreen);
  blackout.addEventListener('click', () => toggle(blackout, false));

  // release focus from sliders/buttons so clicker keys keep driving the deck
  document.addEventListener('pointerup', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON')) setTimeout(() => t.blur(), 0);
  });

  // touch swipe
  let tx = 0, ty = 0;
  window.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)();
  }, { passive: true });

  // idle cursor
  let idle = 0;
  const wake = () => {
    document.body.classList.remove('hide-cursor', 'idle');
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.add('hide-cursor', 'idle'), 2600);
  };
  window.addEventListener('pointermove', wake);
  wake();

  // ---- frame loop --------------------------------------------------------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const t = now / 1000;
    running.forEach((c) => {
      if (!c.frame) return;
      try { c.frame(t, dt); } catch (err) { console.error(err); }
    });
  }
  requestAnimationFrame(loop);

  // pause rendering when tab hidden
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  // ---- start -------------------------------------------------------------
  const m = location.hash.match(/#\/(\d+)(?:\.(\d+))?/);
  const startI = m ? Number(m[1]) - 1 : 0;
  const startS = m && m[2] ? Number(m[2]) : 0;
  go(startI, startS, { instant: true });
  window.addEventListener('hashchange', () => {
    const mm = location.hash.match(/#\/(\d+)(?:\.(\d+))?/);
    if (mm) go(Number(mm[1]) - 1, mm[2] ? Number(mm[2]) : 0);
  });

  return api;
}
