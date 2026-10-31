/**
 * دکور و بازیگرها — همه با primitiveهای ساده‌ی Three.js ساخته شده‌اند (بدون فایل مدل).
 * واحدها «متر» هستند تا محاسبات لنز و فاصله با دنیای واقعی یکی باشد.
 *
 * آناتومی بازیگر (ارتفاع از زمین):
 *   فرق سر 1.75 · چشم 1.65 · چانه 1.52 · شانه 1.42 · سینه 1.25 · کمر 1.0 · لگن 0.85 · زانو 0.45
 */
import * as THREE from 'three';

export const ANATOMY = {
  top: 1.75, eyes: 1.65, chin: 1.52, shoulders: 1.42, chest: 1.25,
  waist: 1.0, hips: 0.85, thigh: 0.62, knees: 0.45, feet: 0,
};

export const COLORS = { amber: 0xe0a458, teal: 0x4fb3bf, violet: 0x9b7ede, red: 0xe5534b };

export function createActor({ color = COLORS.amber, skin = 0xf0c8a0, hair = 0x2a1c14 } = {}) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.4 });
  const hairM = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.8 });
  const shoeM = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.7 });

  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // پاها (pivot در لگن تا بتوانند در راه رفتن تاب بخورند)
  const legs = [-0.1, 0.1].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, ANATOMY.hips, 0);
    pivot.add(mesh(new THREE.CapsuleGeometry(0.085, 0.62, 4, 12), dark, 0, -0.41, 0));
    pivot.add(mesh(new THREE.BoxGeometry(0.13, 0.07, 0.24), shoeM, 0, -0.82, 0.05));
    g.add(pivot);
    return pivot;
  });

  const torso = mesh(new THREE.CapsuleGeometry(0.19, 0.26, 6, 16), cloth, 0, 1.13, 0);
  torso.scale.set(1, 1, 0.68);
  g.add(torso);

  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.255, 1.38, 0);
    pivot.rotation.z = side * 0.09;
    pivot.add(mesh(new THREE.CapsuleGeometry(0.055, 0.5, 4, 10), cloth, 0, -0.3, 0));
    pivot.add(mesh(new THREE.SphereGeometry(0.06, 12, 10), skinM, 0, -0.6, 0));
    g.add(pivot);
    return pivot;
  });

  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12), skinM, 0, 1.49, 0));

  const head = new THREE.Group();
  head.position.set(0, 1.63, 0);
  head.add(mesh(new THREE.SphereGeometry(0.12, 32, 24), skinM));
  const hairCap = mesh(new THREE.SphereGeometry(0.125, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, 0, 0.01, -0.01);
  hairCap.rotation.x = -0.25;
  head.add(hairCap);
  [-0.042, 0.042].forEach((x) => head.add(mesh(new THREE.SphereGeometry(0.016, 12, 8), dark, x, 0.02, 0.108)));
  const nose = mesh(new THREE.ConeGeometry(0.018, 0.05, 10), skinM, 0, -0.01, 0.125);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  g.add(head);

  g.userData = { legs, arms, head, torso, walkPhase: 0, baseY: 0 };
  return g;
}

/** انیمیشن راه رفتن ساده: amount بین 0 (ایستاده) تا 1 (راه رفتن کامل) */
export function animateWalk(actor, dt, amount = 1, speed = 7) {
  const u = actor.userData;
  u.walkPhase += dt * speed * amount;
  const s = Math.sin(u.walkPhase) * 0.55 * amount;
  u.legs[0].rotation.x = s;
  u.legs[1].rotation.x = -s;
  u.arms[0].rotation.x = -s * 0.8;
  u.arms[1].rotation.x = s * 0.8;
  actor.position.y = u.baseY + Math.abs(Math.cos(u.walkPhase)) * 0.035 * amount;
}

/** نفس کشیدن و حرکت جزئی سر وقتی بازیگر ایستاده */
export function animateIdle(actor, time, seed = 0) {
  const u = actor.userData;
  u.torso.scale.y = 1 + Math.sin(time * 1.6 + seed) * 0.012;
  u.head.rotation.y = Math.sin(time * 0.45 + seed) * 0.12;
  u.head.rotation.x = Math.sin(time * 0.3 + seed * 2) * 0.04;
}

/** دکور: کف، نورها، ستون‌ها (برای دیدن عمق و فشردگی لنز) و چراغ‌های دور (برای بوکه) */
export function createSet(scene, { pillars = true, scatter = true, orbs = true, fog = [30, 140] } = {}) {
  const bg = new THREE.Color(0x0b0d12);
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, fog[0], fog[1]);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, 0x2c313c, 0x1f232b);
  grid.position.y = 0.002;
  scene.add(grid);

  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x20160e, 0.75));

  const key = new THREE.DirectionalLight(0xffe2bd, 2.4);
  key.position.set(5, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.4);
  rim.position.set(-6, 5, -8);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  if (pillars) {
    const geo = new THREE.BoxGeometry(0.5, 4, 0.5);
    const capGeo = new THREE.BoxGeometry(0.56, 0.12, 0.56);
    const matA = new THREE.MeshStandardMaterial({ color: 0x3a4152, roughness: 0.8 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x4b3f3a, roughness: 0.8 });
    const capM = new THREE.MeshStandardMaterial({ color: 0xffb35c, emissive: 0xff9a3c, emissiveIntensity: 1.4 });
    for (let i = 0; i < 16; i++) {
      for (const x of [-3.5, 3.5]) {
        const z = -4 - i * 4;
        const p = new THREE.Mesh(geo, i % 2 ? matA : matB);
        p.position.set(x, 2, z);
        p.castShadow = true; p.receiveShadow = true;
        const cap = new THREE.Mesh(capGeo, capM);
        cap.position.set(x, 4.06, z);
        group.add(p, cap);
      }
    }
  }

  if (scatter) {
    // «شهر» دوردست با بلوک‌های تصادفی (seeded تا همیشه یکسان باشد)
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const mat = new THREE.MeshStandardMaterial({ color: 0x252a35, roughness: 0.9 });
    const winM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x7fb8ff, emissiveIntensity: 0.9 });
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 22 + rnd() * 50;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 6 && z > -70 && z < 10) continue; // راهروی ستون‌ها خالی بماند
      const h = 2 + rnd() * 14;
      const w = 2 + rnd() * 4;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      group.add(b);
      if (rnd() > 0.55) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, 0.25, w * 1.01), winM);
        win.position.set(x, h * (0.4 + rnd() * 0.5), z);
        group.add(win);
      }
    }
  }

  if (orbs) {
    const colors = [0xff7a59, 0xffd166, 0x6fd3ff, 0xc792ea, 0x7cf29a];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 16, 12),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
      );
      const z = -8 - (i % 13) * 3.2;
      m.position.set((i < 13 ? -1 : 1) * (1.2 + (i % 3) * 0.5), 1.2 + ((i * 7) % 5) * 0.45, z);
      group.add(m);
    }
  }

  return { floor, grid, key, rim, props: group };
}

/** چهارچوب در (برای «کادر در کادر») */
export function createDoorFrame() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x2e2622, roughness: 0.8 });
  const wallM = new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: 1 });
  const add = (w, h, d, x, y) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, 0); b.castShadow = true; g.add(b);
  };
  add(0.18, 2.6, 0.25, -0.95, 1.3);
  add(0.18, 2.6, 0.25, 0.95, 1.3);
  add(2.08, 0.18, 0.25, 0, 2.6);
  // دیوار اطراف در
  for (const x of [-3.05, 3.05]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.2), wallM);
    w.position.set(x, 2, -0.02); g.add(w);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 0.2), wallM);
  top.position.set(0, 3.35, -0.02); g.add(top);
  return g;
}
