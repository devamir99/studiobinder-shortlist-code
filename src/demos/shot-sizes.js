import * as THREE from 'three';
import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, ANATOMY as A, COLORS } from '../lib/set.js';
import { shell, buttonGroup, toggle, setInfo } from '../lib/ui.js';

/**
 * هر نما با «بازه‌ی عمودی» روی بدن بازیگر تعریف می‌شود: [پایین، بالا] به متر.
 * فاصله‌ی دوربین از فرمول d = (h/2) / tan(vfov/2) به دست می‌آید.
 */
const SHOTS = [
  { id: 'ews', label: 'EWS', sub: 'Extreme Wide', fa: 'نمای خیلی باز', en: 'Extreme Wide Shot (EWS)', range: [-6, 16], camY: 7,
    text: 'سوژه در برابر محیط تقریباً گم است. مکان، مقیاس و تنهایی شخصیت را معرفی می‌کند. معمولاً به‌عنوان <b>Establishing Shot</b> اول صحنه می‌آید.',
    use: 'اینترو سایت، صفحه‌ی لودینگ، معرفی «جهان» یک تجربه‌ی سه‌بعدی، نقشه‌ی کلی.' },
  { id: 'ws', label: 'WS', sub: 'Wide / Long', fa: 'نمای باز', en: 'Wide Shot / Long Shot (WS/LS)', range: [-0.6, 4.4],
    text: 'کل بدن با فضای زیاد اطراف. رابطه‌ی شخصیت با مکان را نشان می‌دهد ولی شخصیت قابل شناسایی است.',
    use: 'هیروی صفحه با کاراکتر کوچک، نمای ورود به یک سین سه‌بعدی، صفحه‌های About با فضای منفی زیاد.' },
  { id: 'fs', label: 'FS', sub: 'Full Shot', fa: 'نمای کامل', en: 'Full Shot (FS)', range: [-0.08, 1.92],
    text: 'از سر تا پا، بدن کادر را پر می‌کند. زبان بدن، لباس و حرکت کامل دیده می‌شود.',
    use: 'نمایش کاراکتر/آواتار کامل، کانفیگوریتور لباس، صفحه‌ی انتخاب کاراکتر در بازی.' },
  { id: 'mws', label: 'MWS', sub: 'Cowboy', fa: 'نمای مدیوم باز (کابوی)', en: 'Medium Wide / Cowboy Shot', range: [0.55, 1.88],
    text: 'از وسط ران تا بالای سر. در وسترن‌ها برای دیدن اسلحه روی کمر ساخته شد. حالت ایستادن و اکشن را با جزئیات صورت ترکیب می‌کند.',
    use: 'کارت معرفی تیم، اسپلش‌اسکرین بازی، ویدیوهای پرزنتیشن.' },
  { id: 'ms', label: 'MS', sub: 'Medium', fa: 'نمای مدیوم', en: 'Medium Shot (MS)', range: [0.95, 1.86],
    text: 'از کمر به بالا. نمای «خنثی» و پرکاربرد برای دیالوگ؛ هم حالت دست‌ها و هم صورت دیده می‌شود.',
    use: 'ویدیوهای آموزشی، استریم، اواتار دستیار در UI، بیشتر نماهای گفت‌وگو.' },
  { id: 'mcu', label: 'MCU', sub: 'Medium Close-Up', fa: 'نمای مدیوم کلوزآپ', en: 'Medium Close-Up (MCU)', range: [1.24, 1.84],
    text: 'از سینه به بالا. صمیمی‌تر از مدیوم؛ تمرکز روی صورت با کمی زبان بدن.',
    use: 'تصویر پروفایل، ویدیوکال، اواتار در چت، Testimonialها.' },
  { id: 'cu', label: 'CU', sub: 'Close-Up', fa: 'کلوزآپ', en: 'Close-Up (CU)', range: [1.44, 1.81],
    text: 'صورت کادر را پر می‌کند. احساس را مستقیم به مخاطب منتقل می‌کند؛ کوچک‌ترین تغییر چهره بزرگ دیده می‌شود.',
    use: 'لحظه‌ی احساسی در storytelling اسکرولی، Hover روی کارت که روی چهره زوم می‌کند.' },
  { id: 'ecu', label: 'ECU', sub: 'Extreme Close-Up', fa: 'اکستریم کلوزآپ', en: 'Extreme Close-Up (ECU)', range: [1.6, 1.705],
    text: 'فقط یک جزء: چشم‌ها، لب، انگشت. شدت و تنش بالا؛ جزئیاتی را نشان می‌دهد که در زندگی واقعی هرگز این‌قدر نزدیک نمی‌بینیم.',
    use: 'ماکروی محصول (بافت، دوخت، قطعه)، لحظه‌ی اوج در موشن‌گرافیک، ترنزیشن «ورود به چشم».' },
  { id: 'insert', label: 'Insert', sub: 'Insert Shot', fa: 'اینسرت', en: 'Insert Shot', custom: true,
    text: 'نمای نزدیک از یک <b>شیء</b> (نامه، ساعت، گوشی) که اطلاعات مهمی به داستان می‌دهد. معمولاً بین نماهای دیگر «قرار داده می‌شود».',
    use: 'هایلایت یک فیچر محصول، نمایش نوتیفیکیشن یا جزئیات UI داخل یک سکانس سه‌بعدی.' },
];

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 35 });
  const { scene } = stage;
  createSet(scene, { fog: [60, 220] });

  const actor = createActor({ color: COLORS.amber });
  actor.rotation.y = 0.35;
  scene.add(actor);

  // میز و شیء برای Insert
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a4636 }));
  table.position.set(0.9, 0.9, 0.35);
  table.castShadow = table.receiveShadow = true;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9), table.material);
  leg.position.set(0.9, 0.45, 0.35);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }));
  phone.position.set(0.88, 0.93, 0.38);
  phone.rotation.y = 0.4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.135), new THREE.MeshBasicMaterial({ color: 0x5fd0ff }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.0045;
  phone.add(screen);
  scene.add(table, leg, phone);

  stage.onTick((dt, t) => {
    animateIdle(actor, t);
    screen.material.color.setHSL(0.55, 0.9, 0.55 + Math.sin(t * 4) * 0.12);
  });

  let animate = true;

  function stateFor(shot) {
    if (shot.custom) {
      return { x: 1.05, y: 1.22, z: 0.72, tx: 0.88, ty: 0.93, tz: 0.38, focal: 50, roll: 0 };
    }
    const [lo, hi] = shot.range;
    const hgt = hi - lo;
    const cy = shot.camY ?? (lo + hi) / 2;
    const d = stage.distanceForHeight(hgt, 35);
    // دوربین کمی از سمت راست (زاویه‌ی سه‌رخ) و هم‌ارتفاع مرکز کادر
    const ang = 0.12;
    return { x: Math.sin(ang) * d, y: Math.max(cy, 0.3), z: Math.cos(ang) * d, tx: 0, ty: (lo + hi) / 2, tz: 0, focal: 35, roll: 0 };
  }

  function show(shot) {
    group.select(shot.id);
    const st = stateFor(shot);
    animate ? stage.moveTo(st, { duration: 1.5, ease: 'power3.inOut' }) : stage.cutTo(st);
    stage.setHUD(`<span class="hud-tag">${shot.label}</span><span>${shot.en}</span>`);
    const code = shot.custom
      ? `// Insert: دوربین نزدیک و از بالا روی شیء
gsap.to(cam, { x: 1.05, y: 1.22, z: 0.72, tx: 0.88, ty: 0.93, tz: 0.38, focal: 50 });`
      : `// کادر = از ${shot.range[0]}m تا ${shot.range[1]}m روی بدن
const d = frameHeight(${(shot.range[1] - shot.range[0]).toFixed(2)}, camera); // ≈ ${stateFor(shot).z.toFixed(2)}m
gsap.to(cam, { z: d, ty: ${((shot.range[0] + shot.range[1]) / 2).toFixed(2)}, duration: 1.5, ease: 'power3.inOut' });`;
    setInfo(info, { fa: shot.fa, en: shot.en, text: shot.text, use: shot.use, code });
  }

  const group = buttonGroup(controls, SHOTS, show, { label: 'اندازه نما' });
  toggle(controls, { label: 'حرکت نرم بین نماها (خاموش = کات)', value: true, onChange: (v) => (animate = v) });

  stage.cutTo(stateFor(SHOTS[4]));
  show(SHOTS[4]);
}
