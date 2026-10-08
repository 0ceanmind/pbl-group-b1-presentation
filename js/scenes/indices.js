// MCV / MCH / MCHC on a real biconcave model: her cell morphs from a
// reference cell — smaller (MCV), less hemoglobin (MCH), wider pallor (MCHC).
import { THREE, makeStage, rbcGeometry, rbcMaterial, Labels, DragRotate } from '../lib/three-kit.js';
import { H } from '../lib/dom.js';
import { CASE, RANGES } from '../data.js';

export default function indices(slide, api) {
  const host = slide.querySelector('.viz3d');
  const layer = slide.querySelector('.labels3d');
  const k = makeStage(host, { fov: 28, exposure: 1.05 });
  const { scene, camera } = k;
  camera.position.set(0, 0, 15);

  scene.add(new THREE.HemisphereLight(0xfff2f4, 0x200008, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(3, 7, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5a78, 2.4);
  rim.position.set(-6, -4, -6);
  scene.add(rim);

  const geo = rbcGeometry(72, 140);
  const mid = (r) => (r.lo + r.hi) / 2;
  const ref = { mcv: mid(RANGES.mcv), mch: mid(RANGES.mch), mchc: mid(RANGES.mchc) };

  const matA = rbcMaterial({ pallor: 0.34, hb: 1 });
  const matB = rbcMaterial({ pallor: 0.34, hb: 1 });
  const A = new THREE.Mesh(geo, matA);
  const B = new THREE.Mesh(geo, matB);
  const R0 = 2.35;
  A.scale.setScalar(R0);
  B.scale.setScalar(R0);
  const gA = new THREE.Group(), gB = new THREE.Group();
  gA.position.x = -3.4;
  gB.position.x = 3.4;
  gA.add(A);
  gB.add(B);
  scene.add(gA, gB);

  // dashed ghost ring = reference diameter around her cell
  const ringPts = [];
  for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; ringPts.push(new THREE.Vector3(Math.cos(a) * R0, 0, Math.sin(a) * R0)); }
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0 }));
  ring.computeLineDistances();
  gB.add(ring);

  const L = new Labels(layer, camera, k.size);
  const la = L.add('Reference cell', new THREE.Vector3(-3.4, -R0 - 0.2, 0), { color: 'var(--green)', side: 'down' });
  const lb = L.add('Her red cells', new THREE.Vector3(3.4, -R0 - 0.2, 0), { color: 'var(--red)', side: 'down' });
  L.show(la, true);
  L.show(lb, true);

  // ------------------------------------------------------------ index cards
  const cardsHost = slide.querySelector('[data-cards]');
  const defs = [
    { key: 'mcv', name: 'MCV', full: 'Mean corpuscular volume', what: 'Size', verdict: 'Microcytic', unit: 'fL', c: 'var(--blue)' },
    { key: 'mch', name: 'MCH', full: 'Mean corpuscular hemoglobin', what: 'Hb per cell', verdict: 'Less hemoglobin', unit: 'pg', c: 'var(--pink)' },
    { key: 'mchc', name: 'MCHC', full: 'Mean corpuscular Hb concentration', what: 'Hb concentration', verdict: 'Hypochromic', unit: 'g/dL', c: 'var(--amber)' },
  ];
  const cards = defs.map((d, i) => {
    const c = H('div', { class: 'card', style: `padding:26px 30px;transition:opacity .6s, border-color .6s, background .6s, transform .8s var(--ease)` }, cardsHost);
    c.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div><div style="font-size:40px;font-weight:760;letter-spacing:-.02em;color:${d.c}">${d.name}</div><div class="caption" style="font-size:19px">${d.full}</div></div>
        <div style="text-align:right"><div class="num" style="font-size:48px;font-weight:760;letter-spacing:-.03em">${CASE[d.key]}<span style="font-size:22px;color:var(--text-3);font-weight:550"> ${d.unit}</span> <span class="down">↓</span></div>
        <div class="caption num" style="font-size:18px">ref ${RANGES[d.key].lo}–${RANGES[d.key].hi} ${d.unit}</div></div>
      </div>
      <p style="font-size:27px;margin-top:14px;color:var(--text)">${d.what} → <b style="color:${d.c}">${d.verdict}</b></p>`;
    return c;
  });

  let step = 0;
  const want = { size: 1, hb: 1, pallor: 0.34, ring: 0 };
  const cur = { ...want };
  function setStep(s) {
    step = s;
    want.size = s >= 1 ? Math.cbrt(CASE.mcv / ref.mcv) : 1;
    want.ring = s >= 1 ? 0.55 : 0;
    want.hb = s >= 2 ? CASE.mch / ref.mch : 1;
    want.pallor = s >= 3 ? 0.34 + (1 - CASE.mchc / ref.mchc) * 1.6 : 0.34;
    cards.forEach((c, i) => {
      const on = s === i + 1;
      c.style.opacity = s === 0 || s > i ? 1 : 0.35;
      c.style.borderColor = on ? defs[i].c : '';
      c.style.transform = on ? 'translateY(-8px)' : '';
    });
  }

  const drag = new DragRotate(k.renderer.domElement, { yaw: [-1.4, 1.4], pitch: [-0.8, 0.8], sway: 0.2 });
  let time = 0;
  function frame(t, dt) {
    time += dt;
    drag.update(time, dt);
    const a = 1 - Math.exp(-2.2 * dt);
    for (const key in want) cur[key] += (want[key] - cur[key]) * a;
    B.scale.setScalar(R0 * cur.size);
    matB.userData.u.uHb.value = cur.hb;
    matB.userData.u.uPallor.value = cur.pallor;
    ring.material.opacity = cur.ring;
    const tilt = 1.05 + drag.pitch;
    [gA, gB].forEach((g) => {
      g.rotation.set(tilt, drag.yaw + Math.sin(time * 0.3) * 0.25, 0);
    });
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
