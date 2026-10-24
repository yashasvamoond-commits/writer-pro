import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor, JSONContent } from '@tiptap/react';
import EditorPane from './editor/Editor';
import Toolbar from './ui/Toolbar';
import Sidebar from './ui/Sidebar';
import { BottomSheet, CauseTitleModal, DocsModal, ExportModal, KrutiModal } from './ui/Overlays';
import { DEFAULT_SETTINGS, DocRecord, CaseInfo, PageSettings } from './types';
import { listDocs, newDoc, putDoc } from './lib/storage';
import { applyPageRule, printNow } from './lib/print';
import { applyVariables, insertTextAtCursor } from './lib/editor-ops';
import { FONT_BY_ID } from './data/fonts';

const PAGE_DIM: Record<string, [number, number]> = { A4: [794, 1123], LEGAL: [816, 1344] };

export default function App() {
  const [doc, setDoc] = useState<DocRecord>(() => {
    const d = listDocs()[0] || newDoc('Untitled draft');
    return { ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings } };
  });
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tab, setTab] = useState('templates');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [krutiText, setKrutiText] = useState<string | null>(null);
  const [causeOpen, setCauseOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const saveTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.setTimeout(() => setToastMsg((cur) => (cur === m ? null : cur)), 2600);
  }, []);

  const settings = doc.settings;
  const patch = useCallback((p: Partial<PageSettings>) => {
    setDoc((d) => {
      const next = { ...d, settings: { ...d.settings, ...p } };
      putDoc(next);
      return next;
    });
  }, []);

  // page geometry -> CSS custom properties + @page print rule
  useEffect(() => {
    const root = document.documentElement;
    const [w, h] = PAGE_DIM[settings.pageSize];
    const fsPx = (settings.fontSizePt * 96) / 72;
    root.style.setProperty('--page-w', `${w}px`);
    root.style.setProperty('--page-h', `${h}px`);
    root.style.setProperty('--ml', `${settings.marginL}in`);
    root.style.setProperty('--mr', `${settings.marginR}in`);
    root.style.setProperty('--mt', `${settings.marginT}in`);
    root.style.setProperty('--mb', `${settings.marginB}in`);
    root.style.setProperty('--fs-pt', `${settings.fontSizePt}pt`);
    root.style.setProperty('--fs-px', `${fsPx}px`);
    root.style.setProperty('--lh', `${Math.round(fsPx * settings.lineHeight)}px`);
    root.style.setProperty('--font-hi', FONT_BY_ID[settings.fontHi]?.stack || FONT_BY_ID.mukta.stack);
    root.style.setProperty('--font-en', FONT_BY_ID[settings.fontEn]?.stack || FONT_BY_ID.tinos.stack);
    applyPageRule(settings);
  }, [settings]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const onUpdate = useCallback((json: JSONContent) => {
    setDoc((d) => {
      const next = { ...d, content: json };
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => putDoc(next), 700);
      return next;
    });
  }, []);

  const onVars = useCallback((vars: Record<string, string>) => {
    setDoc((d) => {
      const next = { ...d, variables: vars };
      putDoc(next);
      return next;
    });
    if (editor) applyVariables(editor, vars);
  }, [editor]);

  const openDoc = useCallback((d: DocRecord) => {
    setDoc({ ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings } });
    // remount editor with the new content
    setEditor(null);
    window.setTimeout(() => setEditorKey((k) => k + 1), 0);
  }, []);
  const [editorKey, setEditorKey] = useState(0);

  return (
    <div className="app">
      <div className="topbar">
        <button className="tbtn" onClick={() => setSidebarOpen((v) => !v)} title="Panels">☰</button>
        <div className="brand">Writer Pro <small>· Legal Drafter</small></div>
        <input
          className="doc-title"
          value={doc.title}
          onChange={(e) => setDoc((d) => { const n = { ...d, title: e.target.value }; putDoc(n); return n; })}
        />
        <div className="spacer" />
        <span className="offline-pill">{online ? 'offline-ready ✓' : 'OFFLINE mode ✓'}</span>
        <span className="offline-pill">100% on-device</span>
      </div>
      <Toolbar
        editor={editor}
        settings={settings}
        patch={patch}
        onDocs={() => setDocsOpen(true)}
        onExport={() => setExportOpen(true)}
        onSheet={() => setSheet(true)}
        onSidebar={(t) => { if (t === '') setSidebarOpen((v) => !v); else { setTab(t); setSidebarOpen(true); } }}
        sidebarOpen={sidebarOpen}
        onPrint={() => printNow()}
        toast={toast}
      />
      <div className="body">
        {sidebarOpen && (
          <Sidebar
            tab={tab}
            setTab={setTab}
            onClose={() => setSidebarOpen(false)}
            settings={settings}
            patch={patch}
            editor={editor}
            vars={doc.variables}
            onVars={onVars}
            cases={cases}
            onCases={setCases}
            onCauseTitle={() => setCauseOpen(true)}
            toast={toast}
          />
          )}
        {!sidebarOpen && (
          <button className="edge-handle" onClick={() => setSidebarOpen(true)} title="Open panels / पैनल खोलें">
            PANELS · पैनल
          </button>
        )}
        <div className="desk">
          <div className={`sheet ${settings.guides ? 'guides' : ''}`}>
            {settings.guides && <span className="stitch-note">COURT STITCHING MARGIN 1.75&quot;</span>}
            <EditorPane
              key={`${doc.id}-${editorKey}`}
              content={doc.content as JSONContent}
              settings={settings}
              onReady={setEditor}
              onUpdate={onUpdate}
              onKrutiPaste={(t) => setKrutiText(t)}
            />
          </div>
        </div>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} editor={editor} vars={doc.variables} toast={toast} />
      <KrutiModal
        text={krutiText}
        onClose={() => setKrutiText(null)}
        onInsert={(t) => editor && insertTextAtCursor(editor, t)}
      />
      <CauseTitleModal open={causeOpen} onClose={() => setCauseOpen(false)} editor={editor} vars={doc.variables} toast={toast} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} editor={editor} doc={doc} onPrint={() => printNow()} toast={toast} />
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} currentId={doc.id} onOpen={openDoc} toast={toast} />
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
