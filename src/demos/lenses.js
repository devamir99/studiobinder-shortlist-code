import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, COLORS } from '../lib/set.js';
import { shell, buttonGroup, slider, toggle, setInfo, h } from '../lib/ui.js';

/** شیدر اعوجاج بشکه‌ای (Barrel) برای شبیه‌سازی فیش‌آی */
export const FisheyeShader = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0 }, aspect: { value: 16 / 9 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float strength; uniform float aspect;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      p.x *= aspect;
      float r2 = dot(p, p);
      vec2 q = p * (1.0 + strength * r2);   // هرچه از مرکز دورتر، نمونه‌برداری دورتر ⇒ لبه‌ها فشرده
      q.x /= aspect;
      vec2 uv = q * 0.5 + 0.5;
      float vig = smoothstep(1.0, 0.75, length(p / vec2(aspect, 1.0)) * (0.6 + strength));
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      gl_FragColor = vec4(texture2D(tDiffuse, uv).rgb * mix(1.0, vig, step(0.001, strength)), 1.0);
    }`,
};

const LENSES = [
  { id: 14, label: '14mm', sub: 'Ultra Wide', fa: 'فوق واید',
    text: 'زاویه‌ی دید بسیار بزرگ (~۱۰۴° افقی). فاصله‌ها اغراق می‌شوند، خطوط لبه کش می‌آیند و چهره در نزدیکی دفرمه می‌شود.',
    use: 'فضاهای تنگ، معماری، اکشن نزدیک، حس عظمت یا اضطراب. در Three.js: <code>fov</code> بزرگ (۷۰ به بالا).' },
  { id: 24, label: '24mm', sub: 'Wide', fa: 'واید',
    text: 'واید کلاسیک برای Establishing و نماهای محیطی؛ عمق را بیشتر از واقعیت نشان می‌دهد.',
    use: 'هیروی محیطی، سین‌های اکسپلور، دوربین بازی‌های سوم‌شخص.' },
  { id: 35, label: '35mm', sub: 'Standard Wide', fa: 'استاندارد واید',
    text: 'لنز «داستان‌گو»؛ کمی بازتر از چشم. هم محیط و هم شخصیت را با اعوجاج کم نشان می‌دهد.',
    use: 'پیش‌فرض بسیار خوب برای اکثر سین‌های وب (≈ fov عمودی ۳۸° در ۱۶:۹).' },
  { id: 50, label: '50mm', sub: 'Normal', fa: 'نرمال',
    text: 'نزدیک‌ترین به پرسپکتیو چشم انسان. طبیعی، صادق و بدون اغراق.',
    use: 'نمایش محصول بدون دفرمگی، UI سه‌بعدی که باید «واقعی» حس شود.' },
  { id: 85, label: '85mm', sub: 'Portrait', fa: 'پرتره',
    text: 'لنز پرتره: فشردگی ملایم، چهره‌ی خوش‌فرم و جداسازی عالی سوژه از پس‌زمینه.',
    use: 'کلوزآپ کاراکتر، کارت محصول، نمای Hero محصول.' },
  { id: 135, label: '135mm', sub: 'Telephoto', fa: 'تله',
    text: 'زاویه‌ی دید باریک؛ پس‌زمینه بزرگ و نزدیک به سوژه دیده می‌شود (Compression). حس دیدزدن از دور.',
    use: 'نماهای «جاسوسی»، فشرده کردن لایه‌ها، پارالاکس کم.' },
  { id: 200, label: '200mm', sub: 'Long Tele', fa: 'تله‌ی بلند',
    text: 'فشردگی شدید؛ لایه‌ها روی هم چسبیده‌اند و تصویر تقریباً «تخت» می‌شود. ستون‌ها انگار پشت سر هم ایستاده‌اند.',
    use: 'تقریب نزدیک به دوربین Orthographic؛ برای حس گرافیکی و پوستری.' },
];

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 35, inset: true });
  const { scene, camera, renderer } = stage;
  createSet(scene, { fog: [50, 200] });

  const A = createActor({ color: COLORS.amber });
  A.rotation.y = 0.3;
  scene.add(A);
  stage.onTick((dt, t) => animateIdle(A, t));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const fish = new ShaderPass(FisheyeShader);
  composer.addPass(fish);
  composer.addPass(new OutputPass());
  stage.composer = composer;
  composer.setSize(stage.el.clientWidth, stage.el.clientHeight);

  const letterbox = h('div', { class: 'letterbox' });
  stage.el.append(letterbox);

  const FRAME_H = 1.25; // ارتفاعی از بازیگر (بالاتنه) که می‌خواهیم ثابت بماند
  const s = { focal: 35, keep: true };
  const c = stage.cam;

  function apply() {
    c.focal = s.focal;
    c.y = 1.4; c.tx = 0; c.ty = 1.25; c.tz = 0; c.x = 0;
    if (s.keep) c.z = stage.distanceForHeight(FRAME_H, s.focal);
    fish.uniforms.aspect.value = camera.aspect;
    stage.applyCamera();
    stage.setHUD(`<span class="hud-tag">${Math.round(s.focal)}mm</span>
      <span>FOV افقی ${stage.hfov.toFixed(1)}° · عمودی ${camera.fov.toFixed(1)}° · فاصله تا سوژه ${c.z.toFixed(2)}m</span>`);
  }

  const focalSlider = slider(controls, {
    label: 'فاصله‌ی کانونی', min: 10, max: 200, step: 1, value: 35, format: (v) => `${v}mm`,
    onInput: (v) => { s.focal = v; apply(); },
  });

  function showLens(l) {
    group.select(l.id);
    gsap.to(s, { focal: l.id, duration: 1.2, ease: 'power2.inOut', onUpdate: () => { focalSlider.set(Math.round(s.focal), true); apply(); } });
    setInfo(info, {
      fa: `${l.fa} — ${l.label}`, en: l.sub, text: l.text, use: l.use,
      code: `camera.filmGauge = 36;        // سنسور فول‌فریم (mm)
camera.setFocalLength(${l.id});     // ⇒ camera.fov = ${(2 * Math.atan(36 / (16 / 9) / 2 / l.id) * 180 / Math.PI).toFixed(1)}° (عمودی، 16:9)
${s.keep ? `// ثابت نگه داشتن اندازه‌ی سوژه ⇒ دوربین جابه‌جا می‌شود (پرسپکتیو تغییر می‌کند)
camera.position.z = (h / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);` : '// دوربین ثابت: فقط کادر بریده می‌شود (Zoom)'}`,
    });
  }

  const group = buttonGroup(controls, LENSES, showLens, { label: 'لنز' });

  toggle(controls, {
    label: 'ثابت نگه داشتن اندازه‌ی سوژه (دوربین جلو/عقب می‌رود)', value: true,
    onChange: (v) => { s.keep = v; if (!v) c.z = stage.distanceForHeight(FRAME_H, s.focal); apply(); },
  });

  buttonGroup(controls, [
    { id: 'vertigo', label: '▶ Dolly Zoom', sub: 'ورتیگو' },
    { id: 'fisheye', label: 'Fisheye', sub: '8mm' },
    { id: 'anamorphic', label: 'Anamorphic', sub: '2.39:1' },
  ], (item, btn) => {
    if (item.id === 'vertigo') {
      s.keep = true;
      gsap.timeline()
        .to(s, { focal: 16, duration: 0.8, onUpdate: apply })
        .to(s, { focal: 160, duration: 4, ease: 'power1.inOut', onUpdate: () => { focalSlider.set(Math.round(s.focal), true); apply(); } })
        .to(s, { focal: 35, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { focalSlider.set(Math.round(s.focal), true); apply(); } }, '+=0.5');
      setInfo(info, {
        fa: 'دالی زوم با لنز', en: 'Dolly Zoom / Vertigo Effect',
        text: 'سوژه هم‌اندازه می‌ماند ولی با افزایش فاصله‌ی کانونی و عقب رفتن دوربین، پس‌زمینه «جلو می‌آید» و فشرده می‌شود. این ثابت می‌کند فشردگی پس‌زمینه از <b>فاصله‌ی دوربین</b> می‌آید، نه خود لنز.',
        code: `gsap.to(s, { focal: 160, duration: 4, onUpdate() {
  camera.setFocalLength(s.focal);
  camera.position.z = (h / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
}});`,
      });
    }
    if (item.id === 'fisheye') {
      const on = !btn.classList.toggle('active') ? false : true;
      gsap.to(fish.uniforms.strength, { value: on ? 0.42 : 0, duration: 0.8 });
      gsap.to(s, { focal: on ? 12 : 35, duration: 0.8, onUpdate: () => { focalSlider.set(Math.round(s.focal), true); apply(); } });
      setInfo(info, {
        fa: 'فیش‌آی', en: 'Fisheye Lens',
        text: 'لنز فوق‌واید با اعوجاج بشکه‌ای عمدی (۱۸۰° یا بیشتر). خطوط صاف خم می‌شوند؛ حس اسکیت‌بورد، چشمی در، دوربین مداربسته یا رؤیا. دوربین‌های Three.js <b>Rectilinear</b> هستند؛ پس فیش‌آی را با یک پاس شیدر می‌سازیم.',
        lang: 'glsl',
        code: `vec2 p = vUv * 2.0 - 1.0;  p.x *= aspect;
vec2 q = p * (1.0 + strength * dot(p, p)); // Barrel distortion
q.x /= aspect;
gl_FragColor = texture2D(tDiffuse, q * 0.5 + 0.5);`,
      });
    }
    if (item.id === 'anamorphic') {
      const on = btn.classList.toggle('active');
      letterbox.classList.toggle('on', on);
      // در حالت آنامورفیک نمای کارگردان زیر نوار سیاه می‌رود؛ پنهانش کن
      stage.insetEnabled = !on;
      stage.el.classList.toggle('has-inset', !on);
      stage.el.querySelector('.stage-inset-label').style.display = on ? 'none' : '';
      setInfo(info, {
        fa: 'آنامورفیک', en: 'Anamorphic Lens',
        text: 'لنزی که تصویر را افقی فشرده روی سنسور ثبت می‌کند و بعد باز می‌شود ⇒ نسبت تصویر سینمایی ۲.۳۹:۱، بوکه‌ی بیضی و فلر افقی آبی. امضای «حس سینمایی».',
        use: 'نوار سیاه Letterbox با CSS، فلر افقی با Bloom کشیده، بوکه‌ی بیضی با scale افقی کرنل بلور.',
        lang: 'css',
        code: `.stage { aspect-ratio: 16 / 9; position: relative; }
.stage::before, .stage::after {          /* نوارهای 2.39:1 */
  content: ""; position: absolute; inset-inline: 0;
  height: calc((100% - (100cqw / 2.39)) / 2); background: #000;
}`,
      });
    }
  }, { label: 'جلوه‌های لنز', multi: true });

  stage.cutTo({ x: 0, y: 1.4, z: stage.distanceForHeight(FRAME_H, 35), tx: 0, ty: 1.25, tz: 0, focal: 35 });
  apply();
  showLens(LENSES[2]);
}
