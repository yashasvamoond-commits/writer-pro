/**
 * 🧑‍⚖ Smart Clerk pane — reads every PDF/Word/text/image file you pick from
 * the tablet, works out from the heading INSIDE each document which of the
 * five courts it belongs to (JM · ACJM · ADJ · SDM · AECM) and files the rest
 * under Miscellaneous. Also the all-in-one converter (PDF ⇄ Word, TXT, HTML,
 * PNG, print-to-PDF) — scanned files go through the bundled offline OCR.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { useI18n } from '../data/i18n';
import { classifyText, COURT_ORDER, CourtId } from '../lib/court-classify';
import {
  FileKind, kindOf, pdfToDocx, pdfToHtml, pdfToPngZip, pdfToTxt, docxToHtmlString, docxToTxt,
  ocrImage, readFileSmart, ReadResult, targetsFor, Target, TARGET_LABEL, txtToDocx,
} from '../lib/clerk';

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

interface LedgerItem { name: string; court: CourtId; at: number; ocr: boolean }
const LKEY = 'writerpro.clerk.ledger';
function loadLedger(): LedgerItem[] { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch { return []; } }
function saveLedger(items: LedgerItem[]) { localStorage.setItem(LKEY, JSON.stringify(items.slice(0, 200))); }

const COURT_LABEL: Record<CourtId, string> = {
  jm: 'JM · न्यायिक मजिस्ट्रेट',
  acjm: 'ACJM · अतिरिक्त मुख्य न्यायिक मजिस्ट्रेट',
  adj: 'ADJ · अपर जिला एवं सेशन न्यायाधीश',
  sdm: 'SDM · उपखण्ड अधिकारी',
  aecm: 'AECM · अतिरिक्त कार्यपालक मजिस्ट्रेट',
  misc: 'Miscellaneous · विविध',
};
const KIND_ICON: Record<FileKind, string> = { pdf: '📕', docx: '📘', doc: '📙', txt: '📄', html: '🌐', image: '🖼', other: '📎' };

interface PrintJob { kind: 'docx' | 'raw'; title: string; margin: string; data?: ArrayBuffer; html?: string }

export default function ClerkPane({ toast }: { toast: (m: string) => void }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ClerkEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>(loadLedger);
  const [busy, setBusy] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState('');
  const [job, setJob] = useState<PrintJob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  /* render docx preview into the print portal */
  useEffect(() => {
    if (job?.kind === 'docx' && job.data && renderRef.current) {
      renderRef.current.innerHTML = '';
      void renderAsync(job.data, renderRef.current, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: true });
    }
  }, [job]);

  const patchEntry = (id: string, p: Partial<ClerkEntry>) =>
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...p } : e)));

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
        const led = [{ name: e.name, court: res.cls.court, at: Date.now(), ocr: res.ocr }, ...loadLedger()];
        saveLedger(led); setLedger(led);
      } catch {
        patchEntry(e.id, { status: 'err', progress: undefined });
      }
    }
    setScanNote('');
  };

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

  const grouped = COURT_ORDER.map((c) => ({
    court: c,
    rows: entries.filter((e) => (e.status === 'ok' ? e.res?.cls.court === c : false)),
  })).filter((g) => g.rows.length);
  const working = entries.filter((e) => e.status !== 'ok');

  return (
    <div className="pane clerk-pane">
      <h4>🧑‍⚖ {t('clerkTitle')}</h4>
      <p className="muted small">{t('clerkHint')}</p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>📁 {t('clerkFiles')}</button>
        <button className="btn" onClick={() => dirRef.current?.click()}>🗂 {t('clerkFolder')}</button>
        {ledger.length > 0 && (
          <button className="btn ghost" onClick={() => { saveLedger([]); setLedger([]); }}>{t('clerkClear')}</button>
        )}
      </div>
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.txt,.md,.html,.htm,.png,.jpg,.jpeg,.webp"
        onChange={(ev) => { const fs = [...(ev.target.files || [])]; if (fs.length) void scan(fs); ev.target.value = ''; }} />
      <input ref={dirRef} type="file" multiple style={{ display: 'none' }}
        // @ts-expect-error non-standard but supported on Android WebView
        webkitdirectory="" directory=""
        onChange={(ev) => { const fs = [...(ev.target.files || [])].filter((f) => kindOf(f.name) !== 'other'); if (fs.length) void scan(fs); ev.target.value = ''; }} />

      {scanNote && <div className="clerk-progress">⏳ {t('clerkReading')} {scanNote}</div>}

      {grouped.map((g) => (
        <div className="court-group" key={g.court}>
          <div className={`court-head ${g.court}`}>
            <b>{COURT_LABEL[g.court]}</b><span className="cnt">{g.rows.length}</span>
          </div>
          {g.rows.map((e) => (
            <ClerkRow key={e.id} e={e} busy={busy} onConvert={convert} />
          ))}
        </div>
      ))}

      {working.length > 0 && (
        <div className="court-group">
          <div className="court-head work"><b>{t('clerkReading')}</b><span className="cnt">{working.length}</span></div>
          {working.map((e) => <ClerkRow key={e.id} e={e} busy={busy} onConvert={convert} />)}
        </div>
      )}

      {entries.length === 0 && ledger.length > 0 && (
        <div className="clerk-ledger">
          <b>📒 {t('clerkLedger')}</b>
          <p className="muted small">{t('clerkReselect')}</p>
          {COURT_ORDER.map((c) => {
            const items = ledger.filter((l) => l.court === c);
            if (!items.length) return null;
            return (
              <div key={c} className="ledger-court">
                <div className={`court-head ${c}`}><b>{COURT_LABEL[c]}</b><span className="cnt">{items.length}</span></div>
                {items.slice(0, 8).map((l, i) => (
                  <div className="ledger-row" key={i}>📄 {l.name} <span className="muted small">· {new Date(l.at).toLocaleDateString()}{l.ocr ? ' · OCR' : ''}</span></div>
                ))}
              </div>
            );
          })}
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

function ClerkRow({ e, busy, onConvert }: {
  e: ClerkEntry; busy: string | null; onConvert: (e: ClerkEntry, t: Target) => void;
}) {
  const { t } = useI18n();
  const isBusy = busy?.startsWith(e.id);
  const targets = e.status === 'ok' ? targetsFor(e.kind) : [];
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
          </div>
          {e.res.cls.snippet && <div className="cr-snippet muted small">“{e.res.cls.snippet}”</div>}
        </>
      )}
      {e.status === 'err' && <div className="cr-badges"><span className="badge warn">{t('clerkErr')}</span></div>}
      {targets.length > 0 && (
        <div className="row cr-conv" style={{ flexWrap: 'wrap', gap: 4 }}>
          <span className="muted small">🔄</span>
          {targets.map((tg) => (
            <button key={tg} className="btn tiny" disabled={!!busy} onClick={() => onConvert(e, tg)}>
              {isBusy && busy === `${e.id}:${tg}` ? '⏳' : '→'} {TARGET_LABEL[tg]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
