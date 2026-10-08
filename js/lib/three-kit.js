// Shared Three.js helpers: renderer, red-cell geometry, materials, labels.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/BufferGeometryUtils.js';

export { THREE };

export function makeStage(host, { fov = 35, near = 0.1, far = 400, exposure = 1.0, envIntensity = 0.04 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, near, far);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), envIntensity).texture;
  pmrem.dispose();

  let shiftPx = 0;
  const size = { w: 1, h: 1 };
  function applyShift() {
    if (shiftPx) camera.setViewOffset(size.w, size.h, -shiftPx, 0, size.w, size.h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function resize(scale = 1) {
    const w = host.clientWidth || 1920, h = host.clientHeight || 1080;
    size.w = w; size.h = h;
    renderer.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * scale));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    applyShift();
  }
  return {
    renderer, scene, camera, size, resize,
    // shift rendered content horizontally (in CSS px) to leave room for text
    shift(px) { shiftPx = px; applyShift(); },
    render() { renderer.render(scene, camera); },
  };
}

// Biconcave disc from the Evans–Fung (1972) profile:
// D(x) = sqrt(1 − x²)(C0 + C2x² + C4x⁴), R0 = 3.91 µm. Radius normalised to 1.
export function rbcGeometry(n = 44, seg = 72) {
  const R0 = 3.91, C0 = 0.81, C2 = 7.83, C4 = -4.39;
  const half = (x) => (Math.sqrt(Math.max(0, 1 - x * x)) * (C0 + C2 * x * x + C4 * x ** 4)) / 2 / R0;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const x = Math.sin((k / n) * Math.PI / 2);
    pts.push(new THREE.Vector2(x, -half(x)));
  }
  for (let k = n - 1; k >= 0; k--) {
    const x = Math.sin((k / n) * Math.PI / 2);
    pts.push(new THREE.Vector2(x, half(x)));
  }
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, seg);
}

// Physical material with a radial "central pallor" term so hemoglobin
// content can be dialled (uHb) and the pale centre widened (uPallor).
export function rbcMaterial({ color = 0xd9203a, pale = 0xf29aa6, pallor = 0.34, hb = 1, opacity = 1 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
    sheen: 0.7,
    sheenColor: new THREE.Color(0xff8094),
    sheenRoughness: 0.45,
    transparent: opacity < 1,
    opacity,
  });
  const u = { uPallor: { value: pallor }, uPale: { value: new THREE.Color(pale) }, uHb: { value: hb } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vRad;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRad = length(position.xz);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vRad;\nuniform float uPallor;\nuniform vec3 uPale;\nuniform float uHb;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float pal = 1.0 - smoothstep(uPallor - 0.16, uPallor + 0.14, vRad);
        float k = clamp(pal * 0.62 + (1.0 - uHb) * 0.62, 0.0, 0.94);
        diffuseColor.rgb = mix(diffuseColor.rgb, uPale, k);`
      );
  };
  m.customProgramCacheKey = () => 'rbc-v1';
  return m;
}

// Soft radial glow texture for additive sprites.
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
export function glowSprite(color = 0xffb340, size = 1, opacity = 0.9) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.setScalar(size);
  return s;
}

// Organic blob (macrophage, megakaryocyte lobes …) by displacing an icosphere.
export function blobGeometry(radius = 1, detail = 4, amp = 0.12, freq = 2.2, seed = 1) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const d =
      Math.sin(n.x * freq * 3.1 + seed) * Math.cos(n.y * freq * 2.7 + seed * 1.3) +
      Math.sin(n.z * freq * 3.7 + seed * 0.7) * 0.6 +
      Math.sin((n.x + n.y + n.z) * freq * 5.3 + seed * 2.1) * 0.25;
    v.addScaledVector(n, d * amp * radius);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// HTML labels pinned to 3D positions.
export class Labels {
  constructor(layer, camera, size, parent = null) {
    this.parent = parent;
    this.layer = layer;
    this.camera = camera;
    this.size = size;
    this.items = [];
    this.v = new THREE.Vector3();
  }
  add(text, target, { color = 'var(--red)', offset = [0, 0, 0], side = 'up' } = {}) {
    if (target.isVector3 && this.parent) {
      const o = new THREE.Object3D();
      o.position.copy(target);
      this.parent.add(o);
      target = o;
    }
    const el = document.createElement('div');
    el.className = 'l3';
    el.style.setProperty('--c', color);
    el.innerHTML = `<div class="l3-in"><span class="dot"></span>${text}</div>${side === 'up' ? '<div class="stem"></div>' : ''}`;
    if (side === 'down') {
      el.querySelector('.l3-in').style.transform = 'translate(-50%, 0) translateY(26px)';
    }
    this.layer.appendChild(el);
    const it = { el, target, offset: new THREE.Vector3(...offset), on: false };
    this.items.push(it);
    return it;
  }
  show(it, on) { it.on = on; it.el.classList.toggle('on', on); }
  update() {
    const { w, h } = this.size;
    for (const it of this.items) {
      if (!it.on) continue;
      if (it.target.isObject3D) {
        it.target.localToWorld(this.v.copy(it.offset));
      } else this.v.copy(it.target).add(it.offset);
      this.v.project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }
}

// Drag-to-rotate with limits, damping and a gentle idle sway.
export class DragRotate {
  constructor(dom, { yaw = [-0.8, 0.8], pitch = [-0.3, 0.4], sway = 0.18, sens = 0.004 } = {}) {
    this.yaw = 0; this.pitch = 0; this.ty = 0; this.tp = 0;
    this.lim = { yaw, pitch };
    this.sway = sway;
    this.idle = 10;
    this.drag = false;
    this.base = { yaw: 0, pitch: 0 };
    dom.addEventListener('pointerdown', (e) => {
      this.drag = true; this.lx = e.clientX; this.ly = e.clientY;
      try { dom.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      this.ty = Math.max(yaw[0], Math.min(yaw[1], this.ty + (e.clientX - this.lx) * sens));
      this.tp = Math.max(pitch[0], Math.min(pitch[1], this.tp + (e.clientY - this.ly) * sens));
      this.lx = e.clientX; this.ly = e.clientY; this.idle = 0;
    });
    const up = () => { this.drag = false; };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
  }
  update(t, dt) {
    this.idle += dt;
    let ty = this.ty, tp = this.tp;
    if (this.idle > 4 && !this.drag) {
      // drift back toward the authored view with a slow sway
      this.ty += (this.base.yaw - this.ty) * Math.min(1, dt * 0.6);
      this.tp += (this.base.pitch - this.tp) * Math.min(1, dt * 0.6);
      ty = this.ty + Math.sin(t * 0.22) * this.sway;
      tp = this.tp + Math.sin(t * 0.17) * this.sway * 0.25;
    }
    const a = 1 - Math.exp(-6 * dt);
    this.yaw += (ty - this.yaw) * a;
    this.pitch += (tp - this.pitch) * a;
  }
}

export function disposeAll(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}
