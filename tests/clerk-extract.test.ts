import { describe, expect, it } from 'vitest';
import { extractCaseMeta, findDates, fmtDate, daysUntil, splitParties, partyKey } from '../src/lib/clerk-extract';

describe('paralegal extraction', () => {
  it('case number — English & Hindi', () => {
    expect(extractCaseMeta('IN THE COURT OF JM. Case No. 204/2025, State vs Ram').caseNo).toBe('204/2025');
    expect(extractCaseMeta('प्रकरण क्रमांक 123/24 दिनांक').caseNo).toBe('123/24');
    expect(extractCaseMeta('Bail App. No. 87/2023 filed').caseNo).toBe('87/2023');
  });
  it('FIR number + police station', () => {
    const m = extractCaseMeta('FIR No. 218/2022 registered at Police Station Bhadra, district Hanumangarh');
    expect(m.firNo).toBe('218/2022');
    expect(m.psName).toMatch(/Bhadra/);
    const h = extractCaseMeta('प्राथमिकी संख्या 45/2023 थाना सांगरिया जिला श्रीगंगानगर');
    expect(h.firNo).toBe('45/2023');
    expect(h.psName).toMatch(/सांगरिया/);
  });
  it('sections from keywords and statute tokens', () => {
    const m = extractCaseMeta('charge sheet under sections 302, 34 IPC and 25 Arms Act');
    expect(m.sections).toContain('302');
    expect(m.sections.some((x) => x === '34' || x.startsWith('34 '))).toBe(true);
    const t = extractCaseMeta('Offence 498A IPC read with 115 BNS');
    expect(t.sections.some((s) => s.includes('498A') && s.includes('IPC'))).toBe(true);
    expect(t.sections.some((s) => s.includes('115') && s.includes('BNS'))).toBe(true);
  });
  it('parties title (vs / वनाम)', () => {
    expect(extractCaseMeta('Ram Lal versus State of Rajasthan, case no 1/2024').title).toMatch(/Ram Lal.*State of Rajasthan/);
    expect(extractCaseMeta('रामलाल वनाम राज्य राजस्थान').title).toMatch(/रामलाल/);
  });
  it('dates: numeric, month names, Hindi months', () => {
    const d = findDates('Filed on 12/03/2025 and listed 5 April 2025, again 10 मार्च 2026');
    const isos = d.map((x) => x.iso);
    expect(isos).toContain('2025-03-12');
    expect(isos).toContain('2025-04-05');
    expect(isos).toContain('2026-03-10');
    expect(fmtDate('2025-03-12')).toBe('12 Mar 2025');
  });
  it('next hearing date & decided date', () => {
    const m = extractCaseMeta('Matter fixed for evidence. Next date of hearing: 15/07/2025. Nothing else.');
    expect(m.nextDate).toBe('2025-07-15');
    const d = extractCaseMeta('अगली तारीख 20/08/2025 निर्धारित');
    expect(d.nextDate).toBe('2025-08-20');
    const j = extractCaseMeta('Judgment pronounced on 02/02/2024');
    expect(j.decidedDate).toBe('2024-02-02');
    expect(daysUntil('2000-01-01')).toBeLessThan(0);
  });
  it('document type priority: charge-sheet beats generic order/application', () => {
    expect(extractCaseMeta('CHARGE SHEET under section 302 IPC, order of court attached').docType).toBe('Charge-sheet');
    expect(extractCaseMeta('Bail application under section 483 BNSS').docType).toBe('Bail application');
    expect(extractCaseMeta('Vakalatnama for the complainant').docType).toBe('Vakalatnama');
  });
  it('advocate name', () => {
    expect(extractCaseMeta(' argued by Advocate R.K. Sharma for applicant').advocate).toMatch(/R\.K\. Sharma/);
  });
  it('party splitting & grouping keys', () => {
    expect(splitParties('Ram Lal vs State of Rajasthan')).toEqual({ first: 'Ram Lal', second: 'State of Rajasthan' });
    expect(splitParties('रामलाल वनाम राज्य राजस्थान').first).toBe('रामलाल');
    expect(splitParties('Smt. Anita Devi versus Union of India').second).toBe('Union of India');
    expect(partyKey('  ram   lal. ')).toBe('ram lal');
    expect(splitParties(undefined)).toEqual({});
  });
  it('empty text yields empty meta', () => {
    const m = extractCaseMeta('');
    expect(m.sections).toEqual([]);
    expect(m.dates).toEqual([]);
    expect(m.caseNo).toBeUndefined();
  });
});
