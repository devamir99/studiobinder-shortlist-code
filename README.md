# 🎬 The Shot List برای کریتیو دولوپرها

مرجع تعاملی فارسی بر اساس سری آموزشی **The Shot List** از کانال [StudioBinder](https://www.youtube.com/@StudioBinder).
هر مفهوم سینمایی (اندازه نما، کادربندی، زاویه، عمق میدان، ریگ، حرکت دوربین، لنز، فریم‌ریت، ترنزیشن و تدوین) با هدف، کاربرد،
دموی زنده و **معادل کد** در Three.js، GSAP، CSS، GLSL و Web Audio توضیح داده شده است.

## اجرا

```bash
npm install
npm run dev       # سرور توسعه
npm run build     # خروجی استاتیک در dist/
npm run preview   # نمایش خروجی build روی http://localhost:4173
```

## انتشار روی GitHub Pages

1. پروژه را push کنید (شاخه‌ی `main`).
2. در GitHub: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. ورک‌فلو [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) در هر push، سایت را build و منتشر می‌کند.

چون `base: './'` در [`vite.config.js`](vite.config.js) تنظیم شده، خروجی زیر هر مسیری (مثلاً `/repo-name/`) کار می‌کند.
اگر نمی‌خواهید از Actions استفاده کنید، محتوای `dist/` را روی هر هاست استاتیکی بگذارید.

## ساختار

```
index.html              محتوای کامل سند (فارسی، RTL)
src/main.js             ناوبری، تب‌های کد، هایلایت، بارگذاری تنبل دموها
src/styles.css          استایل
src/lib/stage.js        «پلاتو»ی Three.js: وضعیت دوربین، حرکت/کات، نمای کارگردان
src/lib/set.js          بازیگرها و دکور procedural (واحد = متر)
src/lib/ui.js           کنترل‌های دموها
src/demos/*.js          یک ماژول برای هر دمو
scripts/check.mjs       تست دود با Chrome (npm run preview و سپس npm run check)
```

## کتابخانه‌ها

three · gsap (+ScrollTrigger) · highlight.js · @fontsource-variable/vazirmatn · @fontsource-variable/jetbrains-mono · vite · puppeteer-core (فقط تست)

> این پروژه یک مرجع آموزشی مستقل است و ارتباط رسمی با StudioBinder ندارد.
