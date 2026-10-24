import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor, JSONContent } from '@tiptap/react';
import EditorPane from './editor/Editor';
import Toolbar from './ui/Toolbar';
import Sidebar from './ui/Sidebar';
import {
  BottomSheet, CauseTitleModal, DocsModal, ExportModal, KrutiModal,
  HeaderFooterModal, FindReplaceModal, FootnoteModal, LinkModal, OcrModal,
} from './ui/Overlays';
import { DEFAULT_SETTINGS, DocRecord, CaseInfo, PageSettings } from './types';
import { listDocs, newDoc, putDoc } from './lib/storage';
import { applyPageRule, printNow } from './lib/print';
import { applyVariables, insertTextAtCursor, docStats } from './lib/editor-ops';
import { FONT_BY_ID } from './data/fonts';
import { I18nCtx, makeT, UiLang } from './data/i18n';

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
  const [hfOpen, setHfOpen] = useState(false);
  const [frOpen, setFrOpen] = useState(false);
  const [fnOpen, setFnOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrWords, setOcrWords] = useState<string[]>([]);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [stats, setStats] = useState({ words: 0, paras: 0 });
  const [editorKey, setEditorKey] = useState(0);
  const saveTimer = useRef<number | undefined>(undefined);

  const uiLang: UiLang = doc.settings.uiLang || 'en';
  const t = makeT(uiLang);

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
      setSaveState('saving');
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        putDoc(next);
        setSaveState('saved');
      }, 700);
      return next;
    });
    window.setTimeout(() => {
      if (editor) setStats(docStats(editor));
    }, 300);
  }, [editor]);

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
    setEditor(null);
    window.setTimeout(() => setEditorKey((k) => k + 1), 0);
  }, []);

  const setLang = (l: UiLang) => patch({ uiLang: l });

  return (
    <I18nCtx.Provider value={{ lang: uiLang, t }}>
      <div className="app">
        <div className="topbar">
          <button className="tbtn" onClick={() => setSidebarOpen((v) => !v)} title={t('panels')}>☰</button>
          <div className="brand">⚖ {t('brand')} <small>· {t('brandSub')}</small></div>
          <input
            className="doc-title"
            value={doc.title}
            onChange={(e) => setDoc((d) => { const n = { ...d, title: e.target.value }; putDoc(n); return n; })}
          />
          <div className="spacer" />
          <div className="lang-switch" title={t('langSwitchTitle')}>
            <button className={uiLang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={uiLang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')}>हिं</button>
          </div>
          <span className="pill">{online ? t('offlineReady') : t('offlineMode')}</span>
        </div>
        <Toolbar
          editor={editor}
          settings={settings}
          vars={doc.variables}
          patch={patch}
          onDocs={() => setDocsOpen(true)}
          onExport={() => setExportOpen(true)}
          onSheet={() => setSheet(true)}
          onSidebar={(tb) => { if (tb === '') setSidebarOpen((v) => !v); else { setTab(tb); setSidebarOpen(true); } }}
          sidebarOpen={sidebarOpen}
          onPrint={() => printNow()}
          onHF={() => setHfOpen(true)}
          onFR={() => setFrOpen(true)}
          onFN={() => setFnOpen(true)}
          onLink={() => setLinkOpen(true)}
          onOcr={() => setOcrOpen(true)}
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
              ocrWords={ocrWords}
              toast={toast}
            />
          )}
          {!sidebarOpen && (
            <button className="edge-handle" onClick={() => setSidebarOpen(true)} title={t('openPanel')}>
              {t('openPanel')}
            </button>
          )}
          <div className="desk">
            <div className={`sheet ${settings.guides ? 'guides' : ''}`}>
              {settings.guides && <span className="stitch-note">COURT STITCHING MARGIN 1.75&quot;</span>}
              {settings.headerText && <div className="sheet-head">{settings.headerText}</div>}
              {settings.footerText && <div className="sheet-foot">{settings.footerText}</div>}
              <EditorPane
                key={`${doc.id}-${editorKey}`}
                content={doc.content as JSONContent}
                settings={settings}
                placeholder={uiLang === 'hi' ? 'यहाँ ड्राफ्ट लिखना आरंभ करें…' : 'Start drafting here…'}
                onReady={setEditor}
                onUpdate={onUpdate}
                onKrutiPaste={(txt) => setKrutiText(txt)}
              />
            </div>
          </div>
        </div>
        <div className="statusbar">
          <span className="dot" />
          <span>{saveState === 'saving' ? t('saving') : t('saved')}</span>
          <span>{stats.words} {t('words')}</span>
          <span>{stats.paras} {t('paras')}</span>
          <span className="right">
            <span>{settings.pageSize} · {settings.fontSizePt}pt · {settings.lineHeight}</span>
            <span>{uiLang === 'hi' ? 'हिन्दी' : 'English'}</span>
          </span>
        </div>

        <BottomSheet open={sheet} onClose={() => setSheet(false)} editor={editor} vars={doc.variables} toast={toast} />
        <KrutiModal text={krutiText} onClose={() => setKrutiText(null)} onInsert={(txt) => editor && insertTextAtCursor(editor, txt)} />
        <CauseTitleModal open={causeOpen} onClose={() => setCauseOpen(false)} editor={editor} vars={doc.variables} toast={toast} />
        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} editor={editor} doc={doc} onPrint={() => printNow()} toast={toast} />
        <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} currentId={doc.id} onOpen={openDoc} toast={toast} />
        <HeaderFooterModal open={hfOpen} onClose={() => setHfOpen(false)} settings={settings} patch={patch} />
        <FindReplaceModal open={frOpen} onClose={() => setFrOpen(false)} editor={editor} />
        <FootnoteModal open={fnOpen} onClose={() => setFnOpen(false)} editor={editor} />
        <LinkModal open={linkOpen} onClose={() => setLinkOpen(false)} editor={editor} />
        <OcrModal open={ocrOpen} onClose={() => setOcrOpen(false)} editor={editor} onWords={setOcrWords} toast={toast} />
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    </I18nCtx.Provider>
  );
}
