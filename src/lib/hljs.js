// فقط زبان‌های لازم را ثبت می‌کنیم تا حجم باندل کم بماند
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import glsl from 'highlight.js/lib/languages/glsl';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('glsl', glsl);
hljs.registerLanguage('html', xml);

export default hljs;
