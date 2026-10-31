import { Stage } from '../lib/stage.js';
import { createSet, createActor, animateIdle, COLORS } from '../lib/set.js';
import { shell, buttonGroup, slider, setInfo } from '../lib/ui.js';

const ANGLES = [
  { id: 'eye', label: 'Eye Level', fa: 'هم‌سطح چشم', cam: { x: 0.5, y: 1.65, z: 3.2, tx: 0, ty: 1.5, tz: 0 },
    text: 'دوربین هم‌ارتفاع چشم بازیگر. خنثی‌ترین زاویه؛ مخاطب با شخصیت «برابر» است.',
    use: 'پیش‌فرض بیشتر سین‌ها و کانفیگوریتورها؛ حس صادقانه و بدون قضاوت.' },
  { id: 'low', label: 'Low Angle', fa: 'زاویه‌ی پایین', cam: { x: 0.4, y: 0.55, z: 2.6, tx: 0, ty: 1.45, tz: 0 },
    text: 'دوربین پایین‌تر از چشم و رو به بالا. شخصیت قدرتمند، مسلط یا تهدیدکننده دیده می‌شود.',
    use: 'معرفی «قهرمان» یا محصول پرچم‌دار، باس‌فایت در بازی، لوگوی بزرگ و باشکوه.' },
  { id: 'high', label: 'High Angle', fa: 'زاویه‌ی بالا', cam: { x: 0.4, y: 3.4, z: 2.6, tx: 0, ty: 1.1, tz: 0 },
    text: 'دوربین بالاتر از سوژه و رو به پایین. شخصیت کوچک، آسیب‌پذیر یا تحت کنترل به نظر می‌رسد.',
    use: 'نمایش ضعف یا «Game Over»، نمای کلی میز کار/محصول روی سطح.' },
  { id: 'overhead', label: 'Overhead', fa: 'عمود از بالا', cam: { x: 0.02, y: 5.5, z: 0.05, tx: 0, ty: 0, tz: 0 },
    text: 'دوربین دقیقاً عمود بالای سوژه (God\'s eye / Top shot). الگوها، چیدمان و جغرافیا را گرافیکی نشان می‌دهد.',
    use: 'Flat-lay محصولات، نمای نقشه، بازی‌های top-down، دسته‌بندی آیتم‌ها.' },
  { id: 'birds', label: "Bird's Eye", fa: 'نمای پرنده', cam: { x: 8, y: 22, z: 18, tx: 0, ty: 0, tz: 0 },
    text: 'خیلی بالا و دور (مثل پهپاد). موقعیت شخصیت در جهان و مقیاس محیط را نشان می‌دهد.',
    use: 'نقشه‌ی تعاملی، معرفی شهر/کمپوس، ترنزیشن بین بخش‌ها.' },
  { id: 'shoulder', label: 'Shoulder Level', fa: 'هم‌سطح شانه', cam: { x: 0.45, y: 1.42, z: 3, tx: 0, ty: 1.45, tz: 0 },
    text: 'کمی پایین‌تر از چشم. بازیگر کمی بلندتر و قوی‌تر از حالت Eye Level دیده می‌شود؛ رایج‌ترین ارتفاع واقعی در فیلم.',
    use: 'یک جایگزین ظریف برای Low Angle وقتی نمی‌خواهید اغراق کنید.' },
  { id: 'hip', label: 'Hip Level', fa: 'هم‌سطح لگن', cam: { x: 0.5, y: 0.9, z: 3, tx: 0, ty: 1.05, tz: 0 },
    text: 'دوربین در ارتفاع کمر/لگن؛ مثل نماهای اسلحه‌کشی وسترن یا وقتی شخصیت دست به کمر است.',
    use: 'تاکید روی اکشن دست‌ها، ابزار یا آیتم روی کمر کاراکتر.' },
  { id: 'knee', label: 'Knee Level', fa: 'هم‌سطح زانو', cam: { x: 0.5, y: 0.45, z: 3, tx: 0, ty: 0.75, tz: 0 },
    text: 'ارتفاع زانو. حس برتری شخصیت بدون اغراق Low Angle؛ اغلب برای ورود دراماتیک یا راه رفتن.',
    use: 'نمای راه‌رفتن کاراکتر در اینترو، ورود محصول به صحنه.' },
  { id: 'ground', label: 'Ground Level', fa: 'هم‌سطح زمین', cam: { x: 0.6, y: 0.08, z: 2.6, tx: 0, ty: 0.25, tz: 0 },
    text: 'دوربین روی زمین. چیزهایی که روی زمین اتفاق می‌افتد (قدم‌ها، اشیای افتاده) بزرگ می‌شوند.',
    use: 'نمایش کفش/محصولات کف، شروع یک سکانس با قدم‌ها.' },
  { id: 'worm', label: "Worm's Eye", fa: 'چشم کرم', cam: { x: 0.15, y: 0.05, z: 0.9, tx: 0, ty: 2.4, tz: -0.4 },
    text: 'از زمین و تقریباً عمود به بالا. اغراق شدید در عظمت؛ سوژه مثل برج دیده می‌شود.',
    use: 'معماری، آسمان‌خراش‌ها، لحظه‌ی «غول‌آسا» شدن.' },
  { id: 'dutch', label: 'Dutch Angle', fa: 'زاویه‌ی هلندی (کج)', cam: { x: 0.5, y: 1.6, z: 3, tx: 0, ty: 1.45, tz: 0, roll: 18 },
    text: 'دوربین حول محور لنز می‌چرخد و خط افق کج می‌شود. ناآرامی، جنون، سرگیجه یا اینکه «چیزی درست نیست».',
    use: 'صحنه‌های گلیچ/ارور، حالت مستی در بازی، هیجان در موشن‌گرافیک. با <code>camera.rotateZ()</code> بعد از <code>lookAt</code>.' },
];

export function mount(root) {
  const { stageHost, controls, info } = shell(root);
  const stage = new Stage(stageHost, { focal: 30, inset: true });
  const { scene } = stage;
  createSet(scene);
  const actor = createActor({ color: COLORS.teal, hair: 0x6b4a2b });
  actor.rotation.y = 0.25;
  scene.add(actor);
  stage.onTick((dt, t) => animateIdle(actor, t));

  let current = ANGLES[0];

  function show(a) {
    current = a;
    group.select(a.id);
    stage.moveTo({ roll: 0, focal: 30, ...a.cam }, { duration: 1.6, ease: 'power3.inOut' });
    rollSlider.set(a.cam.roll ?? 0, true);
    stage.setHUD(`<span class="hud-tag">${a.label}</span><span>${a.fa}</span>`);
    const c = a.cam;
    setInfo(info, {
      fa: a.fa, en: a.label, text: a.text, use: a.use,
      code: `// ارتفاع دوربین نسبت به چشم سوژه (۱.۶۵m) زاویه را می‌سازد
camera.position.set(${c.x}, ${c.y}, ${c.z});
camera.lookAt(${c.tx}, ${c.ty}, ${c.tz});${c.roll ? `\ncamera.rotateZ(THREE.MathUtils.degToRad(${c.roll})); // Dutch` : ''}`,
    });
  }

  const group = buttonGroup(controls, ANGLES, show, { label: 'زاویه دوربین' });
  const rollSlider = slider(controls, {
    label: 'Roll (Dutch)', min: -45, max: 45, step: 1, value: 0, format: (v) => `${v}°`,
    onInput: (v) => stage.moveTo({ roll: v }, { duration: 0.3, ease: 'power1.out' }),
  });

  stage.cutTo({ roll: 0, focal: 30, ...ANGLES[0].cam });
  show(ANGLES[0]);
}
