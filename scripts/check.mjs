// تست دود: همه‌ی دموها را لود می‌کند، روی دکمه‌ها کلیک می‌کند و خطاهای کنسول را گزارش می‌دهد
// اجرا: npm run build && npm run preview  (در ترمینال دیگر)  سپس: node scripts/check.mjs [outDir]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.URL || 'http://localhost:4173/';
const OUT = process.argv[2] || 'screens';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle0' });

const demos = await page.$$eval('[data-demo]', (els) => els.map((e) => e.dataset.demo));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const id of demos) {
  const sel = `[data-demo="${id}"]`;
  await page.$eval(sel, (el) => el.scrollIntoView({ block: 'start' }));
  await sleep(2200);
  const chips = await page.$$(`${sel} .chip`);
  console.log(`${id}: ${chips.length} buttons`);
  for (let i = 0; i < chips.length; i++) {
    await chips[i].evaluate((b) => b.click());
    await sleep(id === 'framerate' ? 150 : 350);
  }
  // اولین دکمه‌ی میانه برای اسکرین‌شات
  if (chips[Math.min(3, chips.length - 1)]) await chips[Math.min(3, chips.length - 1)].evaluate((b) => b.click());
  await sleep(1800);
  await page.$eval(sel, (el) => el.scrollIntoView({ block: 'start' }));
  await sleep(700);
  const el = await page.$(sel);
  await el.screenshot({ path: `${OUT}/${id}.png`, captureBeyondViewport: false });
}
await page.evaluate(() => scrollTo(0, 0));
await sleep(600);
await page.screenshot({ path: `${OUT}/_top.png` });
await page.setViewport({ width: 390, height: 844, isMobile: true });
await sleep(800);
await page.screenshot({ path: `${OUT}/_mobile.png` });
console.log('\nERRORS:\n' + (errors.join('\n') || 'none'));
await browser.close();
