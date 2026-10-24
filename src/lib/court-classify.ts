/**
 * Smart clerk — court classifier (pure, offline, no DOM).
 *
 * Reads the text INSIDE a document and decides which of the five courts it
 * belongs to, based on the court heading written in the document itself:
 *   JM · ACJM · ADJ · SDM · AECM
 * Anything with NO court heading at all goes to "Miscellaneous" — and only
 * those files do.
 */

export type CourtId = 'jm' | 'acjm' | 'adj' | 'sdm' | 'aecm' | 'misc';

export interface ClassifyResult {
  court: CourtId;
  /** 0–99 confidence of the match */
  confidence: number;
  /** the heading snippet that decided it */
  snippet: string;
}

export const COURT_ORDER: CourtId[] = ['jm', 'acjm', 'adj', 'sdm', 'aecm', 'misc'];

interface Pattern { re: RegExp; explicit: boolean }
const RX: Record<Exclude<CourtId, 'misc'>, Pattern[]> = {
  // ACJM is tested BEFORE JM (an ACJM heading contains "judicial magistrate")
  acjm: [
    { re: /additional\s+chief\s+judicial\s+magistrate/i, explicit: true },
    { re: /addl\.?\s*chief\s+judicial\s+magistrate/i, explicit: true },
    { re: /\bacjm\b/i, explicit: false },
    { re: /अतिरिक्त\s+मुख्य\s+न्यायिक\s+मजिस्ट्रेट/, explicit: true },
    { re: /अपर\s+मुख्य\s+न्यायिक\s+मजिस्ट्रेट/, explicit: true },
    { re: /मुख्य\s+न्यायिक\s+मजिस्ट्रेट/, explicit: true },
  ],
  jm: [
    { re: /judicial\s+magistrate\s+(?:first|second|1st|2nd)\s+class/i, explicit: true },
    { re: /judicial\s+magistrate/i, explicit: true },
    { re: /\bjmfc\b/i, explicit: false },
    { re: /\bjm\b/i, explicit: false },
    { re: /न्यायिक\s+मजिस्ट्रेट/, explicit: true },
  ],
  adj: [
    { re: /additional\s+district\s*(?:&\s*|and\s+)?(?:sessions?\s*)?judge/i, explicit: true },
    { re: /addl\.?\s*district\s*(?:&\s*|and\s+)?(?:sessions?\s*)?judge/i, explicit: true },
    { re: /\badj\b/i, explicit: false },
    { re: /अपर\s+जिला\s*(?:एवं\s+)?(?:सेशन|अधिवक्ता)?\s*(?:न्यायाधीश|जज)?/, explicit: true },
    { re: /अतिरिक्त\s+जिला\s*(?:एवं\s+)?सेशन/, explicit: true },
  ],
  sdm: [
    { re: /sub[\s-]?divisional\s+magistrate/i, explicit: true },
    { re: /\bsdm\b/i, explicit: false },
    { re: /उपखण्ड\s+अधिकारी/, explicit: true },
    { re: /उप-?खंड\s+(?:अधिकारी|मजिस्ट्रेट|मैजिस्ट्रेट)/, explicit: true },
  ],
  aecm: [
    { re: /additional\s+executive\s+magistrate/i, explicit: true },
    { re: /addl\.?\s*executive\s+magistrate/i, explicit: true },
    { re: /\baecm\b/i, explicit: false },
    { re: /अतिरिक्त\s+कार्यपालक\s+मजिस्ट्रेट/, explicit: true },
    { re: /कार्यपालक\s+मजिस्ट्रेट/, explicit: true },
  ],
};

/** Guard: a "judicial magistrate" hit preceded by additional/chief words is really ACJM. */
function isShadowedByAcjm(norm: string, index: number): boolean {
  const before = norm.slice(Math.max(0, index - 40), index).toLowerCase();
  return /(additional|addl\.?|chief|अतिरिक्त|मुख्य|अपर)\s*$/.test(before);
}

export function classifyText(rawText: string): ClassifyResult {
  const norm = (rawText || '').replace(/\s+/g, ' ').trim().slice(0, 40000);
  if (!norm) return { court: 'misc', confidence: 0, snippet: '' };

  let best: { court: CourtId; score: number; explicit: boolean; index: number } | null = null;

  for (const court of ['acjm', 'jm', 'adj', 'sdm', 'aecm'] as Exclude<CourtId, 'misc'>[]) {
    for (const { re, explicit } of RX[court]) {
      re.lastIndex = 0;
      const m = re.exec(norm);
      if (!m) continue;
      if (court === 'jm' && isShadowedByAcjm(norm, m.index)) continue;
      // Earlier heading + explicit full name = stronger evidence.
      const score = (explicit ? 1000 : 400) + Math.max(0, 500 - Math.floor(m.index / 40));
      if (!best || score > best.score) best = { court, score, explicit, index: m.index };
    }
  }

  if (!best) return { court: 'misc', confidence: 0, snippet: '' };
  const snippet = norm.slice(Math.max(0, best.index - 40), best.index + 90).trim();
  return {
    court: best.court,
    confidence: Math.min(99, best.explicit ? 92 : 68),
    snippet,
  };
}
