import { useRef, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { PageSettings } from '../types';
import { currentPlev, setPlev, toggleLang, convertScope, insertCourtHeader, insertNotesList, setIndent } from '../lib/editor-ops';
import { JURISDICTIONS } from '../lib/templates';
import { useI18n } from '../data/i18n';

interface Props {
  editor: Editor | null;
  settings: PageSettings;
  vars: Record<string, string>;
  patch: (p: Partial<PageSettings>) => void;
  onDocs: () => void;
  onExport: () => void;
  onSheet: () => void;
  onSidebar: (tab: string) => void;
  sidebarOpen: boolean;
  onPrint: () => void;
  onHF: () => void;
  onFR: () => void;
  onFN: () => void;
  onLink: () => void;
  onOcr: () => void;
  onSymbols: () => void;
  onTextBox: () => void;
  onTOC: () => void;
  onVersion: () => void;
  toast: (m: string) => void;
}

function Menu({ label, title, right, children }: { label: ReactNode; title: string; right?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu">
      <button className={`tbtn ${open ? 'on' : ''}`} title={title} onClick={() => setOpen((v) => !v)}>
        {label}<span className="caret">▼</span>
      </button>
      {open && (
        <>
          <div className="menu-back" onClick={() => setOpen(false)} />
          <div className={`menu-pop ${right ? 'right' : ''}`}>{children(() => setOpen(false))}</div>
        </>
      )}
    </div>
  );
}

export default function Toolbar(p: Props) {
  const { t, lang } = useI18n();
  const imgRef = useRef<HTMLInputElement>(null);
  const { editor, settings, patch } = p;
  const [painterArmed, setPainterArmed] = useState(false);
  const painterRef = useRef<{ color: string | null; highlight: string | null; bold: boolean; italic: boolean; underline: boolean } | null>(null);

  const armPainter = () => {
    if (!editor || painterArmed) return;
    const st = editor.state;
    const marks = st.selection.$from.marks();
    const has = (n: string) => marks.some((m) => m.type.name === n);
    painterRef.current = {
      color: (editor.getAttributes('textStyle').color as string) || null,
      highlight: (editor.getAttributes('highlight').color as string) || null,
      bold: has('bold'), italic: has('italic'), underline: has('underline'),
    };
    setPainterArmed(true);
    const h = () => {
      const e = editor;
      const pt = painterRef.current;
      if (!e || !pt) return;
      if (e.state.selection.empty) return;
      let c = e.chain().focus();
      if (pt.bold) c = c.setBold();
      if (pt.italic) c = c.setItalic();
      if (pt.underline) c = c.setUnderline();
      if (pt.color) c = c.setColor(pt.color);
      if (pt.highlight) c = c.setHighlight({ color: pt.highlight });
      c.run();
      painterRef.current = null;
      setPainterArmed(false);
      e.off('selectionUpdate', h);
    };
    editor.on('selectionUpdate', h);
  };

  if (!editor) return null;
  const plev = currentPlev(editor);
  const paraLang = editor.getAttributes('paragraph')?.lang || 'en';

  const conv = (scope: 'selection' | 'doc') => {
    const dir = convertScope(editor, scope);
    p.toast(dir === 'toUnicode' ? t('tConvertedU') : dir === 'toKruti' ? t('tConvertedK') : t('tSelectFirst'));
  };

  const pickImage = async (f: File) => {
    if (f.size > 2_500_000) { p.toast('Image too large (max 2.5 MB) / चित्र बहुत बड़ा'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: String(reader.result) }).run();
      p.toast(t('tInserted'));
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="toolbar">
      <button className={`tbtn ${p.sidebarOpen ? 'on' : ''}`} onClick={() => p.onSidebar('')} title={t('panels')}>☰</button>

      <Menu label={`📁 ${t('file')}`} title={t('file')}>
        {(close) => (
          <>
            <button onClick={() => { p.onDocs(); close(); }}>📁 {t('drafts')}</button>
            <button onClick={() => { p.onExport(); close(); }}>⬇ {t('exportMenu')}</button>
            <button onClick={() => { p.onPrint(); close(); }}>🖨 {t('print')}</button>
            <button onClick={() => { p.onVersion(); close(); }}>🕘 {t('history')}</button>
          </>
        )}
      </Menu>
      <span className="sep" />

      <button className="tbtn" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title={t('undo')}>↩</button>
      <button className="tbtn" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title={t('redo')}>↪</button>
      <span className="sep" />

      <button className="tbtn" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></button>
      <button className="tbtn" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></button>
      <button className="tbtn" onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></button>
      <span className="sep" />

      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('left').run()} title={t('alignL')}>⬅</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('center').run()} title={t('alignC')}>☰</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('right').run()} title={t('alignR')}>➡</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('justify').run()} title={t('alignJ')}>⇔</button>
      <span className="sep" />

      <button className={`tbtn ${plev === 1 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 1 ? 0 : 1)} title={t('plev1')}>1.</button>
      <button className={`tbtn ${plev === 2 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 2 ? 0 : 2)} title={t('plev2')}>(a)</button>
      <button className={`tbtn ${plev === 3 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 3 ? 0 : 3)} title={t('plev3')}>(i)</button>
      <span className="sep" />

      <button className={`tbtn ${paraLang === 'hi' ? 'on' : ''}`} onClick={() => toggleLang(editor)} title={t('langPara')}>
        {paraLang === 'hi' ? 'अ' : 'A'}
      </button>

      <Menu label="क⇄U" title={t('convert')}>
        {(close) => (
          <>
            <button onClick={() => { conv('selection'); close(); }}>{t('convSel')}</button>
            <button onClick={() => { conv('doc'); close(); }}>{t('convDoc')}</button>
          </>
        )}
      </Menu>
      <span className="sep" />

      <select className="tbtn" title={t('blockType')} value={editor.isActive('heading', { level: 1 }) ? 'H1' : editor.isActive('heading', { level: 2 }) ? 'H2' : editor.isActive('heading', { level: 3 }) ? 'H3' : editor.isActive('blockquote') ? 'Q' : 'P'}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'P') editor.chain().focus().setParagraph().run();
          else if (v === 'Q') editor.chain().focus().toggleBlockquote().run();
          else editor.chain().focus().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
        }}>
        <option value="P">{t('styleNormal')}</option>
        <option value="H1">{t('styleH1')}</option>
        <option value="H2">{t('styleH2')}</option>
        <option value="H3">{t('styleH3')}</option>
        <option value="Q">{t('styleQuote')}</option>
      </select>
      <select className="tbtn" value={settings.fontSizePt} onChange={(e) => patch({ fontSizePt: Number(e.target.value) })} title={t('fontSize')}>
        {[10, 11, 12, 13, 14, 15, 16, 18, 20, 24].map((n) => <option key={n} value={n}>{n} pt</option>)}
      </select>
      <select className="tbtn" value={settings.lineHeight} onChange={(e) => patch({ lineHeight: Number(e.target.value) })} title={t('lineSp')}>
        {[1, 1.15, 1.5, 1.75, 2, 2.5, 3].map((lh) => <option key={lh} value={lh}>{lh.toFixed(2)}</option>)}
      </select>
      <span className="sep" />
      <button className="tbtn" onClick={() => setIndent(editor, 1)} title={t('indentIn')}>»</button>
      <button className="tbtn" onClick={() => setIndent(editor, -1)} title={t('indentOut')}>«</button>
      <input type="color" className="tbtn tb-color" defaultValue="#c0392b" title={t('textColor')} onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
      <input type="color" className="tbtn tb-color" defaultValue="#fff176" title={t('highlight')} onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()} />
      <button className={`tbtn ${editor.isActive('superscript') ? 'on' : ''}`} onClick={() => editor.chain().focus().toggleSuperscript().run()} title={t('sup')}>x²</button>
      <button className={`tbtn ${editor.isActive('subscript') ? 'on' : ''}`} onClick={() => editor.chain().focus().toggleSubscript().run()} title={t('sub')}>x₂</button>
      <button className={`tbtn ${painterArmed ? 'on' : ''}`} onClick={armPainter} title={t('painter')}>🖌</button>
      <span className="sep" />
      <select className="tbtn" value={settings.columns} onChange={(e) => patch({ columns: Number(e.target.value) as 1 | 2 | 3 })} title={t('columns')}>
        <option value={1}>{t('col1')}</option>
        <option value={2}>{t('col2')}</option>
        <option value={3}>{t('col3')}</option>
      </select>

      <Menu label={`👁 ${t('view')}`} title={t('view')}>
        {(close) => (
          <>
            <div className="mtitle">{t('paper')}</div>
            <button onClick={() => { patch({ pageSize: 'A4' }); close(); }}>A4 {settings.pageSize === 'A4' ? '✓' : ''}</button>
            <button onClick={() => { patch({ pageSize: 'LEGAL' }); close(); }}>Legal {settings.pageSize === 'LEGAL' ? '✓' : ''}</button>
            <button onClick={() => { patch({ pageSize: 'LETTER' }); close(); }}>Letter {settings.pageSize === 'LETTER' ? '✓' : ''}</button>
            <button onClick={() => { p.onHF(); close(); }}>📐 {t('pageSetupTitle')}</button>
            <hr />
            <button onClick={() => { patch({ marginL: 1.75, marginR: 1, marginT: 1, marginB: 1 }); close(); }}>{t('courtMargins')}</button>
            <button onClick={() => { patch({ guides: !settings.guides }); close(); }}>{t('guides')} {settings.guides ? '✓' : ''}</button>
            <button onClick={() => { patch({ spellcheck: !settings.spellcheck }); close(); }}>{t('spell')} {settings.spellcheck ? '✓' : ''}</button>
            <button onClick={() => { patch({ grammar: !settings.grammar }); close(); }}>{t('grammar')} {settings.grammar ? '✓' : ''}</button>
            <hr />
            <button onClick={() => { p.onSidebar('fonts'); close(); }}>🔤 {t('fontLib')}</button>
            <button onClick={() => { p.onHF(); close(); }}>📄 {t('pageSetup')}</button>
            <button onClick={() => { p.onFR(); close(); }}>🔍 {t('find')}</button>
          </>
        )}
      </Menu>

      <Menu label={`＋ ${t('insert')}`} title={t('insert')}>
        {(close) => (
          <>
            <div className="mtitle">{t('courtHeader')}</div>
            {JURISDICTIONS.map((j) => (
              <button
                key={j.id}
                onClick={() => { insertCourtHeader(editor, j, lang, p.vars); p.toast(t('tHeaderTop')); close(); }}
              >🏛 {j.label}</button>
            ))}
            <hr />
            <button onClick={() => { p.onSidebar('templates'); close(); }}>🏛 {t('templates')}</button>
            <button onClick={() => { p.onSidebar('variables'); close(); }}>🧩 {t('variables')}</button>
            <button onClick={() => { p.onSidebar('cases'); close(); }}>⚖ {t('cases')}</button>
            <button onClick={() => { p.onSidebar('index'); close(); }}>🗂 {t('index')}</button>
            <button onClick={() => { p.onSidebar('dict'); close(); }}>📖 {t('dict')}</button>
            <hr />
            <button onClick={() => { imgRef.current?.click(); close(); }}>🖼 {t('image')}</button>
            <button onClick={() => { p.onOcr(); close(); }}>📷 {t('ocr')}</button>
            <button onClick={() => { p.onLink(); close(); }}>🔗 {t('link')}</button>
            <button onClick={() => { p.onFN(); close(); }}>📝 {t('footnote')}</button>
            <button onClick={() => { insertNotesList(editor) ? p.toast(t('tInserted')) : p.toast('—'); close(); }}>📚 {t('notesList')}</button>
            <hr />
            <button onClick={() => { p.onSymbols(); close(); }}>Ω {t('symbols')}</button>
            <button onClick={() => { p.onTextBox(); close(); }}>🗗 {t('textBox')}</button>
            <button onClick={() => { p.onTOC(); close(); }}>🗒 {t('toc')}</button>
            <button onClick={() => { editor.chain().focus().insertContent(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })).run(); p.toast(t('tInserted')); close(); }}>📅 {t('todayDate')}</button>
            <hr />
            <button onClick={() => { p.onSheet(); close(); }}>🖋 {t('affidavit')}</button>
          </>
        )}
      </Menu>

      <Menu label={`⊞ ${t('table')}`} title={t('table')}>
        {(close) => (
          <>
            <button onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); close(); }}>⊞ {t('tableNew')}</button>
            <button onClick={() => { editor.chain().focus().addRowAfter().run(); close(); }}>＋ {t('rowAdd')}</button>
            <button onClick={() => { editor.chain().focus().addColumnAfter().run(); close(); }}>＋ {t('colAdd')}</button>
            <button onClick={() => { editor.chain().focus().deleteRow().run(); close(); }}>－ {t('rowDel')}</button>
            <button onClick={() => { editor.chain().focus().deleteColumn().run(); close(); }}>－ {t('colDel')}</button>
          </>
        )}
      </Menu>

      <span style={{ flex: 1 }} />
      <button className="tbtn" onClick={p.onPrint} title={t('print')}>🖨</button>
      <button className="tbtn primary" onClick={p.onExport}>⬇ {t('export')}</button>
      <input
        ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickImage(f); e.target.value = ''; }}
      />
    </div>
  );
}
