import { CaseInfo } from '../types';

/**
 * Parses the advocate's case register export (myCases.txt): a JSON array whose
 * elements are stringified case objects (eCourt/NJAC style), or newline
 * delimited JSON objects as a fallback. Completely offline.
 */
export function parseCaseFile(text: string): CaseInfo[] {
  const out: CaseInfo[] = [];
  const push = (o: Record<string, unknown>) => {
    if (!o || typeof o !== 'object') return;
    const s = (k: string) => String(o[k] ?? '').trim();
    out.push({
      cino: s('cino'),
      caseNo: s('case_no'),
      regYear: Number(o.reg_year || 0),
      type: s('type_name'),
      typeHi: s('ltype_name'),
      court: s('establishment_name'),
      courtHi: s('lestablishment_name'),
      district: s('district_name'),
      petitioner: s('petparty_name'),
      petitionerHi: s('lpetparty_name'),
      respondent: s('resparty_name'),
      respondentHi: s('lresparty_name'),
      nextDate: s('date_next_list'),
      lastDate: s('date_last_list'),
      purpose: s('purpose_name'),
      purposeHi: s('lpurpose_name'),
    });
  };

  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      for (const el of arr) {
        if (typeof el === 'string') {
          try { push(JSON.parse(el)); } catch { /* skip malformed */ }
        } else push(el);
      }
      return out;
    } catch { /* fall through to line mode */ }
  }
  for (const line of trimmed.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    try { push(JSON.parse(l)); } catch { /* skip */ }
  }
  return out;
}

export function caseLabel(c: CaseInfo): string {
  const parties = `${c.petitioner || c.petitionerHi} vs ${c.respondent || c.respondentHi}`;
  return parties.slice(0, 80);
}

export function sortByNextDate(cs: CaseInfo[]): CaseInfo[] {
  return [...cs].sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'));
}
