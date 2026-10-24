/**
 * Bilingual legacy-font engine.
 *  - Kruti Dev 010 -> Unicode : @bharattype/hindi-transliteration (MIT, (c) BharatType)
 *  - Unicode -> Kruti Dev 010 : inverse engine built on the same pair table
 *    (src/data/kruti-pairs.ts), mirroring the legacy visual-order storage rules
 *    (i-matra and reph stored in visual position).
 *  - Heuristic auto-detection of pasted Kruti Dev text.
 */
import { krutiDevToUnicode } from '@bharattype/hindi-transliteration';
import { KRUTI_PAIRS } from '../data/kruti-pairs';

export { krutiDevToUnicode };

const CONS = '[क-ह]';
const MATRA = '[ािीुूृेैॉोौंँःॅ़]';
const CLUSTER = `(${CONS}(?:्${CONS})*)`;
const REPH_RE = new RegExp(`र्(${CONS}(?:्${CONS})*${MATRA}*)`, 'g');
const I_MATRA_ANUSVARA_RE = new RegExp(`${CLUSTER}िं`, 'g');
const I_MATRA_RE = new RegExp(`${CLUSTER}ि`, 'g');

/** unicode-string -> kruti-string, longest keys first, first variant wins. */
const REV: [string, string][] = (() => {
  const map = new Map<string, string>();
  for (const [k, u] of KRUTI_PAIRS) if (!map.has(u)) map.set(u, k);
  return [...map.entries()].sort((a, b) => b[0].length - a[0].length);
})();

/** Convert clean Unicode Devanagari text back to Kruti Dev 010 encoding. */
export function unicodeToKruti(input: string): string {
  let t = (input || '').normalize('NFC');
  // 1. Reph: र् + syllable  ->  syllable + 'Z'   (legacy visual order)
  t = t.replace(REPH_RE, '$1Z');
  // 2. i-matra (+ anusvara) sits before the consonant in Kruti Dev
  t = t.replace(I_MATRA_ANUSVARA_RE, 'Ç$1');
  t = t.replace(I_MATRA_RE, 'f$1');
  // 3. Longest-match substitution over the remainder
  let out = '';
  let i = 0;
  while (i < t.length) {
    let hit = false;
    for (const [u, k] of REV) {
      if (t.startsWith(u, i)) {
        out += k;
        i += u.length;
        hit = true;
        break;
      }
    }
    if (!hit) {
      out += t[i];
      i += 1;
    }
  }
  return out;
}

export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text || '');
}

/** Characteristic Kruti Dev 010 function-word fingerprints (ASCII encodings of
 *  very common Hindi words): का के की को से में और है नहीं जिस जिसमें एक इस उस यह कि । */
const KRUTI_FINGERPRINTS = [
  'dk', 'ds', 'dh', 'dks', 'ls', 'esa', 'vkSj', 'gS', 'ugha', 'ftl', 'ftlesa',
  'ftuds', ',d', 'bl', 'ml', 'mls', 'bdZ', ' ;g', ' ;gk', 'rk', 'Fkk', 'Fkh',
  'djsxk', 'djus', 'fd;k', 'vkosnu', 'U;k;', 'U;k;k;', 'oknh', 'fouk', 'djk',
  'kkl', 'ljdkj', 'Fkkuk', 'Fkkukv', 'vHk;', 'vkjksi', 'vkjksfi', 'izfroknh',
  'okfn;ksa', 'lqjhfr', 'izkFkZuk', 'vkt', 'fnukad', 'LFkku', 'gks', 'gksus',
];

export interface KrutiDetection {
  isKruti: boolean;
  score: number; // fingerprint hits per 200 chars
}

/** Detect legacy Kruti Dev "gibberish" (ASCII standing in for Devanagari). */
export function detectKrutiDev(text: string): KrutiDetection {
  const t = text || '';
  if (!t.trim()) return { isKruti: false, score: 0 };
  if (containsDevanagari(t)) return { isKruti: false, score: 0 };
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters / Math.max(1, t.length) < 0.45) return { isKruti: false, score: 0 };
  let hits = 0;
  for (const f of KRUTI_FINGERPRINTS) {
    let idx = t.indexOf(f);
    while (idx !== -1) {
      hits += 1;
      idx = t.indexOf(f, idx + f.length);
    }
  }
  const score = (hits / Math.max(1, t.length)) * 200;
  return { isKruti: hits >= 3 && score >= 1.2, score };
}
