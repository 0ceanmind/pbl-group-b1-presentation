// Classic hepatic lobule: central vein, radiating hepatocyte plates, sinusoid
// blood flowing inward, portal triads at the corners, Kupffer cells, and bile
// flowing outward in the canaliculi toward the bile ducts.
import { THREE, makeStage, Labels, DragRotate } from '../lib/three-kit.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { rng } from '../lib/dom.js';

export default function liver(slide, api) {
  const host = slide.querySelector('.viz3d');
  const layer = slide.querySelector('.labels3d');
  const k = makeStage(host, { fov: 32, exposure: 1.0 });
  const { scene, camera } = k;
  k.shift(330);
  const rand = rng(11);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x302030, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(5, 12, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb8ff, 0.9);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  const world = new THREE.Group();
  scene.add(world);
  const R = 5; // centre → corner
  const corner = (i) => new THREE.Vector3(Math.cos((i * Math.PI) / 3) * R, 0, Math.sin((i * Math.PI) / 3) * R);
  const edgeDist = (th) => {
    const a = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
    return (R * Math.cos(Math.PI / 6)) / Math.cos(a - Math.PI / 6);
  };

  // ------------------------------------------------------------- outlines
  const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  const ghostMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 });
  const hexLine = (cx, cz, mat, y = -0.3) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const c = corner(i % 6); pts.push(new THREE.Vector3(c.x + cx, y, c.z + cz)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  };
  const outlines = new THREE.Group();
  outlines.add(hexLine(0, 0, outlineMat));
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const d = R * Math.sqrt(3);
    outlines.add(hexLine(Math.cos(a) * d, Math.sin(a) * d, ghostMat));
  }
  world.add(outlines);
  // translucent floor plate
  const floorShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const c = corner(i); i ? floorShape.lineTo(c.x, c.z) : floorShape.moveTo(c.x, c.z); }
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  floor.rotation.x = Math.PI / 2;
  floor.position.y = -0.31;
  world.add(floor);

  // ---------------------------------------------------------- central vein
  const cv = new THREE.Group();
  const cvMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.1, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x2f6bff, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide }));
  const cvLumen = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48), new THREE.MeshBasicMaterial({ color: 0x0b1a4a }));
  cvLumen.rotation.x = -Math.PI / 2;
  cvLumen.position.y = 0.2;
  const cvRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 64), new THREE.MeshStandardMaterial({ color: 0x5c8dff, emissive: 0x1a3fb0, emissiveIntensity: 0.6 }));
  cvRing.rotation.x = Math.PI / 2;
  cvRing.position.y = 0.55;
  cv.add(cvMesh, cvLumen, cvRing);
  cv.position.y = 0.05;
  world.add(cv);

  // ----------------------------------------------------- hepatocyte plates
  const PLATES = 30;
  const cellGeo = new RoundedBoxGeometry(0.36, 0.5, 0.3, 2, 0.07);
  const cellMat = new THREE.MeshPhysicalMaterial({ color: 0xe8967a, roughness: 0.5, clearcoat: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0xffd2c2) });
  const cellData = [];
  const plateLines = [];
  for (let p = 0; p < PLATES; p++) {
    const th = (p / PLATES) * Math.PI * 2 + 0.05;
    const re = edgeDist(th) - 0.3;
    const pts = [];
    for (let r = 0.95; r < re; r += 0.4) {
      const jit = (rand() - 0.5) * 0.05;
      const thj = th + jit + Math.sin(r * 1.7 + p) * 0.025;
      pts.push(r);
      cellData.push({ th: thj, r, d: r / R, rot: thj });
    }
    plateLines.push({ th, r0: 0.9, r1: re });
  }
  const cells = new THREE.InstancedMesh(cellGeo, cellMat, cellData.length);
  const cColor = new THREE.Color();
  cellData.forEach((c, i) => {
    cColor.setHSL(0.04 + (rand() - 0.5) * 0.015, 0.62, 0.62 + (rand() - 0.5) * 0.06);
    cells.setColorAt(i, cColor);
  });
  world.add(cells);

  // -------------------------------------------- sinusoid blood (inward flow)
  const SIN = PLATES;
  const BPER = 7;
  const bloodGeo = new THREE.SphereGeometry(0.075, 10, 8);
  const bloodMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const blood = new THREE.InstancedMesh(bloodGeo, bloodMat, SIN * BPER);
  blood.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const bl = [];
  for (let s = 0; s < SIN; s++) {
    const th = ((s + 0.5) / PLATES) * Math.PI * 2 + 0.05;
    for (let i = 0; i < BPER; i++) bl.push({ th, u: rand(), v: 0.16 + rand() * 0.06, y: (rand() - 0.5) * 0.3 });
  }
  const cArt = new THREE.Color(0xff2d55), cVen = new THREE.Color(0x6f7dff);
  world.add(blood);

  // ---------------------------------------------------------- portal triads
  const triads = new THREE.Group();
  const mats = {
    pv: new THREE.MeshPhysicalMaterial({ color: 0x7d6bff, roughness: 0.3, clearcoat: 0.7 }),
    ha: new THREE.MeshPhysicalMaterial({ color: 0xff3b4f, roughness: 0.3, clearcoat: 0.7 }),
    bd: new THREE.MeshPhysicalMaterial({ color: 0x2fd158, roughness: 0.3, clearcoat: 0.7 }),
  };
  const triadAnchors = [];
  for (let i = 0; i < 6; i++) {
    const c = corner(i);
    const g = new THREE.Group();
    g.position.copy(c);
    const out = c.clone().normalize();
    const side = new THREE.Vector3(-out.z, 0, out.x);
    const pv = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.3, 32), mats.pv);
    const ha = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.3, 24), mats.ha);
    const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.3, 24), mats.bd);
    pv.position.copy(out.clone().multiplyScalar(0.12));
    ha.position.copy(side.clone().multiplyScalar(0.5).add(out.clone().multiplyScalar(-0.15)));
    bd.position.copy(side.clone().multiplyScalar(-0.5).add(out.clone().multiplyScalar(-0.12)));
    g.add(pv, ha, bd);
    triads.add(g);
    triadAnchors.push({ g, pv, ha, bd });
  }
  world.add(triads);

  // ------------------------------------------------------------ Kupffer cells
  const kupGeo = new THREE.IcosahedronGeometry(0.13, 0);
  const kupMat = new THREE.MeshStandardMaterial({ color: 0xffb340, emissive: 0x7a4300, emissiveIntensity: 0.5, flatShading: true, roughness: 0.4 });
  const KN = 34;
  const kup = new THREE.InstancedMesh(kupGeo, kupMat, KN);
  const kd = [];
  for (let i = 0; i < KN; i++) {
    const s = Math.floor(rand() * SIN);
    const th = ((s + 0.5) / PLATES) * Math.PI * 2 + 0.05;
    const r = 1.3 + rand() * (edgeDist(th) - 1.9);
    kd.push({ th, r, ph: rand() * 6 });
  }
  world.add(kup);

  // -------------------------------------- bile canaliculi + outward bile flow
  const bileGroup = new THREE.Group();
  const canMat = new THREE.LineBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0.9 });
  const bilePaths = plateLines.map((pl) => {
    const a = new THREE.Vector3(Math.cos(pl.th) * pl.r0, 0.27, Math.sin(pl.th) * pl.r0);
    const b = new THREE.Vector3(Math.cos(pl.th) * (pl.r1 + 0.2), 0.27, Math.sin(pl.th) * (pl.r1 + 0.2));
    // nearest corner (bile duct)
    let best = 0, bd = 1e9;
    for (let i = 0; i < 6; i++) { const d = corner(i).distanceTo(b); if (d < bd) { bd = d; best = i; } }
    const duct = triadAnchors[best].bd.getWorldPosition(new THREE.Vector3()).setY(0.27);
    bileGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), canMat));
    const L1 = a.distanceTo(b), L2 = b.distanceTo(duct);
    return { a, b, c: duct, L1, L2 };
  });
  world.add(bileGroup);
  const bileGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const bileMat = new THREE.MeshBasicMaterial({ color: 0x5bff8a, transparent: true });
  const BB = 4;
  const bile = new THREE.InstancedMesh(bileGeo, bileMat, bilePaths.length * BB);
  bile.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const bd = [];
  bilePaths.forEach((p, i) => { for (let j = 0; j < BB; j++) bd.push({ p, u: (j / BB) + rand() * 0.2 }); });
  world.add(bile);

  // ----------------------------------------------------------------- labels
  const L = new Labels(layer, camera, k.size, world);
  const lab = [
    [L.add('Central vein', cv, { color: 'var(--blue)', offset: [0, 0.75, 0] })],
    [L.add('Hepatocyte plates', new THREE.Vector3(Math.cos(1.2) * 3, 0.3, Math.sin(1.2) * 3), { color: '#e8967a' })],
    [L.add('Sinusoids → central vein', new THREE.Vector3(Math.cos(-0.45) * 2.6, 0.2, Math.sin(-0.45) * 2.6), { color: 'var(--red)' })],
    [
      L.add('Portal vein', triadAnchors[1].pv, { color: 'var(--indigo)', offset: [0, 0.75, 0] }),
      L.add('Hepatic artery', triadAnchors[0].ha, { color: 'var(--red)', offset: [0, 0.75, 0] }),
      L.add('Bile duct', triadAnchors[5].bd, { color: 'var(--green)', offset: [0, 0.75, 0] }),
    ],
    [L.add('Kupffer cell', new THREE.Object3D(), { color: 'var(--amber)', offset: [0, 0.2, 0] })],
    [L.add('Bile → bile duct', new THREE.Vector3(Math.cos(2.7) * 3.8, 0.3, Math.sin(2.7) * 3.8), { color: 'var(--green)' })],
  ];
  const kupAnchor = lab[4][0].target;
  world.add(kupAnchor);
  kupAnchor.position.set(Math.cos(kd[0].th) * kd[0].r, 0.2, Math.sin(kd[0].th) * kd[0].r);

  // ---------------------------------------------------------- presence/steps
  const pres = { plates: 0, blood: 0, triads: 0, kup: 0, bile: 0 };
  const want = { ...pres };
  let step = 0;
  function setStep(s) {
    step = s;
    want.plates = s >= 1 ? 1 : 0;
    want.blood = s >= 2 ? 1 : 0;
    want.triads = s >= 3 ? 1 : 0;
    want.kup = s >= 4 ? 1 : 0;
    want.bile = s >= 5 ? 1 : 0;
    lab.forEach((arr, i) => arr.forEach((it) => L.show(it, i === s)));
  }

  const drag = new DragRotate(k.renderer.domElement, { yaw: [-Math.PI, Math.PI], pitch: [-0.35, 0.35], sway: 0.35 });
  camera.position.set(0, 12.8, 13.2);
  camera.lookAt(0, -0.6, 0);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  let time = 0;
  function frame(t, dt) {
    time += dt;
    drag.update(time, dt);
    world.rotation.y = drag.yaw + time * 0.03;
    world.rotation.x = drag.pitch;
    const a = 1 - Math.exp(-3 * dt);
    for (const key in pres) pres[key] += (want[key] - pres[key]) * a;

    // plates grow outward from the central vein
    for (let i = 0; i < cellData.length; i++) {
      const c = cellData[i];
      const g = Math.max(0, Math.min(1, pres.plates * 1.6 - c.d * 0.8));
      const s = g < 0.001 ? 0.0001 : 0.3 + 0.7 * g;
      pv.set(Math.cos(c.th) * c.r, -0.05 + (1 - g) * -0.4, Math.sin(c.th) * c.r);
      q.setFromAxisAngle(up, -c.rot);
      sv.set(s, s, s);
      m4.compose(pv, q, sv);
      cells.setMatrixAt(i, m4);
    }
    cells.instanceMatrix.needsUpdate = true;

    // sinusoid blood: periphery → centre, colour shifts toward venous
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      b.u += b.v * dt * 0.6;
      if (b.u > 1) b.u -= 1;
      const re = edgeDist(b.th) - 0.15;
      const r = re + (0.7 - re) * b.u;
      pv.set(Math.cos(b.th) * r, b.y * 0.6, Math.sin(b.th) * r);
      const s = pres.blood * (b.u > 0.92 ? (1 - b.u) / 0.08 : 1);
      sv.setScalar(Math.max(0.0001, s));
      m4.compose(pv, q.identity(), sv);
      blood.setMatrixAt(i, m4);
      col.copy(cArt).lerp(cVen, b.u);
      blood.setColorAt(i, col);
    }
    blood.instanceMatrix.needsUpdate = true;
    if (blood.instanceColor) blood.instanceColor.needsUpdate = true;

    // triads rise
    triads.children.forEach((g, i) => {
      const s = Math.max(0.0001, Math.min(1, pres.triads * 1.3 - i * 0.05));
      g.scale.set(s, s, s);
    });

    // Kupffer cells pop in and wobble
    for (let i = 0; i < KN; i++) {
      const c = kd[i];
      pv.set(Math.cos(c.th) * c.r, 0.12, Math.sin(c.th) * c.r);
      q.setFromEuler(new THREE.Euler(time * 0.6 + c.ph, time * 0.4, 0));
      const s = Math.max(0.0001, pres.kup * (1 + Math.sin(time * 2 + c.ph) * 0.08));
      sv.set(s * 1.3, s * 0.9, s * 1.1);
      m4.compose(pv, q, sv);
      kup.setMatrixAt(i, m4);
    }
    kup.instanceMatrix.needsUpdate = true;

    // bile: centre → edge → nearest corner duct
    canMat.opacity = 0.85 * pres.bile;
    for (let i = 0; i < bd.length; i++) {
      const d = bd[i];
      d.u += dt * 0.13;
      if (d.u > 1) d.u -= 1;
      const { a: A, b: B, c: C, L1, L2 } = d.p;
      const s = d.u * (L1 + L2);
      if (s < L1) pv.copy(A).lerp(B, s / L1); else pv.copy(B).lerp(C, (s - L1) / L2);
      sv.setScalar(Math.max(0.0001, pres.bile));
      m4.compose(pv, q.identity(), sv);
      bile.setMatrixAt(i, m4);
    }
    bile.instanceMatrix.needsUpdate = true;
    bileMat.opacity = pres.bile;

    cvRing.material.emissiveIntensity = 0.5 + Math.sin(time * 2) * 0.2;
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
