import * as THREE from 'three';
import gsap from 'gsap';
import { shell, buttonGroup, setInfo, h } from '../lib/ui.js';

/* ---------- ساخت «نماها» با Canvas (بدون فایل تصویری) ---------- */
const SW = 1280, SH = 720;
const SUN = { x: 0.62, y: 0.42, r: 0.15 }; // دایره در هر دو نما هم‌جا ⇒ Match Cut

function figure(g, x, y, s, color) {
  g.fillStyle = color;
  g.beginPath(); g.arc(x, y - 60 * s, 13 * s, 0, Math.PI * 2); g.fill();
  g.fillRect(x - 12 * s, y - 46 * s, 24 * s, 46 * s);
  g.fillRect(x - 10 * s, y, 8 * s, 34 * s); g.fillRect(x + 2 * s, y, 8 * s, 34 * s);
}

export function drawShot(kind, figX = 0.3) {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const g = c.getContext('2d');
  if (kind === 'A') {
    const sky = g.createLinearGradient(0, 0, 0, SH);
    sky.addColorStop(0, '#2b1055'); sky.addColorStop(0.45, '#d9455f'); sky.addColorStop(0.75, '#f7b267');
    g.fillStyle = sky; g.fillRect(0, 0, SW, SH);
    g.fillStyle = '#ffe29a';
    g.beginPath(); g.arc(SUN.x * SW, SUN.y * SH, SUN.r * SH, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a2e3a';
    g.beginPath(); g.moveTo(0, SH * 0.72);
    for (let x = 0; x <= SW; x += 40) g.lineTo(x, SH * 0.72 - Math.sin(x / 210) * 40 - Math.sin(x / 90) * 12);
    g.lineTo(SW, SH); g.lineTo(0, SH); g.fill();
    g.fillStyle = '#3d1424';
    g.beginPath(); g.moveTo(0, SH * 0.82);
    for (let x = 0; x <= SW; x += 40) g.lineTo(x, SH * 0.82 - Math.cos(x / 260) * 30);
    g.lineTo(SW, SH); g.lineTo(0, SH); g.fill();
    figure(g, figX * SW, SH * 0.79, 1.6, '#1a0912');
  } else {
    const sky = g.createLinearGradient(0, 0, 0, SH);
    sky.addColorStop(0, '#020617'); sky.addColorStop(0.6, '#0b2547'); sky.addColorStop(1, '#13406b');
    g.fillStyle = sky; g.fillRect(0, 0, SW, SH);
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#cfe8ff';
    for (let i = 0; i < 160; i++) g.fillRect(rnd() * SW, rnd() * SH * 0.6, 2, 2);
    const moon = g.createRadialGradient(SUN.x * SW, SUN.y * SH, 0, SUN.x * SW, SUN.y * SH, SUN.r * SH * 1.6);
    moon.addColorStop(0, '#f3f7ff'); moon.addColorStop(0.62, '#d4e2ff'); moon.addColorStop(0.64, 'rgba(120,170,255,.25)'); moon.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = moon;
    g.beginPath(); g.arc(SUN.x * SW, SUN.y * SH, SUN.r * SH * 1.6, 0, Math.PI * 2); g.fill();
    for (let x = 0; x < SW; x += 70) {
      const bh = 120 + rnd() * 260;
      g.fillStyle = '#050b18'; g.fillRect(x, SH - bh, 64, bh);
      g.fillStyle = rnd() > 0.5 ? '#4fb3bf' : '#ffd166';
      for (let y = SH - bh + 16; y < SH - 10; y += 22) if (rnd() > 0.55) g.fillRect(x + 10 + Math.floor(rnd() * 4) * 12, y, 7, 9);
    }
  }
  g.font = '700 30px "JetBrains Mono Variable", monospace';
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.textAlign = 'right';
  g.fillText(kind === 'A' ? 'SHOT A · DESERT · DUSK' : 'SHOT B · CITY · NIGHT', SW - 36, SH - 34);
  return c;
}

/* ---------- صدا برای J-Cut و L-Cut (Web Audio) ---------- */
let ac = null;
function audioCtx() { ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }

/** صدای نمای A: پد بم و آرام (باد صحرا) */
function soundA(t0, t1) {
  const a = audioCtx();
  const out = a.createGain(); out.connect(a.destination);
  out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(0.16, t0 + 0.3);
  out.gain.setValueAtTime(0.16, t1 - 0.25); out.gain.linearRampToValueAtTime(0, t1);
  for (const f of [110, 164.8, 220.5]) {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    o.connect(out); o.start(t0); o.stop(t1 + 0.05);
  }
}
/** صدای نمای B: آرپژ پالسی (شهر شب) */
function soundB(t0, t1) {
  const a = audioCtx();
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(a.destination);
  const notes = [440, 554.4, 659.3, 880];
  for (let t = t0, i = 0; t < t1; t += 0.14, i++) {
    const o = a.createOscillator(); o.type = 'square'; o.frequency.value = notes[i % 4];
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(lp); o.start(t); o.stop(t + 0.13);
  }
}

/* ---------- شیدر ترنزیشن ---------- */
const TransitionShader = {
  vertex: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragment: /* glsl */ `
    uniform sampler2D tA, tB; uniform float progress, mode, aspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.0; a *= 0.5; } return v; }
    void main(){
      vec2 uv = vUv; vec3 col;
      if (mode < 0.5) {                       // ۱) Burn / Noise dissolve
        float n = fbm(uv * vec2(aspect, 1.0) * 3.5);
        float edge = progress * 1.3 - 0.15;
        float m = smoothstep(edge - 0.015, edge + 0.015, n);
        col = mix(texture2D(tB, uv).rgb, texture2D(tA, uv).rgb, m);
        float glow = smoothstep(0.05, 0.0, abs(n - edge)) * step(0.001, progress) * step(progress, 0.999);
        col += vec3(1.0, 0.45, 0.1) * glow * 1.8;
      } else if (mode < 1.5) {                // ۲) Liquid displacement
        float d = fbm(uv * 3.0 + progress * 1.5) - 0.5;
        vec3 a = texture2D(tA, uv + vec2(d, d * 0.5) * progress * 0.7).rgb;
        vec3 b = texture2D(tB, uv - vec2(d, d * 0.5) * (1.0 - progress) * 0.7).rgb;
        col = mix(a, b, smoothstep(0.2, 0.8, progress));
      } else {                                // ۳) Pixelate
        float p = 1.0 - abs(progress * 2.0 - 1.0);
        vec2 cells = vec2(aspect, 1.0) * mix(500.0, 14.0, pow(p, 0.6));
        vec2 q = (floor(uv * cells) + 0.5) / cells;
        col = progress < 0.5 ? texture2D(tA, q).rgb : texture2D(tB, q).rgb;
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const cA = drawShot('A'), cB = drawShot('B');
  const urlA = cA.toDataURL('image/jpeg', 0.9), urlB = cB.toDataURL('image/jpeg', 0.9);
  const jumps = [0.18, 0.42, 0.66, 0.8].map((x) => drawShot('A', x).toDataURL('image/jpeg', 0.85));

  const imgA = h('img', { class: 'shot', src: urlA, alt: 'Shot A' });
  const imgB = h('img', { class: 'shot', src: urlB, alt: 'Shot B' });
  const black = h('div', { class: 'tr-black' });
  const flash = h('div', { class: 'tr-flash' });
  const gl = h('canvas', { class: 'tr-gl' });
  const frame = h('div', { class: 'stage tr-stage' }, imgB, imgA, gl, black, flash);
  const hud = h('div', { class: 'stage-hud' });
  frame.append(hud);
  stageHost.append(frame);

  // نمایش تراک‌های ویدیو و صدا (برای J/L cut)
  const tracks = h('div', { class: 'tr-tracks', dir: 'ltr' });
  stageHost.append(tracks);
  function drawTracks(v, a) {
    // v = [{from,to,label,cls}], a = همین برای صدا ؛ مقادیر در بازه‌ی 0..1
    const row = (name, segs) => h('div', { class: 'tr-row' }, h('span', { class: 'tr-name' }, name),
      h('div', { class: 'tr-lane' }, segs.map((s) => h('i', { class: `seg ${s.cls}`, style: `left:${s.from * 100}%;width:${(s.to - s.from) * 100}%` }, s.label))));
    tracks.innerHTML = '';
    const head = h('b', { class: 'tr-playhead' });
    tracks.append(row('V1', v), row('A1', a), head);
    return head;
  }

  // WebGL (lazy)
  let glr = null;
  function ensureGL() {
    if (glr) return glr;
    const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const texA = new THREE.CanvasTexture(cA), texB = new THREE.CanvasTexture(cB);
    texA.colorSpace = texB.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tA: { value: texA }, tB: { value: texB }, progress: { value: 0 }, mode: { value: 0 }, aspect: { value: 16 / 9 } },
      vertexShader: TransitionShader.vertex, fragmentShader: TransitionShader.fragment,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const cam = new THREE.Camera();
    const render = () => {
      const w = frame.clientWidth, hh = frame.clientHeight;
      renderer.setSize(w, hh, false);
      mat.uniforms.aspect.value = w / hh;
      renderer.render(scene, cam);
    };
    glr = { mat, render };
    return glr;
  }

  let tl = null;
  function reset() {
    tl?.kill();
    gsap.killTweensOf([imgA, imgB, black, flash, frame, gl]);
    imgA.src = urlA;
    gsap.set(imgA, { autoAlpha: 1, x: 0, xPercent: 0, y: 0, scale: 1, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0%)', zIndex: 2, transformOrigin: '50% 50%' });
    gsap.set(imgB, { autoAlpha: 1, x: 0, xPercent: 0, y: 0, scale: 1, filter: 'blur(0px)', clipPath: 'none', zIndex: 1, transformOrigin: '50% 50%' });
    gsap.set([black, flash], { autoAlpha: 0 });
    gsap.set(frame, { x: 0, y: 0 });
    gsap.set(gl, { autoAlpha: 0 });
    tracks.classList.remove('show');
  }

  const HOLD = 0.7;
  const T = [
    { id: 'cut', label: 'Cut', fa: 'کات', run: (t) => t.set(imgA, { autoAlpha: 0 }, HOLD),
      text: 'ساده‌ترین و پرکاربردترین ترنزیشن: یک فریم A، فریم بعد B. «نامرئی» است چون مغز ما به آن عادت کرده (مثل پلک زدن).',
      use: 'بیشتر تعویض‌های state در UI باید کات باشند — سریع و بدون حواس‌پرتی.',
      code: `gsap.set(shotA, { autoAlpha: 0 }); // بدون duration` },
    { id: 'dissolve', label: 'Cross Dissolve', fa: 'دیزالو', run: (t) => t.to(imgA, { autoAlpha: 0, duration: 1.4, ease: 'none' }, HOLD),
      text: 'A آرام محو و هم‌زمان B ظاهر می‌شود. گذر زمان، رؤیا، خاطره یا ارتباط معنایی دو تصویر.',
      use: 'تعویض اسلایدر تصاویر، crossfade بین بک‌گراندها، View Transitions پیش‌فرض.',
      code: `gsap.to(shotA, { autoAlpha: 0, duration: 1.4, ease: 'none' }); // B زیر A است` },
    { id: 'dip', label: 'Fade to Black', fa: 'فید به سیاه', run: (t) => t.to(black, { autoAlpha: 1, duration: 0.8 }, HOLD).set(imgA, { autoAlpha: 0 }).to(black, { autoAlpha: 0, duration: 0.8 }, '+=0.35'),
      text: 'تصویر به سیاه می‌رود و از سیاه بیرون می‌آید. پایان یک فصل، گذر زمان طولانی، مرگ یا «نفس کشیدن» داستان.',
      use: 'ترنزیشن بین صفحات (route change)، لودینگ بین سین‌های سه‌بعدی.',
      code: `gsap.timeline()
  .to(black, { autoAlpha: 1, duration: 0.8 })
  .call(swapScene)                       // تعویض صحنه در تاریکی
  .to(black, { autoAlpha: 0, duration: 0.8 }, '+=0.35');` },
    { id: 'wipe', label: 'Wipe', fa: 'وایپ', run: (t) => t.to(imgA, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1, ease: 'power2.inOut' }, HOLD),
      text: 'یک لبه‌ی متحرک تصویر جدید را جایگزین می‌کند. بسیار «آگاهانه» و بازیگوش (جنگ ستارگان).',
      use: 'ریویل با clip-path، ترنزیشن بین سکشن‌ها، before/after slider.',
      code: `gsap.to(shotA, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1, ease: 'power2.inOut' });` },
    { id: 'iris', label: 'Iris', fa: 'آیریس', run: (t) => t.set(imgB, { zIndex: 3, clipPath: 'circle(0% at 62% 42%)' }).to(imgB, { clipPath: 'circle(120% at 62% 42%)', duration: 1.4, ease: 'power2.in' }, HOLD),
      text: 'دایره‌ای باز یا بسته می‌شود. نوستالژی سینمای صامت و کارتون؛ توجه را به یک نقطه جمع می‌کند.',
      use: 'ریویل از محل کلیک کاربر (circle at clientX/Y)، ترنزیشن تم روشن/تاریک.',
      code: `gsap.fromTo(shotB, { clipPath: 'circle(0% at 62% 42%)' },
  { clipPath: 'circle(120% at 62% 42%)', duration: 1.4, ease: 'power2.in' });` },
    { id: 'whip', label: 'Whip Pan', fa: 'ویپ پن', run: (t) => t
        .to(imgA, { xPercent: -100, filter: 'blur(18px)', duration: 0.4, ease: 'power4.in' }, HOLD)
        .fromTo(imgB, { xPercent: 100, filter: 'blur(18px)' }, { xPercent: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power4.out' }),
      text: 'یک پن خیلی سریع که با موشن‌بلور دو نما را به هم می‌دوزد. انرژی بالا، کمدی، نماهای پرسرعت (ادگار رایت).',
      use: 'سوییچ تب/کاروسل با blur جهت‌دار، ترنزیشن ویدیوهای تبلیغاتی.',
      code: `gsap.timeline()
  .to(shotA, { xPercent: -100, filter: 'blur(18px)', duration: 0.4, ease: 'power4.in' })
  .fromTo(shotB, { xPercent: 100, filter: 'blur(18px)' },
                 { xPercent: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power4.out' });` },
    { id: 'zoom', label: 'Zoom Through', fa: 'زوم ترنزیشن', run: (t) => t
        .to(imgA, { scale: 4, autoAlpha: 0, filter: 'blur(6px)', duration: 0.9, ease: 'power3.in', transformOrigin: '62% 42%' }, HOLD)
        .fromTo(imgB, { scale: 0.5, filter: 'blur(6px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' }, '-=0.35'),
      text: 'به داخل یک نقطه از نمای A «شیرجه» می‌زنیم و از نمای B بیرون می‌آییم.',
      use: 'ورود به جزئیات یک کارت، ترنزیشن صفحه از روی thumbnail (Shared element).',
      code: `gsap.timeline()
  .to(shotA, { scale: 4, autoAlpha: 0, transformOrigin: '62% 42%', duration: 0.9, ease: 'power3.in' })
  .fromTo(shotB, { scale: 0.5 }, { scale: 1, duration: 0.9, ease: 'power3.out' }, '-=0.35');` },
    { id: 'match', label: 'Match Cut', fa: 'مچ کات', run: (t) => t
        .to(imgA, { scale: 1.25, duration: 1.8, ease: 'power1.in', transformOrigin: '62% 42%' }, 0.2)
        .set(imgB, { scale: 1.25, transformOrigin: '62% 42%' }, '<')
        .set(imgA, { autoAlpha: 0 })
        .to(imgB, { scale: 1, duration: 1.8, ease: 'power1.out' }),
      text: 'کات بین دو نما که یک <b>شکل، حرکت یا رنگ</b> مشترک دارند (اینجا: خورشید ← ماه در همان نقطه). استخوان → سفینه در «۲۰۰۱».',
      use: 'Shared Element / FLIP: یک عنصر (لوگو، دایره، کارت) در دو صفحه هم‌جاست و تعویض «بی‌درز» حس می‌شود.',
      code: `// شکل مشترک در هر دو نما هم‌مختصات است: (62%, 42%)
gsap.timeline()
  .to(shotA, { scale: 1.25, transformOrigin: '62% 42%', duration: 1.8 })
  .set(shotB, { scale: 1.25, transformOrigin: '62% 42%' }, '<')
  .set(shotA, { autoAlpha: 0 })                    // کات
  .to(shotB, { scale: 1, duration: 1.8 });` },
    { id: 'jump', label: 'Jump Cut', fa: 'جامپ کات', run: (t) => {
        jumps.forEach((src, i) => t.call(() => (imgA.src = src), null, HOLD + i * 0.45));
        t.call(() => (imgA.src = urlA), null, HOLD + jumps.length * 0.45 + 0.4);
      },
      text: 'کات بین دو لحظه از <b>همان نما</b>؛ سوژه «می‌پرد». گذر زمان فشرده، بی‌قراری، ریتم ولاگ‌ها (Breathless گدار).',
      use: 'نمایش مراحل/استپ‌ها بدون انیمیشن میانی، کاتِ عمداً خشن در موشن.',
      code: `// تعویض آنی محتوای همان «نما» در فواصل ثابت
frames.forEach((src, i) => tl.call(() => (img.src = src), null, i * 0.45));` },
    { id: 'smash', label: 'Smash Cut', fa: 'اسمش کات', run: (t) => t
        .to(imgA, { filter: 'brightness(0.55) blur(1px)', duration: 1.6, ease: 'none' }, 0)
        .set(imgA, { autoAlpha: 0 })
        .set(flash, { autoAlpha: 0.9 })
        .to(flash, { autoAlpha: 0, duration: 0.35 })
        .fromTo(frame, { x: -14 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' }, '<'),
      text: 'کات ناگهانی از یک لحظه‌ی آرام به یک لحظه‌ی کاملاً متضاد (پرانرژی، بلند، شوکه‌کننده). برای کمدی یا شوک.',
      use: 'بعد از یک اسکرول آرام ناگهان یک سکشن پرانرژی؛ ارورهای بزرگ؛ ریویل تبلیغاتی.',
      code: `gsap.timeline()
  .to(shotA, { filter: 'brightness(.55)', duration: 1.6 })  // آرام‌سازی
  .set(shotA, { autoAlpha: 0 })                              // کات خشن
  .fromTo(flash, { autoAlpha: .9 }, { autoAlpha: 0, duration: .35 })
  .fromTo(frame, { x: -14 }, { x: 0, ease: 'elastic.out(1.2,.3)' }, '<');` },
    { id: 'jcut', label: 'J-Cut 🔊', fa: 'جی کات', audio: 'J',
      text: 'صدای نمای بعدی <b>قبل از</b> تصویرش شروع می‌شود (شکل J روی تایم‌لاین). مخاطب را آماده‌ی صحنه‌ی بعد می‌کند؛ بسیار طبیعی و رایج.',
      use: 'پخش صدای سکشن بعد قبل از رسیدن اسکرول؛ Sound design در اپ‌ها و بازی‌ها.',
      code: `const t0 = audioCtx.currentTime;
playSoundA(t0, t0 + 1.4);            // صدای A تمام می‌شود…
playSoundB(t0 + 1.4, t0 + 4);         // صدای B زودتر شروع می‌شود
gsap.set(shotA, { autoAlpha: 0, delay: 2.4 }); // …تصویر B دیرتر` },
    { id: 'lcut', label: 'L-Cut 🔊', fa: 'ال کات', audio: 'L',
      text: 'تصویر به نمای بعد کات می‌شود ولی <b>صدای نمای قبل ادامه دارد</b> (شکل L). برای دیدن واکنش شنونده یا ادامه‌ی حس صحنه.',
      use: 'ادامه‌ی موزیک/ویس‌اور هنگام تغییر سکشن؛ ترنزیشن‌های نرم صوتی.',
      code: `const t0 = audioCtx.currentTime;
gsap.set(shotA, { autoAlpha: 0, delay: 1.4 }); // تصویر زودتر کات می‌شود
playSoundA(t0, t0 + 2.6);                     // صدای A ادامه دارد
playSoundB(t0 + 2.6, t0 + 4);` },
    { id: 'gl-burn', label: 'Shader: Burn', fa: 'شیدر: سوختن', gl: 0,
      text: 'ترنزیشن‌هایی که در سینما با اپتیکال پرینتر یا افترافکت ساخته می‌شوند، در وب با <b>Fragment Shader</b> و یک عدد progress بین ۰ و ۱ ساخته می‌شوند.',
      use: 'ترنزیشن بین تصاویر/اسلایدها با WebGL (مثل gl-transitions، Curtains.js، OGL).',
      lang: 'glsl',
      code: `float n = fbm(uv * 3.5);                 // نقشه‌ی نویز
float edge = progress * 1.3 - 0.15;
float m = smoothstep(edge - .015, edge + .015, n);
vec3 col = mix(texture2D(tB, uv).rgb, texture2D(tA, uv).rgb, m);
col += vec3(1., .45, .1) * smoothstep(.05, 0., abs(n - edge)); // لبه‌ی سوزان` },
    { id: 'gl-liquid', label: 'Shader: Liquid', fa: 'شیدر: مایع', gl: 1,
      text: 'هر دو تصویر با نقشه‌ی نویز جابه‌جا (displace) می‌شوند و در هم حل می‌شوند.',
      use: 'اسلایدرهای «ارگانیک» در سایت‌های آژانسی و پورتفولیو.',
      lang: 'glsl',
      code: `float d = fbm(uv * 3.0 + progress) - 0.5;
vec3 a = texture2D(tA, uv + d * progress * 0.7).rgb;
vec3 b = texture2D(tB, uv - d * (1.0 - progress) * 0.7).rgb;
gl_FragColor = vec4(mix(a, b, smoothstep(.2, .8, progress)), 1.);` },
    { id: 'gl-pixel', label: 'Shader: Pixelate', fa: 'شیدر: پیکسلی', gl: 2,
      text: 'تصویر درشت‌دانه می‌شود، در اوج تعویض می‌شود و دوباره ریز می‌شود — زبان بازی‌های رترو و گلیچ.',
      use: 'ترنزیشن‌های بازی، تم‌های رترو، loading.',
      lang: 'glsl',
      code: `float p = 1.0 - abs(progress * 2.0 - 1.0);       // 0 → 1 → 0
vec2 cells = vec2(aspect, 1.) * mix(500., 14., p);
vec2 q = (floor(uv * cells) + .5) / cells;
gl_FragColor = progress < .5 ? texture2D(tA, q) : texture2D(tB, q);` },
    { id: 'vt', label: 'View Transitions API', fa: 'View Transitions API', vt: true,
      text: 'API بومی مرورگر: اسنپ‌شات قبل و بعد از تغییر DOM گرفته می‌شود و با CSS انیمیت می‌شود. «کات/دیزالو/وایپ» سینمایی، این بار برای صفحات وب.',
      use: 'ترنزیشن بین route ها در SPA/MPA بدون کتابخانه؛ Shared element با <code>view-transition-name</code>.',
      code: `img.style.viewTransitionName = 'tr-shot';
document.startViewTransition(() => { img.src = shotB; });
/* CSS:
::view-transition-new(tr-shot) { animation: iris-in 1s ease-in; }
@keyframes iris-in { from { clip-path: circle(0% at 62% 42%); } to { clip-path: circle(120% at 62% 42%); } } */` },
  ];

  function play(tr) {
    reset();
    group.select(tr.id);
    hud.innerHTML = `<span class="hud-tag">${tr.label}</span><span>${tr.fa}</span>`;
    setInfo(info, { fa: tr.fa, en: tr.label, text: tr.text, use: tr.use, code: tr.code, lang: tr.lang });
    tl = gsap.timeline();

    if (tr.audio) {
      tracks.classList.add('show');
      const total = 4, cutV = tr.audio === 'J' ? 2.4 : 1.4, cutA = tr.audio === 'J' ? 1.4 : 2.6;
      const head = drawTracks(
        [{ from: 0, to: cutV / total, label: 'A', cls: 'a' }, { from: cutV / total, to: 1, label: 'B', cls: 'b' }],
        [{ from: 0, to: cutA / total, label: '♪ A', cls: 'a' }, { from: cutA / total, to: 1, label: '♪ B', cls: 'b' }],
      );
      const a = audioCtx(); const t0 = a.currentTime + 0.05;
      soundA(t0, t0 + cutA); soundB(t0 + cutA, t0 + total);
      tl.set(imgA, { autoAlpha: 0 }, cutV)
        .fromTo(head, { left: '0%' }, { left: '100%', duration: total, ease: 'none' }, 0);
      return;
    }
    if (tr.gl !== undefined) {
      const g = ensureGL();
      g.mat.uniforms.mode.value = tr.gl;
      g.mat.uniforms.progress.value = 0;
      g.render();
      tl.set(gl, { autoAlpha: 1 })
        .to(g.mat.uniforms.progress, { value: 1, duration: 1.8, ease: 'power1.inOut', onUpdate: g.render }, HOLD)
        .set(imgA, { autoAlpha: 0 });
      return;
    }
    if (tr.vt) {
      if (!document.startViewTransition) {
        setInfo(info, { fa: 'پشتیبانی نمی‌شود', en: 'View Transitions', text: 'مرورگر شما از <code>document.startViewTransition</code> پشتیبانی نمی‌کند (Chrome/Edge 111+، Safari 18+). به‌جای آن دیزالو نمایش داده شد.', code: tr.code });
        tl.to(imgA, { autoAlpha: 0, duration: 1.2 }, HOLD);
        return;
      }
      imgA.style.viewTransitionName = 'tr-shot';
      tl.call(() => { document.startViewTransition(() => { imgA.src = urlB; }); }, null, HOLD);
      return;
    }
    tr.run(tl);
  }

  const group = buttonGroup(controls, T, play, { label: 'ترنزیشن‌ها (کلیک = پخش A → B)' });
  reset();
  hud.innerHTML = '<span class="hud-tag">A → B</span><span>یک ترنزیشن انتخاب کنید</span>';
  setInfo(info, T[0]);
}
