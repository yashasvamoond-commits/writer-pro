/**
 * Paralegal extraction engine — pure, offline, testable.
 * Pulls the practical case-register facts out of any document text:
 * case number, FIR number + police station, sections (IPC/BNS/CrPC/BNSS…),
 * parties/title, next hearing date, decided date, document type, advocate.
 */

export interface CaseMeta {
  caseNo?: string;
  firNo?: string;
  psName?: string;
  sections: string[];
  title?: string;
  nextDate?: string;   // ISO yyyy-mm-dd
  decidedDate?: string;
  dates: string[];     // all ISO dates found (unique, chronological)
  docType?: string;
  advocate?: string;
}

const HI_MONTHS: Record<string, number> = {
  'जनवरी': 1, 'फरवरी': 2, 'फ़रवरी': 2, 'मार्च': 3, 'अप्रैल': 4, 'मई': 5, 'जून': 6,
  'जुलाई': 7, 'अगस्त': 8, 'सितम्बर': 9, 'सितंबर': 9, 'अक्टूबर': 10, 'नवम्बर': 11, 'नवंबर': 11, 'दिसम्बर': 12, 'दिसंबर': 12,
};
const EN_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function iso(d: number, m: number, y: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 100) y += y > 60 ? 1900 : 2000;
  if (y < 1950 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Every plausible date in the text: 12/03/2025, 12.3.25, 12 March 2025, 12 मार्च 2025 */
export function findDates(text: string): { iso: string; at: number }[] {
  const out: { iso: string; at: number }[] = [];
  const numeric = /(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/g;
  let m: RegExpExecArray | null;
  while ((m = numeric.exec(text))) {
    const v = iso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (v) out.push({ iso: v, at: m.index });
  }
  const named = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*,?\s+(\d{4})/g;
  while ((m = named.exec(text))) {
    const mo = EN_MONTHS[m[2].toLowerCase()];
    const v = mo ? iso(Number(m[1]), mo, Number(m[3])) : null;
    if (v) out.push({ iso: v, at: m.index });
  }
  const namedHi = /(\d{1,2})\s+([क-ह][ा-ृेैोौं्क-ह]*)\s+(\d{4})/g;
  while ((m = namedHi.exec(text))) {
    const mo = HI_MONTHS[m[2]];
    const v = mo ? iso(Number(m[1]), mo, Number(m[3])) : null;
    if (v) out.push({ iso: v, at: m.index });
  }
  const uniq = new Map<string, number>();
  for (const d of out) if (!uniq.has(d.iso)) uniq.set(d.iso, d.at);
  return [...uniq.entries()].map(([i, at]) => ({ iso: i, at })).sort((a, b) => a.at - b.at);
}

function firstCapture(res: RegExp[], text: string): { val: string; at: number } | null {
  for (const re of res) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m && m[1] && m[1].trim()) return { val: m[1].trim().replace(/\s+/g, ' '), at: m.index };
  }
  return null;
}

const CASE_NO_RX = [
  /(?:case\s*(?:no\.?|number)?|crime\s*no\.?|complaint\s*no\.?|petition\s*no\.?|application\s*no\.?|bail\s*app(?:lication)?\.?\s*no\.?)\s*[:\-]?\s*([0-9]{1,6}[A-Za-z]?\s*[\/-]\s*[0-9]{2,4})/gi,
  /(?:प्रकरण\s*(?:संख्या|क्रमांक)?|केस\s*(?:संख्या|क्रमांक)|वाद\s*(?:संख्या|क्रमांक)|आवेदन\s*(?:संख्या|क्रमांक)|क्र\.?\s*सं\.?|क्रमांक)\s*[:\-]?\s*([0-9]{1,6}[A-Za-z]?\s*[\/-]\s*[0-9]{2,4})/g,
  /\b((?:CC|CRM|Crl\.?|MA|WP|BA|SA|RA|ICA)\s*(?:No\.?)?\s*[\/:-]?\s*[0-9]{1,6}\s*[\/-]\s*[0-9]{2,4})\b/gi,
];

const FIR_RX = [
  /(?:fir|f\.i\.r\.?)\s*(?:no\.?|number|संख्या|क्रमांक)?\s*[:\-]?\s*(?:of\s*)?([0-9]{1,6}[A-Za-z]?\s*[\/-]\s*[0-9]{2,4})/gi,
  /(?:प्राथमिकी|फिर)\s*(?:संख्या|क्रमांक)?\s*[:\-]?\s*([0-9]{1,6}[A-Za-z]?\s*[\/-]\s*[0-9]{2,4})/g,
];

const PS_RX = [
  /(?:police\s*station|p\.s\.?|than[aá])\s*[:\-]?\s*([A-Za-zऀ-ॿ][A-Za-zऀ-ॿ .'-]{1,35}?)(?=\s*[,;.(]|\s+(?:district|under|for|state|दिनांक|जिला)\b|$)/gim,
  /थाना\s*[:\-]?\s*([क-हऀ-ॿ][क-हऀ-ॿ .'-]{1,35}?)(?=\s*[,;।(]|\s+(?:जिला|दिनांक|अंतर्गत)\b|$)/gm,
];

const SECTION_RX = [
  /(?:under\s+sections?|u\/s|sections?|धारा(?:ओं)?|दफ़ा|दफा)\s*[:\-]?\s*([0-9]{2,5}\s*[A-Za-z]?(?:\s*[,\/&+]\s*(?:and\s*)?[0-9]{2,5}\s*[A-Za-z]?)*)/gi,
];
const STATUTE_TOKEN = /([0-9]{2,5}\s*[A-Z]?)\s*(?:of\s*)?(IPC|BNS|CrPC|Cr\.?P\.?C\.?|BNSS|NDPS\s*Act|PMLA|SC\/ST\s*Act|IA)\b/gi;

const TITLE_RX = [
  /([A-Zऀ-ॿ][^\n|]{2,55}?)\s+(?:versus|vs\.?|v\.?s\.?|वनाम|बनाम|विरुद्ध|वि॰)\s+([^\n]{2,60}?)(?=\s*[,;.(—]|\s+(?:case|प्रकरण|under|अंतर्गत|fir)\b|$)/gim,
];

const ADVOCATE_RX = [
  /(?:advocate|counsel|legal\s+practitioner)[\s:.,-]*([A-Z][A-Za-z.'-]{1,30}(?:\s+[A-Z][A-Za-z.'-]{1,30}){0,3})/gi,
  /(?:अधिवक्ता|वकील|पैरवीकार)[\s:.,-]*([क-हऀ-ॿ][क-हऀ-ॿ.'-]{1,30}(?:\s+[क-हऀ-ॿ][क-हऀ-ॿ.'-]{0,30}){0,3})/g,
];

const DOC_TYPES: { label: string; hi: string; rx: RegExp[] }[] = [
  { label: 'Charge-sheet', hi: 'चालान', rx: [/charge[\s-]?sheet/i, /(final|police)\s+report/i, /चालान|अभियोग\s*पत्र|अंतिम\s*प्रतिवेदन/] },
  { label: 'Bail application', hi: 'जमानत', rx: [/bail\s+(application|app|petition)?/i, /जमानत|जामीन/] },
  { label: 'Judgment', hi: 'निर्णय', rx: [/judgment|judgement/i, /निर्णय|फैसला/] },
  { label: 'FIR copy', hi: 'प्राथमिकी', rx: [/first\s+information\s+report/i, /\bf\.?i\.?r\.?\b/i, /प्राथमिकी/] },
  { label: 'Complaint', hi: 'परिवाद', rx: [/complaint/i, /परिवाद|शिकायत\s*पत्र/] },
  { label: 'Affidavit', hi: 'शपथ पत्र', rx: [/affidavit/i, /शपथ\s*पत्र|हलफनामा/] },
  { label: 'Vakalatnama', hi: 'वकालतनामा', rx: [/vakalatnama|vakalat/i, /वकालतनामा/] },
  { label: 'Petition', hi: 'याचिका', rx: [/writ\s+petition|petition/i, /याचिका/] },
  { label: 'Summons', hi: 'समन', rx: [/summons?/i, /समन|तलबी/] },
  { label: 'Warrant', hi: 'वारंट', rx: [/warrant/i, /वारंट|गिरफ्तारी\s*वारंट/] },
  { label: 'Reply', hi: 'जवाब', rx: [/written\s+statement|\breply\b/i, /जवाब|लिखित\s*कथन/] },
  { label: 'Order', hi: 'आदेश', rx: [/\border\b/i, /आदेश/] },
  { label: 'Application', hi: 'आवेदन', rx: [/\bapplication\b/i, /आवेदन|प्रार्थना\s*पत्र/] },
];

const NEXT_DATE_RX = [
  /(?:next|date\s+of|fixed\s+for|listed\s+on|upcoming|hearing(?:\s+date)?)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4})/gi,
  /(?:अगली\s*तारीख|अगली|आगामी|तारीख|सुनवाई)\s*[:\-]?\s*(\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4})/g,
];
const DECIDED_RX = [
  /(?:decided\s+on|date\s+of\s+(?:decision|judgment)|pronounced\s+on|disposed\s+on)\s*[:\-]?\s*(\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4})/gi,
  /(?:निर्णय\s*दिनांक|निर्णय\s*तारीख|तारीख\s*निर्णय)\s*[:\-]?\s*(\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4})/g,
];

function normDateStr(s: string): string | null {
  const m = s.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/);
  return m ? iso(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

export function extractCaseMeta(text: string): CaseMeta {
  const t = (text || '').replace(/\r/g, '');
  const meta: CaseMeta = { sections: [], dates: [] };
  if (!t.trim()) return meta;

  const caseHit = firstCapture(CASE_NO_RX, t);
  if (caseHit) meta.caseNo = caseHit.val;

  const firHit = firstCapture(FIR_RX, t);
  if (firHit && firHit.val !== meta.caseNo) meta.firNo = firHit.val;

  const psHit = firstCapture(PS_RX, t);
  if (psHit) meta.psName = psHit.val;

  // sections: keyword lists + statute tokens ("302 IPC", "115 BNS")
  const secSet = new Set<string>();
  for (const re of SECTION_RX) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) && secSet.size < 12) {
      for (const part of m[1].split(/[,\/&+]|\band\b/i)) {
        const pm = part.trim().match(/^([0-9]{2,5})([A-Z])?\s*(IPC|BNS|CrPC|Cr\.?P\.?C\.?|BNSS|NDPS|PMLA)?/i);
        if (!pm) continue;
        const num = pm[1] + (pm[2] || '');
        const statute = pm[3] ? ` ${pm[3].replace(/\./g, '').toUpperCase().replace('CRPC', 'CrPC').replace('BNSS', 'BNSS').replace('IPC', 'IPC').replace('BNS', 'BNS').replace('NDPS', 'NDPS').replace('PMLA', 'PMLA')}` : '';
        secSet.add(num + statute);
      }
    }
  }
  let sm: RegExpExecArray | null;
  STATUTE_TOKEN.lastIndex = 0;
  while ((sm = STATUTE_TOKEN.exec(t)) && secSet.size < 16) secSet.add(`${sm[1].replace(/\s+/g, '')} ${sm[2].toUpperCase()}`);
  meta.sections = [...secSet];

  for (const re of TITLE_RX) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m && m[1] && m[2]) {
      meta.title = `${m[1].trim().replace(/\s+/g, ' ')} vs ${m[2].trim().replace(/\s+/g, ' ')}`.slice(0, 140);
      break;
    }
  }

  const advHit = firstCapture(ADVOCATE_RX, t);
  if (advHit) meta.advocate = advHit.val.replace(/\s+/g, ' ').slice(0, 60);

  const dated = findDates(t);
  meta.dates = dated.map((d) => d.iso);

  const nextHit = firstCapture(NEXT_DATE_RX, t);
  if (nextHit) meta.nextDate = normDateStr(nextHit.val) || undefined;
  const decHit = firstCapture(DECIDED_RX, t);
  if (decHit) meta.decidedDate = normDateStr(decHit.val) || undefined;

  for (const dt of DOC_TYPES) {
    if (dt.rx.some((re) => re.test(t))) { meta.docType = dt.label; break; }
  }
  return meta;
}

/** Human-friendly date: 12/03/2025 → "12 Mar 2025" */
export function fmtDate(isoDate?: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${names[m - 1]} ${y}`;
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const target = new Date(isoDate + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Split "A vs B" into the two parties; the first is treated as the client. */
export function splitParties(title?: string): { first?: string; second?: string } {
  if (!title) return {};
  const clean = title.replace(/\s+/g, ' ').trim();
  const m = clean.match(/^(.{1,70}?)\s+(?:versus|vs\.?|वनाम|बनाम|विरुद्ध)\s+(.{1,70}?)\.?$/i);
  if (!m) return { first: clean.length <= 70 ? clean : undefined };
  return { first: m[1].trim(), second: m[2].trim() };
}

/** Stable grouping key for a party name (case/space/punctuation-insensitive). */
export function partyKey(name?: string): string {
  return (name || '').toLowerCase().replace(/[.,;'".!?]/g, '').replace(/\s+/g, ' ').trim();
}
