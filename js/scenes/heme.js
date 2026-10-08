// Heme synthesis: protoporphyrin IX assembles, ferrochelatase inserts Fe²⁺,
// heme joins globin chains — and in iron deficiency the last step stalls.
import { THREE, makeStage, Labels, DragRotate, glowSprite, blobGeometry } from '../lib/three-kit.js';
import { rng, segmented, H } from '../lib/dom.js';

export default function heme(slide, api) {
  const host = slide.querySelector('.viz3d');
  const layer = slide.querySelector('.labels3d');
  const k = makeStage(host, { fov: 30, exposure: 1.05 });
  const { scene, camera } = k;
  k.shift(360);
  camera.position.set(0, 0, 21);
  camera.lookAt(0, 0, 0);
  const rand = rng(5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x203040, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9f0a, 1.4);
  rim.position.set(-6, -3, -6);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const mol = new THREE.Group();
  world.add(mol);

  // ------------------------------------------------- porphyrin coordinates
  const SC = 0.42;
  const atoms = []; // {pos, el}
  const bonds = []; // [i, j]
  const add = (x, y, z, el) => { atoms.push({ pos: new THREE.Vector3(x * SC, y * SC, z * SC), el }); return atoms.length - 1; };
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const meso = [];
  const pyr = [];
  for (let q = 0; q < 4; q++) {
    const a = (q * Math.PI) / 2;
    const P = (x, y) => rot(x, y, a);
    const N = add(...P(2.05, 0), 0, 'N');
    const Ca1 = add(...P(2.86, -1.1), 0, 'C');
    const Ca2 = add(...P(2.86, 1.1), 0, 'C');
    const Cb1 = add(...P(4.22, -0.68), 0, 'C');
    const Cb2 = add(...P(4.22, 0.68), 0, 'C');
    bonds.push([N, Ca1], [N, Ca2], [Ca1, Cb1], [Ca2, Cb2], [Cb1, Cb2]);
    pyr.push({ N, Ca1, Ca2, Cb1, Cb2, a });
    const m = add(...rot(2.42, 2.42, a), 0, 'C');
    meso.push(m);
  }
  for (let q = 0; q < 4; q++) {
    bonds.push([pyr[q].Ca2, meso[q]], [meso[q], pyr[(q + 1) % 4].Ca1]);
  }
  // protoporphyrin IX side chains (Fischer 1–8): M V M V M P P M
  const kinds = ['M', 'V', 'M', 'V', 'M', 'P', 'P', 'M'];
  let idx = 0;
  for (let q = 0; q < 4; q++) {
    for (const s of [-1, 1]) {
      const kind = kinds[idx++];
      const base = s < 0 ? pyr[q].Cb1 : pyr[q].Cb2;
      const [dx, dy] = rot(0.821, s * 0.57, pyr[q].a);
      const bp = atoms[base].pos.clone().divideScalar(SC);
      const dir = (ang) => rot(dx, dy, ang);
      if (kind === 'M') {
        const c = add(bp.x + dx * 1.5, bp.y + dy * 1.5, 0, 'C');
        bonds.push([base, c]);
      } else if (kind === 'V') {
        const c1 = add(bp.x + dx * 1.47, bp.y + dy * 1.47, 0, 'C');
        const [ex, ey] = dir(s * 1.05);
        const c2 = add(atoms[c1].pos.x / SC + ex * 1.34, atoms[c1].pos.y / SC + ey * 1.34, 0.2, 'C');
        bonds.push([base, c1], [c1, c2]);
      } else {
        const ca = add(bp.x + dx * 1.5, bp.y + dy * 1.5, 0.25, 'C');
        const [e1x, e1y] = dir(-s * 0.9);
        const cb = add(atoms[ca].pos.x / SC + e1x * 1.53, atoms[ca].pos.y / SC + e1y * 1.53, 0.9, 'C');
        const [e2x, e2y] = dir(s * 0.35);
        const cc = add(atoms[cb].pos.x / SC + e2x * 1.52, atoms[cb].pos.y / SC + e2y * 1.52, 1.5, 'C');
        const [o1x, o1y] = dir(s * 1.3);
        const [o2x, o2y] = dir(-s * 0.55);
        const o1 = add(atoms[cc].pos.x / SC + o1x * 1.25, atoms[cc].pos.y / SC + o1y * 1.25, 1.9, 'O');
        const o2 = add(atoms[cc].pos.x / SC + o2x * 1.25, atoms[cc].pos.y / SC + o2y * 1.25, 2.1, 'O');
        bonds.push([base, ca], [ca, cb], [cb, cc], [cc, o1], [cc, o2]);
      }
    }
  }

  // ---------------------------------------------------------------- meshes
  const EL = {
    C: { r: 0.3, mat: new THREE.MeshPhysicalMaterial({ color: 0xb8c0cc, roughness: 0.3, metalness: 0.1, clearcoat: 0.8 }) },
    N: { r: 0.33, mat: new THREE.MeshPhysicalMaterial({ color: 0x4f7dff, roughness: 0.25, clearcoat: 0.9 }) },
    O: { r: 0.32, mat: new THREE.MeshPhysicalMaterial({ color: 0xff4d5e, roughness: 0.25, clearcoat: 0.9 }) },
  };
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const atomMeshes = atoms.map((a) => {
    const m = new THREE.Mesh(sphere, EL[a.el].mat);
    m.scale.setScalar(EL[a.el].r * SC * 1.9);
    m.userData.home = a.pos.clone();
    m.userData.scatter = new THREE.Vector3((rand() - 0.5) * 16, (rand() - 0.5) * 9, (rand() - 0.5) * 6);
    m.userData.ph = rand() * 6;
    mol.add(m);
    return m;
  });
  const bondMat = new THREE.MeshPhysicalMaterial({ color: 0x8d96a6, roughness: 0.35, clearcoat: 0.5 });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  const bondMeshes = bonds.map(([i, j]) => {
    const m = new THREE.Mesh(cyl, bondMat);
    m.userData = { i, j };
    mol.add(m);
    return m;
  });
  const yAxis = new THREE.Vector3(0, 1, 0);
  function placeBond(m) {
    const a = atomMeshes[m.userData.i].position, b = atomMeshes[m.userData.j].position;
    const d = b.clone().sub(a);
    const L = d.length();
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(0.085, L, 0.085);
    m.quaternion.setFromUnitVectors(yAxis, d.normalize());
  }

  // coordination bonds Fe–N (shown once iron is seated)
  const coordMat = new THREE.MeshBasicMaterial({ color: 0xffb340, transparent: true, opacity: 0 });
  const coords = pyr.map((p) => {
    const m = new THREE.Mesh(cyl, coordMat);
    const a = new THREE.Vector3(), b = atoms[p.N].pos;
    const d = b.clone().sub(a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(0.05, d.length() - 0.4, 0.05);
    m.quaternion.setFromUnitVectors(yAxis, d.clone().normalize());
    mol.add(m);
    return m;
  });

  // the iron ion
  const fe = new THREE.Group();
  const feCore = new THREE.Mesh(new THREE.SphereGeometry(0.62 * SC * 1.9 / 1.9, 48, 32), new THREE.MeshPhysicalMaterial({
    color: 0xff9f0a, emissive: 0xff7a00, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.4, clearcoat: 1,
  }));
  feCore.scale.setScalar(1.9);
  const feGlow = glowSprite(0xffa31a, 3.2, 0.85);
  fe.add(feCore, feGlow);
  world.add(fe);
  const trail = [];
  for (let i = 0; i < 14; i++) {
    const s = glowSprite(0xff9f0a, 1.2 - i * 0.06, 0.5 - i * 0.03);
    world.add(s);
    trail.push(s);
  }
  const feStart = new THREE.Vector3(9, 6, 4);

  // --------------------------------------------- hemoglobin tetramer (step 3)
  const tet = new THREE.Group();
  world.add(tet);
  const subs = [];
  const tpos = [[1.35, 1.0, 0.6], [-1.35, 1.0, -0.6], [1.35, -1.0, -0.6], [-1.35, -1.0, 0.6]];
  tpos.forEach((p, i) => {
    const g = new THREE.Group();
    g.position.set(...p).multiplyScalar(1.15);
    const blob = new THREE.Mesh(blobGeometry(1.45, 4, 0.12, 2.4, i + 3), new THREE.MeshPhysicalMaterial({
      color: i < 2 ? 0xff4d6d : 0xd23a8a, roughness: 0.35, transparent: true, opacity: 0.38, clearcoat: 0.6, depthWrite: false,
    }));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 32), new THREE.MeshPhysicalMaterial({ color: 0xc7ccd6, roughness: 0.3 }));
    disc.rotation.set(Math.PI / 2 + i, i * 0.7, 0);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), feCore.material);
    g.add(blob, disc, dot);
    tet.add(g);
    subs.push(g);
  });
  tet.visible = false;

  // ----------------------------------------------------------------- labels
  const L = new Labels(layer, camera, k.size, world);
  const lab = {
    ppix: L.add('Protoporphyrin IX', new THREE.Vector3(0, 2.6, 0), { color: 'var(--blue)' }),
    fe: L.add('Fe²⁺', fe, { color: 'var(--iron)', offset: [0, 0.5, 0] }),
    heme: L.add('Heme', new THREE.Vector3(0, 2.6, 0), { color: 'var(--iron)' }),
    hb: L.add('Hemoglobin · 4 globin chains, each with a heme', new THREE.Vector3(0, 3.3, 0), { color: 'var(--red)' }),
    wait: L.add('No iron → no heme', new THREE.Vector3(0, -2.4, 0), { color: 'var(--blue)', side: 'down' }),
  };

  // --------------------------------------------------------------- UI (DOM)
  const pathHost = slide.querySelector('[data-path]');
  pathHost.innerHTML = `
    <div class="steps-list compact">
      <div class="it" data-hs="0" style="--c:var(--teal)"><span class="sw"></span><div><h4>Glycine + succinyl-CoA → ALA</h4><p>ALA synthase · vitamin B6</p></div></div>
      <div class="it" data-hs="1" style="--c:var(--blue)"><span class="sw"></span><div><h4>→ Protoporphyrin IX</h4><p>Several steps</p></div></div>
      <div class="it" data-hs="2" style="--c:var(--iron)"><span class="sw"></span><div><h4>+ Fe²⁺ → heme</h4><p>Ferrochelatase</p></div></div>
      <div class="it" data-hs="3" style="--c:var(--red)"><span class="sw"></span><div><h4>Heme + globin → hemoglobin</h4><p>Four chains, four hemes</p></div></div>
      <div class="it" data-hs="4" style="--c:var(--blue)"><span class="sw"></span><div><h4>Iron deficiency</h4><p>↓ heme → ↓ Hb → ↓ MCV · MCH · MCHC</p></div></div>
    </div>`;
  const items = [...pathHost.querySelectorAll('[data-hs]')];

  let ironOK = true;
  const seg = segmented(slide.querySelector('[data-ctl]'), [
    { label: 'Iron available', color: 'var(--iron)' },
    { label: 'Iron deficient', color: 'var(--blue)' },
  ], (i) => { ironOK = i === 0; });

  const counter = slide.querySelector('[data-counter]');
  counter.innerHTML = `<div class="stat"><div class="v num" data-n style="font-size:72px">0</div><div class="k">heme formed</div></div>`;
  const nEl = counter.querySelector('[data-n]');
  counter.style.opacity = 0;
  counter.style.transition = 'opacity .6s';

  // ------------------------------------------------------------ step logic
  let step = 0;
  const pres = { ring: 0, tet: 0 };
  const want = { ring: 0, tet: 0 };
  let cycle = 0, cycleN = 0, made = 0, arrives = true;
  function setStep(s) {
    step = s;
    want.ring = s >= 1 ? 1 : 0;
    want.tet = s === 3 ? 1 : 0;
    if (s === 4) seg.set(1); else if (s <= 3) seg.set(0);
    items.forEach((it, i) => {
      it.classList.toggle('cur', i === s);
      it.classList.toggle('past', i < s && s !== 4);
    });
    counter.style.opacity = s === 2 || s === 4 ? 1 : 0;
    cycle = 0;
  }

  const drag = new DragRotate(k.renderer.domElement, { yaw: [-1.2, 1.2], pitch: [-0.6, 0.6], sway: 0.35 });
  let time = 0;
  const tmp = new THREE.Vector3();
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  let feAmt = 0;
  function frame(t, dt) {
    time += dt;
    drag.update(time, dt);
    const a = 1 - Math.exp(-2.6 * dt);
    pres.ring += (want.ring - pres.ring) * a;
    pres.tet += (want.tet - pres.tet) * a;

    world.rotation.y = drag.yaw;
    world.rotation.x = drag.pitch - 0.35;

    // assembly from scattered precursors
    const r = ease(Math.min(1, Math.max(0, pres.ring)));
    atomMeshes.forEach((m) => {
      const d = m.userData;
      const sc = d.scatter;
      tmp.set(sc.x + Math.sin(time * 0.6 + d.ph) * 0.4, sc.y + Math.cos(time * 0.5 + d.ph) * 0.4, sc.z);
      m.position.copy(tmp).lerp(d.home, r);
    });
    bondMeshes.forEach((m) => { placeBond(m); m.visible = r > 0.92; });

    // ring → tetramer
    const tt = pres.tet;
    mol.scale.setScalar(1 - tt * 0.82);
    mol.position.copy(subs[0].position).multiplyScalar(tt);
    tet.visible = tt > 0.02;
    tet.scale.setScalar(0.6 + tt * 0.4);
    subs.forEach((g, i) => { g.children[0].material.opacity = 0.38 * tt; g.visible = tt > 0.02; g.rotation.y = time * 0.2 + i; });

    // iron insertion loop (steps 2 & 4)
    const looping = step === 2 || step === 4;
    if (looping) {
      const period = 3.6;
      const prevCycle = cycle;
      cycle += dt / period;
      if (Math.floor(cycle) !== Math.floor(prevCycle) || cycleN === 0) {
        cycleN++;
        arrives = ironOK ? true : cycleN % 4 === 0;
      }
      const u = cycle % 1;
      if (arrives) {
        // fly in (0–0.45), seat & glow (0.45–0.85), fade (0.85–1)
        const f = ease(Math.min(1, u / 0.45));
        fe.position.copy(feStart).lerp(mol.position, f);
        fe.position.y += Math.sin(f * Math.PI) * 1.6;
        feAmt = u < 0.85 ? 1 : 1 - (u - 0.85) / 0.15;
        if (u > 0.45 && !fe.userData.counted) { fe.userData.counted = true; made++; nEl.textContent = made; }
        if (u < 0.45) fe.userData.counted = false;
        coordMat.opacity = u > 0.45 ? Math.min(1, (u - 0.45) * 6) * feAmt : 0;
      } else {
        // iron never comes: the ring waits
        feAmt = 0;
        coordMat.opacity = 0;
        fe.userData.counted = false;
      }
    } else if (step === 3) {
      feAmt = 1;
      fe.position.copy(mol.position);
      coordMat.opacity = 1;
    } else {
      feAmt = 0;
      coordMat.opacity = 0;
    }
    fe.visible = feAmt > 0.01;
    fe.scale.setScalar(Math.max(0.001, feAmt) * (1 - pres.tet * 0.82));
    feGlow.material.opacity = 0.85 * feAmt * (1 + Math.sin(time * 6) * 0.1);
    // comet trail
    trail.forEach((s, i) => {
      const lag = i * 0.022;
      const u = looping && arrives ? (cycle % 1) - lag : -1;
      if (u > 0 && u < 0.45) {
        const f = ease(u / 0.45);
        s.position.copy(feStart).lerp(mol.position, f);
        s.position.y += Math.sin(f * Math.PI) * 1.6;
        s.material.opacity = (0.5 - i * 0.03) * (1 - f * 0.6);
        s.visible = true;
      } else s.visible = false;
    });

    // labels
    const seated = coordMat.opacity > 0.5;
    L.show(lab.ppix, step === 1 || ((step === 2 || step === 4) && !seated));
    L.show(lab.heme, (step === 2 || step === 4) && seated);
    L.show(lab.fe, looping && arrives && (cycle % 1) < 0.45);
    L.show(lab.hb, step === 3);
    L.show(lab.wait, step === 4 && !arrives);

    k.render();
    L.update();
  }

  setStep(0);
  return {
    resize(s) { k.resize(s); },
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame,
  };
}
