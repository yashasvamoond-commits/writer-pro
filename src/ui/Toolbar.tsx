import { useRef, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { PageSettings } from '../types';
import { currentPlev, setPlev, toggleLang, convertScope, insertCourtHeader, insertNotesList } from '../lib/editor-ops';
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
          </>
        )}
      </Menu>
      <span className="sep" />

      <button className="tbtn" onClick={() => editor.chain().focus().undo().run()} title={t('undo')}>↩</button>
      <button className="tbtn" onClick={() => editor.chain().focus().redo().run()} title={t('redo')}>↪</button>
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

      <select className="tbtn" value={settings.fontSizePt} onChange={(e) => patch({ fontSizePt: Number(e.target.value) })} title={t('fontSize')}>
        {[12, 13, 14, 15, 16].map((n) => <option key={n} value={n}>{n} pt</option>)}
      </select>
      <select className="tbtn" value={settings.lineHeight} onChange={(e) => patch({ lineHeight: Number(e.target.value) as 1.5 | 2 })} title={t('lineSp')}>
        <option value={1.5}>1.5</option>
        <option value={2}>2.0</option>
      </select>

      <Menu label={`👁 ${t('view')}`} title={t('view')}>
        {(close) => (
          <>
            <div className="mtitle">{t('paper')}</div>
            <button onClick={() => { patch({ pageSize: 'A4' }); close(); }}>A4 {settings.pageSize === 'A4' ? '✓' : ''}</button>
            <button onClick={() => { patch({ pageSize: 'LEGAL' }); close(); }}>Legal {settings.pageSize === 'LEGAL' ? '✓' : ''}</button>
            <hr />
            <button onClick={() => { patch({ marginL: 1.75, marginR: 1, marginT: 1, marginB: 1 }); close(); }}>{t('courtMargins')}</button>
            <button onClick={() => { patch({ guides: !settings.guides }); close(); }}>{t('guides')} {settings.guides ? '✓' : ''}</button>
            <button onClick={() => { patch({ spellcheck: !settings.spellcheck }); close(); }}>{t('spell')} {settings.spellcheck ? '✓' : ''}</button>
            <button onClick={() => { patch({ grammar: !settings.grammar }); close(); }}>{t('grammar')} {settings.grammar ? '✓' : ''}</button>
            <hr />
            <button onClick={() => { p.onSidebar('fonts'); close(); }}>🔤 {t('fontLib')}</button>
            <button onClick={() => { p.onHF(); close(); }}>📄 {t('headerFooter')}</button>
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
