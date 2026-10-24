/**
 * Offline grammar & legal-citation checker.
 * Rule-based (no server): returns issues with positions + one-tap fixes.
 * English rules: articles, duplicates, spacing, contractions, double
 * negatives, sentence case. Hindi rules: missing spaces before common
 * auxiliaries, duplicate words. Legal: legacy IPC/CrPC citations flagged with
 * their BNS/BNSS 2023 equivalents.
 */
export interface GrammarIssue {
  from: number;
  to: number;
  message: { en: string; hi: string };
  fix?: string;
  kind: 'grammar' | 'citation' | 'ocr';
}

const IPC_TO_BNS: Record<string, string> = {
  '302': '103', '304': '105', '307': '109', '376': '64', '406': '316',
  '420': '318', '498a': '80', '323': '115(2)', '324': '116(2)', '506': '351(2)',
  '147': '115(1)', '148': '116(1)', '120b': '61(2)', '34': '3(5)',
};
const CRPC_TO_BNSS: Record<string, string> = {
  '437': '480', '438': '482', '439': '483', '125': '144', '156(3)': '175(3)',
  '164': '183', '313': '351', '205': '229', '317': '355', '457': '503',
};


export function checkGrammar(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const push = (from: number, to: number, en: string, hi: string, fix: string | undefined, kind: GrammarIssue['kind'] = 'grammar') =>
    issues.push({ from, to, message: { en, hi }, fix, kind });

  // ---- English rules ----
  let m: RegExpExecArray | null;
  const en = (re: RegExp, cb: (m: RegExpExecArray) => void) => { re.lastIndex = 0; while ((m = re.exec(text))) cb(m); };

  en(/\b(a)\s+([aeiouAEIOU][a-zA-Z]*)/g, (mm) => {
    push(mm.index, mm.index + mm[0].length, `Use "an" before vowel sound: "an ${mm[2]}"`, `स्वर से पहले "an": "an ${mm[2]}"`, `an ${mm[2]}`);
  });
  en(/\b(an)\s+((?!hour|honest|honor|heir)[bcdfgjklmnpqrstvwxyzBCDFGJKLMNPQRSTVWXYZ][a-zA-Z]*)/g, (mm) => {
    push(mm.index, mm.index + mm[0].length, `Use "a" before consonant sound: "a ${mm[2]}"`, `व्यंजन से पहले "a": "a ${mm[2]}"`, `a ${mm[2]}`);
  });
  en(/\b(\w+)\s+\1\b/gi, (mm) => {
    if (mm[1].length > 2) push(mm.index, mm.index + mm[0].length, `Repeated word "${mm[1]}"`, `दोहराया शब्द "${mm[1]}"`, mm[1]);
  });
  en(/\b(could|should|would)\s+of\b/gi, (mm) => {
    push(mm.index, mm.index + mm[0].length, `"${mm[1]} have" (not "of")`, `"${mm[1]} have" (न कि "of")`, `${mm[1]} have`);
  });
  en(/\balot\b/gi, (mm) => push(mm.index, mm.index + 4, '"a lot" is two words', '"a lot" दो शब्द हैं', 'a lot'));
  en(/\bnot\b([^.!?\n]{0,40}?\b(no|nothing|never|none)\b)/gi, (mm) => {
    push(mm.index, mm.index + mm[0].length, 'Possible double negative', 'संभव दोहरा नकार', undefined);
  });
  en(/([a-z])\s{2,}([a-z])/g, (mm) => {
    push(mm.index, mm.index + mm[0].length, 'Multiple spaces', 'एकाधिक रिक्ति', `${mm[1]} ${mm[2]}`);
  });
  en(/([,.;:])([A-Za-z0-9])/g, (mm) => {
    push(mm.index, mm.index + 2, 'Missing space after punctuation', 'विराम चिह्न के बाद रिक्ति नहीं', `${mm[1]} ${mm[2]}`);
  });
  en(/(?:^|([.!?]\s+))([a-z]{3,})/g, (mm) => {
    const start = mm.index + (mm[1] ? mm[1].length : 0);
    push(start, start + 1, 'Sentence should start with a capital letter', 'वाक्य की शुरूआत बड़े अक्षर से', mm[2][0].toUpperCase());
  });

  // ---- Hindi rules ----
  const hiSpace = /((?:[क-ह][ािीुूृेैोौं्]?)+?)(है|हैं|था|थी|थे|थीं|करना|करने|किया|किए)(?=[\s।,;.!?]|$)/g;
  en(hiSpace, (mm) => {
    // only fires when glued without space: e.g. "कियाहै"
    push(mm.index, mm.index + mm[0].length, 'Missing space before helper verb', 'सहायक क्रिया से पहले रिक्ति चाहिए', `${mm[1]} ${mm[2]}`);
  });
  en(/([क-ह])\1/g, (mm) => {
    push(mm.index, mm.index + 2, 'Possible doubled character', 'संभव दोहरा अक्षर', mm[1]);
  });

  // ---- Legal citation checks ----
  en(/(\d+[A-Z]?(?:\([0-9A-Za-z]+\))?)\s*(IPC)\b/g, (mm) => {
    const key = mm[1].toLowerCase();
    const bns = IPC_TO_BNS[key];
    push(mm.index, mm.index + mm[0].length,
      bns ? `Legacy IPC ${mm[1]} — since 1.7.2024 cite Section ${bns} BNS` : `Legacy IPC citation — verify BNS (2023) equivalent`,
      bns ? `पुरानी IPC ${mm[1]} — 1.7.2024 से धारा ${bns} BNS उद्धृत करें` : 'पुरानी IPC धारा — BNS (2023) तुल्य जाँचें',
      bns ? `${bns} BNS` : undefined, 'citation');
  });
  en(/(\d+(?:\([0-9]+\))?)\s*(Cr\.?\s?P\.?\s?C\.?|CrPC)\b/gi, (mm) => {
    const key = mm[1].toLowerCase();
    const bnss = CRPC_TO_BNSS[key];
    push(mm.index, mm.index + mm[0].length,
      bnss ? `Legacy CrPC ${mm[1]} — cite Section ${bnss} BNSS` : `Legacy CrPC citation — verify BNSS (2023) equivalent`,
      bnss ? `पुरानी CrPC ${mm[1]} — धारा ${bnss} BNSS उद्धृत करें` : 'पुरानी CrPC धारा — BNSS (2023) तुल्य जाँचें',
      bnss ? `${bnss} BNSS` : undefined, 'citation');
  });
  en(/\b(Indian\s+Evidence\s+Act|IEA)\b/gi, (mm) => {
    push(mm.index, mm.index + mm[0].length, 'Evidence Act replaced by BSA, 2023', 'साक्ष्य अधिनियम अब BSA, 2023', 'Bharatiya Sakshya Adhiniyam, 2023', 'citation');
  });

  return issues.sort((a, b) => a.from - b.from);
}
