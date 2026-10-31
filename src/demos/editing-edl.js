import gsap from 'gsap';
import { shell, buttonGroup, setInfo, h } from '../lib/ui.js';

/**
 * EDL (Edit Decision List) = آرایه‌ای از کلیپ‌ها با مدت زمان.
 * در کد، تدوین یعنی ساختن یک GSAP timeline از روی همین داده.
 */
const CLIPS = {
  face: { emoji: '😐', cap: 'چهره‌ی خنثی', bg: '#2a2f3a' },
  soup: { emoji: '🍲', cap: 'کاسه‌ی سوپ', bg: '#5a3b1e' },
  coffin: { emoji: '⚰️', cap: 'تابوت', bg: '#1b1b1f' },
  child: { emoji: '🧸', cap: 'کودک در حال بازی', bg: '#2f5b4b' },
  train: { emoji: '🚂', cap: 'قطار نزدیک می‌شود', bg: '#4a1f1f' },
  hero: { emoji: '🏃', cap: 'قهرمان می‌دود', bg: '#1f3a4a' },
  rails: { emoji: '🪢', cap: 'گروگان روی ریل', bg: '#3a2f1f' },
  saved: { emoji: '🙌', cap: 'نجات!', bg: '#2f5b2f' },
  alarm: { emoji: '⏰', cap: '۵ صبح', bg: '#2a2f3a' },
  run: { emoji: '🏃‍♀️', cap: 'دویدن', bg: '#1f3a4a' },
  lift: { emoji: '🏋️', cap: 'وزنه', bg: '#4a3a1f' },
  box: { emoji: '🥊', cap: 'کیسه بوکس', bg: '#4a1f2a' },
  stairs: { emoji: '🪜', cap: 'پله‌ها', bg: '#2f2a4a' },
  win: { emoji: '🏆', cap: '۳ ماه بعد…', bg: '#5a4a1e' },
  talk: { emoji: '🗣️', cap: 'مصاحبه‌شونده حرف می‌زند', bg: '#2a2f3a' },
  broll: { emoji: '🏭', cap: 'Cutaway: کارخانه', bg: '#3a3a3a' },
  hands: { emoji: '🤲', cap: 'Cutaway: دست‌ها', bg: '#3a2f2a' },
  door: { emoji: '🚪', cap: 'دست روی دستگیره…', bg: '#2a2f3a' },
  door2: { emoji: '🚪', cap: '…در باز می‌شود (Cut on action)', bg: '#3a3f4a' },
};

const SEQ = {
  kuleshov: {
    fa: 'اثر کولشوف', en: 'Kuleshov Effect',
    text: 'یک چهره‌ی <b>کاملاً یکسان</b> کنار تصاویر مختلف قرار می‌گیرد و مخاطب احساسات متفاوتی (گرسنگی، غم، محبت) در آن «می‌بیند». معنا از <b>کنار هم قرار گرفتن</b> نماها ساخته می‌شود، نه از خود نما.',
    use: 'ترتیب کارت‌ها/تصاویر در لندینگ معنا را عوض می‌کند؛ یک تصویر محصول کنار تصاویر مختلف، پیام متفاوت می‌دهد.',
    edl: [['face', 1.2], ['soup', 1.2], ['face', 1.2], ['coffin', 1.2], ['face', 1.2], ['child', 1.2], ['face', 1.2]],
  },
  cross: {
    fa: 'برش موازی', en: 'Cross-cutting / Parallel Editing',
    text: 'دو (یا چند) رویداد هم‌زمان در مکان‌های مختلف یک‌درمیان نمایش داده می‌شوند. با <b>کوتاه شدن تدریجی</b> نماها، تعلیق به اوج می‌رسد (گریفیث، نولان).',
    use: 'روایت هم‌زمان دو داستان در اسکرول؛ ریتم = ease روی مدت کلیپ‌ها.',
    edl: [['train', 1.6], ['hero', 1.6], ['rails', 1.3], ['train', 1.0], ['hero', 0.8], ['rails', 0.65], ['train', 0.5], ['hero', 0.4], ['rails', 0.35], ['train', 0.3], ['hero', 0.3], ['saved', 1.8]],
  },
  montage: {
    fa: 'مونتاژ', en: 'Montage',
    text: 'دنباله‌ای از نماهای کوتاه که <b>گذر زمان یا یک فرایند</b> را فشرده می‌کند (مونتاژ تمرین راکی). اغلب روی موسیقی و با ریتم ثابت.',
    use: 'معرفی فیچرها پشت سر هم، استوری‌های اینستاگرام، تایم‌لاین «چطور کار می‌کند».',
    edl: [['alarm', 0.6], ['run', 0.6], ['lift', 0.6], ['box', 0.6], ['stairs', 0.6], ['run', 0.5], ['lift', 0.5], ['box', 0.5], ['stairs', 0.5], ['win', 2]],
  },
  cutaway: {
    fa: 'کات‌اوی', en: 'Cutaway',
    text: 'قطع موقت به نمایی مرتبط (B-roll) و برگشت به نمای اصلی. اطلاعات بصری اضافه می‌کند و پرش‌های تدوین مصاحبه را پنهان می‌کند.',
    use: 'وسط ویدیوی محصول، نمایش UI یا جزئیات؛ پوشاندن تغییر state با یک انیمیشن فرعی.',
    edl: [['talk', 2], ['broll', 1.4], ['talk', 1.6], ['hands', 1.2], ['talk', 1.8]],
  },
  action: {
    fa: 'کات روی حرکت', en: 'Cutting on Action',
    text: 'کات دقیقاً <b>وسط یک حرکت</b> انجام می‌شود و حرکت در نمای بعد ادامه می‌یابد. چشم دنبال حرکت است و کات را نمی‌بیند — پایه‌ی تدوین تداومی (Continuity).',
    use: 'تعویض صفحه/کامپوننت دقیقاً وسط انیمیشن کلیک (نه قبل یا بعد آن) تا تعویض نامرئی شود.',
    edl: [['door', 1.3], ['door2', 1.6], ['talk', 1.4]],
  },
};

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const view = h('div', { class: 'edl-view' });
  const emoji = h('div', { class: 'edl-emoji' });
  const cap = h('div', { class: 'edl-cap' });
  const tc = h('div', { class: 'edl-tc', dir: 'ltr' });
  view.append(emoji, cap, tc);
  const frame = h('div', { class: 'stage edl-stage' }, view);
  const timeline = h('div', { class: 'edl-timeline', dir: 'ltr' });
  stageHost.append(frame, timeline);

  let tl = null;

  function show(key) {
    const c = CLIPS[key];
    view.style.background = `radial-gradient(circle at 50% 40%, ${c.bg}, #07080b 80%)`;
    emoji.textContent = c.emoji;
    cap.textContent = c.cap;
    gsap.fromTo(emoji, { scale: 0.92 }, { scale: 1, duration: 0.25, ease: 'power2.out' });
  }

  function play(id) {
    const s = SEQ[id];
    tl?.kill();
    const total = s.edl.reduce((a, [, d]) => a + d, 0);
    timeline.innerHTML = '';
    const blocks = s.edl.map(([key, d]) => {
      const b = h('i', { class: 'edl-clip', style: `flex:${d}` }, h('span', {}, CLIPS[key].emoji), h('small', {}, `${d}s`));
      timeline.append(b);
      return b;
    });
    const head = h('b', { class: 'edl-playhead' });
    timeline.append(head);

    // ساخت timeline از روی EDL
    tl = gsap.timeline();
    let t = 0;
    s.edl.forEach(([key, d], i) => {
      tl.call(() => { show(key); blocks.forEach((b, j) => b.classList.toggle('on', j === i)); }, null, t);
      t += d;
    });
    tl.fromTo(head, { left: '0%' }, { left: '100%', duration: total, ease: 'none' }, 0);
    tl.eventCallback('onUpdate', () => { tc.textContent = `00:00:${tl.time().toFixed(2).padStart(5, '0')}`; });

    setInfo(info, {
      fa: s.fa, en: s.en, text: s.text, use: s.use,
      code: `const EDL = ${JSON.stringify(s.edl.slice(0, 4))}${s.edl.length > 4 ? ' /* … */' : ''};
const tl = gsap.timeline();
let t = 0;
for (const [clip, dur] of EDL) {
  tl.call(() => showClip(clip), null, t);   // «کات» در زمان t
  t += dur;
}
// سرعت کل تدوین: tl.timeScale(1.5)  ·  اسکراب با اسکرول: ScrollTrigger.create({ animation: tl, scrub: true })`,
    });
  }

  buttonGroup(controls, Object.entries(SEQ).map(([id, s]) => ({ id, label: `▶ ${s.fa}`, sub: s.en })), (it) => play(it.id), { label: 'تکنیک‌های تدوین' });
  show('face');
  setInfo(info, { fa: 'یک تکنیک را پخش کنید', en: 'Editing Techniques', text: 'هر دکمه یک EDL (لیست تصمیم‌های تدوین) را به یک GSAP timeline تبدیل می‌کند و پخش می‌کند.' });
}
