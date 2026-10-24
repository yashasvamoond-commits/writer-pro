import { useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { JURISDICTIONS, SKELETONS, VAR_KEYS, parseBlocks, indexBlocks, datesEventsBlocks, Block, IndexRow, DateRow } from '../lib/templates';
import { ALL_ENTRIES } from '../data/legal-dictionary';
import { HI_FONTS, EN_FONTS } from '../data/fonts';
import { insertBlocksAtCursor, insertTextAtCursor } from '../lib/editor-ops';
import { parseCaseFile, sortByNextDate, caseLabel } from '../lib/cases';
import { CaseInfo, PageSettings } from '../types';

interface Props {
  tab: string;
  setTab: (t: string) => void;
  onClose: () => void;
  editor: Editor | null;
  vars: Record<string, string>;
  onVars: (v: Record<string, string>) => void;
  cases: CaseInfo[];
  onCases: (c: CaseInfo[]) => void;
  onCauseTitle: () => void;
  settings: PageSettings;
  patch: (p: Partial<PageSettings>) => void;
  toast: (m: string) => void;
}

const TABS: [string, string][] = [
  ['templates', 'Templates'],
  ['fonts', 'Fonts'],
  ['variables', 'Vars'],
  ['cases', 'Cases'],
  ['index', 'Index'],
  ['dict', 'Dict'],
];

const TITLES: Record<string, [string, string]> = {
  templates: ['Court Templates', 'प्रपत्र — jurisdiction, cause titles, skeletons'],
  fonts: ['Font Library', 'फ़ॉन्ट — offline Hindi + English faces'],
  variables: ['Smart Variables', 'एक बार भरें, पूरे ड्राफ्ट में'],
  cases: ['My Cases', 'प्रकरण रजिस्टर — offline'],
  index: ['Index & Lists', 'सूची, तिथियाँ, exhibits'],
  dict: ['Legal Dictionary', 'विधि शब्दकोश — offline'],
};

export default function Sidebar(props: Props) {
  const { tab, setTab, onClose } = props;
  const [title, sub] = TITLES[tab] || ['', ''];
  const insert = (blocks: Block[]) => {
    if (!props.editor) return;
    insertBlocksAtCursor(props.editor, blocks, props.vars);
    props.toast('Inserted at cursor ✓');
  };

  return (
    <div className="sidebar">
      <div className="side-head">
        <b>{title}</b>
        <span className="sub">{sub}</span>
        <button className="close" onClick={onClose} title="Close panel / पैनल बंद करें">✕</button>
      </div>
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="pane">
        {tab === 'templates' && <TemplatesPane insert={insert} onCauseTitle={props.onCauseTitle} />}
        {tab === 'fonts' && <FontsPane settings={props.settings} patch={props.patch} />}
        {tab === 'variables' && <VariablesPane vars={props.vars} onVars={props.onVars} />}
        {tab === 'cases' && <CasesPane cases={props.cases} onCases={props.onCases} editor={props.editor} vars={props.vars} toast={props.toast} />}
        {tab === 'index' && <IndexPane insert={insert} />}
        {tab === 'dict' && <DictPane editor={props.editor} />}
      </div>
    </div>
  );
}

function TemplatesPane({ insert, onCauseTitle }: { insert: (b: Block[]) => void; onCauseTitle: () => void }) {
  return (
    <>
      <h4>Jurisdiction blocks / न्यायालय शीर्षक</h4>
      {JURISDICTIONS.map((j) => (
        <button key={j.id} className="item-btn" onClick={() => insert(parseBlocks(j.body))}>{j.label}</button>
      ))}
      <button className="item-btn accent" onClick={onCauseTitle}>
        ⚖ Cause Title Generator
        <small>parties box, memo of parties, case no. placeholder</small>
      </button>
      {(['Criminal', 'Civil & Revenue'] as const).map((cat) => (
        <div key={cat}>
          <h4>{cat} skeletons</h4>
          {SKELETONS.filter((s) => s.cat === cat).map((s) => (
            <button key={s.id} className="item-btn" onClick={() => insert(parseBlocks(s.body))}>
              {s.title}
              <small>{s.desc}</small>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

function FontsPane({ settings, patch }: { settings: PageSettings; patch: (p: Partial<PageSettings>) => void }) {
  return (
    <>
      <h4>Hindi / देवनागरी (bundled offline)</h4>
      {HI_FONTS.map((f) => (
        <button
          key={f.id}
          className={`font-card ${settings.fontHi === f.id ? 'on' : ''}`}
          onClick={() => patch({ fontHi: f.id })}
        >
          <span className="fname">
            {f.label} {f.labelHi}
            {!f.faces.length && <span className="tag sys">system</span>}
            {settings.fontHi === f.id && <span className="tag">active</span>}
          </span>
          <span className="sample" style={{ fontFamily: f.stack }}>
            न्यायालय न्यायिक मजिस्ट्रेट, भाद्रा — कालूराम बनाम प्रीति
          </span>
          <small className="muted">{f.note} · DOCX → {f.docx}</small>
        </button>
      ))}
      <h4>English / latin (bundled offline)</h4>
      {EN_FONTS.map((f) => (
        <button
          key={f.id}
          className={`font-card ${settings.fontEn === f.id ? 'on' : ''}`}
          onClick={() => patch({ fontEn: f.id })}
        >
          <span className="fname">
            {f.label}
            {!f.faces.length && <span className="tag sys">system</span>}
            {settings.fontEn === f.id && <span className="tag">active</span>}
          </span>
          <span className="sample en" style={{ fontFamily: f.stack }}>
            In the Court of the Judicial Magistrate First Class, Bhadra — 123
          </span>
          <small className="muted">{f.note} · DOCX → {f.docx}</small>
        </button>
      ))}
      <p className="muted">
        All bundled faces are SIL OFL and ship inside the APK — no internet needed.
        DOCX exports map to court-PC fonts (Mangal / Times New Roman) automatically.
      </p>
    </>
  );
}

function VariablesPane({ vars, onVars }: { vars: Record<string, string>; onVars: (v: Record<string, string>) => void }) {
  const [custom, setCustom] = useState('');
  const keys = useMemo(() => {
    const base = VAR_KEYS.map((k) => k.key);
    return [...base, ...Object.keys(vars).filter((k) => !base.includes(k))];
  }, [vars]);
  return (
    <>
      <h4>Smart variables / चल संदर्भ</h4>
      <p className="muted">Values fill every yellow chip in the draft at once.</p>
      {keys.map((k) => (
        <div className="field" key={k}>
          <label>{k}{VAR_KEYS.find((v) => v.key === k)?.hint ? ` — ${VAR_KEYS.find((v) => v.key === k)?.hint}` : ''}</label>
          <input value={vars[k] || ''} placeholder={`{{${k}}}`} onChange={(e) => onVars({ ...vars, [k]: e.target.value })} />
        </div>
      ))}
      <div className="row">
        <input placeholder="new key e.g. cheque_no" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn" onClick={() => { if (custom.trim()) { onVars({ ...vars, [custom.trim()]: vars[custom.trim()] || '' }); setCustom(''); } }}>Add</button>
      </div>
    </>
  );
}

function CasesPane({ cases, onCases, editor, vars, toast }: { cases: CaseInfo[]; onCases: (c: CaseInfo[]) => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const load = (text: string) => {
    const parsed = parseCaseFile(text);
    if (!parsed.length) { toast('No cases parsed — check file format'); return; }
    onCases(parsed);
    toast(`${parsed.length} cases loaded (offline) ✓`);
  };
  const causeTitle = (c: CaseInfo) => {
    if (!editor) return;
    const blocks = parseBlocks(
      `C:IN THE COURT OF THE ${c.courtHi || c.court}\n` +
      `C:${c.court || ''}\n` +
      `C:Case No. ${c.caseNo} of ${c.regYear || '20__'}  (CINO ${c.cino})\n` +
      `C:B:${c.petitionerHi || c.petitioner}\n` +
      `C:... Petitioner / वादी\n` +
      `C:Versus / बनाम\n` +
      `C:B:${c.respondentHi || c.respondent}\n` +
      `C:... Respondent / प्रतिवादी\n` +
      `C:(Next listing: ${c.nextDate || '—'} — ${c.purposeHi || c.purpose})`,
    );
    insertBlocksAtCursor(editor, blocks, vars);
    toast('Cause title inserted ✓');
  };
  return (
    <>
      <h4>Case register / प्रकरण रजिस्टर</h4>
      <input
        ref={fileRef} type="file" accept=".txt,.json,application/json" style={{ display: 'none' }}
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); }}
      />
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>Import myCases.txt</button>
      </div>
      <p className="muted">Parsed fully on-device; nothing leaves the tablet.</p>
      {sortByNextDate(cases).map((c) => (
        <div className="case-row" key={c.cino}>
          <b>{caseLabel(c)}</b>
          <div>{c.typeHi || c.type} · {c.courtHi || c.court}</div>
          <div>Case No. {c.caseNo}/{c.regYear} · <span className="next">Next: {c.nextDate || '—'}</span> · {c.purposeHi || c.purpose}</div>
          <div className="row" style={{ marginTop: 5 }}>
            <button className="btn" onClick={() => causeTitle(c)}>Cause title</button>
            <button
              className="btn"
              onClick={() => editor && (insertTextAtCursor(editor, `${c.petitionerHi || c.petitioner} बनाम ${c.respondentHi || c.respondent} (वाद संख्या ${c.caseNo}/${c.regYear})`), toast('Parties line inserted ✓'))}
            >Parties line</button>
          </div>
        </div>
      ))}
      {!cases.length && <p className="muted">No cases loaded yet. Import the eCourt register export (myCases.txt) to auto-fill cause titles and next dates.</p>}
    </>
  );
}

function IndexPane({ insert }: { insert: (b: Block[]) => void }) {
  const [idx, setIdx] = useState<IndexRow[]>([{ mark: 'P-1', title: 'Petition / प्रार्थना पत्र', remark: '' }]);
  const [dates, setDates] = useState<DateRow[]>([{ date: '07.02.2018', event: 'Marriage solemnised / विवाह' }]);
  return (
    <>
      <h4>Index of documents / exhibits</h4>
      {idx.map((r, i) => (
        <div className="row" key={i} style={{ marginBottom: 5 }}>
          <input style={{ width: 62 }} value={r.mark} placeholder="P-1" onChange={(e) => setIdx(idx.map((x, j) => (j === i ? { ...x, mark: e.target.value } : x)))} />
          <input style={{ flex: 1 }} value={r.title} placeholder="Document title" onChange={(e) => setIdx(idx.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <button className="btn ghost" onClick={() => setIdx(idx.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="row">
        <button className="btn" onClick={() => setIdx([...idx, { mark: `P-${idx.length + 1}`, title: '', remark: '' }])}>+ Row</button>
        <button className="btn primary" onClick={() => insert(indexBlocks(idx))}>Insert index</button>
      </div>
      <h4>List of dates & events</h4>
      {dates.map((r, i) => (
        <div className="row" key={i} style={{ marginBottom: 5 }}>
          <input style={{ width: 96 }} value={r.date} placeholder="dd.mm.yyyy" onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
          <input style={{ flex: 1 }} value={r.event} placeholder="Event" onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, event: e.target.value } : x)))} />
          <button className="btn ghost" onClick={() => setDates(dates.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="row">
        <button className="btn" onClick={() => setDates([...dates, { date: '', event: '' }])}>+ Row</button>
        <button className="btn primary" onClick={() => insert(datesEventsBlocks(dates))}>Insert list</button>
      </div>
      <p className="muted">Marks: P-1 plaintiff, D-1 defendant, A-1 annexure, Ex-1 exhibit.</p>
    </>
  );
}

function DictPane({ editor }: { editor: Editor | null }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ALL_ENTRIES.slice(0, 30);
    return ALL_ENTRIES.filter((e) => e.term.toLowerCase().includes(query) || (e.meaning || '').toLowerCase().includes(query)).slice(0, 60);
  }, [q]);
  return (
    <>
      <h4>Search / खोज</h4>
      <div className="field">
        <input placeholder="res judicata, khasra, 138…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {results.map((e) => (
        <button key={`${e.tag}-${e.term}`} className="item-btn" onClick={() => editor && insertTextAtCursor(editor, `${e.term} `)}>
          {e.term}
          <small>{e.meaning} <span className="tag">{e.tag}</span></small>
        </button>
      ))}
      {!results.length && <p className="muted">No entry found.</p>}
    </>
  );
}
