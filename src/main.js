import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/jetbrains-mono';
import 'highlight.js/styles/github-dark-dimmed.css';
import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import hljs from './lib/hljs.js';

gsap.registerPlugin(ScrollTrigger);

/* ---------- هایلایت کد + تب‌ها + دکمه‌ی کپی ---------- */
document.querySelectorAll('pre > code').forEach((el) => {
  // حذف تورفتگی مشترک (برای نوشتن راحت کد داخل HTML)
  const lines = el.textContent.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  el.textContent = lines.map((l) => l.slice(indent)).join('\n');
  hljs.highlightElement(el);
  const pre = el.parentElement;
  pre.setAttribute('dir', 'ltr');
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.type = 'button';
  btn.textContent = 'کپی';
  btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el.textContent);
    btn.textContent = 'کپی شد ✓';
    setTimeout(() => (btn.textContent = 'کپی'), 1400);
  });
  pre.append(btn);
});

document.querySelectorAll('.code-tabs').forEach((wrap) => {
  const panes = [...wrap.querySelectorAll(':scope > pre')];
  const bar = document.createElement('div');
  bar.className = 'tab-bar';
  bar.setAttribute('dir', 'ltr');
  panes.forEach((pre, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = pre.dataset.title || `#${i + 1}`;
    b.addEventListener('click', () => {
      panes.forEach((p, j) => p.classList.toggle('active', i === j));
      bar.querySelectorAll('button').forEach((x, j) => x.classList.toggle('active', i === j));
    });
    bar.append(b);
  });
  wrap.prepend(bar);
  bar.querySelector('button')?.click();
});

/* ---------- ناوبری: scrollspy + منوی موبایل ---------- */
const links = [...document.querySelectorAll('.toc a[href^="#"]')];
const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
  }
}, { rootMargin: '-35% 0px -60% 0px' });
sections.forEach((s) => spy.observe(s));

const body = document.body;
document.querySelector('.menu-btn')?.addEventListener('click', () => body.classList.toggle('nav-open'));
links.forEach((a) => a.addEventListener('click', () => body.classList.remove('nav-open')));

/* ---------- نوار پیشرفت مطالعه ---------- */
gsap.to('.progress', {
  scaleX: 1, ease: 'none',
  scrollTrigger: { start: 0, end: 'max', scrub: 0.2 },
});

/* ---------- ریویل سکشن‌ها با اسکرول (خودش یک «حرکت دوربین» در UI است!) ---------- */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.utils.toArray('.chapter-head, .card, .table-wrap, .callout').forEach((el) => {
    gsap.from(el, {
      y: 28, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ---------- بارگذاری تنبل دموها (هر دمو فقط وقتی نزدیک دید است لود می‌شود) ---------- */
const DEMOS = {
  'shot-sizes': () => import('./demos/shot-sizes.js'),
  framing: () => import('./demos/framing.js'),
  angles: () => import('./demos/angles.js'),
  dof: () => import('./demos/dof.js'),
  rigs: () => import('./demos/rigs.js'),
  movement: () => import('./demos/movement.js'),
  lenses: () => import('./demos/lenses.js'),
  framerate: () => import('./demos/framerate.js'),
  transitions: () => import('./demos/transitions.js'),
  'editing-180': () => import('./demos/editing-180.js'),
  'editing-edl': () => import('./demos/editing-edl.js'),
};

const demoObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    demoObserver.unobserve(el);
    const load = DEMOS[el.dataset.demo];
    if (!load) continue;
    el.classList.add('loading');
    load()
      .then((m) => { m.mount(el); el.classList.remove('loading'); })
      .catch((err) => {
        console.error(err);
        el.classList.remove('loading');
        el.innerHTML = `<p class="demo-error">بارگذاری دمو ناموفق بود: ${err.message}</p>`;
      });
  }
}, { rootMargin: '400px 0px' });
document.querySelectorAll('[data-demo]').forEach((el) => demoObserver.observe(el));

// بعد از ریسایز یا لود دموها، موقعیت ScrollTriggerها را به‌روز کن
window.addEventListener('load', () => ScrollTrigger.refresh());
