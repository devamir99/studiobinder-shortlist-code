/** کمک‌کننده‌های کوچک DOM برای کنترل‌های دموها */
import hljs from './hljs.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
}

/**
 * چیدمان استاندارد یک دمو:
 *   [ stage (بوم) ]
 *   [ controls ]
 *   [ info: عنوان + توضیح + کد معادل ]
 */
export function shell(root) {
  root.innerHTML = '';
  const stageHost = h('div', { class: 'demo-stage' });
  const controls = h('div', { class: 'demo-controls' });
  const info = h('div', { class: 'demo-info' });
  root.append(stageHost, controls, info);
  return { stageHost, controls, info };
}

/** گروه دکمه با حالت active */
export function buttonGroup(parent, items, onSelect, { label, multi = false } = {}) {
  const wrap = h('div', { class: 'btn-group' });
  if (label) wrap.append(h('span', { class: 'ctrl-label' }, label));
  const row = h('div', { class: 'btn-row' });
  wrap.append(row);
  const buttons = new Map();
  for (const item of items) {
    const b = h('button', { type: 'button', class: 'chip', 'data-id': item.id },
      h('span', { class: 'chip-main' }, item.label),
      item.sub ? h('span', { class: 'chip-sub' }, item.sub) : null);
    b.addEventListener('click', () => {
      if (!multi) select(item.id);
      onSelect(item, b);
    });
    buttons.set(item.id, b);
    row.append(b);
  }
  function select(id) {
    buttons.forEach((b, k) => b.classList.toggle('active', k === id));
  }
  parent.append(wrap);
  return { el: wrap, select, buttons };
}

export function slider(parent, { label, min, max, step = 1, value, format = (v) => v, onInput }) {
  const out = h('output', {}, format(value));
  const input = h('input', { type: 'range', min, max, step, value });
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    out.textContent = format(v);
    onInput(v);
  });
  const wrap = h('label', { class: 'slider' }, h('span', { class: 'ctrl-label' }, label), input, out);
  parent.append(wrap);
  return {
    el: wrap,
    input,
    set(v, silent = false) {
      input.value = v;
      out.textContent = format(v);
      if (!silent) onInput(v);
    },
  };
}

export function toggle(parent, { label, value = false, onChange }) {
  const input = h('input', { type: 'checkbox' });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  const wrap = h('label', { class: 'toggle' }, input, h('span', { class: 'toggle-ui' }), h('span', {}, label));
  parent.append(wrap);
  return { el: wrap, input, set(v) { input.checked = v; onChange(v); } };
}

/** پنل توضیح: عنوان فارسی، اصطلاح انگلیسی، متن و یک خط کد معادل */
export function setInfo(info, { fa, en, text, use, code, lang = 'javascript' }) {
  info.innerHTML = '';
  info.append(
    h('div', { class: 'info-title' }, h('strong', {}, fa), en ? h('span', { class: 'en' }, en) : null),
    h('p', { html: text }),
  );
  if (use) info.append(h('p', { class: 'info-use', html: `<b>کاربرد:</b> ${use}` }));
  if (code) {
    const codeEl = h('code', { class: `language-${lang}` });
    codeEl.textContent = code.trim();
    hljs.highlightElement(codeEl);
    info.append(h('pre', { class: 'info-code', dir: 'ltr' }, codeEl));
  }
}
