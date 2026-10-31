import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, COLORS } from '../lib/set.js';
import { shell, buttonGroup, slider, setInfo, h } from '../lib/ui.js';

const FSTOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const COC = 0.03; // دایره‌ی ابهام مجاز برای فول‌فریم (mm)

/** محاسبه‌ی واقعی عمق میدان (همان فرمول‌های عکاسی) — خروجی به متر */
export function depthOfField(focalMM, N, focusM) {
  const f = focalMM / 1000, c = COC / 1000, s = focusM;
  const H = (f * f) / (N * c) + f; // فاصله‌ی هایپرفوکال
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s >= H ? Infinity : (s * (H - f)) / (H - s);
  return { H, near, far, total: far - near };
}

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 85, shadows: true });
  const { scene, camera, renderer } = stage;
  createSet(scene, { scatter: true, fog: [40, 160] });

  // سه لایه‌ی عمق: پیش‌زمینه (گوی) ۱.۲m، سوژه A ۳m، سوژه B ۷m، پس‌زمینه ستون‌ها و چراغ‌ها
  const A = createActor({ color: COLORS.amber });
  A.position.set(-0.25, 0, 0); A.rotation.y = 0.5;
  const B = createActor({ color: COLORS.teal, hair: 0x6b4a2b });
  B.position.set(0.9, 0, -4); B.rotation.y = -0.3;
  const fg = new THREE.Mesh(new THREE.TorusKnotGeometry(0.09, 0.03, 120, 16),
    new THREE.MeshStandardMaterial({ color: 0xff5a36, metalness: 0.4, roughness: 0.3 }));
  fg.position.set(0.3, 1.32, 1.9);
  scene.add(A, B, fg);

  const CAM = { x: 0.1, y: 1.55, z: 3, tx: 0.15, ty: 1.4, tz: -2 };
  stage.cutTo({ ...CAM, focal: 85 });

  // ---- Post Processing ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.01, maxblur: 0.016 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  stage.composer = composer;
  composer.setSize(stage.el.clientWidth, stage.el.clientHeight);

  const lens = { focus: 3, N: 1.4, focal: 85 };

  // نگاشت تقریبی پارامترهای واقعی به aperture شیدر Bokeh
  // اندازه‌ی CoC ∝ f² / (N · s): لنز بلندتر، دیافراگم بازتر، فاصله‌ی کمتر ⇒ تاری بیشتر
  function apply() {
    const f = lens.focal / 1000;
    const filmH = 0.036 / camera.aspect;
    const a = (f * f) / (lens.N * lens.focus * Math.max(lens.focus - f, 0.05) * filmH) * 0.42;
    bokeh.uniforms.focus.value = lens.focus;
    bokeh.uniforms.aperture.value = a;
    stage.cam.focal = lens.focal;
    updateHUD();
  }

  // نوار دید: محدوده‌ی واضح روی خط‌کش فاصله
  const ruler = h('div', { class: 'dof-ruler' });
  const zone = h('div', { class: 'dof-zone' });
  const marks = ['fg', 'A', 'B'].map((k) => h('i', { class: `dof-mark m-${k}` }));
  const logPos = (m) => (Math.log2(Math.max(m, 0.5) / 0.5) / Math.log2(32)) * 100 * (6 / 7);
  const scale = h('span', { class: 'dof-scale' });
  [[0.5, '0.5m'], [1, '1'], [2, '2'], [4, '4'], [8, '8'], [16, '16']].forEach(([m, t]) =>
    scale.append(h('b', { style: `left:${logPos(m)}%` }, t)));
  scale.append(h('b', { style: 'left:100%' }, '∞'));
  const track = h('div', { class: 'dof-track' }, zone, ...marks, scale);
  ruler.append(track);
  ruler.setAttribute('dir', 'ltr');
  stage.el.after(ruler);

  const dist = (obj) => obj.position.clone().setY(1.5).distanceTo(new THREE.Vector3(CAM.x, CAM.y, CAM.z));
  function updateHUD() {
    const d = depthOfField(lens.focal, lens.N, lens.focus);
    const fmt = (v) => (v === Infinity ? '∞' : `${v.toFixed(2)}m`);
    stage.setHUD(`<span class="hud-tag">${lens.focal}mm · f/${lens.N}</span>
      <span>فوکوس ${lens.focus.toFixed(2)}m · واضح از ${fmt(d.near)} تا ${fmt(d.far)} · عمق ${fmt(d.total)}</span>`);
    const L = logPos(d.near);
    const R = d.far === Infinity ? 100 : Math.min(logPos(d.far), 100);
    zone.style.left = `${L}%`;
    zone.style.width = `${Math.max(R - L, 0.6)}%`;
    [fg, A, B].forEach((o, i) => (marks[i].style.left = `${logPos(dist(o))}%`));
  }

  stage.onTick((dt, t) => {
    animateIdle(A, t, 0); animateIdle(B, t, 3);
    fg.rotation.y += dt * 0.6; fg.rotation.x += dt * 0.3;
  });

  const focusSlider = slider(controls, {
    label: 'فاصله‌ی فوکوس', min: 0.6, max: 30, step: 0.05, value: 3, format: (v) => `${(+v).toFixed(2)}m`,
    onInput: (v) => { lens.focus = v; apply(); },
  });
  const stopSlider = slider(controls, {
    label: 'دیافراگم (f-stop)', min: 0, max: FSTOPS.length - 1, step: 1, value: 0, format: (i) => `f/${FSTOPS[i]}`,
    onInput: (i) => { lens.N = FSTOPS[i]; apply(); },
  });
  const focalSlider = slider(controls, {
    label: 'فاصله‌ی کانونی', min: 18, max: 135, step: 1, value: 85, format: (v) => `${v}mm`,
    onInput: (v) => { lens.focal = v; apply(); },
  });

  const tweenLens = (to, dur = 1.2) =>
    gsap.to(lens, {
      ...to, duration: dur, ease: 'power2.inOut',
      onUpdate: () => { focusSlider.set(lens.focus, true); focalSlider.set(Math.round(lens.focal), true); apply(); },
    });

  const PRESETS = [
    { id: 'shallow', label: 'Shallow DOF', fa: 'عمق میدان کم', run: () => { setStop(0); tweenLens({ focus: dist(A), focal: 85 }); },
      text: 'فقط سوژه واضح است و پس‌زمینه به بوکه تبدیل می‌شود. نگاه مخاطب را <b>مجبور</b> می‌کند روی سوژه بماند؛ حس صمیمیت و انزوا.',
      use: 'پرتره، تمرکز روی CTA یا محصول، جدا کردن لایه‌ی UI از پس‌زمینه (backdrop blur).',
      code: `bokehPass.uniforms.focus.value = 3.0;    // فاصله‌ی سوژه (متر)
bokehPass.uniforms.aperture.value = 0.01; // بزرگ = دیافراگم باز (f/1.4)
bokehPass.uniforms.maxblur.value = 0.016;` },
    { id: 'deep', label: 'Deep Focus', fa: 'فوکوس عمیق', run: () => { setStop(7); tweenLens({ focus: 4, focal: 24 }); },
      text: 'همه‌چیز از جلو تا افق واضح است (همشهری کین). مخاطب آزاد است هر لایه را بخواند؛ برای میزانسن‌های پرجزئیات.',
      use: 'سین‌های اکسپلور، نقشه، اینفوگرافیک چندلایه — عملاً یعنی پست‌پراسس DOF خاموش.',
      code: `// دیافراگم بسته + لنز واید ⇒ aperture تقریباً صفر
bokehPass.uniforms.aperture.value = 0.0002;
camera.setFocalLength(24);` },
    { id: 'rack', label: 'Rack Focus', fa: 'جابه‌جایی فوکوس', run: () => {
        setStop(0);
        gsap.timeline()
          .add(tweenLens({ focus: dist(A), focal: 85 }, 0.6))
          .add(tweenLens({ focus: dist(B) }, 1.4), '+=0.6')
          .add(tweenLens({ focus: dist(fg) }, 1.2), '+=0.8')
          .add(tweenLens({ focus: dist(A) }, 1.2), '+=0.8');
      },
      text: 'فوکوس در طول نما از یک سوژه به سوژه‌ی دیگر منتقل می‌شود. بدون کات، توجه مخاطب را جابه‌جا می‌کند و رابطه‌ی دو سوژه را می‌سازد.',
      use: 'هدایت توجه از متن به تصویر در اسکرول، ریویل یک شخصیت در پس‌زمینه، «فوکوس» روی آیتم انتخاب‌شده.',
      code: `gsap.timeline()
  .to(bokehPass.uniforms.focus, { value: 3.0, duration: 0.6 })
  .to(bokehPass.uniforms.focus, { value: 7.3, duration: 1.4 }, '+=0.6') // A → B
  .to(bokehPass.uniforms.focus, { value: 1.2, duration: 1.2 }, '+=0.8'); // → پیش‌زمینه` },
    { id: 'fgfocus', label: 'Foreground', fa: 'فوکوس پیش‌زمینه', run: () => { setStop(0); tweenLens({ focus: dist(fg), focal: 85 }); },
      text: 'سوژه‌ی نزدیک واضح و بقیه محو. برای Insert یا وقتی یک شیء کلیدی جلوی صحنه است.',
      use: 'هایلایت آیکون یا آیتم جلوی سین سه‌بعدی.',
      code: 'bokehPass.uniforms.focus.value = 1.25;' },
    { id: 'bfocus', label: 'Background', fa: 'فوکوس پس‌زمینه', run: () => { setStop(1); tweenLens({ focus: dist(B), focal: 85 }); },
      text: 'سوژه‌ی دور واضح و جلو محو؛ «کادر کثیف» (Dirty frame) و حس دیدزدن یا تعقیب.',
      use: 'ریویل تدریجی، اسنیک‌پیک محصول پشت لایه‌ی محو.',
      code: 'bokehPass.uniforms.focus.value = 7.3;' },
  ];

  function setStop(i) { lens.N = FSTOPS[i]; stopSlider.set(i, true); }

  const group = buttonGroup(controls, PRESETS, (p) => {
    p.run();
    setInfo(info, { fa: p.fa, en: p.label, text: p.text, use: p.use, code: p.code });
  }, { label: 'پریست‌ها' });

  apply();
  group.select('shallow');
  setInfo(info, { fa: PRESETS[0].fa, en: PRESETS[0].label, text: PRESETS[0].text, use: PRESETS[0].use, code: PRESETS[0].code });
}
