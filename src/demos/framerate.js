import { shell, buttonGroup, slider, setInfo, h } from '../lib/ui.js';

/**
 * مدل دقیق دوربین سینما:
 *   - فریم k در لحظه‌ی  k / captureFps  از «زمان صحنه» گرفته می‌شود
 *   - شاتر به اندازه‌ی  (shutterAngle / 360) / captureFps  ثانیه باز می‌ماند ⇒ موشن بلور
 *   - فریم‌ها با playbackFps پخش می‌شوند ⇒ سرعت = playback / capture
 */
export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const canvas = h('canvas', { class: 'fr-canvas' });
  const wrap = h('div', { class: 'stage fr-stage' }, canvas);
  const hud = h('div', { class: 'stage-hud' });
  wrap.append(hud);
  stageHost.append(wrap);
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');

  const s = { capture: 24, playback: 24, shutter: 180, wheel: 1.2, samples: 14 };
  let W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(devicePixelRatio, 2);
    W = wrap.clientWidth; H = wrap.clientHeight;
    for (const c of [canvas, off]) { c.width = W * dpr; c.height = H * dpr; }
    lastFrame = -1;
  }
  new ResizeObserver(resize).observe(wrap);

  /** صحنه در زمان پیوسته‌ی t (ثانیه) */
  function drawScene(g, t) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0d1017';
    g.fillRect(0, 0, W, H);
    // خط زمین
    g.strokeStyle = '#232837'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }

    // ۱) چرخ ۸ پره — اثر واگن‌ویل (Wagon-wheel)
    const cx = W * 0.26, cy = H * 0.5, R = Math.min(W, H) * 0.3;
    const ang = t * s.wheel * Math.PI * 2;
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.strokeStyle = '#e0a458'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke();
    }
    g.fillStyle = '#ff5a36';
    g.beginPath(); g.arc(R * 0.85, 0, 9, 0, Math.PI * 2); g.fill(); // نشانگر برای دیدن جهت واقعی
    g.restore();

    // ۲) توپ با حرکت سینوسی سریع
    const bx = W * 0.58 + Math.sin(t * 2.4) * W * 0.18;
    const by = H * 0.32 + Math.abs(Math.sin(t * 4.8)) * -H * 0.12 + H * 0.12;
    g.fillStyle = '#4fb3bf';
    g.beginPath(); g.arc(bx, by, Math.min(W, H) * 0.06, 0, Math.PI * 2); g.fill();

    // ۳) آونگ
    const px = W * 0.74, py = H * 0.5, L = H * 0.36;
    const pa = Math.sin(t * 3.2) * 0.9;
    const ex = px + Math.sin(pa) * L, ey = py + Math.cos(pa) * L;
    g.strokeStyle = '#9b7ede'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = '#9b7ede';
    g.beginPath(); g.arc(ex, ey, 12, 0, Math.PI * 2); g.fill();
  }

  /** رندر یک فریم «فیلم» با شبیه‌سازی موشن بلور (میانگین چند زیر-نمونه در زمان باز بودن شاتر) */
  function renderFrame(k) {
    if (!off.width || !off.height) return; // هنوز اندازه نگرفته
    const start = k / s.capture;
    const exposure = (s.shutter / 360) / s.capture;
    const n = s.shutter <= 1 ? 1 : s.samples;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) {
      const t = start + (n === 1 ? 0 : (exposure * i) / (n - 1));
      drawScene(octx, t);
      ctx.globalAlpha = 1 / (i + 1); // میانگین متحرک
      ctx.drawImage(off, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  let clock = 0, lastFrame = -1, prev = performance.now(), running = false;
  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;
    clock += dt;
    const shown = Math.floor(clock * s.playback);
    if (shown !== lastFrame) {
      lastFrame = shown;
      renderFrame(shown);
      updateHUD(shown);
    }
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running) { prev = performance.now(); requestAnimationFrame(loop); }
  }).observe(wrap);

  function updateHUD(k) {
    const speed = s.playback / s.capture;
    const label = speed < 0.99 ? `اسلوموشن ×${(1 / speed).toFixed(1)} آهسته‌تر` : speed > 1.01 ? `تایم‌لپس/تند ×${speed.toFixed(1)}` : 'سرعت واقعی';
    const shutterSpeed = Math.round(1 / ((s.shutter / 360) / s.capture));
    hud.innerHTML = `<span class="hud-tag">${s.capture}fps → ${s.playback}fps</span>
      <span>${label} · شاتر ${s.shutter}° ≈ 1/${shutterSpeed}s · فریم ${k}</span>`;
  }

  const CAP = [6, 12, 24, 30, 48, 60, 120, 240].map((v) => ({ id: v, label: `${v}`, sub: 'fps' }));
  const capGroup = buttonGroup(controls, CAP, (it) => { s.capture = it.id; clock = 0; describe(); }, { label: 'فریم‌ریت ضبط (Capture)' });
  const playGroup = buttonGroup(controls, [24, 30, 60].map((v) => ({ id: v, label: `${v}`, sub: 'fps' })),
    (it) => { s.playback = it.id; clock = 0; describe(); }, { label: 'فریم‌ریت پخش (Playback)' });
  const SH = [1, 45, 90, 180, 270, 360].map((v) => ({ id: v, label: v === 1 ? '~0°' : `${v}°` }));
  const shGroup = buttonGroup(controls, SH, (it) => { s.shutter = it.id; lastFrame = -1; describe(); }, { label: 'زاویه‌ی شاتر (Shutter Angle)' });
  slider(controls, { label: 'سرعت چرخ', min: 0, max: 6, step: 0.05, value: s.wheel, format: (v) => `${(+v).toFixed(2)} دور/ثانیه`, onInput: (v) => (s.wheel = v) });

  buttonGroup(controls, [
    { id: 'cinema', label: 'سینمایی', sub: '24 / 180°' },
    { id: 'slowmo', label: 'Slow Motion', sub: '120 → 24' },
    { id: 'timelapse', label: 'Time-lapse', sub: '6 → 24' },
    { id: 'saving', label: 'Saving Private Ryan', sub: '24 / 45°' },
    { id: 'wagon', label: 'Wagon-wheel', sub: '3 rev/s' },
    { id: 'game', label: 'بازی / UI', sub: '60 / ~0°' },
  ], (it) => {
    const P = {
      cinema: [24, 24, 180], slowmo: [120, 24, 180], timelapse: [6, 24, 180],
      saving: [24, 24, 45], wagon: [24, 24, 180], game: [60, 60, 1],
    }[it.id];
    [s.capture, s.playback, s.shutter] = P;
    if (it.id === 'wagon') { s.wheel = 3; } else if (s.wheel === 3) s.wheel = 1.2;
    capGroup.select(s.capture); playGroup.select(s.playback); shGroup.select(s.shutter);
    clock = 0; lastFrame = -1;
    describe(it.id);
  }, { label: 'پریست‌ها', multi: true });

  const TEXT = {
    cinema: ['۲۴fps با شاتر ۱۸۰°', 'Cinematic standard', 'استاندارد سینما از دهه‌ی ۱۹۲۰. هر فریم ۱/۴۸ ثانیه نور می‌گیرد؛ کمی موشن‌بلور که چشم ما آن را «سینمایی» می‌شناسد.'],
    slowmo: ['اسلوموشن', 'Overcranking', 'با فریم‌ریت بالا ضبط و با ۲۴ پخش ⇒ هر ثانیه‌ی واقعی ۵ ثانیه طول می‌کشد. برای تأکید، زیبایی، جزئیات اکشن.'],
    timelapse: ['تایم‌لپس / تند', 'Undercranking', 'فریم‌ریت ضبط پایین‌تر از پخش ⇒ زمان فشرده می‌شود. کمدی‌های صامت، گذر زمان، شلوغی شهر.'],
    saving: ['شاتر باریک', 'Narrow Shutter (45°)', 'زمان نوردهی کوتاه ⇒ هر فریم تیز و بی‌بلور و حرکت «بریده‌بریده» (staccato). حس اضطراب و شوک جنگ — Saving Private Ryan و Gladiator.'],
    wagon: ['اثر واگن‌ویل', 'Wagon-wheel / Stroboscopic', 'چرخ ۸ پره در ۳ دور بر ثانیه دقیقاً در هر فریم ۱/۸ دور می‌چرخد ⇒ ثابت یا حتی برعکس دیده می‌شود (Aliasing زمانی). سرعت چرخ را کمی تغییر دهید.'],
    game: ['بازی و UI', 'Real-time 60fps', 'در رندر Real-time، هر فریم «لحظه‌ای» است (شاتر ≈ ۰°) و موشن‌بلور وجود ندارد مگر آن را بسازیم. به همین دلیل ۲۴fps در بازی «لگ» حس می‌شود ولی در فیلم نه.'],
  };
  function describe(id) {
    const [fa, en, text] = TEXT[id] ?? [
      `${s.capture}fps → ${s.playback}fps · ${s.shutter}°`, 'Frame Rate & Shutter',
      'ضبط با فریم‌ریت متفاوت از پخش، سرعت را تغییر می‌دهد؛ زاویه‌ی شاتر میزان موشن‌بلور هر فریم را تعیین می‌کند.',
    ];
    setInfo(info, {
      fa, en, text,
      code: `// زمان صحنه برای فریم k و مدت باز بودن شاتر
const sceneTime = k / ${s.capture};                 // captureFps
const exposure  = (${s.shutter} / 360) / ${s.capture};      // ثانیه
// پخش: هر 1/${s.playback} ثانیه یک فریم ⇒ سرعت = ${s.playback}/${s.capture} = ×${(s.playback / s.capture).toFixed(2)}
for (let i = 0; i < N; i++) {                        // موشن بلور با میانگین زیرنمونه‌ها
  drawScene(off, sceneTime + exposure * i / (N - 1));
  ctx.globalAlpha = 1 / (i + 1);  ctx.drawImage(off, 0, 0);
}`,
    });
  }

  capGroup.select(24); playGroup.select(24); shGroup.select(180);
  describe('cinema');
}
