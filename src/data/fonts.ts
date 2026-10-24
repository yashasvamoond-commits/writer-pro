/**
 * Offline font library — every face is bundled in the APK / PWA (SIL OFL),
 * no network fetch. Hindi (Devanagari) + English families, each mapped to a
 * court-PC-safe DOCX font name (Mangal / Times New Roman / Arial…).
 */
import muktaR from '../assets/fonts/Mukta-Regular.ttf';
import muktaB from '../assets/fonts/Mukta-Bold.ttf';
import hindR from '../assets/fonts/Hind-Regular.ttf';
import hindB from '../assets/fonts/Hind-Bold.ttf';
import notoSansDev from '../assets/fonts/NotoSansDevanagari-wdth,wght.ttf';
import notoSerifDev from '../assets/fonts/NotoSerifDevanagari-wdth,wght.ttf';
import martelR from '../assets/fonts/Martel-Regular.ttf';
import martelB from '../assets/fonts/Martel-Bold.ttf';
import yantraR from '../assets/fonts/Yantramanav-Regular.ttf';
import rozhaR from '../assets/fonts/RozhaOne-Regular.ttf';
import tinosR from '../assets/fonts/Tinos-Regular.ttf';
import tinosB from '../assets/fonts/Tinos-Bold.ttf';
import tinosI from '../assets/fonts/Tinos-Italic.ttf';
import tinosBI from '../assets/fonts/Tinos-BoldItalic.ttf';
import ebGar from '../assets/fonts/EBGaramond-wght.ttf';
import ebGarI from '../assets/fonts/EBGaramond-Italic-wght.ttf';
import loraR from '../assets/fonts/Lora-wght.ttf';
import loraI from '../assets/fonts/Lora-Italic-wght.ttf';

export interface FontFace { url: string; weight: number | string; style: 'normal' | 'italic' }
export interface FontDef {
  id: string;
  family: string;          // CSS family name
  stack: string;           // CSS font-family value (with fallbacks)
  script: 'hi' | 'en';
  label: string;           // English label
  labelHi: string;         // Hindi label
  note: string;            // usage hint
  docx: string;            // font name written into DOCX exports
  faces: FontFace[];       // bundled faces (empty = system font)
}

const F = (url: string, weight: number | string, style: 'normal' | 'italic' = 'normal'): FontFace => ({ url, weight, style });

export const FONT_LIBRARY: FontDef[] = [
  // ---------------- Hindi / Devanagari ----------------
  { id: 'mukta', family: 'Mukta', script: 'hi', label: 'Mukta (clean sans)', labelHi: 'मुक्त (साफ सैन्स)', note: 'default court drafting face', docx: 'Mangal',
    stack: "'Mukta','Noto Sans Devanagari','Mangal',sans-serif", faces: [F(muktaR, 400), F(muktaB, 700)] },
  { id: 'hind', family: 'Hind', script: 'hi', label: 'Hind (office sans)', labelHi: 'हिन्द (ऑफिस सैन्स)', note: 'very readable at 14pt', docx: 'Mangal',
    stack: "'Hind','Noto Sans Devanagari','Mangal',sans-serif", faces: [F(hindR, 400), F(hindB, 700)] },
  { id: 'notosansdev', family: 'Noto Sans Devanagari', script: 'hi', label: 'Noto Sans Devanagari', labelHi: 'नोटो सैन्स देवनागरी', note: 'variable weight, e-filing safe', docx: 'Mangal',
    stack: "'Noto Sans Devanagari','Mukta','Mangal',sans-serif", faces: [F(notoSansDev, '100 900')] },
  { id: 'notoserifdev', family: 'Noto Serif Devanagari', script: 'hi', label: 'Noto Serif Devanagari', labelHi: 'नोटो सेरिफ देवनागरी', note: 'serif, judgement-like look', docx: 'Mangal',
    stack: "'Noto Serif Devanagari','Martel','Mangal',serif", faces: [F(notoSerifDev, '100 900')] },
  { id: 'martel', family: 'Martel', script: 'hi', label: 'Martel (serif)', labelHi: 'मार्टेल (सेरिफ)', note: 'classic print serif', docx: 'Mangal',
    stack: "'Martel','Noto Serif Devanagari','Mangal',serif", faces: [F(martelR, 400), F(martelB, 700)] },
  { id: 'yantramanav', family: 'Yantra Manav', script: 'hi', label: 'Yantra Manav (compact)', labelHi: 'यन्त्र मानव (कॉम्पैक्ट)', note: 'narrow — fits long cause titles', docx: 'Mangal',
    stack: "'Yantra Manav','Mukta','Mangal',sans-serif", faces: [F(yantraR, 400)] },
  { id: 'rozhaone', family: 'Rozha One', script: 'hi', label: 'Rozha One (headline)', labelHi: 'रोज़ा वन (शीर्षक)', note: 'bold display for headings', docx: 'Mangal',
    stack: "'Rozha One','Noto Serif Devanagari','Mangal',serif", faces: [F(rozhaR, 400)] },
  { id: 'mangal', family: 'Mangal', script: 'hi', label: 'Mangal (system)', labelHi: 'मंगल (सिस्टम)', note: 'Windows court PCs', docx: 'Mangal',
    stack: "'Mangal','Noto Sans Devanagari',sans-serif", faces: [] },
  { id: 'aparajita', family: 'Aparajita', script: 'hi', label: 'Aparajita (system)', labelHi: 'अपराजिता (सिस्टम)', note: 'UP/MP court PCs', docx: 'Aparajita',
    stack: "'Aparajita','Noto Sans Devanagari',sans-serif", faces: [] },
  // ---------------- English / Latin ----------------
  { id: 'tinos', family: 'Tinos', script: 'en', label: 'Tinos (Times-metric)', labelHi: 'टिनोस (टाइम्स माप)', note: 'default — identical metrics to Times New Roman', docx: 'Times New Roman',
    stack: "'Tinos','Times New Roman','Liberation Serif',serif", faces: [F(tinosR, 400), F(tinosB, 700), F(tinosI, 400, 'italic'), F(tinosBI, 700, 'italic')] },
  { id: 'times', family: 'Times New Roman', script: 'en', label: 'Times New Roman (system)', labelHi: 'टाइम्स न्यू रोमन (सिस्टम)', note: 'classic court face', docx: 'Times New Roman',
    stack: "'Times New Roman','Tinos','Liberation Serif',serif", faces: [] },
  { id: 'ebgaramond', family: 'EB Garamond', script: 'en', label: 'EB Garamond (serif)', labelHi: 'ईबी गैरामोंड (सेरिफ)', note: 'elegant briefs & arguments', docx: 'EB Garamond',
    stack: "'EB Garamond','Tinos',serif", faces: [F(ebGar, '400 800'), F(ebGarI, '400 800', 'italic')] },
  { id: 'lora', family: 'Lora', script: 'en', label: 'Lora (modern serif)', labelHi: 'लोरा (आधुनिक सेरिफ)', note: 'screen-friendly serif', docx: 'Lora',
    stack: "'Lora','Tinos',serif", faces: [F(loraR, '400 700'), F(loraI, '400 700', 'italic')] },
  { id: 'arial', family: 'Arial', script: 'en', label: 'Arial (system sans)', labelHi: 'एरियल (सिस्टम सैन्स)', note: 'office correspondence', docx: 'Arial',
    stack: "'Arial','Helvetica',sans-serif", faces: [] },
];

export const FONT_BY_ID: Record<string, FontDef> = Object.fromEntries(FONT_LIBRARY.map((f) => [f.id, f]));

export const HI_FONTS = FONT_LIBRARY.filter((f) => f.script === 'hi');
export const EN_FONTS = FONT_LIBRARY.filter((f) => f.script === 'en');

let installed = false;
/** Inject @font-face rules for every bundled face (idempotent). */
export function installFontFaces() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const css = FONT_LIBRARY.flatMap((f) =>
    f.faces.map(
      (face) => `@font-face{font-family:'${f.family}';src:url('${face.url}') format('truetype');font-weight:${face.weight};font-style:${face.style};font-display:swap;}`,
    ),
  ).join('\n');
  const el = document.createElement('style');
  el.id = 'writerpro-font-library';
  el.textContent = css;
  document.head.appendChild(el);
}
