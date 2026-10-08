// Red bone marrow microanatomy: cords between sinusoids, erythroblastic island,
// megakaryocyte releasing platelets, adipocytes, plasma cells, reticular network.
import { THREE, makeStage, rbcGeometry, rbcMaterial, blobGeometry, Labels, DragRotate } from '../lib/three-kit.js';
import { rng } from '../lib/dom.js';

export default function marrow(slide, api) {
  const host = slide.querySelector('.viz3d');
  const layer = slide.querySelector('.labels3d');
  const k = makeStage(host, { fov: 34, exposure: 1.0 });
  const { scene, camera } = k;
  k.shift(200);
  const rand = rng(7);

  scene.add(new THREE.HemisphereLight(0xfff0f4, 0x2a0a18, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5577, 2.2);
  rim.position.set(-6, -4, -8);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  // ---------------------------------------------------------------- sinusoids
  const SIN_R = 1.2;
  const SIN_Y = [3.3, -3.6];
  const sinMat = new THREE.MeshPhysicalMaterial({
    color: 0xff7a90, roughness: 0.3, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
  });
  const nucGeo = new THREE.SphereGeometry(0.12, 16, 12);
  const nucMat = new THREE.MeshStandardMaterial({ color: 0xd7a0c8, roughness: 0.55, transparent: true, opacity: 0.45 });
  const sinusoids = SIN_Y.map((y) => {
    const g = new THREE.Group();
    g.position.y = y;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(SIN_R, SIN_R, 30, 72, 1, true), sinMat);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    for (let i = 0; i < 18; i++) {
      const a = rand() * Math.PI * 2;
      const n = new THREE.Mesh(nucGeo, nucMat);
      n.position.set(-14 + rand() * 28, Math.cos(a) * (SIN_R + 0.01), Math.sin(a) * (SIN_R + 0.01));
      n.scale.set(2.3, 0.45, 0.95);
      n.rotation.x = a;
      g.add(n);
    }
    world.add(g);
    return g;
  });

  // flowing red cells inside both sinusoids
  const rbcGeo = rbcGeometry(28, 40);
  const flowMat = rbcMaterial({ pallor: 0.34 });
  const FN = 46;
  const flow = new THREE.InstancedMesh(rbcGeo, flowMat, FN * 2);
  flow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(flow);
  const flowCells = [];
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < FN; i++) {
      const r = Math.sqrt(rand()) * 0.72, a = rand() * 6.28;
      flowCells.push({
        s, x: -15 + rand() * 30, y: Math.cos(a) * r, z: Math.sin(a) * r, v: 1.2 + rand() * 0.8,
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6)),
        axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), spin: 0.6 + rand(),
      });
    }
  }

  // ---------------------------------------------------------- reticular net
  const netPts = [];
  for (let i = 0; i < 110; i++) netPts.push(new THREE.Vector3(-9 + rand() * 19, -2.25 + rand() * 4.3, -2.6 + rand() * 3.6));
  const seg = [];
  netPts.forEach((p, i) => {
    const near = netPts.map((q, j) => [p.distanceTo(q), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 3);
    near.forEach(([d, j]) => { if (d < 2.6 && j > i) seg.push(p.x, p.y, p.z, netPts[j].x, netPts[j].y, netPts[j].z); });
  });
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const netMat = new THREE.LineBasicMaterial({ color: 0x8fd3e6, transparent: true, opacity: 0.3 });
  const net = new THREE.LineSegments(netGeo, netMat);
  world.add(net);
  // reticular (stromal) cells on some nodes
  const retGeo = new THREE.SphereGeometry(0.16, 16, 12);
  const retMat = new THREE.MeshStandardMaterial({ color: 0x66c7dd, roughness: 0.5 });
  const retCells = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const p = netPts[(i * 7) % netPts.length];
    const m = new THREE.Mesh(retGeo, retMat);
    m.position.copy(p);
    m.scale.set(2.2, 0.8, 0.8);
    m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    retCells.add(m);
  }
  world.add(retCells);

  // ------------------------------------------------- erythroblastic island
  const island = new THREE.Group();
  island.position.set(0, -0.25, 0);
  world.add(island);
  const macMat = new THREE.MeshPhysicalMaterial({ color: 0xc98bb8, roughness: 0.55, clearcoat: 0.3, sheen: 0.6, sheenColor: new THREE.Color(0xffc4e6) });
  const macro = new THREE.Mesh(blobGeometry(0.95, 5, 0.16, 2.4, 3), macMat);
  island.add(macro);
  const macNuc = new THREE.Mesh(blobGeometry(0.42, 3, 0.1, 2, 5), new THREE.MeshStandardMaterial({ color: 0x5b3a8a, roughness: 0.5 }));
  macNuc.position.set(0.25, 0.2, 0.62);
  island.add(macNuc);
  const blasts = [];
  const early = new THREE.Color(0x8b80ea), late = new THREE.Color(0xec4d68);
  const nucDark = new THREE.MeshStandardMaterial({ color: 0x3b2366, roughness: 0.45 });
  for (let i = 0; i < 12; i++) {
    const f = i / 11;
    const a = (i / 12) * Math.PI * 2;
    const g = new THREE.Group();
    const r = 0.42 - f * 0.08;
    const cyto = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 24),
      new THREE.MeshPhysicalMaterial({ color: early.clone().lerp(late, f), roughness: 0.35, transparent: true, opacity: 0.62, clearcoat: 0.6, depthWrite: false })
    );
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(r * (0.55 - f * 0.18), 24, 16), nucDark);
    nuc.position.set(r * 0.12, 0, r * 0.2);
    g.add(nuc, cyto);
    const tilt = Math.sin(a * 2) * 0.35;
    g.position.set(Math.cos(a) * 1.45, Math.sin(a) * 1.25 * 0.8 + tilt * 0.3, Math.sin(a) * 0.55 + 0.2);
    g.userData = { a, base: g.position.clone(), ph: rand() * 6 };
    island.add(g);
    blasts.push(g);
  }

  // ------------------------------------------------------- megakaryocyte
  const mk = new THREE.Group();
  mk.position.set(4.3, 1.45, 0);
  world.add(mk);
  const mkBody = new THREE.Mesh(blobGeometry(1.12, 6, 0.07, 1.6, 9), new THREE.MeshPhysicalMaterial({
    color: 0xe4b3f0, roughness: 0.35, transparent: true, opacity: 0.5, clearcoat: 0.6, depthWrite: false, sheen: 0.8, sheenColor: new THREE.Color(0xffd6ff),
  }));
  mk.add(mkBody);
  const lobeMat = new THREE.MeshStandardMaterial({ color: 0x6d3fa8, roughness: 0.45 });
  [[0, 0, 0, 0.42], [0.42, 0.18, 0.1, 0.34], [-0.38, 0.12, 0.05, 0.33], [0.1, -0.36, 0.12, 0.3], [-0.1, 0.4, -0.15, 0.3], [0.32, -0.2, -0.3, 0.27]].forEach(([x, y, z, r], i) => {
    const l = new THREE.Mesh(blobGeometry(r, 3, 0.1, 2, i + 2), lobeMat);
    l.position.set(x, y, z);
    mk.add(l);
  });
  // proplatelet processes reaching through the sinusoid wall into the lumen
  const proMat = new THREE.MeshPhysicalMaterial({ color: 0xe1b6f2, roughness: 0.35, clearcoat: 0.6 });
  const tips = [];
  [[-0.45, 0.25], [0.15, -0.2], [0.6, 0.35]].forEach(([dx, dz], i) => {
    const pts = [
      new THREE.Vector3(dx * 0.6, 0.85, dz * 0.6),
      new THREE.Vector3(dx, 1.35, dz),
      new THREE.Vector3(dx + 0.35, 1.85, dz * 0.8),
      new THREE.Vector3(dx + 0.95, 2.15 + i * 0.08, dz * 0.6),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    mk.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.055, 10), proMat));
    for (let b = 1; b <= 4; b++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), proMat);
      bead.position.copy(curve.getPoint(0.4 + b * 0.15));
      mk.add(bead);
    }
    tips.push(pts[3].clone().add(mk.position));
  });
  // platelets: released at the tips, carried downstream
  const pltGeo = new THREE.SphereGeometry(0.1, 14, 10);
  const pltMat = new THREE.MeshPhysicalMaterial({ color: 0xe7b8ff, roughness: 0.3, clearcoat: 0.8 });
  const PN = 26;
  const plt = new THREE.InstancedMesh(pltGeo, pltMat, PN);
  plt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(plt);
  const plts = Array.from({ length: PN }, (_, i) => ({ tip: i % 3, age: (i / PN) * 9, v: 1.1 + rand() * 0.6, dy: (rand() - 0.5) * 0.9, dz: (rand() - 0.5) * 0.9, rot: rand() * 6 }));

  // ------------------------------------------------------------ adipocytes
  const fatMat = new THREE.MeshPhysicalMaterial({
    color: 0xffe9a8, emissive: 0x3a2800, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const fatNuc = new THREE.MeshStandardMaterial({ color: 0xa88a3a, roughness: 0.6 });
  const adipos = [[-3.7, 1.15, -2.4, 1.25], [6.6, -1.0, -1.4, 1.45], [2.6, -1.55, -2.9, 1.15]].map(([x, y, z, r]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), fatMat));
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), fatNuc);
    n.position.set(r * 0.62, r * 0.55, r * 0.5);
    n.scale.set(1.4, 0.5, 1);
    g.add(n);
    world.add(g);
    return g;
  });

  // ------------------------------------------------------------ plasma cells
  const pcMat = new THREE.MeshPhysicalMaterial({ color: 0x8f88e6, roughness: 0.4, clearcoat: 0.4 });
  const pcNuc = new THREE.MeshStandardMaterial({ color: 0x35246f, roughness: 0.5 });
  const plasma = [[-2.6, -1.55, 0.9], [2.6, 0.95, 1.0]].map(([x, y, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), pcMat);
    body.scale.set(1.3, 1, 1);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), pcNuc);
    n.position.set(0.24, 0.02, 0.18);
    g.add(body, n);
    g.rotation.z = i ? 0.6 : -0.4;
    world.add(g);
    return g;
  });

  // free macrophage + assorted developing blood cells
  const mac2 = new THREE.Mesh(blobGeometry(0.62, 4, 0.18, 2.6, 11), macMat);
  mac2.position.set(-3.9, -0.6, 0.4);
  world.add(mac2);
  const devMat = new THREE.MeshPhysicalMaterial({ color: 0xb9b0e6, roughness: 0.4, clearcoat: 0.3, transparent: true, opacity: 0.55, depthWrite: false });
  const devNuc = new THREE.MeshStandardMaterial({ color: 0x7563c4, roughness: 0.5 });
  const avoid = [[0, -0.25, 0, 2.2], [4.3, 1.45, 0, 1.6], [-3.7, 1.15, -2.4, 1.5], [6.6, -1, -1.4, 1.7], [2.6, -1.55, -2.9, 1.4], [-3.9, -0.6, 0.4, 0.9], [-2.6, -1.55, 0.9, 0.7], [2.6, 0.95, 1, 0.7]];
  let placed = 0, tries = 0;
  while (placed < 16 && tries++ < 600) {
    const p = new THREE.Vector3(-5 + rand() * 13, -2.1 + rand() * 4.0, -1.8 + rand() * 2.8);
    if (avoid.some(([x, y, z, r]) => p.distanceTo(new THREE.Vector3(x, y, z)) < r + 0.3)) continue;
    const r = 0.24 + rand() * 0.1;
    const g = new THREE.Group();
    g.position.copy(p);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), devMat));
    const n = new THREE.Mesh(new THREE.SphereGeometry(r * 0.68, 14, 10), devNuc);
    n.position.set(r * 0.12, r * 0.05, r * 0.1);
    g.children[0].renderOrder = 2;
    g.add(n);
    world.add(g);
    avoid.push([p.x, p.y, p.z, r + 0.15]);
    placed++;
  }

  // -------------------------------------------- diapedesis: cell enters blood
  const exitMat = rbcMaterial({ pallor: 0.34 });
  exitMat.transparent = true;
  const exitCell = new THREE.Mesh(rbcGeometry(32, 48), exitMat);
  exitCell.scale.setScalar(0.34);
  world.add(exitCell);
  const exitPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.2, -1.15, 0.6),
    new THREE.Vector3(1.45, -1.8, 0.55),
    new THREE.Vector3(1.6, -2.42, 0.5),
    new THREE.Vector3(1.9, -3.1, 0.3),
    new THREE.Vector3(3.2, -3.5, 0.1),
    new THREE.Vector3(7.5, -3.55, 0.0),
  ]);
  const exitAnchor = new THREE.Object3D();
  world.add(exitAnchor);

  // ----------------------------------------------------------------- labels
  const L = new Labels(layer, camera, k.size, world);
  const lab = {
    sinA: L.add('Vascular sinusoid', new THREE.Vector3(-1.2, SIN_Y[0] + SIN_R, 0.2), { color: 'var(--pink)' }),
    sinB: L.add('Vascular sinusoid', new THREE.Vector3(4.6, SIN_Y[1] + SIN_R, 0.2), { color: 'var(--pink)' }),
    cord: L.add('Marrow cord', new THREE.Vector3(-1.8, 1.55, 0.4), { color: 'var(--teal)' }),
    ret: L.add('Reticular fibres · type III collagen', new THREE.Vector3(-3.2, -1.95, 0.5), { color: 'var(--teal)', side: 'down' }),
    fat: L.add('Adipocyte', new THREE.Vector3(6.6, 0.5, -1.4), { color: 'var(--gold)' }),
    pc: L.add('Plasma cell', plasma[1], { color: 'var(--indigo)', offset: [0, 0.4, 0] }),
    mac: L.add('Central macrophage', island, { color: '#d9a3c9', offset: [0, 0.2, 0.9] }),
    blast: L.add('Erythroblasts', blasts[3], { color: 'var(--red)', offset: [0, 0.35, 0] }),
    mk: L.add('Megakaryocyte', mk, { color: 'var(--purple)', offset: [0.7, -0.9, 0.9], side: 'down' }),
    plt: L.add('Platelets → circulation', new THREE.Vector3(5.6, SIN_Y[0] + 0.25, 0.4), { color: 'var(--purple)' }),
    exit: L.add('Crossing the sinusoid wall', exitAnchor, { color: 'var(--red)', offset: [0, 0.35, 0] }),
  };
  const STEP_LABELS = [
    [],
    ['sinA', 'sinB'],
    ['cord', 'ret', 'fat', 'pc'],
    ['mac', 'blast'],
    ['mk', 'plt'],
    ['exit'],
  ];
  const VIEWS = [
    { cam: [0, 0.4, 17.5], tgt: [0.8, -0.1, 0] },
    { cam: [0.6, 0.8, 16.5], tgt: [1.0, 0, 0] },
    { cam: [0, 0.3, 14.2], tgt: [0.6, -0.1, 0] },
    { cam: [0.2, 0.3, 8.6], tgt: [0.1, -0.25, 0] },
    { cam: [4.3, 2.4, 9.0], tgt: [4.3, 2.0, 0] },
    { cam: [2.2, -1.9, 9.6], tgt: [2.2, -2.5, 0] },
  ];
  const camPos = new THREE.Vector3(...VIEWS[0].cam);
  const camTgt = new THREE.Vector3(...VIEWS[0].tgt);
  const wantPos = camPos.clone(), wantTgt = camTgt.clone();
  let step = 0;
  function setStep(s) {
    step = s;
    const v = VIEWS[Math.min(s, VIEWS.length - 1)];
    wantPos.set(...v.cam);
    wantTgt.set(...v.tgt);
    const on = new Set(STEP_LABELS[s] || []);
    Object.entries(lab).forEach(([key, it]) => L.show(it, on.has(key)));
  }

  const drag = new DragRotate(k.renderer.domElement, { yaw: [-0.55, 0.55], pitch: [-0.25, 0.3], sway: 0.12 });

  // ------------------------------------------------------------------ frame
  const m4 = new THREE.Matrix4(), dq = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  let time = 0;
  let exitT = 0;
  function frame(t, dt) {
    time += dt;
    drag.update(time, dt);
    world.rotation.y = drag.yaw;
    world.rotation.x = drag.pitch * 0.6;

    const a = 1 - Math.exp(-2.4 * dt);
    camPos.lerp(wantPos, a);
    camTgt.lerp(wantTgt, a);
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    // flowing cells
    for (let i = 0; i < flowCells.length; i++) {
      const c = flowCells[i];
      c.x += c.v * dt;
      if (c.x > 15) c.x = -15;
      dq.setFromAxisAngle(c.axis, c.spin * dt);
      c.q.multiply(dq);
      pv.set(c.x, SIN_Y[c.s] + c.y, c.z);
      sv.setScalar(0.34);
      m4.compose(pv, c.q, sv);
      flow.setMatrixAt(i, m4);
    }
    flow.instanceMatrix.needsUpdate = true;

    // platelets
    for (let i = 0; i < PN; i++) {
      const p = plts[i];
      p.age += dt;
      const life = 9;
      if (p.age > life) p.age -= life;
      const tip = tips[p.tip];
      const u = p.age;
      const x = tip.x + 0.2 + u * p.v;
      const settle = Math.min(1, u / 2.5);
      const y = tip.y + (SIN_Y[0] - tip.y) * settle * 0.6 + p.dy * settle * 0.7;
      const z = tip.z + p.dz * settle * 0.8;
      pv.set(x, y, z);
      dq.setFromEuler(new THREE.Euler(p.rot + u, p.rot * 0.5, 0));
      const s = Math.min(1, u * 3) * (x > 9 ? Math.max(0, 1 - (x - 9) / 2) : 1);
      sv.set(1.1 * s, 0.45 * s, 1.1 * s);
      m4.compose(pv, dq, sv);
      plt.setMatrixAt(i, m4);
    }
    plt.instanceMatrix.needsUpdate = true;

    // island breathing
    blasts.forEach((b) => {
      const d = b.userData;
      b.position.copy(d.base).multiplyScalar(1 + Math.sin(time * 0.8 + d.ph) * 0.025);
      b.rotation.y = time * 0.2 + d.ph;
    });
    macro.rotation.y = Math.sin(time * 0.3) * 0.2;
    mk.rotation.y = Math.sin(time * 0.25) * 0.08;
    adipos.forEach((g, i) => { g.position.y += Math.sin(time * 0.4 + i) * 0.0008; });
    plasma.forEach((g, i) => { g.rotation.y = time * 0.15 + i; });

    // diapedesis loop (6 s)
    exitT = (exitT + dt / 6.5) % 1;
    const u = exitT;
    exitCurve(u);
    k.render();
    L.update();
  }
  const tmp = new THREE.Vector3();
  function exitCurve(u) {
    exitPath.getPoint(u, tmp);
    exitCell.position.copy(tmp);
    exitAnchor.position.copy(tmp);
    // squeeze while crossing the wall (y ≈ -2.4)
    const wall = SIN_Y[1] + SIN_R;
    const d = Math.abs(tmp.y - wall);
    const sq = Math.max(0, 1 - d / 0.45);
    exitCell.scale.set(0.34 * (1 + sq * 0.45), 0.34 * (1 - sq * 0.55), 0.34 * (1 - sq * 0.15));
    exitCell.rotation.set(0.3, time * 0.4, Math.PI / 2 - 0.4 + sq * 0.3);
    const fade = u < 0.06 ? u / 0.06 : u > 0.9 ? (1 - u) / 0.1 : 1;
    exitMat.opacity = fade;
  }

  setStep(0);
  return {
    resize(s) { k.resize(s); },
    enter(s) { setStep(s); },
    step(s) { setStep(s); },
    frame,
  };
}
