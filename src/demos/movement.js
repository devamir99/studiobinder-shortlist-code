import gsap from 'gsap';
import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, animateWalk, COLORS } from '../lib/set.js';
import { shell, buttonGroup, setInfo } from '../lib/ui.js';

const BASE = { x: 0, y: 1.6, z: 4.5, tx: 0, ty: 1.45, tz: 0, roll: 0, focal: 35, shiftX: 0, shiftY: 0 };

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 35, inset: true });
  const { scene } = stage;
  createSet(scene);

  const A = createActor({ color: COLORS.amber });
  const B = createActor({ color: COLORS.teal, hair: 0x6b4a2b });
  B.position.set(-3.2, 0, -1.5); B.rotation.y = 0.6;
  scene.add(A, B);

  let walking = 0;
  stage.onTick((dt, t) => {
    animateWalk(A, dt, walking);
    if (!walking) animateIdle(A, t);
    animateIdle(B, t, 2);
  });

  const c = stage.cam;
  let tl = null;
  const canvas = stage.renderer.domElement;

  /** فاصله برای ثابت نگه داشتن ارتفاع h در کادر — اساس Dolly Zoom */
  const keepSize = (h) => stage.distanceForHeight(h, c.focal);

  const MOVES = [
    { id: 'static', label: 'Static', fa: 'ثابت', build: (t) => t.to(c, { ...BASE, duration: 1 }),
      text: 'دوربین هیچ حرکتی ندارد. اجازه می‌دهد اجرای بازیگر یا ترکیب‌بندی حرف بزند؛ سکون می‌تواند تنش بسازد.',
      use: 'بیشتر UI همین است! حرکت را برای لحظه‌های معنادار نگه دارید.',
      code: `// هیچ tween ای — فقط رندر
renderer.render(scene, camera);` },
    { id: 'pan', label: 'Pan', fa: 'پن (چرخش افقی)',
      build: (t) => t.to(c, { tx: -3.2, duration: 1.6, ease: 'power2.inOut' }).to(c, { tx: 2.5, duration: 2.2, ease: 'power2.inOut' }).to(c, { tx: 0, duration: 1.2 }),
      text: 'دوربین در جای خود حول محور عمودی می‌چرخد (مثل چرخاندن سر به چپ و راست). فضا را آشکار می‌کند یا سوژه‌ی متحرک را دنبال می‌کند.',
      use: 'نمایش پانورامای محیط، نشان دادن رابطه‌ی دو سوژه بدون کات.',
      code: `// موقعیت ثابت، فقط «نقطه‌ی نگاه» افقی جابه‌جا می‌شود
gsap.to(cam, { tx: -3.2, duration: 1.6, ease: 'power2.inOut',
  onUpdate: () => camera.lookAt(cam.tx, cam.ty, cam.tz) });` },
    { id: 'tilt', label: 'Tilt', fa: 'تیلت (چرخش عمودی)',
      build: (t) => t.to(c, { ty: 0.1, duration: 1.4, ease: 'power2.inOut' }).to(c, { ty: 3.2, duration: 2.4, ease: 'power2.inOut' }).to(c, { ty: 1.45, duration: 1.2 }),
      text: 'دوربین در جای خود بالا و پایین را نگاه می‌کند. ریویل قد و عظمت (از کفش تا صورت) یا ارتفاع ساختمان.',
      use: 'ریویل عمودی محصول، اسکرول عمودی که «به بالا نگاه می‌کند».',
      code: `gsap.fromTo(cam, { ty: 0.1 }, { ty: 3.2, duration: 2.4, ease: 'power2.inOut' });` },
    { id: 'push', label: 'Push In', fa: 'پوش این (دالی به جلو)',
      build: (t) => t.to(c, { z: 1.3, ty: 1.6, duration: 3.2, ease: 'power1.inOut' }),
      text: 'دوربین فیزیکی به سوژه نزدیک می‌شود. افزایش تنش، اهمیت یا لحظه‌ی درک درونی شخصیت.',
      use: 'زوم به داخل محصول هنگام اسکرول، فوکوس روی یک بخش، ترنزیشن «ورود».',
      code: `gsap.to(camera.position, { z: 1.3, duration: 3.2, ease: 'power1.inOut' });` },
    { id: 'pull', label: 'Pull Out', fa: 'پول اوت (دالی به عقب)',
      build: (t) => t.set(c, { z: 1.3, ty: 1.6 }).to(c, { z: 8.5, ty: 1.2, duration: 3.4, ease: 'power2.inOut' }),
      text: 'دوربین از سوژه دور می‌شود؛ تنهایی، خداحافظی یا آشکار کردن زمینه‌ای که مخاطب از آن بی‌خبر بود.',
      use: 'پایان یک سکشن، نمایش «تصویر بزرگ» بعد از جزئیات.',
      code: `gsap.fromTo(camera.position, { z: 1.3 }, { z: 8.5, duration: 3.4, ease: 'power2.inOut' });` },
    { id: 'truck', label: 'Truck', fa: 'تراک (حرکت جانبی)',
      build: (t) => t.to(c, { x: -3, tx: -3, duration: 1.8, ease: 'power2.inOut' }).to(c, { x: 2.5, tx: 2.5, duration: 2.6, ease: 'power2.inOut' }).to(c, { x: 0, tx: 0, duration: 1.2 }),
      text: 'کل دوربین به چپ/راست جابه‌جا می‌شود (موازی صحنه). برخلاف Pan، پارالاکس واقعی ایجاد می‌کند: لایه‌های نزدیک سریع‌تر حرکت می‌کنند.',
      use: 'پارالاکس اسکرول، گالری افقی، ScrollTrigger با scrub.',
      code: `// موقعیت و هدف با هم جابه‌جا می‌شوند ⇒ جهت نگاه ثابت می‌ماند
gsap.to(cam, { x: 2.5, tx: 2.5, duration: 2.6, ease: 'power2.inOut' });` },
    { id: 'track', label: 'Tracking', fa: 'تراکینگ (همراه سوژه)',
      build: (t) => t.set(A.position, { x: -4 }).set(A.rotation, { y: Math.PI / 2 }).set(c, { x: -4, tx: -4, z: 3.2 })
        .call(() => (walking = 1))
        .to([A.position], { x: 4, duration: 5, ease: 'none' }, '<')
        .to(c, { x: 4, tx: 4, duration: 5, ease: 'none' }, '<')
        .call(() => (walking = 0))
        .to(A.rotation, { y: 0, duration: 0.5 })
        .set(A.position, { x: 0 }).set(c, { ...BASE }),
      text: 'دوربین هم‌پای سوژه‌ی متحرک حرکت می‌کند و او را در کادر نگه می‌دارد. مخاطب «همراه» شخصیت می‌شود.',
      use: 'Follow camera در بازی، کاراکتری که با اسکرول راه می‌رود.',
      code: `// دوربین و سوژه با یک timeline و یک ease خطی همگام می‌شوند
gsap.timeline()
  .to(actor.position, { x: 4, duration: 5, ease: 'none' })
  .to(cam, { x: 4, tx: 4, duration: 5, ease: 'none' }, '<');` },
    { id: 'pedestal', label: 'Pedestal', fa: 'پدستال (بالا/پایین)',
      build: (t) => t.to(c, { y: 0.5, ty: 0.4, duration: 1.5, ease: 'power2.inOut' }).to(c, { y: 2.8, ty: 2.7, duration: 2.6, ease: 'power2.inOut' }).to(c, { y: 1.6, ty: 1.45, duration: 1.2 }),
      text: 'کل دوربین عمودی بالا یا پایین می‌رود بدون تغییر زاویه (برخلاف Tilt).',
      use: 'اسکرول عمودی سه‌بعدی؛ حرکت آسانسوری بین طبقات یک سین.',
      code: `gsap.to(cam, { y: 2.8, ty: 2.7, duration: 2.6 }); // هر دو با هم ⇒ زاویه ثابت` },
    { id: 'crane', label: 'Crane / Boom', fa: 'کرین / بوم',
      build: (t) => t.set(c, { x: 0, y: 0.8, z: 3, ty: 1.4 }).to(c, { y: 6.5, z: 7.5, x: 2, ty: 0.8, duration: 4, ease: 'power2.inOut' }),
      text: 'حرکت بزرگ عمودی و عمق‌دار با بازوی کرین. معمولاً برای شروع (از بالا به سوژه) یا پایان (بالا رفتن و ترک صحنه).',
      use: 'اینترو یا اوترو باشکوه، انتقال از جزئیات به نمای کلی شهر.',
      code: `gsap.fromTo(cam, { y: 0.8, z: 3 }, { y: 6.5, z: 7.5, x: 2, ty: 0.8, duration: 4, ease: 'power2.inOut' });` },
    { id: 'arc', label: 'Arc / Orbit', fa: 'آرک (حرکت دایره‌ای)',
      build: (t) => {
        const o = { a: 0 };
        return t.to(o, {
          a: Math.PI * 1.6, duration: 5, ease: 'power1.inOut',
          onUpdate: () => { c.x = Math.sin(o.a) * 3.5; c.z = Math.cos(o.a) * 3.5; },
        }).to(c, { x: 0, z: 4.5, duration: 1.2 });
      },
      text: 'دوربین روی کمان یا دایره دور سوژه می‌چرخد. سوژه را محور جهان می‌کند؛ لحظه‌های قهرمانانه یا عاشقانه (۳۶۰ درجه‌ی مایکل بِی).',
      use: 'نمایش ۳۶۰ محصول، OrbitControls خودکار (autoRotate)، چرخش قهرمانانه.',
      code: `const o = { a: 0 };
gsap.to(o, { a: Math.PI * 1.6, duration: 5, ease: 'power1.inOut',
  onUpdate: () => camera.position.set(Math.sin(o.a) * R, 1.6, Math.cos(o.a) * R) });` },
    { id: 'zoom', label: 'Zoom', fa: 'زوم (تغییر لنز)',
      build: (t) => t.to(c, { focal: 110, ty: 1.6, duration: 2.6, ease: 'power2.inOut' }).to(c, { focal: 35, ty: 1.45, duration: 1.4, ease: 'power2.inOut' }, '+=0.6'),
      text: 'دوربین جابه‌جا نمی‌شود، فقط فاصله‌ی کانونی عوض می‌شود. برخلاف Push In، پرسپکتیو تغییر نمی‌کند — فقط کادر بریده می‌شود (حس «مصنوعی»تر و مستندگونه).',
      use: 'تغییر fov — با احتیاط؛ اغلب Dolly واقعی حس بهتری می‌دهد.',
      code: `gsap.to(cam, { focal: 110, duration: 2.6,
  onUpdate: () => camera.setFocalLength(cam.focal) });` },
    { id: 'dollyzoom', label: 'Dolly Zoom', fa: 'دالی زوم (ورتیگو)',
      build: (t) => {
        t.set(c, { focal: 18, z: stage.distanceForHeight(1.2, 18), ty: 1.45 });
        return t.to(c, {
          focal: 110, duration: 4, ease: 'power1.inOut',
          onUpdate: () => (c.z = keepSize(1.2)),
        }).to(c, { focal: 18, duration: 3, ease: 'power1.inOut', onUpdate: () => (c.z = keepSize(1.2)) }, '+=0.4')
          .to(c, { ...BASE, duration: 1.2 });
      },
      text: 'هم‌زمان دالی و زوم در جهت مخالف، طوری که اندازه‌ی سوژه ثابت بماند ولی پس‌زمینه کش بیاید یا فشرده شود. سرگیجه، شوک، درک ناگهانی (Vertigo، Jaws).',
      use: 'لحظه‌ی «آها!» در storytelling، ترنزیشن بین بخش‌ها، افکت ترس در بازی.',
      code: `// اندازه‌ی سوژه ثابت: d = (h/2) / tan(vfov/2)
gsap.to(cam, { focal: 110, duration: 4, onUpdate() {
  camera.setFocalLength(cam.focal);
  const d = (h / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  camera.position.z = subject.z + d;
}});` },
    { id: 'whip', label: 'Whip Pan', fa: 'ویپ پن',
      build: (t) => t.to(c, { tx: -3.2, tz: -1.5, ty: 1.45, duration: 0.32, ease: 'power4.inOut' })
        .to(canvas, { filter: 'blur(7px)', duration: 0.16, ease: 'power2.in' }, '<')
        .to(canvas, { filter: 'blur(0px)', duration: 0.16, ease: 'power2.out' }, '<0.16')
        .to(c, { tx: 0, tz: 0, duration: 0.32, ease: 'power4.inOut' }, '+=1.4')
        .to(canvas, { filter: 'blur(7px)', duration: 0.16, ease: 'power2.in' }, '<')
        .to(canvas, { filter: 'blur(0px)', duration: 0.16, ease: 'power2.out' }, '<0.16'),
      text: 'پن آن‌قدر سریع که تصویر به موشن‌بلور تبدیل می‌شود. انرژی، شوخی، یا ترنزیشن مخفی بین دو نما/مکان.',
      use: 'ترنزیشن صفحه با blur جهت‌دار، سوییچ سریع بین تب‌ها/اسلایدها.',
      code: `gsap.timeline()
  .to(cam, { tx: -3.2, duration: 0.32, ease: 'power4.inOut' })
  .to(canvas, { filter: 'blur(7px)', duration: 0.16, yoyo: true, repeat: 1 }, '<');` },
    { id: 'roll', label: 'Roll', fa: 'رول (چرخش حول لنز)',
      build: (t) => t.to(c, { roll: 360, duration: 3.6, ease: 'power2.inOut' }).set(c, { roll: 0 }),
      text: 'دوربین حول محور لنز می‌چرخد؛ جهان وارونه می‌شود. گیجی، رؤیا، بی‌وزنی (Inception، 2001).',
      use: 'ترنزیشن «ورود به دنیای دیگر»، گیم‌پلی بی‌وزنی، حالت گلیچ.',
      code: `gsap.to(cam, { roll: 360, duration: 3.6, ease: 'power2.inOut',
  onUpdate: () => { camera.lookAt(target); camera.rotateZ(THREE.MathUtils.degToRad(cam.roll)); } });` },
  ];

  function show(m) {
    group.select(m.id);
    tl?.kill();
    walking = 0;
    gsap.set(canvas, { filter: 'blur(0px)' });
    gsap.set(A.position, { x: 0 }); gsap.set(A.rotation, { y: 0 });
    stage.cutTo({ ...BASE });
    tl = gsap.timeline({ delay: 0.25 });
    m.build(tl);
    stage.setHUD(`<span class="hud-tag">${m.label}</span><span>${m.fa}</span>`);
    setInfo(info, { fa: m.fa, en: m.label, text: m.text, use: m.use, code: m.code });
  }

  const group = buttonGroup(controls, MOVES, show, { label: 'حرکت دوربین (کلیک = پخش)' });
  stage.cutTo({ ...BASE });
  group.select('static');
  setInfo(info, { fa: 'روی یک حرکت کلیک کنید', en: 'Camera Movement', text: 'هر دکمه یک <b>GSAP timeline</b> روی آبجکت <code>cam</code> اجرا می‌کند. در گوشه‌ی تصویر، «نمای کارگردان» نشان می‌دهد دوربین واقعاً کجا حرکت می‌کند.', code: MOVES[0].code });
}
