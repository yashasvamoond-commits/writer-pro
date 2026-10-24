import { describe, expect, it } from 'vitest';
import { extractEvents, extractCaseMeta } from '../src/lib/clerk-extract';
import { bailDraftSrc, shareSummary, varsFromMeta, courtHeaderSrc } from '../src/lib/clerk-draft';

describe('timeline events', () => {
  it('labels dates by surrounding context', () => {
    const text = 'FIR No. 218/2022 registered on 05/03/2022 at PS Bhadra. Incident occurred on 04/03/2022. Accused arrested on 10/03/2022. Charge-sheet filed on 01/06/2022. Next hearing date 15/07/2025.';
    const evs = extractEvents(text);
    const byKey = (k: string) => evs.filter((e) => e.key === k).map((e) => e.iso);
    expect(byKey('fir')).toContain('2022-03-05');
    expect(byKey('incident')).toContain('2022-03-04');
    expect(byKey('arrest')).toContain('2022-03-10');
    expect(byKey('next')).toContain('2025-07-15');
  });
  it('events are chronological and reach CaseMeta', () => {
    const m = extractCaseMeta('प्राथमिकी दिनांक 01/02/2023 दर्ज हुई, अगली सुनवाई 20/08/2025');
    expect(m.events.length).toBeGreaterThan(0);
    expect(m.events.map((e) => e.iso)).toEqual([...m.events.map((e) => e.iso)].sort());
  });
});

describe('bail draft generation', () => {
  const meta = extractCaseMeta(`IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, JAIPUR
Ram Lal versus State of Rajasthan, Case No. 204/2025
FIR No. 218/2022 registered on 05/03/2022 at Police Station Bhadra under sections 302, 34 IPC.
Accused arrested on 10/03/2022. argued by Advocate R.K. Sharma`);

  it('English bail draft is pre-filled and uses the JM court header', () => {
    const src = bailDraftSrc(meta, 'jm', 'en');
    expect(src).toMatch(/IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS/);
    expect(src).toMatch(/APPLICATION FOR BAIL/);
    expect(src).toMatch(/FIR No\. 218\/2022, registered on 5 Mar 2022/);
    expect(src).toMatch(/Police Station Bhadra/);
    expect(src).toMatch(/302, 34 IPC/);
    expect(src).toMatch(/arrested on 10 Mar 2022/);
    expect(src).toMatch(/R\.K\. Sharma/);
    expect(src).toMatch(/AFFIDAVIT/);
    expect(src).toMatch(/\{\{place\}\}/); // unknown fields stay as chips
  });
  it('Hindi bail draft carries the same facts', () => {
    const src = bailDraftSrc(meta, 'jm', 'hi');
    expect(src).toMatch(/न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी/);
    expect(src).toMatch(/जमानत अर्जी/);
    expect(src).toMatch(/218\/2022/);
    expect(src).toMatch(/थाना Bhadra/);
    expect(src).toMatch(/शपथ पत्र/);
  });
  it('misc court gets a fill-in header; vars map from title', () => {
    expect(courtHeaderSrc('misc', 'en')).toMatch(/\{\{court_name\}\}/);
    const v = varsFromMeta(meta);
    expect(v.client_name).toBe('Ram Lal');
    expect(v.opp_party).toBe('State of Rajasthan');
    expect(v.case_no).toBe('204/2025');
  });
});

describe('WhatsApp share summary', () => {
  it('has bold markers and all known facts', () => {
    const s = shareSummary({
      court: 'JM', title: 'Ram Lal vs State', caseNo: '204/2025', firNo: '218/2022',
      psName: 'Bhadra', sections: ['302 IPC'], nextDate: '2025-07-15', files: ['challan.pdf'],
    });
    expect(s).toMatch(/\*CASE SUMMARY — JM\*/);
    expect(s).toMatch(/\*Next hearing: 15 Jul 2025\*/);
    expect(s).toMatch(/FIR: 218\/2022 · PS Bhadra/);
    expect(s).toMatch(/via Writer Pro/);
  });
});
