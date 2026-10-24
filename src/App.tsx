import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Editor, JSONContent } from '@tiptap/react';
import EditorPane from './editor/Editor';
import Toolbar from './ui/Toolbar';
import Sidebar from './ui/Sidebar';
import {
  BottomSheet, CauseTitleModal, DocsModal, ExportModal, KrutiModal,
  HeaderFooterModal, FindReplaceModal, FootnoteModal, LinkModal, OcrModal, SymbolsModal,
} from './ui/Overlays';
import { DEFAULT_SETTINGS, DocRecord, CaseInfo, PageSettings, TextBox } from './types';
import { listDocs, newDoc, putDoc, pushVersion } from './lib/storage';
import { applyPageRule, printNow } from './lib/print';
import { applyVariables, insertTextAtCursor, docStats, appendBlocks, tocBlocks } from './lib/editor-ops';
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
  const [symOpen, setSymOpen] = useState(false);
  const [boxes, setBoxes] = useState<TextBox[]>(() => doc.textBoxes || []);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);
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
    root.style.setProperty('--cols', String(settings.columns || 1));
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
    setBoxes(d.textBoxes || []);
    setEditor(null);
    window.setTimeout(() => setEditorKey((k) => k + 1), 0);
  }, []);

  const commitBoxes = useCallback((b: TextBox[]) => {
    setBoxes(b);
    setDoc((d) => { const n = { ...d, textBoxes: b }; putDoc(n); return n; });
  }, []);

  const addTextBox = useCallback(() => {
    commitBoxes([...boxes, {
      id: `tb${Date.now().toString(36)}`, xPct: 25, yPct: 25, wPct: 40, hPx: 110,
      text: '', sizePt: settings.fontSizePt, align: 'left', lang: uiLang === 'hi' ? 'hi' : 'en',
    }]);
  }, [boxes, commitBoxes, settings.fontSizePt, uiLang]);

  const onBoxPointerDown = (e: RPointerEvent, b: TextBox, mode: 'move' | 'resize') => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id: b.id, mode, sx: e.clientX, sy: e.clientY, ox: b.xPct, oy: b.yPct, ow: b.wPct, oh: b.hPx };
  };
  const onBoxPointerMove = (e: RPointerEvent) => {
    const d = dragRef.current; const sh = sheetRef.current;
    if (!d || !sh) return;
    const r = sh.getBoundingClientRect();
    const dxPct = ((e.clientX - d.sx) / r.width) * 100;
    const dyPct = ((e.clientY - d.sy) / r.height) * 100;
    setBoxes((cur) => cur.map((b) => {
      if (b.id !== d.id) return b;
      if (d.mode === 'move') return { ...b, xPct: Math.min(95, Math.max(-5, d.ox + dxPct)), yPct: Math.min(98, Math.max(0, d.oy + dyPct)) };
      return { ...b, wPct: Math.min(95, Math.max(12, d.ow + dxPct)), hPx: Math.max(48, d.oh + (e.clientY - d.sy)) };
    }));
  };
  const onBoxPointerUp = () => { if (dragRef.current) { dragRef.current = null; commitBoxesRef.current(boxesRef.current); } };
  const boxesRef = useRef(boxes); boxesRef.current = boxes;
  const commitBoxesRef = useRef(commitBoxes); commitBoxesRef.current = commitBoxes;

  const insertTOC = useCallback(() => {
    if (!editor) return;
    appendBlocks(editor, tocBlocks(editor), doc.variables);
    toast(t('toc') + ' ✓');
  }, [editor, doc.variables, toast, t]);

  const restoreContent = useCallback((content: unknown) => {
    setDoc((d) => { const n = { ...d, content }; putDoc(n); return n; });
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
          onExport={() => { pushVersion(doc, t('manualSnap')); setExportOpen(true); }}
          onSheet={() => setSheet(true)}
          onSidebar={(tb) => { if (tb === '') setSidebarOpen((v) => !v); else { setTab(tb); setSidebarOpen(true); } }}
          sidebarOpen={sidebarOpen}
          onPrint={() => printNow()}
          onHF={() => setHfOpen(true)}
          onFR={() => setFrOpen(true)}
          onFN={() => setFnOpen(true)}
          onLink={() => setLinkOpen(true)}
          onOcr={() => setOcrOpen(true)}
          onSymbols={() => setSymOpen(true)}
          onTextBox={addTextBox}
          onTOC={insertTOC}
          onVersion={() => setDocsOpen(true)}
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
            <div className={`sheet ${settings.guides ? 'guides' : ''}`} ref={sheetRef}>
              {settings.guides && <span className="stitch-note">COURT STITCHING MARGIN 1.75&quot;</span>}
              {settings.headerText && <div className="sheet-head">{settings.headerText}</div>}
              {settings.footerText && <div className="sheet-foot">{settings.footerText}</div>}
              {settings.watermark && <div className="watermark">{settings.watermark}</div>}
              <div className="tb-layer" onPointerMove={onBoxPointerMove} onPointerUp={onBoxPointerUp}>
                {boxes.map((b) => (
                  <div key={b.id} className="tbox" style={{ left: `${b.xPct}%`, top: `${b.yPct}%`, width: `${b.wPct}%`, height: b.hPx }}>
                    <div className="tb-head" onPointerDown={(e) => onBoxPointerDown(e, b, 'move')}>
                      <span className="tb-grip">⠿</span>
                      <select value={b.align} onChange={(e) => commitBoxes(boxes.map((x) => x.id === b.id ? { ...x, align: e.target.value as TextBox['align'] } : x))} onPointerDown={(e) => e.stopPropagation()}>
                        <option value="left">⬅</option><option value="center">☰</option><option value="right">➡</option>
                      </select>
                      <select value={b.sizePt} onChange={(e) => commitBoxes(boxes.map((x) => x.id === b.id ? { ...x, sizePt: Number(e.target.value) } : x))} onPointerDown={(e) => e.stopPropagation()}>
                        {[10, 12, 14, 16, 18, 20, 24, 28].map((n) => <option key={n} value={n}>{n}pt</option>)}
                      </select>
                      <button onClick={(e) => { e.stopPropagation(); commitBoxes(boxes.filter((x) => x.id !== b.id)); }} title={t('tbDel')}>✕</button>
                    </div>
                    <textarea
                      className="tb-body"
                      value={b.text}
                      placeholder={t('tbTitle')}
                      style={{ fontSize: `${b.sizePt}pt`, textAlign: b.align, fontFamily: b.lang === 'hi' ? 'var(--font-hi)' : 'var(--font-en)' }}
                      onChange={(e) => { const v = e.target.value; setBoxes((cur) => cur.map((x) => x.id === b.id ? { ...x, text: v } : x)); window.setTimeout(() => commitBoxesRef.current(boxesRef.current), 600); }}
                    />
                    <div className="tb-rs" onPointerDown={(e) => onBoxPointerDown(e, b, 'resize')} />
                  </div>
                ))}
                <button className="tb-add" onClick={addTextBox} title={t('tbAdd')}>＋ {t('textBox')}</button>
              </div>
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
        <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} currentId={doc.id} onOpen={openDoc} toast={toast} currentDoc={doc} onRestore={restoreContent} />
        <HeaderFooterModal open={hfOpen} onClose={() => setHfOpen(false)} settings={settings} patch={patch} />
        <FindReplaceModal open={frOpen} onClose={() => setFrOpen(false)} editor={editor} />
        <FootnoteModal open={fnOpen} onClose={() => setFnOpen(false)} editor={editor} />
        <LinkModal open={linkOpen} onClose={() => setLinkOpen(false)} editor={editor} />
        <OcrModal open={ocrOpen} onClose={() => setOcrOpen(false)} editor={editor} onWords={setOcrWords} toast={toast} />
        <SymbolsModal open={symOpen} onClose={() => setSymOpen(false)} editor={editor} toast={toast} />
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    </I18nCtx.Provider>
  );
}
