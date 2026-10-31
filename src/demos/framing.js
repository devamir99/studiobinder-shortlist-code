import gsap from 'gsap';
import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, animateWalk, createDoorFrame, COLORS } from '../lib/set.js';
import { shell, buttonGroup, toggle, setInfo, h } from '../lib/ui.js';

const PI = Math.PI;

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 35, inset: true });
  const { scene } = stage;
  createSet(scene, { orbs: false });

  // A و B رو در روی هم؛ C برای Three shot وارد می‌شود
  const A = createActor({ color: COLORS.amber });
  A.position.set(-0.8, 0, 0); A.rotation.y = PI / 2;
  const B = createActor({ color: COLORS.teal, hair: 0x6b4a2b });
  B.position.set(0.8, 0, 0); B.rotation.y = -PI / 2;
  const C = createActor({ color: COLORS.violet, hair: 0x111111 });
  C.position.set(6, 0, -1.1); C.rotation.y = 0;
  const door = createDoorFrame();
  door.position.set(0, 0, 2.6);
  door.visible = false;
  scene.add(A, B, C, door);

  let cWalking = 0;
  stage.onTick((dt, t) => {
    animateIdle(A, t, 0);
    animateIdle(B, t, 2);
    if (cWalking) animateWalk(C, dt, 1); else { animateWalk(C, dt, 0); animateIdle(C, t, 4); }
  });

  // overlay قانون یک‌سوم / خط مرکز
  const overlay = h('div', { class: 'thirds-overlay' },
    h('i', { class: 'v1' }), h('i', { class: 'v2' }), h('i', { class: 'h1' }), h('i', { class: 'h2' }), h('i', { class: 'center' }));
  stage.el.append(overlay);

  const enterC = (inFrame) => {
    const target = inFrame ? 0 : 6;
    if (Math.abs(C.position.x - target) < 0.01) return;
    C.rotation.y = inFrame ? -PI / 2 : PI / 2;
    cWalking = 1;
    gsap.to(C.position, {
      x: target, duration: 1.8, ease: 'none',
      onComplete: () => { cWalking = 0; gsap.to(C.rotation, { y: 0, duration: 0.5 }); },
    });
  };

  const P = {
    single: {
      cam: { x: 0.3, y: 1.6, z: 1.15, tx: -0.8, ty: 1.55, tz: 0, focal: 40 },
      fa: 'سینگل', en: 'Single Shot',
      text: 'فقط یک شخصیت در کادر. تمرکز کامل روی واکنش و دیالوگ همان فرد.',
      use: 'نمایش یک آیتم/کاراکتر فعال؛ در UI: حالت «فوکوس» روی یک کارت.',
    },
    two: {
      cam: { x: 0, y: 1.5, z: 3.8, tx: 0, ty: 1.3, tz: 0, focal: 35 },
      fa: 'دو نفره', en: 'Two Shot',
      text: 'دو شخصیت در یک کادر. رابطه، فاصله و تعادل قدرت بین آن‌ها را نشان می‌دهد.',
      use: 'مقایسه‌ی دو محصول/پلن، صحنه‌ی تعامل دو کاراکتر سه‌بعدی.',
    },
    three: {
      cam: { x: 0, y: 1.55, z: 4.6, tx: 0, ty: 1.25, tz: -0.3, focal: 32 }, c: true,
      fa: 'سه نفره', en: 'Three Shot',
      text: 'سه شخصیت در قاب؛ معمولاً به‌صورت مثلثی چیده می‌شوند تا عمق و سلسله‌مراتب بسازند.',
      use: 'نمایش گروهی تیم، ترکیب‌بندی مثلثی در هیرو.',
    },
    ots: {
      cam: { x: -1.65, y: 1.66, z: 0.5, tx: 0.8, ty: 1.55, tz: 0, focal: 50 },
      fa: 'از روی شانه', en: 'Over-the-Shoulder (OTS)',
      text: 'دوربین پشت شانه‌ی یک شخصیت و رو به دیگری. حس حضور در گفت‌وگو و جغرافیای دو نفر را حفظ می‌کند.',
      use: 'سین‌های دیالوگ در بازی و موشن، نمای «کاربر و محصول».',
    },
    rots: {
      cam: { x: 1.65, y: 1.66, z: 0.5, tx: -0.8, ty: 1.55, tz: 0, focal: 50 },
      fa: 'معکوس (Reverse)', en: 'Reverse OTS',
      text: 'نمای معکوس OTS قبلی. در تدوین دیالوگ، این دو را پشت سر هم کات می‌کنند (Shot / Reverse Shot).',
      use: 'الگوی گفت‌وگو؛ تعویض دوربین در state machine سین.',
    },
    pov: {
      cam: { x: -0.7, y: 1.65, z: 0.0, tx: 0.8, ty: 1.6, tz: 0, focal: 28 }, pov: true,
      fa: 'نقطه‌ی دید', en: 'Point of View (POV)',
      text: 'دقیقاً همان چیزی که شخصیت می‌بیند. مخاطب «جای» شخصیت قرار می‌گیرد.',
      use: 'دوربین اول‌شخص (FPS)، تور مجازی، تجربه‌های WebXR.',
    },
    thirds: {
      cam: { x: 0.25, y: 1.62, z: 1.6, tx: -0.8, ty: 1.55, tz: 0, focal: 35, shiftX: 1 / 6, shiftY: 0.1 }, grid: true,
      fa: 'قانون یک‌سوم + فضای نگاه', en: 'Rule of Thirds + Lead Room',
      text: 'چشم‌ها روی خط یک‌سوم بالایی و بازیگر روی یک‌سوم سمت چپ، با فضای خالی در <b>جهتی که نگاه می‌کند</b> (Lead/Look Room).',
      use: 'چیدمان متن و تصویر در هیرو؛ با <code>camera.setViewOffset</code> سوژه را بدون جابه‌جایی دوربین در کادر جابه‌جا کنید.',
    },
    short: {
      cam: { x: 0.25, y: 1.62, z: 1.6, tx: -0.8, ty: 1.55, tz: 0, focal: 35, shiftX: -1 / 6, shiftY: 0.1 }, grid: true,
      fa: 'کادر بسته‌ی پشت سر', en: 'Short-siding',
      text: 'شخصیت به لبه‌ی کادر نگاه می‌کند و فضای خالی پشت سرش است. حس خفگی، ناراحتی یا خطری پشت سر ایجاد می‌کند؛ اگر عمدی نباشد اشتباه است.',
      use: 'عمداً برای ایجاد تنش؛ وگرنه در UI هم متن را پشت سر تصویر «نگاه‌کننده» نگذارید.',
    },
    headroom: {
      cam: { x: 0.25, y: 1.62, z: 1.6, tx: -0.8, ty: 1.55, tz: 0, focal: 35, shiftX: 0, shiftY: -0.22 }, grid: true,
      fa: 'هدروم زیاد', en: 'Too Much Headroom',
      text: 'فضای خالی بالای سر بیش از حد است و شخصیت «کوچک و پایین‌افتاده» به نظر می‌رسد. قاعده: چشم‌ها روی یک‌سوم بالایی.',
      use: 'در کراپ آواتارها و تامبنیل‌ها: <code>object-position</code> را طوری تنظیم کنید که چشم‌ها روی ۳۳٪ بالایی باشند.',
    },
    symmetry: {
      cam: { x: 0, y: 1.45, z: 5.5, tx: 0, ty: 1.45, tz: -10, focal: 35 }, center: true,
      fa: 'قرینه', en: 'Symmetrical Composition',
      text: 'خطوط و سوژه‌ها حول محور مرکزی قرینه‌اند (امضای وس اندرسون و کوبریک). حس نظم، کنترل یا حتی ناآرامی می‌دهد.',
      use: 'صفحه‌های لندینگ مینیمال، لوگو ریویل، سین‌های معماری.',
    },
    frame: {
      cam: { x: 0.15, y: 1.5, z: 6.2, tx: 0, ty: 1.35, tz: 0, focal: 35 }, door: true,
      fa: 'کادر در کادر', en: 'Frame within a Frame',
      text: 'استفاده از عناصر صحنه (در، پنجره، آینه) به‌عنوان کادر دوم. نگاه را هدایت می‌کند و حس «دیدزدن» یا محصور بودن می‌دهد.',
      use: 'ماسک و clip-path روی تصویر، پورتال‌ها در Three.js با Render Target، کارت‌هایی که کاراکتر از آن بیرون می‌زند.',
    },
  };

  const items = [
    { id: 'single', label: 'Single' }, { id: 'two', label: 'Two Shot' }, { id: 'three', label: 'Three Shot' },
    { id: 'ots', label: 'OTS' }, { id: 'rots', label: 'Reverse OTS' }, { id: 'pov', label: 'POV' },
    { id: 'thirds', label: 'یک‌سوم + Lead Room' }, { id: 'short', label: 'Short-sided' }, { id: 'headroom', label: 'Headroom' },
    { id: 'symmetry', label: 'Symmetry' }, { id: 'frame', label: 'Frame in Frame' },
  ];

  let povBob = null;
  let showGridAlways = false;

  function show(item) {
    const p = P[item.id];
    group.select(item.id);
    enterC(!!p.c);
    door.visible = !!p.door;
    stage.moveTo({ roll: 0, shiftX: 0, shiftY: 0, ...p.cam }, { duration: 1.4 });
    overlay.classList.toggle('show-grid', !!p.grid || showGridAlways);
    overlay.classList.toggle('show-center', !!p.center);

    povBob?.kill();
    stage.shake.y = 0;
    if (p.pov) {
      povBob = gsap.to(stage.shake, { y: 0.012, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.4 });
    }
    stage.setHUD(`<span class="hud-tag">${item.label}</span><span>${p.en}</span>`);

    const c = p.cam;
    const code = c.shiftX !== undefined
      ? `// جابه‌جایی سوژه در کادر بدون حرکت دوربین (مثل Lens Shift)
const W = 1000, H = W / camera.aspect;
camera.setViewOffset(W, H, ${(c.shiftX ?? 0).toFixed(3)} * W, ${(c.shiftY ?? 0).toFixed(3)} * H, W, H);`
      : `camera.position.set(${c.x}, ${c.y}, ${c.z});
camera.lookAt(${c.tx}, ${c.ty}, ${c.tz});
camera.setFocalLength(${c.focal}); // میلی‌متر`;
    setInfo(info, { fa: p.fa, en: p.en, text: p.text, use: p.use, code });
  }

  const group = buttonGroup(controls, items, show, { label: 'کادربندی و ترکیب‌بندی' });
  toggle(controls, {
    label: 'نمایش همیشگی خطوط یک‌سوم',
    onChange: (v) => { showGridAlways = v; overlay.classList.toggle('show-grid', v || overlay.classList.contains('show-grid')); if (!v) overlay.classList.remove('show-grid'); },
  });

  stage.cutTo({ ...P.two.cam, roll: 0, shiftX: 0, shiftY: 0 });
  show(items[1]);
}
