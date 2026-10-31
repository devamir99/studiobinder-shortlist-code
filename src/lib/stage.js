/**
 * Stage — یک «پلاتو» کوچک Three.js برای همه‌ی دموها.
 *
 * ایده‌ی اصلی: دوربین را مثل یک دوربین واقعی با «وضعیت» (state) توصیف می‌کنیم:
 *   موقعیت (x,y,z) + نقطه‌ی هدف (tx,ty,tz) + غلت (roll) + فاصله‌ی کانونی (focal, میلی‌متر)
 *   + شیفت کادر (shiftX/shiftY برای ترکیب‌بندی بدون جابه‌جایی دوربین).
 * هر حرکت دوربین سینمایی = tween کردن همین چند عدد با GSAP.
 */
import * as THREE from 'three';
import gsap from 'gsap';

const DEG = Math.PI / 180;

export class Stage {
  constructor(parent, opts = {}) {
    const {
      focal = 35,
      inset = false,
      aspect = 16 / 9,
      shadows = true,
      insetLabel = 'نمای کارگردان (Director view)',
    } = opts;

    this.el = document.createElement('div');
    this.el.className = 'stage';
    this.el.style.aspectRatio = String(aspect);
    parent.appendChild(this.el);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.el.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.05, 400);
    // filmGauge = عرض سنسور به میلی‌متر. 36 = فول‌فریم (۳۶×۲۴). با این کار setFocalLength دقیقاً مثل لنز واقعی رفتار می‌کند
    this.camera.filmGauge = 36;

    /** وضعیت دوربین — همه‌ی انیمیشن‌ها فقط همین آبجکت را تغییر می‌دهند */
    this.cam = { x: 0, y: 1.6, z: 5, tx: 0, ty: 1.5, tz: 0, roll: 0, focal, shiftX: 0, shiftY: 0 };
    /** لرزش اضافه (دوربین روی دست و …) که بعد از lookAt اعمال می‌شود */
    this.shake = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };

    this.updaters = [];
    this.composer = null;
    this._prev = 0;
    this.time = 0;
    this.running = false;
    this._lastFocal = null;
    this._tween = null;

    // HUD (برچسب‌های روی تصویر)
    this.hud = document.createElement('div');
    this.hud.className = 'stage-hud';
    this.el.appendChild(this.hud);

    // ---- نمای کارگردان (Picture in Picture) ----
    this.insetEnabled = inset;
    if (inset) this._setupInset(insetLabel);

    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    new ResizeObserver(this._resize).observe(this.el);
    this._resize();

    // فقط وقتی دمو روی صفحه است رندر کن (صرفه‌جویی در GPU و باتری)
    new IntersectionObserver(([entry]) => {
      entry.isIntersecting ? this.start() : this.stop();
    }, { rootMargin: '120px' }).observe(this.el);
  }

  _setupInset(label) {
    this.director = new THREE.PerspectiveCamera(38, 1.5, 0.1, 500);
    this.gizmo = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff5a36 })
    );
    body.position.z = 0.15;
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.03;
    this.gizmoBody = new THREE.Group();
    this.gizmoBody.add(body, lens);
    this.proxy = new THREE.PerspectiveCamera(40, 1, 0.1, 3);
    this.proxyHelper = new THREE.CameraHelper(this.proxy);
    this.gizmo.add(this.gizmoBody, this.proxyHelper);
    this.gizmo.visible = false;
    this.scene.add(this.gizmo);

    const tag = document.createElement('div');
    tag.className = 'stage-inset-label';
    tag.textContent = label;
    this.el.appendChild(tag);
    this.el.classList.add('has-inset');
    this.insetOffset = new THREE.Vector3(7, 6, 8);
  }

  /** یک تابع به حلقه‌ی رندر اضافه می‌کند: fn(dt, time) */
  onTick(fn) { this.updaters.push(fn); return this; }

  setHUD(html) { this.hud.innerHTML = html; }

  /** حرکت نرم دوربین به وضعیت جدید (همان «حرکت دوربین» در سینما) */
  moveTo(state, { duration = 1.6, ease = 'power2.inOut', onComplete } = {}) {
    this._tween?.kill();
    this._tween = gsap.to(this.cam, { ...state, duration, ease, onComplete });
    return this._tween;
  }

  /** «کات» — تغییر آنی وضعیت دوربین */
  cutTo(state) {
    this._tween?.kill();
    Object.assign(this.cam, state);
    this.applyCamera();
  }

  applyCamera() {
    const c = this.cam;
    const cam = this.camera;
    cam.position.set(c.x, c.y, c.z);
    // اگر دوربین دقیقاً عمودی به پایین نگاه کند، بردار up را عوض می‌کنیم تا lookAt مبهم نشود
    const flat = Math.hypot(c.tx - c.x, c.tz - c.z);
    cam.up.set(0, 1, 0);
    if (flat < 0.02) cam.up.set(0, 0, -1);
    cam.lookAt(c.tx, c.ty, c.tz);
    cam.rotateZ(c.roll * DEG);

    const s = this.shake;
    if (s.x || s.y || s.z || s.rx || s.ry || s.rz) {
      cam.translateX(s.x); cam.translateY(s.y); cam.translateZ(s.z);
      cam.rotateX(s.rx); cam.rotateY(s.ry); cam.rotateZ(s.rz);
    }

    if (c.focal !== this._lastFocal) {
      cam.setFocalLength(c.focal);
      this._lastFocal = c.focal;
    }
    if (c.shiftX || c.shiftY) {
      const W = 1000, H = 1000 / cam.aspect;
      cam.setViewOffset(W, H, c.shiftX * W, c.shiftY * H, W, H);
    } else if (cam.view?.enabled) {
      cam.clearViewOffset();
    }
  }

  /** فاصله‌ای که یک ارتفاع مشخص (متر) دقیقاً کادر عمودی را پر کند */
  distanceForHeight(height, focal = this.cam.focal) {
    const filmH = this.camera.filmGauge / Math.max(this.camera.aspect, 1);
    const vfov = 2 * Math.atan(filmH / (2 * focal));
    return (height / 2) / Math.tan(vfov / 2);
  }

  get vfov() { return this.camera.fov; }
  get hfov() {
    return 2 * Math.atan(Math.tan((this.camera.fov * DEG) / 2) * this.camera.aspect) / DEG;
  }

  _resize() {
    const w = this.el.clientWidth || 640;
    const h = this.el.clientHeight || 360;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._lastFocal = null; // باعث محاسبه‌ی مجدد fov با نسبت جدید می‌شود
    this.applyCamera();
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    if (!this.running) this.render();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._prev = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
  }

  _loop(now = performance.now()) {
    if (!this.running) return;
    const dt = Math.min(Math.max((now - this._prev) / 1000, 0), 1 / 20);
    this._prev = now;
    this.time += dt;
    for (const fn of this.updaters) fn(dt, this.time);
    this.render();
    requestAnimationFrame(this._loop);
  }

  render() {
    this.applyCamera();
    const r = this.renderer;
    if (this.gizmo) this.gizmo.visible = false;
    r.setScissorTest(false);
    r.setViewport(0, 0, r.domElement.width / r.getPixelRatio(), r.domElement.height / r.getPixelRatio());

    if (this.composer) this.composer.render();
    else r.render(this.scene, this.camera);

    if (this.insetEnabled) this._renderInset();
  }

  _renderInset() {
    const r = this.renderer;
    const W = r.domElement.width / r.getPixelRatio();
    const H = r.domElement.height / r.getPixelRatio();
    const w = Math.round(W * 0.3), h = Math.round(w / 1.5);
    const m = 10;

    // پروکسی برای نمایش مخروط دید دوربین
    const c = this.cam;
    const dist = Math.hypot(c.tx - c.x, c.ty - c.y, c.tz - c.z);
    this.proxy.position.copy(this.camera.position);
    this.proxy.quaternion.copy(this.camera.quaternion);
    this.proxy.fov = this.camera.fov;
    this.proxy.aspect = this.camera.aspect;
    this.proxy.far = THREE.MathUtils.clamp(dist, 0.8, 8);
    this.proxy.updateProjectionMatrix();
    this.proxyHelper.update();
    this.gizmoBody.position.copy(this.camera.position);
    this.gizmoBody.quaternion.copy(this.camera.quaternion);
    this.gizmo.visible = true;

    // دوربین کارگردان: از بالا و کنار، نقطه‌ی میانی دوربین و هدف را می‌بیند
    const mid = new THREE.Vector3((c.x + c.tx) / 2, (c.y + c.ty) / 2, (c.z + c.tz) / 2);
    const span = THREE.MathUtils.clamp(dist, 3, 30);
    const off = this.insetOffset.clone().normalize().multiplyScalar(span * 1.6 + 6);
    this.director.position.copy(mid).add(off);
    this.director.lookAt(mid);
    this.director.aspect = w / h;
    this.director.updateProjectionMatrix();

    r.setScissorTest(true);
    r.setViewport(m, m, w, h);
    r.setScissor(m, m, w, h);
    const prevBg = this.scene.background;
    const prevFog = this.scene.fog;
    this.scene.background = new THREE.Color(0x07080b);
    this.scene.fog = null;
    r.render(this.scene, this.director);
    this.scene.background = prevBg;
    this.scene.fog = prevFog;
    r.setScissorTest(false);
    this.gizmo.visible = false;
  }
}

/* ---------- ابزارهای کوچک ---------- */

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Value noise یک‌بعدی نرم در بازه‌ی [-1, 1] */
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
}

/** چند اکتاو نویز روی هم (Fractal Brownian Motion) — لرزش طبیعی دوربین روی دست */
export function fbm(x, octaves = 3) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) { v += a * noise1(x * f + i * 17.3); f *= 2; a *= 0.5; }
  return v;
}

export { DEG };
