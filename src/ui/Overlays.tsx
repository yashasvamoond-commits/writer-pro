import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { saveAs } from 'file-saver';
import Tesseract from 'tesseract.js';
import { AFFIDAVIT_BLOCK, IDENTIFICATION_CERT, VERIFICATION_EN, VERIFICATION_HI, parseBlocks } from '../lib/templates';
import { appendBlocks, findRanges, nextFootnoteNumber, replaceAll } from '../lib/editor-ops';
import { krutiDevToUnicode } from '../lib/krutidev';
import { exportDocx } from '../lib/docx';
import { DocRecord, PageSettings } from '../types';
import { deleteDoc, duplicateDoc, listDocs, newDoc, putDoc } from '../lib/storage';
import { useI18n } from '../data/i18n';

/* ---------------- Bottom sheet: verification / affidavit ---------------- */
export function BottomSheet({ open, onClose, editor, vars, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void;
}) {
  const { t, lang } = useI18n();
  const add = (src: string, label: string) => {
    if (!editor) return;
    appendBlocks(editor, parseBlocks(src), vars);
    toast(`${label} ✓`);
    onClose();
  };
  return (
    <div className={`bsheet ${open ? 'open' : ''}`}>
      <div className="grip" />
      <div className="content">
        <h4>{t('affidavit')}</h4>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => add(lang === 'hi' ? VERIFICATION_HI : VERIFICATION_EN, lang === 'hi' ? 'सत्यापन' : 'Verification')}>
            {lang === 'hi' ? t('verifyHi') : t('verifyEn')}
          </button>
          <button className="btn" onClick={() => add(AFFIDAVIT_BLOCK, 'Affidavit')}>{t('addAffidavit')}</button>
          <button className="btn" onClick={() => add(IDENTIFICATION_CERT, 'ID cert')}>{t('addIdCert')}</button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>{t('sheetHint')}</p>
      </div>
    </div>
  );
}

/* ---------------- Kruti Dev paste prompt ---------------- */
export function KrutiModal({ text, onClose, onInsert }: { text: string | null; onClose: () => void; onInsert: (t: string) => void }) {
  const { t } = useI18n();
  if (!text) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('krutiQ')}</header>
        <div className="mbody">
          <p>{t('krutiDetected')}</p>
          <pre style={{ background: '#f6f4ef', padding: 8, borderRadius: 8, overflow: 'auto', maxHeight: 160 }}>{text.slice(0, 500)}</pre>
          <p>{t('krutiPreview')}</p>
          <pre style={{ background: '#eef6f2', padding: 8, borderRadius: 8, overflow: 'auto', maxHeight: 160 }}>{krutiDevToUnicode(text).slice(0, 500)}</pre>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn" onClick={() => { onInsert(text); onClose(); }}>{t('insertAsIs')}</button>
          <button className="btn primary" onClick={() => { onInsert(krutiDevToUnicode(text)); onClose(); }}>{t('convertInsert')}</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Cause title generator ---------------- */
export function CauseTitleModal({ open, onClose, editor, vars, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void;
}) {
  const { t, lang: uiLang } = useI18n();
  const [court, setCourt] = useState('Judicial Magistrate First Class, Bhadra');
  const [caseNo, setCaseNo] = useState('');
  const [pet, setPet] = useState('{{client_name}} s/o {{client_father}}, r/o {{client_address}}');
  const [res, setRes] = useState('{{opp_party}}');
  const [memo, setMemo] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi' | 'both'>(uiLang === 'hi' ? 'hi' : 'en');
  if (!open) return null;
  const generate = () => {
    if (!editor) return;
    const lines: string[] = [];
    if (lang !== 'hi') {
      lines.push(`C:IN THE COURT OF THE ${court.toUpperCase()}`);
      lines.push(`C:Case No. ${caseNo || '____'} of 20__`);
      lines.push(`C:B:${pet}`);
      lines.push('C:... Petitioner(s)');
      lines.push('C:Versus');
      lines.push(`C:B:${res}`);
      lines.push('C:... Respondent(s)');
    }
    if (lang !== 'en') {
      lines.push(`C:न्यायालय ${court}`);
      lines.push(`C:वाद / प्रकरण संख्या ${caseNo || '____'} of 20__`);
      lines.push(`C:B:${pet}`);
      lines.push('C:... वादी / प्रार्थी');
      lines.push('C:बनाम');
      lines.push(`C:B:${res}`);
      lines.push('C:... प्रतिवादी / विपक्षी');
    }
    if (memo) {
      lines.push('H3:B:MEMO OF PARTIES / पक्षकार विवरण');
      lines.push(`J:Petitioner: ${pet}`);
      lines.push(`J:Respondent: ${res}`);
    }
    appendBlocks(editor, parseBlocks(lines.join('\n')), vars);
    toast(t('tCause'));
    onClose();
  };
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('causeGen')}</header>
        <div className="mbody">
          <div className="field"><label>{t('causeCourt')}</label><input value={court} onChange={(e) => setCourt(e.target.value)} /></div>
          <div className="field"><label>{t('causeNo')}</label><input value={caseNo} onChange={(e) => setCaseNo(e.target.value)} placeholder="204/2025" /></div>
          <div className="field"><label>{t('causePet')}</label><textarea rows={2} value={pet} onChange={(e) => setPet(e.target.value)} /></div>
          <div className="field"><label>{t('causeRes')}</label><textarea rows={2} value={res} onChange={(e) => setRes(e.target.value)} /></div>
          <div className="row">
            <label className="muted"><input type="checkbox" checked={memo} onChange={(e) => setMemo(e.target.checked)} /> {t('memoParties')}</label>
            <select className="tbtn" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'hi' | 'both')}>
              <option value="en">English</option><option value="hi">हिन्दी</option><option value="both">{t('bilingual')}</option>
            </select>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn primary" onClick={generate}>{t('insertCause')}</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Export dialog ---------------- */
export function ExportModal({ open, onClose, editor, doc, onPrint, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; doc: DocRecord; onPrint: () => void; toast: (m: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const jsonRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  const doDocx = async () => {
    if (!editor) return;
    setBusy(true);
    try {
      const blob = await exportDocx(doc, editor.getJSON());
      saveAs(blob, `${doc.title.replace(/[^\w\d-]+/g, '_')}.docx`);
      toast('DOCX ✓');
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('exportTitle')}</header>
        <div className="mbody">
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="btn primary" disabled={busy} onClick={doDocx}>{t('docxBtn')}</button>
            <button className="btn primary" onClick={() => { onClose(); onPrint(); }}>{t('pdfBtn')}</button>
            <button className="btn" onClick={() => editor && (saveAs(new Blob([editor.getText()], { type: 'text/plain;charset=utf-8' }), `${doc.title}.txt`), toast('.txt ✓'))}>{t('txtBtn')}</button>
            <button className="btn" onClick={() => editor && (saveAs(new Blob([JSON.stringify({ ...doc, content: editor.getJSON() }, null, 2)], { type: 'application/json' }), `${doc.title}.writerpro.json`), toast('.json ✓'))}>{t('backupBtn')}</button>
            <button className="btn" onClick={() => jsonRef.current?.click()}>{t('restoreBtn')}</button>
            <input ref={jsonRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f && editor) {
                  const data = JSON.parse(await f.text());
                  editor.commands.setContent(data.content ?? data, { emitUpdate: true });
                  onClose();
                }
              }} />
          </div>
        </div>
        <footer><button className="btn ghost" onClick={onClose}>{t('close')}</button></footer>
      </div>
    </div>
  );
}

/* ---------------- Drafts manager ---------------- */
export function DocsModal({ open, onClose, currentId, onOpen, toast }: {
  open: boolean; onClose: () => void; currentId: string; onOpen: (d: DocRecord) => void; toast: (m: string) => void;
}) {
  const { t } = useI18n();
  const [refresh, setRefresh] = useState(0);
  if (!open) return null;
  void refresh;
  const docs = listDocs();
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('draftsTitle')}</header>
        <div className="mbody">
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn primary" onClick={() => { const d = newDoc(); onOpen(d); onClose(); }}>{t('newDraft')}</button>
          </div>
          {docs.map((d) => (
            <div className="case-row" key={d.id}>
              <b>{d.title}</b> {d.id === currentId && <span className="tag">open</span>}
              <div className="muted">{new Date(d.updatedAt).toLocaleString()}</div>
              <div className="row" style={{ marginTop: 4 }}>
                <button className="btn" onClick={() => { onOpen(d); onClose(); }}>{t('open')}</button>
                <button className="btn" onClick={() => { duplicateDoc(d.id); setRefresh(refresh + 1); }}>{t('duplicate')}</button>
                <button className="btn" onClick={() => { const n = prompt(t('rename'), d.title); if (n) { putDoc({ ...d, title: n }); setRefresh(refresh + 1); } }}>{t('rename')}</button>
                <button className="btn" onClick={() => { if (confirm(`${d.title}?`)) { deleteDoc(d.id); setRefresh(refresh + 1); toast('✓'); } }}>{t('delete')}</button>
              </div>
            </div>
          ))}
        </div>
        <footer><button className="btn ghost" onClick={onClose}>{t('close')}</button></footer>
      </div>
    </div>
  );
}

/* ---------------- Header & footer ---------------- */
export function HeaderFooterModal({ open, onClose, settings, patch }: {
  open: boolean; onClose: () => void; settings: PageSettings; patch: (p: Partial<PageSettings>) => void;
}) {
  const { t } = useI18n();
  const [h, setH] = useState(settings.headerText);
  const [f, setF] = useState(settings.footerText);
  if (!open) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('hfTitle')}</header>
        <div className="mbody">
          <div className="field"><label>{t('hfHeader')}</label><textarea rows={2} value={h} onChange={(e) => setH(e.target.value)} /></div>
          <div className="field"><label>{t('hfFooter')}</label><textarea rows={2} value={f} onChange={(e) => setF(e.target.value)} /></div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn primary" onClick={() => { patch({ headerText: h, footerText: f }); onClose(); }}>{t('save')}</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Find & replace ---------------- */
export function FindReplaceModal({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor | null }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [r, setR] = useState('');
  const [count, setCount] = useState(0);
  const cursor = useRef(0);
  if (!open || !editor) return null;
  const ranges = () => findRanges(editor, q);
  const next = () => {
    const rs = ranges();
    setCount(rs.length);
    if (!rs.length) return;
    cursor.current = (cursor.current + 1) % rs.length;
    const sel = rs[cursor.current];
    editor.commands.setTextSelection(sel);
    editor.view.focus();
  };
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('frTitle')}</header>
        <div className="mbody">
          <div className="field"><label>{t('frFind')}</label><input value={q} onChange={(e) => { setQ(e.target.value); cursor.current = -1; }} /></div>
          <div className="field"><label>{t('frReplace')}</label><input value={r} onChange={(e) => setR(e.target.value)} /></div>
          <p className="muted">{count} matches</p>
        </div>
        <footer>
          <button className="btn" onClick={next}>{t('frNext')}</button>
          <button className="btn" onClick={() => {
            const sel = editor.state.selection;
            if (sel.empty) return;
            editor.commands.insertContentAt({ from: sel.from, to: sel.to }, r);
            next();
          }}>{t('frReplaceOne')}</button>
          <button className="btn primary" onClick={() => { const n = replaceAll(editor, q, r); setCount(0); void n; }}>{t('frAll')}</button>
          <button className="btn ghost" onClick={onClose}>{t('close')}</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Footnote ---------------- */
export function FootnoteModal({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor | null }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  if (!open || !editor) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('fnTitle')}</header>
        <div className="mbody">
          <div className="field"><label>{t('fnText')}</label><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn primary" onClick={() => {
            const n = nextFootnoteNumber(editor);
            editor.chain().focus().insertContent({ type: 'fnRef', attrs: { n, text } }).run();
            setText('');
            onClose();
          }}>{t('fnInsert')}</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Hyperlink ---------------- */
export function LinkModal({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor | null }) {
  const { t } = useI18n();
  const [url, setUrl] = useState('https://');
  if (!open || !editor) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('linkTitle')}</header>
        <div className="mbody">
          <div className="field"><label>{t('linkUrl')}</label><input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
        </div>
        <footer>
          <button className="btn" onClick={() => { editor.chain().focus().unsetLink().run(); onClose(); }}>{t('linkDel')}</button>
          <button className="btn primary" onClick={() => { editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); onClose(); }}>{t('linkApply')}</button>
          <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Photo OCR ---------------- */
export function OcrModal({ open, onClose, editor, onWords, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; onWords: (w: string[]) => void; toast: (m: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  const run = async (f: File) => {
    setBusy(true);
    try {
      const res = await Tesseract.recognize(f, 'hin+eng', {
        langPath: `${import.meta.env.BASE_URL}tessdata`.replace(/\/$/, ''),
        gzip: true,
        logger: () => undefined,
      });
      const page = res.data as unknown as { words?: { text: string; confidence: number }[]; confidence: number; text: string };
      const words = (page.words || []).filter((w) => w.confidence < 70).map((w) => w.text);
      if (editor) editor.chain().focus().insertContent(page.text).run();
      onWords(words);
      toast(`${t('tOcrDone')} ${Math.round(page.confidence)}% · ${words.length} ${t('tOcrLow')}`);
      onClose();
    } catch {
      toast('OCR error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-back">
      <div className="modal">
        <header>{t('ocrTitle')}</header>
        <div className="mbody">
          <p className="muted">{t('ocrHint')}</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(f); }} />
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? t('ocrWorking') : `📷 ${t('ocrRun')}`}
            </button>
          </div>
        </div>
        <footer><button className="btn ghost" onClick={onClose}>{t('close')}</button></footer>
      </div>
    </div>
  );
}
