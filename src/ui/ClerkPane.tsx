/**
 * 🧑‍⚖ Smart Clerk — full paralegal workbench.
 *
 *  • reads every PDF/Word/text/image file you pick (offline; scans → OCR)
 *  • files each document under the court named INSIDE it (JM · ACJM · ADJ ·
 *    SDM · AECM), Miscellaneous only when no court heading exists
 *  • extracts case no · FIR no · police station · sections · parties ·
 *    next hearing date · decided date · document type · advocate
 *  • 📅 agenda + 🔔 Android reminders (evening-before 8 pm & morning-of 9 am)
 *  • 👥 party-wise view — every file of one client together
 *  • 📦 filing bundles — zip a court's documents with an auto INDEX.docx/INDEX.csv
 *  • 📒 persistent register with CSV/Word export, per-file notes, tap-to-copy
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import JSZip from 'jszip';
import type { Editor } from '@tiptap/react';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { useI18n } from '../data/i18n';
import { COURT_ORDER, CourtId } from '../lib/court-classify';
import { fmtDate, daysUntil, splitParties, partyKey } from '../lib/clerk-extract';
import {
  FileKind, kindOf, pdfToDocx, pdfToHtml, pdfToPngZip, pdfToTxt, docxToHtmlString, docxToTxt,
  ocrImage, readFileSmart, ReadResult, targetsFor, Target, TARGET_LABEL, txtToDocx,
} from '../lib/clerk';
import { insertTextAtCursor } from '../lib/editor-ops';
import { remindersAvailable, remindersForDate, syncReminders } from '../lib/notify';

interface ClerkEntry {
  id: string;
  name: string;
  kind: FileKind;
  size: number;
  file: File;
  status: 'working' | 'ok' | 'err';
  res?: ReadResult;
  progress?: number;
}

interface LedgerItem {
  name: string; court: CourtId; at: number; ocr: boolean;
  caseNo?: string; firNo?: string; psName?: string; sections?: string[];
  title?: string; nextDate?: string; decidedDate?: string; docType?: string; advocate?: string;
  note?: string;
}
const LKEY = 'writerpro.clerk.ledger.v2';
function loadLedger(): LedgerItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LKEY) || localStorage.getItem('writerpro.clerk.ledger') || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function saveLedger(items: LedgerItem[]) { localStorage.setItem(LKEY, JSON.stringify(items.slice(0, 300))); }

const COURT_LABEL: Record<CourtId, string> = {
  jm: 'JM · न्यायिक मजिस्ट्रेट',
  acjm: 'ACJM · अतिरिक्त मुख्य न्यायिक मजिस्ट्रेट',
  adj: 'ADJ · अपर जिला एवं सेशन न्यायाधीश',
  sdm: 'SDM · उपखण्ड अधिकारी',
  aecm: 'AECM · अतिरिक्त कार्यपालक मजिस्ट्रेट',
  misc: 'Miscellaneous · विविध',
};
const COURT_SHORT = (c: CourtId) => COURT_LABEL[c].split(' · ')[0];
const KIND_ICON: Record<FileKind, string> = { pdf: '📕', docx: '📘', doc: '📙', txt: '📄', html: '🌐', image: '🖼', other: '📎' };

interface PrintJob { kind: 'docx' | 'raw'; title: string; margin: string; data?: ArrayBuffer; html?: string }

/* ---------------- register builders (shared by export & bundles) ---------------- */
function registerCsv(items: LedgerItem[]): string {
  const head = ['Court', 'File', 'Title/Parties', 'Case No', 'FIR No', 'Police Station', 'Sections', 'Doc type', 'Next date', 'Decided', 'Advocate', 'Note', 'OCR', 'Scanned at'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const l of items) {
    lines.push([COURT_SHORT(l.court), l.name, l.title, l.caseNo, l.firNo, l.psName,
      (l.sections || []).join(' '), l.docType, l.nextDate, l.decidedDate, l.advocate, l.note,
      l.ocr ? 'yes' : 'no', new Date(l.at).toISOString()].map(esc).join(','));
  }
  return '\ufeff' + lines.join('\n');
}

async function registerDocxBlob(items: LedgerItem[], title: string): Promise<Blob> {
  const kids: (Paragraph | Table)[] = [new Paragraph({
    alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: title, bold: true, size: 30 })],
  })];
  for (const c of COURT_ORDER) {
    const rows4 = items.filter((l) => l.court === c);
    if (!rows4.length) continue;
    kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `${COURT_LABEL[c]} (${rows4.length})`, bold: true, size: 26 })] }));
    const rows = [new TableRow({
      tableHeader: true,
      children: ['File', 'Parties', 'Case No', 'FIR/PS', 'Sections', 'Type', 'Next date', 'Note'].map((h) =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })] })),
    })];
    for (const l of rows4) {
      rows.push(new TableRow({
        children: [l.name, l.title || '', l.caseNo || '', [l.firNo, l.psName].filter(Boolean).join(' · '),
          (l.sections || []).join(', '), l.docType || '', l.nextDate ? fmtDate(l.nextDate) : '', l.note || ''].map((v) =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })] })] })),
      }));
    }
    kids.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    kids.push(new Paragraph({ children: [new TextRun('')] }));
  }
  const doc = new Document({ creator: 'Writer Pro Smart Clerk', title, sections: [{ properties: {}, children: kids }] });
  return Packer.toBlob(doc);
}

export default function ClerkPane({ toast, editor }: { toast: (m: string) => void; editor: Editor | null }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ClerkEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>(loadLedger);
  const [busy, setBusy] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'courts' | 'parties'>('courts');
  const [job, setJob] = useState<PrintJob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (job?.kind === 'docx' && job.data && renderRef.current) {
      renderRef.current.innerHTML = '';
      void renderAsync(job.data, renderRef.current, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: true });
    }
  }, [job]);

  const patchEntry = (id: string, p: Partial<ClerkEntry>) =>
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const updateLedger = (fn: (items: LedgerItem[]) => LedgerItem[]) => {
    const next = fn(loadLedger());
    saveLedger(next);
    setLedger(next);
  };

  const scan = async (files: File[]) => {
    const docs = files.filter((f) => kindOf(f.name) !== 'other');
    if (!docs.length) { toast(t('clerkNoFiles')); return; }
    const fresh: ClerkEntry[] = docs.map((f, i) => ({
      id: `c${Date.now().toString(36)}-${i}`, name: f.name, kind: kindOf(f.name), size: f.size, file: f, status: 'working',
    }));
    setEntries((cur) => [...fresh, ...cur]);
    for (let i = 0; i < fresh.length; i++) {
      const e = fresh[i];
      setScanNote(`${i + 1}/${fresh.length} · ${e.name}`);
      try {
        const res = await readFileSmart(e.file, (p) => patchEntry(e.id, { progress: p }));
        patchEntry(e.id, { status: 'ok', res, progress: undefined });
        const m = res.meta;
        updateLedger((old) => [{
          name: e.name, court: res.cls.court, at: Date.now(), ocr: res.ocr,
          caseNo: m.caseNo, firNo: m.firNo, psName: m.psName, sections: m.sections.length ? m.sections : undefined,
          title: m.title, nextDate: m.nextDate, decidedDate: m.decidedDate, docType: m.docType, advocate: m.advocate,
          note: old.find((l) => l.name === e.name)?.note, // keep earlier note on re-scan
        }, ...old.filter((l) => l.name !== e.name)]);
      } catch {
        patchEntry(e.id, { status: 'err', progress: undefined });
      }
    }
    setScanNote('');
    toast(t('clerkScanDone'));
  };

  /* ---------- register exports ---------- */
  const exportCsv = () => {
    saveAs(new Blob([registerCsv(ledger)], { type: 'text/csv;charset=utf-8' }), 'court-register.csv');
    toast('CSV ✓');
  };
  const exportRegisterDocx = async () => {
    saveAs(await registerDocxBlob(ledger, 'COURT-WISE DOCUMENT REGISTER / न्यायालय-वार दस्तावेज़ रजिस्टर'), 'court-register.docx');
    toast('DOCX ✓');
  };

  /* ---------- 📦 filing bundles ---------- */
  const bundle = async (court: CourtId | 'all') => {
    setBusy(`bundle:${court}`);
    try {
      const courts = court === 'all' ? COURT_ORDER : [court];
      const items = ledger.filter((l) => courts.includes(l.court));
      const zip = new JSZip();
      let files = 0;
      for (const c of courts) {
        const folder = zip.folder(COURT_SHORT(c))!;
        for (const e of entries.filter((x) => x.status === 'ok' && x.res?.cls.court === c)) {
          folder.file(e.name, e.file);
          files++;
        }
      }
      zip.file('INDEX.csv', registerCsv(items));
      zip.file('INDEX.docx', await (await registerDocxBlob(items, `FILING INDEX — ${court === 'all' ? 'ALL COURTS' : COURT_LABEL[court]}`)).arrayBuffer());
      const name = court === 'all' ? 'filing-bundle-all.zip' : `filing-bundle-${COURT_SHORT(court).toLowerCase()}.zip`;
      saveAs(await zip.generateAsync({ type: 'blob' }), name);
      toast(files ? `📦 ${files} + INDEX ✓` : `📦 ${t('clerkBundleIdxOnly')}`);
    } catch {
      toast(t('clerkConvErr'));
    } finally {
      setBusy(null);
    }
  };

  /* ---------- 🔔 reminders ---------- */
  const armReminders = async () => {
    if (!remindersAvailable()) { toast(t('clerkRemNA')); return; }
    setBusy('reminders');
    const items = ledger.filter((l) => l.nextDate && daysUntil(l.nextDate) >= 0 && daysUntil(l.nextDate) <= 60);
    const rems = items.flatMap((l) => remindersForDate(
      l.nextDate!,
      `${COURT_SHORT(l.court)}${l.caseNo ? ` · ${l.caseNo}` : ''}`,
      `${l.title || l.name} — ${COURT_LABEL[l.court]}`,
    ));
    const n = await syncReminders(rems);
    setBusy(null);
    toast(n >= 0 ? `🔔 ${t('clerkRemSet').replace('{n}', String(n))}` : t('clerkRemDenied'));
  };

  /* ---------- agenda ---------- */
  const agenda = useMemo(() => {
    return ledger
      .filter((l) => l.nextDate)
      .map((l) => ({ l, d: daysUntil(l.nextDate!) }))
      .filter((x) => x.d >= 0 && x.d <= 30)
      .sort((a, b) => a.d - b.d)
      .slice(0, 12);
  }, [ledger]);

  /* ---------- search ---------- */
  const q = query.trim().toLowerCase();
  const matchesLedger = (l: LedgerItem) => !q || [l.name, l.caseNo, l.firNo, l.title, l.psName, l.docType, l.note, ...(l.sections || [])]
    .some((v) => v && String(v).toLowerCase().includes(q));
  const matches = (e: ClerkEntry) => !q || [e.name, e.res?.cls.court, e.res?.meta.caseNo, e.res?.meta.firNo,
    e.res?.meta.title, e.res?.meta.psName, e.res?.meta.docType, ...(e.res?.meta.sections || [])]
    .some((v) => v && String(v).toLowerCase().includes(q));

  const grouped = COURT_ORDER.map((c) => {
    const rows = entries.filter((e) => e.status === 'ok' && e.res?.cls.court === c && matches(e));
    const led = ledger.filter((l) => l.court === c && matchesLedger(l));
    return {
      court: c, rows,
      stats: {
        total: led.length,
        pending: led.filter((l) => !l.decidedDate).length,
        decided: led.filter((l) => l.decidedDate).length,
        dated: led.filter((l) => l.nextDate && daysUntil(l.nextDate) >= 0).length,
      },
    };
  }).filter((g) => g.rows.length || (q ? g.stats.total : 0));

  /* ---------- parties view ---------- */
  const partyGroups = useMemo(() => {
    const map = new Map<string, LedgerItem[]>();
    for (const l of ledger) {
      if (!matchesLedger(l)) continue;
      const key = partyKey(splitParties(l.title).first) || partyKey(l.advocate) || '';
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(l);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 40);
  }, [ledger, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const working = entries.filter((e) => e.status !== 'ok');

  const doPrint = () => {
    if (!job) return;
    document.body.classList.add('print-external');
    const st = document.createElement('style');
    st.textContent = `@page { margin: ${job.margin}; size: auto portrait; }
@media print {
  body.print-external #root { display: none !important; }
  body.print-external .ext-preview { position: static !important; inset: auto !important; background: #fff !important; overflow: visible !important; }
  body.print-external .ext-preview .ext-bar { display: none !important; }
}`;
    document.head.appendChild(st);
    const cleanup = () => { document.body.classList.remove('print-external'); st.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const convert = async (e: ClerkEntry, target: Target) => {
    setBusy(`${e.id}:${target}`);
    const base = e.name.replace(/\.[^.]+$/, '');
    try {
      if (e.kind === 'pdf') {
        if (target === 'docx') { const b = await pdfToDocx(e.file, (p) => patchEntry(e.id, { progress: p })); saveAs(b, `${base}.docx`); }
        else if (target === 'txt') saveAs(new Blob([await pdfToTxt(e.file)], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
        else if (target === 'html') saveAs(new Blob([await pdfToHtml(e.file)], { type: 'text/html;charset=utf-8' }), `${base}.html`);
        else if (target === 'png') { const z = await pdfToPngZip(e.file, (p) => patchEntry(e.id, { progress: p })); saveAs(z, `${base}-pages.zip`); }
      } else if (e.kind === 'docx') {
        if (target === 'pdf') setJob({ kind: 'docx', title: e.name, margin: '0', data: await e.file.arrayBuffer() });
        else if (target === 'txt') saveAs(new Blob([await docxToTxt(e.file)], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
        else if (target === 'html') {
          const body = await docxToHtmlString(e.file);
          saveAs(new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>${base}</title><style>body{font-family:'Times New Roman',serif;max-width:800px;margin:24px auto;line-height:1.5;padding:0 12px}</style></head><body>${body}</body></html>`], { type: 'text/html;charset=utf-8' }), `${base}.html`);
        }
      } else if (e.kind === 'txt' || e.kind === 'html') {
        const text = await e.file.text();
        if (target === 'docx') { const b = await txtToDocx(e.kind === 'html' ? text.replace(/<[^>]+>/g, ' ') : text, base); saveAs(b, `${base}.docx`); }
        else if (target === 'pdf') {
          const html = e.kind === 'html' ? text : `<pre style="white-space:pre-wrap;font-family:inherit">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`;
          setJob({ kind: 'raw', title: e.name, margin: '0.75in', html });
        }
      } else if (e.kind === 'image') {
        if (target === 'pdf') setJob({ kind: 'raw', title: e.name, margin: '0.4in', html: `<img src="${URL.createObjectURL(e.file)}" style="max-width:100%;display:block;margin:0 auto" />` });
        else if (target === 'docx') { const b = await txtToDocx(await ocrImage(e.file), base); saveAs(b, `${base}-ocr.docx`); }
        else if (target === 'txt') saveAs(new Blob([await ocrImage(e.file)], { type: 'text/plain;charset=utf-8' }), `${base}-ocr.txt`);
      }
      if (target !== 'pdf') toast(`${e.name} → ${TARGET_LABEL[target]} ✓`);
    } catch {
      toast(t('clerkConvErr'));
    } finally {
      setBusy(null);
      patchEntry(e.id, { progress: undefined });
    }
  };

  const openDraft = (e: ClerkEntry) => {
    if (!editor) { toast('—'); return; }
    const text = e.res?.text || '';
    if (!text.trim()) { toast(t('clerkErr')); return; }
    insertTextAtCursor(editor, text);
    toast(t('clerkDrafted'));
  };

  const copy = async (text?: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast(`⧉ ${text}`); } catch { toast(text); }
  };

  const editNote = (name: string) => {
    const cur = loadLedger().find((l) => l.name === name)?.note || '';
    const n = window.prompt(t('clerkNotePrompt'), cur);
    if (n === null) return;
    updateLedger((old) => old.map((l) => (l.name === name ? { ...l, note: n || undefined } : l)));
    toast('📝 ✓');
  };

  return (
    <div className="pane clerk-pane">
      <h4>🧑‍⚖ {t('clerkTitle')}</h4>
      <p className="muted small">{t('clerkHint')}</p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>📁 {t('clerkFiles')}</button>
        <button className="btn" onClick={() => dirRef.current?.click()}>🗂 {t('clerkFolder')}</button>
      </div>
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.txt,.md,.html,.htm,.png,.jpg,.jpeg,.webp"
        onChange={(ev) => { const fs = [...(ev.target.files || [])]; if (fs.length) void scan(fs); ev.target.value = ''; }} />
      <input ref={dirRef} type="file" multiple style={{ display: 'none' }}
        // @ts-expect-error non-standard but supported on Android WebView
        webkitdirectory="" directory=""
        onChange={(ev) => { const fs = [...(ev.target.files || [])].filter((f) => kindOf(f.name) !== 'other'); if (fs.length) void scan(fs); ev.target.value = ''; }} />

      <div className="clerk-switch">
        <button className={view === 'courts' ? 'on' : ''} onClick={() => setView('courts')}>🏛 {t('clerkViewCourts')}</button>
        <button className={view === 'parties' ? 'on' : ''} onClick={() => setView('parties')}>👥 {t('clerkViewParties')}</button>
      </div>

      {ledger.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <button className="btn" onClick={exportCsv}>⬇ {t('clerkExportCsv')}</button>
          <button className="btn" onClick={() => void exportRegisterDocx()}>⬇ {t('clerkExportDocx')}</button>
          <button className="btn" onClick={() => void bundle('all')} disabled={!!busy}>
            {busy === 'bundle:all' ? '⏳' : '📦'} {t('clerkBundleAll')}
          </button>
          {remindersAvailable() && (
            <button className="btn" onClick={() => void armReminders()} disabled={!!busy}>
              {busy === 'reminders' ? '⏳' : '🔔'} {t('clerkReminders')}
            </button>
          )}
          <button className="btn ghost" onClick={() => { saveLedger([]); setLedger([]); }}>{t('clerkClear')}</button>
          <span className="muted small" style={{ alignSelf: 'center' }}>{ledger.length} {t('clerkLedgerCount')}</span>
        </div>
      )}

      {agenda.length > 0 && (
        <div className="clerk-agenda">
          <b>📅 {t('clerkAgenda')}</b>
          {agenda.map(({ l, d }, i) => (
            <div className={`ag-row ${d === 0 ? 'today' : d <= 3 ? 'soon' : d <= 7 ? 'week' : ''}`} key={i}>
              <span className="ag-date">{d === 0 ? t('clerkToday') : fmtDate(l.nextDate)}</span>
              <span className="ag-body" onClick={() => copy(l.caseNo || l.name)}>
                <b>{COURT_SHORT(l.court)}</b> {l.caseNo || l.name}
                {l.title && <span className="muted small"> · {l.title}</span>}
              </span>
              <button className="btn tiny" title={t('clerkNote')} onClick={() => editNote(l.name)}>📝</button>
            </div>
          ))}
        </div>
      )}

      {(entries.length > 0 || ledger.length > 0) && (
        <input className="clerk-search" placeholder={`🔍 ${t('clerkSearch')}`} value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      {scanNote && <div className="clerk-progress">⏳ {t('clerkReading')} {scanNote}</div>}

      {view === 'courts' && grouped.map((g) => (
        <div className="court-group" key={g.court}>
          <div className={`court-head ${g.court}`}>
            <b>{COURT_LABEL[g.court]}</b>
            {g.stats.total > 0 && (
              <span className="court-stats">
                {g.stats.pending} {t('clerkPending')} · {g.stats.decided} {t('clerkDecided')}
                {g.stats.dated > 0 && <> · ⏰ {g.stats.dated}</>}
              </span>
            )}
            <span className="cnt">{g.rows.length || g.stats.total}</span>
            <button className="btn tiny bundle" disabled={!!busy} onClick={() => void bundle(g.court)} title={t('clerkBundle')}>
              {busy === `bundle:${g.court}` ? '⏳' : '📦'}
            </button>
          </div>
          {g.rows.map((e) => (
            <ClerkRow key={e.id} e={e} busy={busy} onConvert={convert} onDraft={() => openDraft(e)} hasEditor={!!editor}
              onCopy={copy} onNote={() => editNote(e.name)}
              note={loadLedger().find((l) => l.name === e.name)?.note} />
          ))}
          {!g.rows.length && ledger.filter((l) => l.court === g.court && matchesLedger(l)).map((l, i) => (
            <LedgerRow key={i} l={l} onCopy={copy} onNote={() => editNote(l.name)} />
          ))}
        </div>
      ))}

      {view === 'parties' && (
        partyGroups.length ? partyGroups.map(([name, items]) => (
          <div className="court-group" key={name}>
            <div className="court-head party">
              <b>👤 {splitParties(items[0].title).first || name}</b>
              <span className="cnt">{items.length}</span>
            </div>
            {items.slice(0, 12).map((l, i) => <LedgerRow key={i} l={l} onCopy={copy} onNote={() => editNote(l.name)} showCourt />)}
          </div>
        )) : <p className="muted small" style={{ marginTop: 10 }}>{t('clerkNoParties')}</p>
      )}

      {working.length > 0 && (
        <div className="court-group">
          <div className="court-head work"><b>{t('clerkReading')}</b><span className="cnt">{working.length}</span></div>
          {working.map((e) => <ClerkRow key={e.id} e={e} busy={busy} onConvert={convert} onDraft={() => openDraft(e)} hasEditor={!!editor} onCopy={copy} onNote={() => editNote(e.name)} />)}
        </div>
      )}

      {entries.length === 0 && ledger.length > 0 && view === 'courts' && (
        <div className="clerk-ledger">
          <b>📒 {t('clerkLedger')}</b>
          <p className="muted small">{t('clerkReselect')}</p>
        </div>
      )}

      {job && createPortal(
        <div className="ext-preview">
          <div className="ext-bar">
            <b>🖨 {job.title}</b>
            <span className="muted small">{t('clerkPrintHint')}</span>
            <div className="row" style={{ marginLeft: 'auto' }}>
              <button className="btn primary" onClick={doPrint}>🖨 {t('print')}</button>
              <button className="btn ghost" onClick={() => setJob(null)}>{t('close')}</button>
            </div>
          </div>
          <div className="docx-print-root" ref={renderRef}>
            {job.kind === 'raw' && <div className="raw-print" dangerouslySetInnerHTML={{ __html: job.html || '' }} />}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function LedgerRow({ l, onCopy, onNote, showCourt }: {
  l: LedgerItem; onCopy: (s?: string) => void; onNote: () => void; showCourt?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="clerk-row">
      <div className="cr-main">
        <span className="cr-icon">📄</span>
        <span className="cr-name" title={l.name}>{l.name}</span>
        {showCourt && <span className="badge court-mini">{COURT_SHORT(l.court)}</span>}
        {l.nextDate && daysUntil(l.nextDate) >= 0 && daysUntil(l.nextDate) <= 7 && (
          <span className="badge alert">⏰ {fmtDate(l.nextDate)}</span>
        )}
      </div>
      <div className="cr-meta">
        {l.title && <span onClick={() => onCopy(l.title)}><em>{t('clerkMetaTitle')}</em> {l.title}</span>}
        {l.caseNo && <span onClick={() => onCopy(l.caseNo)}><em>{t('clerkMetaCase')}</em> {l.caseNo}</span>}
        {l.firNo && <span onClick={() => onCopy(l.firNo)}><em>{t('clerkMetaFir')}</em> {l.firNo}</span>}
        {l.docType && <span><em>{t('clerkMetaType')}</em> {l.docType}</span>}
        {l.nextDate && <span><em>{t('clerkMetaNext')}</em> {fmtDate(l.nextDate)}</span>}
        {l.decidedDate && <span><em>{t('clerkMetaDecided')}</em> {fmtDate(l.decidedDate)}</span>}
        {l.note && <span className="cr-note">📝 {l.note}</span>}
      </div>
      <div className="row cr-conv" style={{ gap: 4 }}>
        <button className="btn tiny" onClick={onNote}>📝 {t('clerkNote')}</button>
      </div>
    </div>
  );
}

function ClerkRow({ e, busy, onConvert, onDraft, hasEditor, onCopy, onNote, note }: {
  e: ClerkEntry; busy: string | null; onConvert: (e: ClerkEntry, t: Target) => void; onDraft: () => void; hasEditor: boolean;
  onCopy: (s?: string) => void; onNote: () => void; note?: string;
}) {
  const { t } = useI18n();
  const isBusy = busy?.startsWith(e.id);
  const targets = e.status === 'ok' ? targetsFor(e.kind) : [];
  const m = e.res?.meta;
  const metaBits: [string, string | undefined, boolean?][] = m ? [
    [t('clerkMetaTitle'), m.title, true],
    [t('clerkMetaCase'), m.caseNo, true],
    [t('clerkMetaFir'), m.firNo, true],
    [t('clerkMetaPs'), m.psName],
    [t('clerkMetaSec'), m.sections.length ? m.sections.join(', ') : undefined],
    [t('clerkMetaType'), m.docType],
    [t('clerkMetaNext'), m.nextDate ? fmtDate(m.nextDate) : undefined],
    [t('clerkMetaDecided'), m.decidedDate ? fmtDate(m.decidedDate) : undefined],
    [t('clerkMetaAdv'), m.advocate],
  ] : [];
  return (
    <div className="clerk-row">
      <div className="cr-main">
        <span className="cr-icon">{KIND_ICON[e.kind]}</span>
        <span className="cr-name" title={e.name}>{e.name}</span>
        <span className="muted small">{Math.max(1, Math.round(e.size / 1024))} KB</span>
      </div>
      {e.progress !== undefined && <div className="cr-prog"><i style={{ width: `${Math.round(e.progress * 100)}%` }} /></div>}
      {e.status === 'ok' && e.res && (
        <>
          <div className="cr-badges">
            {e.res.ocr && <span className="badge ocr">OCR</span>}
            {e.res.note === 'legacy-doc' && <span className="badge warn">{t('clerkLegacy')}</span>}
            {e.res.cls.court !== 'misc' && <span className="badge ok">{e.res.cls.confidence}% {t('clerkConf')}</span>}
            {e.res.cls.court === 'misc' && <span className="badge misc">{t('clerkMiscBadge')}</span>}
            {m?.nextDate && daysUntil(m.nextDate) >= 0 && daysUntil(m.nextDate) <= 7 && (
              <span className="badge alert">⏰ {fmtDate(m.nextDate)}</span>
            )}
          </div>
          {e.res.cls.snippet && <div className="cr-snippet muted small">“{e.res.cls.snippet}”</div>}
          {metaBits.some(([, v]) => v) && (
            <div className="cr-meta">
              {metaBits.filter(([, v]) => v).map(([k, v, copyable]) => (
                <span key={k} onClick={copyable ? () => onCopy(v) : undefined} className={copyable ? 'copyable' : undefined}>
                  <em>{k}</em> {v}
                </span>
              ))}
              {note && <span className="cr-note">📝 {note}</span>}
            </div>
          )}
        </>
      )}
      {e.status === 'err' && <div className="cr-badges"><span className="badge warn">{t('clerkErr')}</span></div>}
      {(targets.length > 0 || e.status === 'ok') && (
        <div className="row cr-conv" style={{ flexWrap: 'wrap', gap: 4 }}>
          <span className="muted small">🔄</span>
          {targets.map((tg) => (
            <button key={tg} className="btn tiny" disabled={!!busy} onClick={() => onConvert(e, tg)}>
              {isBusy && busy === `${e.id}:${tg}` ? '⏳' : '→'} {TARGET_LABEL[tg]}
            </button>
          ))}
          {e.status === 'ok' && hasEditor && e.res?.text && (
            <button className="btn tiny accent" onClick={onDraft}>✍ {t('clerkOpenDraft')}</button>
          )}
          {e.status === 'ok' && (
            <button className="btn tiny" onClick={onNote}>📝 {t('clerkNote')}</button>
          )}
        </div>
      )}
    </div>
  );
}
