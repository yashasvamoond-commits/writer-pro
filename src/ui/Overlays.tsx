import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { saveAs } from 'file-saver';
import { AFFIDAVIT_BLOCK, IDENTIFICATION_CERT, VERIFICATION_EN, VERIFICATION_HI, parseBlocks } from '../lib/templates';
import { appendBlocks } from '../lib/editor-ops';
import { krutiDevToUnicode } from '../lib/krutidev';
import { exportDocx } from '../lib/docx';
import { DocRecord } from '../types';
import { deleteDoc, duplicateDoc, listDocs, newDoc, putDoc } from '../lib/storage';

/* ---------------- Bottom sheet: verification / affidavit ---------------- */
export function BottomSheet({ open, onClose, editor, vars, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void;
}) {
  const add = (src: string, label: string) => {
    if (!editor) return;
    appendBlocks(editor, parseBlocks(src), vars);
    toast(`${label} appended ✓`);
    onClose();
  };
  return (
    <div className={`bsheet ${open ? 'open' : ''}`}>
      <div className="grip" />
      <div className="content">
        <h4>One-tap court clauses</h4>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => add(VERIFICATION_HI, 'सत्यापन')}>+ सत्यापन (Hindi verification)</button>
          <button className="btn primary" onClick={() => add(VERIFICATION_EN, 'Verification')}>+ Verification (English)</button>
          <button className="btn" onClick={() => add(AFFIDAVIT_BLOCK, 'Affidavit')}>+ Affidavit / शपथ पत्र</button>
          <button className="btn" onClick={() => add(IDENTIFICATION_CERT, 'Identification certificate')}>+ Identification certificate</button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Clauses append at the end of the draft with court stamp spaces and your smart variables filled.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Kruti Dev paste prompt ---------------- */
export function KrutiModal({ text, onClose, onInsert }: { text: string | null; onClose: () => void; onInsert: (t: string) => void }) {
  if (!text) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <header>Convert Kruti Dev to Unicode?</header>
        <div className="mbody">
          <p>Legacy Kruti Dev 010 encoding detected in the pasted text:</p>
          <pre style={{ background: '#f6f4ef', padding: 8, borderRadius: 8, overflow: 'auto', maxHeight: 180 }}>{text.slice(0, 600)}</pre>
          <p>Preview (Unicode):</p>
          <pre style={{ background: '#eef6f2', padding: 8, borderRadius: 8, overflow: 'auto', maxHeight: 180 }}>{krutiDevToUnicode(text).slice(0, 600)}</pre>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => { onInsert(text); onClose(); }}>Insert as-is</button>
          <button className="btn primary" onClick={() => { onInsert(krutiDevToUnicode(text)); onClose(); }}>Convert & insert</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Cause title generator ---------------- */
export function CauseTitleModal({ open, onClose, editor, vars, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; vars: Record<string, string>; toast: (m: string) => void;
}) {
  const [court, setCourt] = useState('Judicial Magistrate First Class, Bhadra');
  const [caseNo, setCaseNo] = useState('');
  const [pet, setPet] = useState('{{client_name}} s/o {{client_father}}, r/o {{client_address}}');
  const [res, setRes] = useState('{{opp_party}}');
  const [memo, setMemo] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi' | 'both'>('both');
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
    toast('Cause title inserted ✓');
    onClose();
  };
  return (
    <div className="modal-back">
      <div className="modal">
        <header>Cause Title Generator / पक्षकार शीर्षक</header>
        <div className="mbody">
          <div className="field"><label>Court / न्यायालय</label><input value={court} onChange={(e) => setCourt(e.target.value)} /></div>
          <div className="field"><label>Case number (blank = placeholder)</label><input value={caseNo} onChange={(e) => setCaseNo(e.target.value)} placeholder="204/2025" /></div>
          <div className="field"><label>Petitioner / Plaintiff line</label><textarea rows={2} value={pet} onChange={(e) => setPet(e.target.value)} /></div>
          <div className="field"><label>Respondent / Defendant line</label><textarea rows={2} value={res} onChange={(e) => setRes(e.target.value)} /></div>
          <div className="row">
            <label className="muted"><input type="checkbox" checked={memo} onChange={(e) => setMemo(e.target.checked)} /> include memo of parties</label>
            <select className="tbtn" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'hi' | 'both')}>
              <option value="both">Bilingual</option><option value="en">English</option><option value="hi">हिन्दी</option>
            </select>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={generate}>Insert cause title</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Export dialog ---------------- */
export function ExportModal({ open, onClose, editor, doc, onPrint, toast }: {
  open: boolean; onClose: () => void; editor: Editor | null; doc: DocRecord; onPrint: () => void; toast: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const jsonRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  const doDocx = async () => {
    if (!editor) return;
    setBusy(true);
    try {
      const blob = await exportDocx(doc, editor.getJSON());
      saveAs(blob, `${doc.title.replace(/[^\w\d-]+/g, '_')}.docx`);
      toast('DOCX exported — Word & LibreOffice compatible ✓');
    } finally {
      setBusy(false);
      onClose();
    }
  };
  const doTxt = () => {
    if (!editor) return;
    saveAs(new Blob([editor.getText()], { type: 'text/plain;charset=utf-8' }), `${doc.title}.txt`);
    toast('Plain text saved ✓');
  };
  const doJson = () => {
    if (!editor) return;
    saveAs(new Blob([JSON.stringify({ ...doc, content: editor.getJSON() }, null, 2)], { type: 'application/json' }), `${doc.title}.writerpro.json`);
    toast('Backup saved ✓');
  };
  const importJson = async (f: File) => {
    if (!editor) return;
    const data = JSON.parse(await f.text());
    editor.commands.setContent(data.content ?? data, { emitUpdate: true });
    toast('Draft restored from backup ✓');
    onClose();
  };
  return (
    <div className="modal-back">
      <div className="modal">
        <header>Export & print / निर्यात</header>
        <div className="mbody">
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="btn primary" disabled={busy} onClick={doDocx}>⬇ DOCX (Word / LibreOffice)</button>
            <button className="btn primary" onClick={() => { onClose(); onPrint(); }}>🖨 PDF / paper (court-ready)</button>
            <button className="btn" onClick={doTxt}>⬇ Plain text (.txt)</button>
            <button className="btn" onClick={doJson}>⬇ Backup (.json)</button>
            <button className="btn" onClick={() => jsonRef.current?.click()}>⬆ Restore backup</button>
            <input ref={jsonRef} type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            PDF path uses the on-device print engine: choose “Save as PDF” (or a Wi-Fi / USB-OTG printer such as
            Canon LBP/MF) and the output keeps {doc.settings.pageSize === 'A4' ? 'A4' : 'Legal'} paper, the
            1.75&quot; stitching margin, embedded Devanagari fonts and a searchable text layer for e-filing.
          </p>
        </div>
        <footer><button className="btn ghost" onClick={onClose}>Close</button></footer>
      </div>
    </div>
  );
}

/* ---------------- Drafts manager ---------------- */
export function DocsModal({ open, onClose, currentId, onOpen, toast }: {
  open: boolean; onClose: () => void; currentId: string; onOpen: (d: DocRecord) => void; toast: (m: string) => void;
}) {
  const [refresh, setRefresh] = useState(0);
  if (!open) return null;
  const docs = listDocs();
  void refresh;
  return (
    <div className="modal-back">
      <div className="modal">
        <header>Drafts / फाइलें (on-device)</header>
        <div className="mbody">
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn primary" onClick={() => { const d = newDoc(); onOpen(d); onClose(); }}>+ New draft</button>
          </div>
          {docs.map((d) => (
            <div className="case-row" key={d.id}>
              <b>{d.title}</b> {d.id === currentId && <span className="tag">open</span>}
              <div className="muted">updated {new Date(d.updatedAt).toLocaleString()}</div>
              <div className="row" style={{ marginTop: 4 }}>
                <button className="btn" onClick={() => { onOpen(d); onClose(); }}>Open</button>
                <button className="btn" onClick={() => { duplicateDoc(d.id); setRefresh(refresh + 1); toast('Duplicated ✓'); }}>Duplicate</button>
                <button className="btn" onClick={() => {
                  const t = prompt('Rename draft', d.title);
                  if (t) { putDoc({ ...d, title: t }); setRefresh(refresh + 1); }
                }}>Rename</button>
                <button className="btn" onClick={() => { if (confirm(`Delete "${d.title}"?`)) { deleteDoc(d.id); setRefresh(refresh + 1); } }}>Delete</button>
              </div>
            </div>
          ))}
          {!docs.length && <p className="muted">No drafts yet.</p>}
        </div>
        <footer><button className="btn ghost" onClick={onClose}>Close</button></footer>
      </div>
    </div>
  );
}
