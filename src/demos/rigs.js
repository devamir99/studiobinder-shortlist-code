import * as THREE from 'three';
import { Stage, fbm } from '../lib/stage.js';
import { createSet, createActor, animateWalk, COLORS } from '../lib/set.js';
import { shell, buttonGroup, slider, setInfo } from '../lib/ui.js';

const damp = THREE.MathUtils.damp;

/**
 * هر «ریگ» یک تابع است که هر فریم، با دانستن موقعیت بازیگر، وضعیت دوربین را آپدیت می‌کند.
 * تفاوت ریگ‌ها در دنیای کد = تفاوت در «قید» (constraint) و «میرایی» (damping) و «نویز».
 */
const RIGS = [
  { id: 'tripod', label: 'Tripod', fa: 'سه‌پایه',
    text: 'دوربین در جای خود ثابت است و فقط می‌چرخد (Pan/Tilt). تصویر پایدار، رسمی و «ناظر».',
    use: 'OrbitControls با enablePan=false، کیوسک و ویترین محصول، نماهای خبری.',
    code: `// موقعیت ثابت؛ فقط هدف (نگاه) با تاخیر نرم دنبال سوژه می‌رود
cam.tx = THREE.MathUtils.damp(cam.tx, actor.position.x, 3, dt);
camera.position.set(0, 1.5, 7);
camera.lookAt(cam.tx, 1.4, actor.position.z);` },
  { id: 'handheld', label: 'Handheld', fa: 'روی دست',
    text: 'لرزش ارگانیک و تنفس اپراتور. حس مستند، فوریت، هرج‌ومرج و «حضور» در صحنه.',
    use: 'سین‌های اکشن، حالت اضطراب، ترسناک، ویدیوهای UGC-style. با نویز fbm (نه Math.random!).',
    code: `// نویز نرم (Perlin/Simplex/fbm) — Math.random لرزش «پرشی» و غیرطبیعی می‌سازد
const t = clock.elapsedTime;
camera.position.x += fbm(t * 1.3) * 0.04;
camera.position.y += fbm(t * 1.1 + 10) * 0.03;
camera.rotation.z += fbm(t * 0.8 + 20) * THREE.MathUtils.degToRad(1.2);` },
  { id: 'steadicam', label: 'Steadicam', fa: 'استدی‌کم',
    text: 'دوربین روی بازوی فنری و جلیقه؛ همراه بازیگر راه می‌رود ولی بدون لرزش. حرکت شناور و رؤیاگونه (The Shining).',
    use: 'تعقیب کاراکتر در بازی سوم‌شخص، تور مجازی پیوسته، اسکرول‌های طولانی. یعنی damping کم (فنر نرم).',
    code: `// دنبال کردن با فنر نرم: lambda کم = تاخیر بیشتر و حرکت شناورتر
const desired = actor.position.clone().add(behindOffset);
cam.x = THREE.MathUtils.damp(cam.x, desired.x, 1.6, dt);
cam.z = THREE.MathUtils.damp(cam.z, desired.z, 1.6, dt);` },
  { id: 'gimbal', label: 'Gimbal', fa: 'گیمبال',
    text: 'تثبیت‌کننده‌ی موتوری سه‌محوره. افق همیشه صاف است و حرکت دقیق‌تر و سریع‌تر از استدی‌کم دنبال می‌کند.',
    use: 'دوربین تعقیب سریع، follow cam با «قفل افق»: هر لرزش، فقط در position نه rotation.',
    code: `// damping سریع‌تر + roll همیشه صفر (افق قفل)
cam.x = THREE.MathUtils.damp(cam.x, desired.x, 4.5, dt);
camera.lookAt(head);
camera.rotation.z = 0;` },
  { id: 'dolly', label: 'Dolly / Track', fa: 'دالی روی ریل',
    text: 'دوربین روی ریل و چرخ حرکت می‌کند: فقط در یک مسیر مشخص. حرکت کاملاً نرم و کنترل‌شده.',
    use: 'گالری افقی، اسکرول افقی سه‌بعدی، Camera-on-rails با CatmullRomCurve3 و پارامتر t.',
    code: `// دوربین مقید به یک مسیر (curve) و فقط پارامتر u تغییر می‌کند
const track = new THREE.CatmullRomCurve3(points);
u = THREE.MathUtils.damp(u, targetU, 2, dt);
camera.position.copy(track.getPointAt(u));` },
  { id: 'slider', label: 'Slider', fa: 'اسلایدر',
    text: 'ریل کوچک (۶۰ تا ۱۲۰ سانتی‌متر). حرکت آرام و کوتاه که به نمای ثابت «زندگی» و پارالاکس می‌دهد.',
    use: 'هیروی سایت با پارالاکس ملایم ماوس، B-roll محصول.',
    code: `// حرکت کوتاه و آرام رفت‌وبرگشتی؛ یا متصل به موقعیت ماوس
cam.x = Math.sin(t * 0.3) * 0.6;            // ±60cm
// cam.x = THREE.MathUtils.damp(cam.x, mouse.x * 0.6, 2, dt);` },
  { id: 'crane', label: 'Crane / Jib', fa: 'کرین / جیب',
    text: 'دوربین روی بازوی بلند؛ ارتفاع را در یک کمان تغییر می‌دهد. شروع یا پایان باشکوه صحنه.',
    use: 'Reveal ابتدای صفحه، خروج از صحنه در پایان اسکرول، حرکت عمودی روی ساختمان.',
    code: `// نقطه‌ی انتهای یک بازو حول پیوت (مختصات قطبی)
const a = 0.4 + Math.sin(t * 0.3) * 0.6;
camera.position.set(pivot.x, pivot.y + Math.sin(a) * L, pivot.z - (1 - Math.cos(a)) * L);` },
  { id: 'drone', label: 'Drone', fa: 'پهپاد',
    text: 'نمای هوایی متحرک: اوربیت، دنبال کردن از بالا، ریویل منظره. حس عظمت و آزادی.',
    use: 'اینتروی نقشه/شهر، اوربیت دور محصول، ترنزیشن بین مکان‌ها.',
    code: `// اوربیت بالا و دور: مختصات کروی
const ang = t * 0.12;
camera.position.set(actor.x + Math.cos(ang) * 12, 9, actor.z + Math.sin(ang) * 12);
camera.lookAt(actor.position);` },
  { id: 'snorri', label: 'Snorricam', fa: 'اسنوری‌کم (روی بدن)',
    text: 'دوربین به بدن بازیگر بسته شده و رو به صورت اوست؛ بازیگر ثابت در کادر و دنیا دور او می‌لرزد. حس مستی، پارانویا، گیجی (Requiem for a Dream).',
    use: 'دوربین child آبجکت کاراکتر: <code>actor.add(camera)</code> — نمای «گیر افتاده».',
    code: `// دوربین فرزند بازیگر است ⇒ با او حرکت و دوران می‌کند
actor.add(camera);
camera.position.set(0, 1.65, 0.7);   // جلوی صورت
camera.lookAt(actor.localToWorld(new THREE.Vector3(0, 1.62, 0)));` },
];

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 28, inset: true });
  const { scene } = stage;
  createSet(scene);

  const actor = createActor({ color: COLORS.amber });
  scene.add(actor);

  // ریل دالی
  const rails = new THREE.Group();
  const railM = new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: 0.8, roughness: 0.3 });
  for (const dz of [-0.25, 0.25]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(13, 0.04, 0.04), railM);
    r.position.set(0, 0.04, 3.6 + dz); rails.add(r);
  }
  for (let x = -6.4; x <= 6.4; x += 0.6) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.7), new THREE.MeshStandardMaterial({ color: 0x4b3a2c }));
    s.position.set(x, 0.015, 3.6); rails.add(s);
  }
  rails.visible = false;
  scene.add(rails);

  let rig = RIGS[0];
  let speed = 1;
  let walkT = 0;
  let yaw = Math.PI / 2;
  const c = stage.cam;
  const head = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  stage.onTick((dt, t) => {
    // بازیگر روی خط x رفت‌وبرگشت راه می‌رود
    walkT += dt * 0.28 * speed;
    const prevX = actor.position.x;
    actor.position.x = Math.sin(walkT) * 5;
    const vx = (actor.position.x - prevX) / Math.max(dt, 1e-4);
    const targetYaw = vx >= 0 ? Math.PI / 2 : -Math.PI / 2;
    yaw = damp(yaw, targetYaw, 6, dt);
    actor.rotation.y = yaw;
    animateWalk(actor, dt, THREE.MathUtils.clamp(Math.abs(vx) / 1.2, 0, 1), 7 * speed);
    head.set(actor.position.x, 1.6, actor.position.z);

    const s = stage.shake;
    s.x = s.y = s.z = s.rx = s.ry = s.rz = 0;
    const fwd = tmp.set(Math.sin(yaw), 0, Math.cos(yaw));

    switch (rig.id) {
      case 'tripod':
        c.x = damp(c.x, 0, 4, dt); c.y = damp(c.y, 1.5, 4, dt); c.z = damp(c.z, 7, 4, dt);
        c.tx = damp(c.tx, head.x, 3, dt); c.ty = damp(c.ty, 1.4, 3, dt); c.tz = damp(c.tz, 0, 3, dt);
        break;
      case 'handheld':
        c.x = damp(c.x, head.x + 0.7, 3.5, dt); c.y = damp(c.y, 1.6, 3, dt); c.z = damp(c.z, 2.3, 3, dt);
        c.tx = damp(c.tx, head.x, 5, dt); c.ty = damp(c.ty, 1.45, 5, dt); c.tz = damp(c.tz, 0, 5, dt);
        s.x = fbm(t * 1.3) * 0.045; s.y = fbm(t * 1.1 + 10) * 0.035 + Math.sin(t * 9 * speed) * 0.006;
        s.rx = fbm(t * 0.9 + 3) * 0.02; s.ry = fbm(t * 0.7 + 7) * 0.02; s.rz = fbm(t * 0.8 + 20) * 0.025;
        break;
      case 'steadicam': {
        const dx = head.x - fwd.x * 2.6, dz = head.z - fwd.z * 2.6 + 0.6;
        c.x = damp(c.x, dx, 1.6, dt); c.y = damp(c.y, 1.75, 1.6, dt); c.z = damp(c.z, dz, 1.6, dt);
        c.tx = damp(c.tx, head.x + fwd.x * 1.5, 2, dt); c.ty = damp(c.ty, 1.35, 2, dt); c.tz = damp(c.tz, head.z, 2, dt);
        s.y = Math.sin(t * 1.4) * 0.012; s.rz = Math.sin(t * 0.7) * 0.004;
        break;
      }
      case 'gimbal': {
        const dx = head.x + fwd.x * 1.8 + 0.6, dz = head.z + 1.4;
        c.x = damp(c.x, dx, 4.5, dt); c.y = damp(c.y, 1.15, 4.5, dt); c.z = damp(c.z, dz, 4.5, dt);
        c.tx = damp(c.tx, head.x, 6, dt); c.ty = damp(c.ty, 1.4, 6, dt); c.tz = damp(c.tz, head.z, 6, dt);
        s.y = Math.sin(t * 9 * speed) * 0.01; // فقط بالا-پایین ریز قدم‌ها؛ چرخش صفر
        break;
      }
      case 'dolly':
        c.x = damp(c.x, THREE.MathUtils.clamp(head.x, -6, 6), 2, dt); c.y = damp(c.y, 1.4, 3, dt); c.z = damp(c.z, 3.6, 3, dt);
        c.tx = damp(c.tx, head.x, 3, dt); c.ty = damp(c.ty, 1.2, 3, dt); c.tz = damp(c.tz, 0, 3, dt);
        break;
      case 'slider':
        c.x = damp(c.x, Math.sin(t * 0.3) * 0.6, 3, dt); c.y = damp(c.y, 1.3, 3, dt); c.z = damp(c.z, 4.2, 3, dt);
        c.tx = damp(c.tx, head.x * 0.5, 1.5, dt); c.ty = damp(c.ty, 1.2, 3, dt); c.tz = damp(c.tz, 0, 3, dt);
        break;
      case 'crane': {
        const L = 4.5, a = 0.45 + Math.sin(t * 0.3) * 0.65;
        c.x = damp(c.x, head.x * 0.3, 2, dt);
        c.y = damp(c.y, 1.2 + Math.sin(a) * L, 3, dt);
        c.z = damp(c.z, 7.5 - (1 - Math.cos(a)) * L, 3, dt);
        c.tx = damp(c.tx, head.x, 3, dt); c.ty = damp(c.ty, 1.2, 3, dt); c.tz = damp(c.tz, 0, 3, dt);
        break;
      }
      case 'drone': {
        const ang = t * 0.12;
        c.x = damp(c.x, head.x + Math.cos(ang) * 12, 1.5, dt);
        c.y = damp(c.y, 9, 1.5, dt);
        c.z = damp(c.z, Math.sin(ang) * 12, 1.5, dt);
        c.tx = damp(c.tx, head.x, 2.5, dt); c.ty = damp(c.ty, 0.8, 2.5, dt); c.tz = damp(c.tz, 0, 2.5, dt);
        break;
      }
      case 'snorri': {
        actor.updateMatrixWorld();
        const p = actor.localToWorld(new THREE.Vector3(0, 1.66 + Math.cos(actor.userData.walkPhase) * 0.01, 0.75));
        const q = actor.localToWorld(new THREE.Vector3(0, 1.6, 0));
        Object.assign(c, { x: p.x, y: p.y, z: p.z, tx: q.x, ty: q.y, tz: q.z });
        s.rz = Math.sin(actor.userData.walkPhase) * 0.02;
        break;
      }
    }
    c.roll = 0;
  });

  function show(r) {
    rig = r;
    group.select(r.id);
    rails.visible = r.id === 'dolly';
    stage.setHUD(`<span class="hud-tag">${r.label}</span><span>${r.fa}</span>`);
    setInfo(info, { fa: r.fa, en: r.label, text: r.text, use: r.use, code: r.code });
  }

  const group = buttonGroup(controls, RIGS, show, { label: 'ریگ / تجهیزات' });
  slider(controls, { label: 'سرعت بازیگر', min: 0.2, max: 2, step: 0.1, value: 1, format: (v) => `×${(+v).toFixed(1)}`, onInput: (v) => (speed = v) });

  stage.cutTo({ x: 0, y: 1.5, z: 7, tx: 0, ty: 1.4, tz: 0, focal: 28 });
  show(RIGS[0]);
}
