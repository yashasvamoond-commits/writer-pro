import { useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { JURISDICTIONS, SKELETONS, VAR_KEYS, parseBlocks, indexBlocks, datesEventsBlocks, Block, IndexRow, DateRow } from '../lib/templates';
import { ALL_ENTRIES } from '../data/legal-dictionary';
import { HI_FONTS, EN_FONTS } from '../data/fonts';
import { insertBlocksAtCursor, insertTextAtCursor, insertCourtHeader } from '../lib/editor-ops';
import { parseCaseFile, sortByNextDate, caseLabel } from '../lib/cases';
import { checkGrammar, GrammarIssue } from '../lib/grammar';
import { CaseInfo, PageSettings } from '../types';
import { useI18n } from '../data/i18n';
import ClerkPane from './ClerkPane';

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
  ocrWords: string[];
  toast: (m: string) => void;
}

const TABS: [string, string, string][] = [
  ['clerk', 'sideClerk', '🧑‍⚖'],
  ['templates', 'sideTemplates', '🏛'],
  ['fonts', 'sideFonts', '🔤'],
  ['variables', 'sideVars', '🧩'],
  ['cases', 'sideCases', '⚖'],
  ['index', 'sideIndex', '🗂'],
  ['dict', 'sideDict', '📖'],
  ['issues', 'sideIssues', '⚠'],
];

export default function Sidebar(props: Props) {
  const { t, lang } = useI18n();
  const { tab, setTab, onClose } = props;
  const insert = (blocks: Block[]) => {
    if (!props.editor) return;
    insertBlocksAtCursor(props.editor, blocks, props.vars);
    props.toast(t('tInserted'));
  };

  return (
    <div className="sidebar">
      <div className="side-head">
        <b>{lang === 'hi' ? 'पैनल' : 'Panel'}</b>
        <span className="sub">{t(tab === 'fonts' ? 'fontLib' : tab === 'issues' ? 'issues' : 'panels')}</span>
        <button className="close" onClick={onClose} title={t('closePanel')}>✕</button>
      </div>
      <div className="tabs">
        {TABS.map(([id, key, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} title={t(key)}>
            {icon} {t(key)}
          </button>
        ))}
      </div>
      <div className="pane">
        {tab === 'clerk' && <ClerkPane toast={props.toast} />}
        {tab === 'templates' && <TemplatesPane insert={insert} onCauseTitle={props.onCauseTitle} editor={props.editor} vars={props.vars} toast={props.toast} />}
        {tab === 'fonts' && <FontsPane settings={props.settings} patch={props.patch} />}
        {tab === 'variables' && <VariablesPane vars={props.vars} onVars={props.onVars} />}
        {tab === 'cases' && <CasesPane cases={props.cases} onCases={props.onCases} editor={props.editor} vars={props.vars} toast={props.toast} />}
        {tab === 'index' && <IndexPane insert={insert} />}
        {tab === 'dict' && <DictPane editor={props.editor} />}
        {tab === 'issues' && <IssuesPane editor={props.editor} ocrWords={props.ocrWords} toast={props.toast} />}
      </div>
    </div>
  );
}

function TemplatesPane({ insert, onCauseTitle, editor, vars, toast }: {
  insert: (b: Block[]) => void; onCauseTitle: () => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <>
      <h4>{t('jurBlocks')}</h4>
      {JURISDICTIONS.map((j) => (
        <button
          key={j.id}
          className="item-btn"
          onClick={() => { if (editor) { insertCourtHeader(editor, j, lang, vars); toast(t('tHeaderTop')); } }}
        >{j.label}</button>
      ))}
      <button className="item-btn accent" onClick={onCauseTitle}>
        ⚖ {t('causeGen')}
        <small>{t('causeGenSub')}</small>
      </button>
      <h4>{t('skeletonsCrim')}</h4>
      {SKELETONS.filter((s) => s.cat === 'Criminal').map((s) => (
        <button key={s.id} className="item-btn" onClick={() => insert(parseBlocks(s.body))}>
          {s.title}
          <small>{s.desc}</small>
        </button>
      ))}
      <h4>{t('skeletonsCivil')}</h4>
      {SKELETONS.filter((s) => s.cat === 'Civil & Revenue').map((s) => (
        <button key={s.id} className="item-btn" onClick={() => insert(parseBlocks(s.body))}>
          {s.title}
          <small>{s.desc}</small>
        </button>
      ))}
    </>
  );
}

function FontsPane({ settings, patch }: { settings: PageSettings; patch: (p: Partial<PageSettings>) => void }) {
  const { t } = useI18n();
  return (
    <>
      <h4>{t('fontsHi')}</h4>
      {HI_FONTS.map((f) => (
        <button key={f.id} className={`font-card ${settings.fontHi === f.id ? 'on' : ''}`} onClick={() => patch({ fontHi: f.id })}>
          <span className="fname">
            {f.label} {f.labelHi}
            {!f.faces.length && <span className="tag sys">{t('system')}</span>}
            {settings.fontHi === f.id && <span className="tag">{t('active')}</span>}
          </span>
          <span className="sample" style={{ fontFamily: f.stack }}>न्यायालय न्यायिक मजिस्ट्रेट, भाद्रा — कालूराम बनाम प्रीति</span>
          <small className="muted">{f.note} · DOCX → {f.docx}</small>
        </button>
      ))}
      <h4>{t('fontsEn')}</h4>
      {EN_FONTS.map((f) => (
        <button key={f.id} className={`font-card ${settings.fontEn === f.id ? 'on' : ''}`} onClick={() => patch({ fontEn: f.id })}>
          <span className="fname">
            {f.label}
            {!f.faces.length && <span className="tag sys">{t('system')}</span>}
            {settings.fontEn === f.id && <span className="tag">{t('active')}</span>}
          </span>
          <span className="sample en" style={{ fontFamily: f.stack }}>In the Court of the Judicial Magistrate First Class, Bhadra — 123</span>
          <small className="muted">{f.note} · DOCX → {f.docx}</small>
        </button>
      ))}
    </>
  );
}

function VariablesPane({ vars, onVars }: { vars: Record<string, string>; onVars: (v: Record<string, string>) => void }) {
  const { t } = useI18n();
  const [custom, setCustom] = useState('');
  const keys = useMemo(() => {
    const base = VAR_KEYS.map((k) => k.key);
    return [...base, ...Object.keys(vars).filter((k) => !base.includes(k))];
  }, [vars]);
  return (
    <>
      <h4>{t('sideVars')}</h4>
      <p className="muted">{t('varsHint')}</p>
      {keys.map((k) => (
        <div className="field" key={k}>
          <label>{k}{VAR_KEYS.find((v) => v.key === k)?.hint ? ` — ${VAR_KEYS.find((v) => v.key === k)?.hint}` : ''}</label>
          <input value={vars[k] || ''} placeholder={`{{${k}}}`} onChange={(e) => onVars({ ...vars, [k]: e.target.value })} />
        </div>
      ))}
      <div className="row">
        <input placeholder={t('addKey')} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn" onClick={() => { if (custom.trim()) { onVars({ ...vars, [custom.trim()]: vars[custom.trim()] || '' }); setCustom(''); } }}>{t('add')}</button>
      </div>
    </>
  );
}

function CasesPane({ cases, onCases, editor, vars, toast }: { cases: CaseInfo[]; onCases: (c: CaseInfo[]) => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const load = (text: string) => {
    const parsed = parseCaseFile(text);
    if (!parsed.length) { toast('No cases parsed'); return; }
    onCases(parsed);
    toast(`${parsed.length} ✓`);
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
    toast(t('tCause'));
  };
  return (
    <>
      <h4>{t('sideCases')}</h4>
      <input ref={fileRef} type="file" accept=".txt,.json,application/json" style={{ display: 'none' }}
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); }} />
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>{t('importCases')}</button>
      </div>
      <p className="muted">{t('casesHint')}</p>
      {sortByNextDate(cases).map((c) => (
        <div className="case-row" key={c.cino}>
          <b>{caseLabel(c)}</b>
          <div>{c.typeHi || c.type} · {c.courtHi || c.court}</div>
          <div>Case No. {c.caseNo}/{c.regYear} · <span className="next">Next: {c.nextDate || '—'}</span> · {c.purposeHi || c.purpose}</div>
          <div className="row" style={{ marginTop: 5 }}>
            <button className="btn" onClick={() => causeTitle(c)}>{t('causeTitle')}</button>
            <button className="btn" onClick={() => editor && (insertTextAtCursor(editor, `${c.petitionerHi || c.petitioner} बनाम ${c.respondentHi || c.respondent} (वाद संख्या ${c.caseNo}/${c.regYear})`), toast(t('tInserted')))}>{t('partiesLine')}</button>
          </div>
        </div>
      ))}
      {!cases.length && <p className="muted">myCases.txt → import</p>}
    </>
  );
}

function IndexPane({ insert }: { insert: (b: Block[]) => void }) {
  const { t } = useI18n();
  const [idx, setIdx] = useState<IndexRow[]>([{ mark: 'P-1', title: 'Petition / प्रार्थना पत्र', remark: '' }]);
  const [dates, setDates] = useState<DateRow[]>([{ date: '07.02.2018', event: 'Marriage solemnised / विवाह' }]);
  return (
    <>
      <h4>{t('idxDocs')}</h4>
      {idx.map((r, i) => (
        <div className="row" key={i} style={{ marginBottom: 5 }}>
          <input style={{ width: 62 }} value={r.mark} placeholder="P-1" onChange={(e) => setIdx(idx.map((x, j) => (j === i ? { ...x, mark: e.target.value } : x)))} />
          <input style={{ flex: 1 }} value={r.title} placeholder="Title" onChange={(e) => setIdx(idx.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <button className="btn ghost" onClick={() => setIdx(idx.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="row">
        <button className="btn" onClick={() => setIdx([...idx, { mark: `P-${idx.length + 1}`, title: '', remark: '' }])}>{t('row')}</button>
        <button className="btn primary" onClick={() => insert(indexBlocks(idx))}>{t('insertIdx')}</button>
      </div>
      <h4>{t('idxDates')}</h4>
      {dates.map((r, i) => (
        <div className="row" key={i} style={{ marginBottom: 5 }}>
          <input style={{ width: 96 }} value={r.date} placeholder="dd.mm.yyyy" onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
          <input style={{ flex: 1 }} value={r.event} placeholder="Event" onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, event: e.target.value } : x)))} />
          <button className="btn ghost" onClick={() => setDates(dates.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="row">
        <button className="btn" onClick={() => setDates([...dates, { date: '', event: '' }])}>{t('row')}</button>
        <button className="btn primary" onClick={() => insert(datesEventsBlocks(dates))}>{t('insertList')}</button>
      </div>
    </>
  );
}

function DictPane({ editor }: { editor: Editor | null }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ALL_ENTRIES.slice(0, 30);
    return ALL_ENTRIES.filter((e) => e.term.toLowerCase().includes(query) || (e.meaning || '').toLowerCase().includes(query)).slice(0, 60);
  }, [q]);
  return (
    <>
      <h4>{t('search')}</h4>
      <div className="field"><input placeholder={t('searchPh')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <p className="muted">{ALL_ENTRIES.length} entries offline</p>
      {results.map((e, i) => (
        <button key={`${e.tag}-${e.term}-${i}`} className="item-btn" onClick={() => editor && insertTextAtCursor(editor, `${e.term} `)}>
          {e.term}
          <small>{e.meaning} <span className="tag">{e.tag}</span></small>
        </button>
      ))}
      {!results.length && <p className="muted">{t('noEntry')}</p>}
    </>
  );
}

interface LocatedIssue extends GrammarIssue { pos: number }

function IssuesPane({ editor, ocrWords, toast }: { editor: Editor | null; ocrWords: string[]; toast: (m: string) => void }) {
  const { t, lang } = useI18n();
  const [refresh, setRefresh] = useState(0);
  const issues = useMemo<LocatedIssue[]>(() => {
    void refresh;
    if (!editor) return [];
    const out: LocatedIssue[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      for (const iss of checkGrammar(node.text)) out.push({ ...iss, pos });
    });
    return out.slice(0, 80);
  }, [editor, refresh]);

  const fix = (iss: LocatedIssue) => {
    if (!editor || !iss.fix) return;
    editor.commands.insertContentAt({ from: iss.pos + iss.from, to: iss.pos + iss.to }, iss.fix);
    toast(t('tFixed'));
    setRefresh((r) => r + 1);
  };

  return (
    <>
      <h4>{t('issues')}</h4>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={() => setRefresh((r) => r + 1)}>↻</button>
        <span className="muted">{issues.length}</span>
      </div>
      {issues.map((iss, i) => (
        <div className="case-row" key={i}>
          <b style={{ color: iss.kind === 'citation' ? '#8a5a00' : '#1d6fb8' }}>
            {iss.kind === 'citation' ? '⚖' : '✍'} {lang === 'hi' ? iss.message.hi : iss.message.en}
          </b>
          {iss.fix && (
            <div className="row" style={{ marginTop: 4 }}>
              <button className="btn primary" onClick={() => fix(iss)}>{t('fix')}: “{iss.fix}”</button>
            </div>
          )}
        </div>
      ))}
      {!issues.length && <p className="muted">{t('issuesNone')}</p>}
      {ocrWords.length > 0 && (
        <>
          <h4>{t('ocrReview')}</h4>
          <div className="case-row">{ocrWords.join(', ')}</div>
        </>
      )}
    </>
  );
}
