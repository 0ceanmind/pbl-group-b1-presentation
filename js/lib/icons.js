// Reusable SVG cell icons + gradient defs.
import { S } from './dom.js';

let uid = 0;
export function defs(svg) {
  const id = `g${++uid}`;
  const d = S('defs', {}, svg);
  const rg = (name, stops, attrs = {}) => {
    const g = S('radialGradient', { id: `${id}-${name}`, ...attrs }, d);
    stops.forEach(([o, c, a = 1]) => S('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  };
  rg('rbc', [['0%', '#f9b8c0'], ['30%', '#f39aa6'], ['58%', '#e43448'], ['92%', '#b4152f'], ['100%', '#8e0d26']]);
  rg('rbcPale', [['0%', '#fde2e5'], ['48%', '#f8c4ca'], ['74%', '#ea6f7e'], ['100%', '#b4344a']]);
  rg('wbc', [['0%', '#ffffff'], ['70%', '#e6e0f5'], ['100%', '#bfb2e6']]);
  rg('hsc', [['0%', '#e9fbff'], ['55%', '#8fe3f2'], ['100%', '#2ea6c2']]);
  rg('mac', [['0%', '#f4d4ea'], ['70%', '#d197c0'], ['100%', '#a96b98']]);
  rg('iron', [['0%', '#fff4d6'], ['45%', '#ffb340'], ['100%', '#e07800']]);
  rg('glow', [['0%', '#ffffff', 0.9], ['40%', '#ffffff', 0.25], ['100%', '#ffffff', 0]]);
  rg('ironGlow', [['0%', '#ffb340', 0.9], ['100%', '#ffb340', 0]]);
  rg('redGlow', [['0%', '#ff375f', 0.55], ['100%', '#ff375f', 0]]);
  const f = S('filter', { id: `${id}-soft`, x: '-50%', y: '-50%', width: '200%', height: '200%' }, d);
  S('feGaussianBlur', { stdDeviation: 6 }, f);
  const sh = S('filter', { id: `${id}-shadow`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, d);
  S('feDropShadow', { dx: 0, dy: 8, stdDeviation: 10, 'flood-color': '#000', 'flood-opacity': 0.35 }, sh);
  const url = (name) => `url(#${id}-${name})`;
  return { id, d, url };
}

export function rbc(parent, x, y, r, D, { pale = false, tilt = 0, opacity = 1 } = {}) {
  const g = S('g', { transform: `translate(${x} ${y}) rotate(${tilt})`, opacity }, parent);
  S('ellipse', { rx: r, ry: r * 0.9, fill: D.url(pale ? 'rbcPale' : 'rbc') }, g);
  return g;
}

export function wbc(parent, x, y, r, D) {
  const g = S('g', { transform: `translate(${x} ${y})` }, parent);
  S('circle', { r, fill: D.url('wbc') }, g);
  [[-0.35, -0.15], [0.05, 0.25], [0.38, -0.12]].forEach(([dx, dy]) => S('circle', { cx: dx * r, cy: dy * r, r: r * 0.3, fill: '#6b4fb3' }, g));
  S('path', { d: `M${-0.35 * r} ${-0.15 * r} Q ${-0.1 * r} ${0.4 * r} ${0.05 * r} ${0.25 * r} T ${0.38 * r} ${-0.12 * r}`, stroke: '#6b4fb3', 'stroke-width': r * 0.14, fill: 'none' }, g);
  return g;
}

export function platelet(parent, x, y, r, rot = 0) {
  const g = S('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, parent);
  S('ellipse', { rx: r, ry: r * 0.62, fill: '#cfa8f5' }, g);
  S('circle', { cx: r * 0.15, cy: -r * 0.05, r: r * 0.22, fill: '#9a6fd6' }, g);
  return g;
}

export function macrophage(parent, x, y, r, D, seed = 1) {
  const pts = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * Math.cos(a * 5 + seed * 2));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    d += ` Q ${p0[0]} ${p0[1]} ${mx} ${my}`;
  }
  d += ' Z';
  return S('path', { d, fill: D.url('mac') }, parent);
}

export function pill(parent, x, y, text, color, { size = 24, padX = 20, h = 50 } = {}) {
  const g = S('g', { transform: `translate(${x} ${y})` }, parent);
  const w = text.length * size * 0.56 + padX * 2;
  S('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 2 }, g);
  S('text', { x: 0, y: size * 0.36, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 650, style: `fill:${color}`, text }, g);
  return g;
}
