// Title / closing scene: a slow stream of biconcave red cells in depth.
import { THREE, makeStage, rbcGeometry, rbcMaterial } from '../lib/three-kit.js';
import { rng, css } from '../lib/dom.js';

export default function hero(slide, api) {
  const host = slide.querySelector('.viz3d');
  const k = makeStage(host, { fov: 30, exposure: 1.05 });
  const { scene, camera } = k;
  camera.position.set(0, 0, 24);

  scene.add(new THREE.HemisphereLight(0xffe4ea, 0x1a0006, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(6, 9, 12);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3355, 3.2);
  rim.position.set(-10, -3, -8);
  scene.add(rim);

  const fog = new THREE.Fog(0x000000, 20, 70);
  scene.fog = fog;
  const setFog = () => { fog.color.set(css('--bg') || '#000'); };
  setFog();
  window.addEventListener('themechange', setFog);

  // ---- the stream --------------------------------------------------------
  const geo = rbcGeometry(36, 56);
  const mat = rbcMaterial({ pallor: 0.34 });
  const N = 210;
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const rand = rng(42);
  const cells = [];
  const color = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const c = {
      p: new THREE.Vector3((rand() - 0.5) * 60, (rand() - 0.5) * 22, -48 + rand() * 56),
      v: 0.9 + rand() * 1.1,
      axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      spin: (rand() - 0.5) * 0.9,
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28)),
      s: 0.62 + rand() * 0.22,
      ph: rand() * 6.28,
    };
    cells.push(c);
    const b = 0.72 + rand() * 0.28;
    color.setRGB(b, b * (0.92 + rand() * 0.08), b * (0.92 + rand() * 0.08));
    mesh.setColorAt(i, color);
  }

  // ---- one hero cell, close and slow -------------------------------------
  const heroMat = rbcMaterial({ pallor: 0.34 });
  const heroCell = new THREE.Mesh(rbcGeometry(64, 128), heroMat);
  heroCell.scale.setScalar(2.6);
  heroCell.position.set(7.4, 0.5, 3);
  scene.add(heroCell);

  const m4 = new THREE.Matrix4();
  const dq = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let t0 = 0;
  function frame(t, dt) {
    t0 += dt;
    for (let i = 0; i < N; i++) {
      const c = cells[i];
      c.p.x += c.v * dt;
      c.p.y += Math.sin(t0 * 0.35 + c.ph) * dt * 0.25;
      if (c.p.x > 32) c.p.x = -32;
      dq.setFromAxisAngle(c.axis, c.spin * dt);
      c.q.multiply(dq);
      sc.setScalar(c.s);
      m4.compose(c.p, c.q, sc);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;

    heroCell.rotation.x = 0.9 + Math.sin(t0 * 0.25) * 0.35;
    heroCell.rotation.z = Math.cos(t0 * 0.2) * 0.25;
    heroCell.rotation.y += dt * 0.12;
    heroCell.position.y = 0.5 + Math.sin(t0 * 0.5) * 0.25;

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camera.position.x = pointer.x * 1.6;
    camera.position.y = -pointer.y * 1.0;
    camera.lookAt(0, 0, -6);
    k.render();
  }

  return {
    resize(s) { k.resize(s); },
    enter() {},
    frame,
  };
}
