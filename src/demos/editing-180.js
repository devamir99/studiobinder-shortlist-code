import * as THREE from 'three';
import gsap from 'gsap';
import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, COLORS } from '../lib/set.js';
import { shell, buttonGroup, slider, setInfo } from '../lib/ui.js';

const PI = Math.PI;

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 35, inset: true });
  const { scene, camera } = stage;
  createSet(scene, { orbs: false });
  stage.insetOffset.set(0.5, 9, 3); // نمای کارگردان تقریباً از بالا

  const A = createActor({ color: COLORS.amber });
  A.position.set(-0.8, 0, 0); A.rotation.y = PI / 2;
  const B = createActor({ color: COLORS.teal, hair: 0x6b4a2b });
  B.position.set(0.8, 0, 0); B.rotation.y = -PI / 2;
  scene.add(A, B);

  // محور ۱۸۰ درجه (خط فرضی بین دو بازیگر) + نیم‌دایره‌ی مجاز/غیرمجاز
  const axis = new THREE.Mesh(new THREE.BoxGeometry(14, 0.01, 0.04), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
  axis.position.y = 0.012;
  const half = (color, start) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(5, 48, start, PI),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false }));
    m.rotation.x = -PI / 2; m.position.y = 0.008; return m;
  };
  scene.add(axis, half(0x3ddc84, PI), half(0xff3b3b, 0));

  let speaker = null;
  stage.onTick((dt, t) => {
    animateIdle(A, t, 0); animateIdle(B, t, 2);
    if (speaker) speaker.userData.head.rotation.x = Math.sin(t * 9) * 0.05;
    updateHUD();
  });

  const head = (o) => new THREE.Vector3(o.position.x, 1.6, o.position.z);
  const SHOTS = {
    wide: { x: 0, y: 1.6, z: 4.2, tx: 0, ty: 1.4, tz: 0, focal: 35 },
    otsB: { x: -1.65, y: 1.66, z: 0.55, tx: 0.8, ty: 1.55, tz: 0, focal: 50 },
    otsA: { x: 1.65, y: 1.66, z: 0.55, tx: -0.8, ty: 1.55, tz: 0, focal: 50 },
    otsAwrong: { x: 1.65, y: 1.66, z: -0.55, tx: -0.8, ty: 1.55, tz: 0, focal: 50 },
    cuA: { x: 0.1, y: 1.62, z: 1.3, tx: -0.8, ty: 1.58, tz: 0, focal: 60 },
    cuA10: { x: 0.0, y: 1.62, z: 1.38, tx: -0.8, ty: 1.58, tz: 0, focal: 60 },
    cuA45: { x: -0.5, y: 1.62, z: 1.55, tx: -0.8, ty: 1.58, tz: 0, focal: 60 },
  };

  // تشخیص جهت نگاه روی صفحه: پروجکت سر و نقطه‌ی جلوی صورت
  const v = new THREE.Vector3();
  const scr = (p) => v.copy(p).project(camera).x;
  function facing(actor) {
    const hp = head(actor);
    const fwd = new THREE.Vector3(Math.sin(actor.rotation.y), 0, Math.cos(actor.rotation.y)).multiplyScalar(0.3).add(hp);
    return scr(fwd) - scr(hp) > 0 ? '→' : '←';
  }
  function updateHUD() {
    const crossed = stage.cam.z < -0.05;
    const ax = scr(head(A)), bx = scr(head(B));
    const order = ax < bx ? `A${facing(A)} … ${facing(B)}B` : `B${facing(B)} … ${facing(A)}A`;
    stage.setHUD(`<span class="hud-tag ${crossed ? 'bad' : 'good'}">${crossed ? '✕ از خط عبور کرد' : '✓ سمت درست خط'}</span>
      <span dir="ltr">${order}</span>`);
  }

  let seq = null;
  function runSequence(list, step = 1.5) {
    seq?.kill();
    seq = gsap.timeline({ repeat: 1 });
    list.forEach(([shot, who], i) => seq.call(() => { stage.cutTo(SHOTS[shot]); speaker = who; }, null, i * step));
    seq.call(() => { speaker = null; }, null, list.length * step);
  }

  const items = [
    { id: 'good', label: '▶ دیالوگ درست', sub: 'Shot / Reverse' },
    { id: 'bad', label: '▶ عبور از خط', sub: 'Crossing the line' },
    { id: 'r30bad', label: '▶ کات ۱۰°', sub: 'Jump (بد)' },
    { id: 'r30good', label: '▶ کات ۴۵°', sub: '30° rule (خوب)' },
  ];
  const TEXT = {
    good: ['قانون ۱۸۰ درجه — درست', '180° Rule',
      'همه‌ی دوربین‌ها در <b>یک سمت</b> محور فرضی بین دو بازیگر هستند (نیم‌دایره‌ی سبز). A همیشه سمت چپ و رو به راست، B سمت راست و رو به چپ. جغرافیای صحنه در ذهن مخاطب ثابت می‌ماند.'],
    bad: ['قانون ۱۸۰ درجه — شکسته', 'Crossing the Line',
      'نمای معکوس A از سمت دیگر خط (قرمز) گرفته شده: حالا هر دو بازیگر به یک جهت نگاه می‌کنند و انگار با هم حرف نمی‌زنند. مخاطب گیج می‌شود — مگر اینکه عمداً برای ایجاد سردرگمی باشد (The Shining).'],
    r30bad: ['قانون ۳۰ درجه — شکسته', '30° Rule (Jump)',
      'کات بین دو نمای تقریباً یکسان (اختلاف زاویه کمتر از ۳۰°) حس پرش و خطا می‌دهد؛ یعنی یک Jump Cut ناخواسته.'],
    r30good: ['قانون ۳۰ درجه — رعایت‌شده', '30° Rule',
      'بین دو نمای پشت‌سرهم از یک سوژه، زاویه‌ی دوربین حداقل ۳۰° (یا اندازه‌ی نما به‌وضوح) تغییر کند تا کات «انگیزه‌دار» و نرم حس شود.'],
  };
  const CODE = {
    good: `// تدوین = لیست نماها + زمان؛ دوربین فقط «کات» می‌شود (بدون tween)
const EDL = [['wide'], ['otsB', B], ['otsA', A], ['otsB', B], ['otsA', A]];
const tl = gsap.timeline();
EDL.forEach(([shot, who], i) => tl.call(() => cutTo(SHOTS[shot]), null, i * 1.5));`,
    bad: `// بررسی خودکار: آیا دوربین سمت درست محور است؟
const axisDir = B.position.clone().sub(A.position);         // محور
const toCam = camera.position.clone().sub(A.position);
const side = Math.sign(axisDir.x * toCam.z - axisDir.z * toCam.x); // ضرب خارجی ۲بعدی
if (side !== allowedSide) console.warn('Crossed the 180° line!');`,
    r30bad: `// زاویه‌ی بین دو نما (حول سوژه)
const a1 = Math.atan2(cam1.x - S.x, cam1.z - S.z);
const a2 = Math.atan2(cam2.x - S.x, cam2.z - S.z);
const delta = THREE.MathUtils.radToDeg(Math.abs(a2 - a1)); // ≈ 10° ⇒ پرش`,
    r30good: `if (delta < 30 && sameShotSize) {
  // یا زاویه را بیشتر کن، یا اندازه نما را عوض کن، یا یک Cutaway بگذار
}`,
  };

  const group = buttonGroup(controls, items, (it) => {
    const [fa, en, text] = TEXT[it.id];
    setInfo(info, { fa, en, text, code: CODE[it.id] });
    if (it.id === 'good') runSequence([['wide'], ['otsB', B], ['otsA', A], ['otsB', B], ['otsA', A], ['wide']]);
    if (it.id === 'bad') runSequence([['wide'], ['otsB', B], ['otsAwrong', A], ['otsB', B], ['otsAwrong', A], ['wide']]);
    if (it.id === 'r30bad') runSequence([['cuA', A], ['cuA10', A], ['cuA', A], ['cuA10', A]], 1.1);
    if (it.id === 'r30good') runSequence([['cuA', A], ['cuA45', A], ['cuA', A], ['cuA45', A]], 1.1);
  }, { label: 'سکانس‌ها' });

  slider(controls, {
    label: 'چرخاندن دوربین دور صحنه', min: -180, max: 180, step: 1, value: 0, format: (v) => `${v}°`,
    onInput: (deg) => {
      seq?.kill(); speaker = null; group.select(null);
      const a = THREE.MathUtils.degToRad(deg);
      stage.cutTo({ x: Math.sin(a) * 3.6, y: 1.6, z: Math.cos(a) * 3.6, tx: 0, ty: 1.4, tz: 0, focal: 35 });
      const [fa, en, text] = TEXT[Math.cos(a) < 0 ? 'bad' : 'good'];
      setInfo(info, { fa, en, text, code: CODE.bad });
    },
  });

  stage.cutTo(SHOTS.wide);
  setInfo(info, { fa: TEXT.good[0], en: TEXT.good[1], text: TEXT.good[2], code: CODE.good });
}
