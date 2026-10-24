import { PageSettings } from '../types';

/**
 * Court-ready PDF / paper engine. The browser & Android print frameworks do
 * real glyph shaping (Devanagari matras & conjuncts), embed the fonts and keep
 * the text layer searchable — exactly what e-filing registries require.
 * @page carries the paper size and the exact court margins.
 */
export function applyPageRule(s: PageSettings) {
  let el = document.getElementById('writerpro-page-rule') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'writerpro-page-rule';
    document.head.appendChild(el);
  }
  const size =
    s.pageSize === 'A4' ? 'A4' :
    s.pageSize === 'LETTER' ? 'letter' :
    s.pageSize === 'CUSTOM' ? `${s.customWIn}in ${s.customHIn}in` : 'legal';
  el.textContent = `@page { size: ${size} portrait; margin: ${s.marginT}in ${s.marginR}in ${s.marginB}in ${s.marginL}in; }`;
}

export function printNow() {
  window.print();
}
