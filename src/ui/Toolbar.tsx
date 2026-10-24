import { useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { PageSettings } from '../types';
import { currentPlev, setPlev, toggleLang, convertScope } from '../lib/editor-ops';

interface Props {
  editor: Editor | null;
  settings: PageSettings;
  patch: (p: Partial<PageSettings>) => void;
  onDocs: () => void;
  onExport: () => void;
  onSheet: () => void;
  onSidebar: (tab: string) => void;
  sidebarOpen: boolean;
  onPrint: () => void;
  toast: (m: string) => void;
}

/** Compact dropdown used by the grouped toolbar. */
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
  const { editor, settings, patch } = p;
  if (!editor) return null;
  const plev = currentPlev(editor);
  const lang = editor.getAttributes('paragraph')?.lang || 'en';

  const conv = (scope: 'selection' | 'doc') => {
    const dir = convertScope(editor, scope);
    p.toast(
      dir === 'toUnicode' ? 'Kruti Dev → Unicode ✓'
        : dir === 'toKruti' ? 'Unicode → Kruti Dev 010 ✓'
          : 'Pehle text select karein / select text first',
    );
  };

  return (
    <div className="toolbar">
      <button className={`tbtn ${p.sidebarOpen ? 'on' : ''}`} onClick={() => p.onSidebar('')} title="Panels show/hide karein — टूल पैनल">☰</button>

      <Menu label="📁 File" title="Drafts, export, print">
        {(close) => (
          <>
            <button onClick={() => { p.onDocs(); close(); }}>📁 Drafts open / new <span className="hint">फाइलें</span></button>
            <button onClick={() => { p.onExport(); close(); }}>⬇ Export DOCX / PDF / backup</button>
            <button onClick={() => { p.onPrint(); close(); }}>🖨 Print / Save as PDF <span className="hint">कोर्ट कॉपी</span></button>
          </>
        )}
      </Menu>
      <span className="sep" />

      <button className="tbtn" onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</button>
      <button className="tbtn" onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</button>
      <span className="sep" />

      <button className="tbtn" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></button>
      <button className="tbtn" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></button>
      <button className="tbtn" onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></button>
      <span className="sep" />

      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Left align">⬅</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center (cause titles)">☰</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Right (signature)">➡</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">⇔</button>
      <span className="sep" />

      <button className={`tbtn ${plev === 1 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 1 ? 0 : 1)} title="Paragraph 1. 2. 3.">1.</button>
      <button className={`tbtn ${plev === 2 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 2 ? 0 : 2)} title="Sub (a) (b)">(a)</button>
      <button className={`tbtn ${plev === 3 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 3 ? 0 : 3)} title="Sub (i) (ii)">(i)</button>
      <span className="sep" />

      <button className={`tbtn ${lang === 'hi' ? 'on' : ''}`} onClick={() => toggleLang(editor)} title="Hindi / English paragraph toggle">
        {lang === 'hi' ? 'अ' : 'A'}
      </button>

      <Menu label="क⇄U" title="Kruti Dev ⇄ Unicode conversion">
        {(close) => (
          <>
            <button onClick={() => { conv('selection'); close(); }}>Convert selected text <span className="hint">चयनित</span></button>
            <button onClick={() => { conv('doc'); close(); }}>Convert whole document <span className="hint">पूरा ड्राफ्ट</span></button>
          </>
        )}
      </Menu>
      <span className="sep" />

      <select className="tbtn" value={settings.fontSizePt} onChange={(e) => patch({ fontSizePt: Number(e.target.value) })} title="Font size — court standard 14pt">
        {[12, 13, 14, 15, 16].map((n) => <option key={n} value={n}>{n} pt</option>)}
      </select>
      <select className="tbtn" value={settings.lineHeight} onChange={(e) => patch({ lineHeight: Number(e.target.value) as 1.5 | 2 })} title="Line spacing">
        <option value={1.5}>1.5</option>
        <option value={2}>2.0</option>
      </select>

      <Menu label="👁 View" title="Page, margins, guides, fonts">
        {(close) => (
          <>
            <div className="mtitle">Paper / कागज़</div>
            <button onClick={() => { patch({ pageSize: 'A4' }); close(); }}>A4 {settings.pageSize === 'A4' ? '✓' : ''}</button>
            <button onClick={() => { patch({ pageSize: 'LEGAL' }); close(); }}>Legal {settings.pageSize === 'LEGAL' ? '✓' : ''}</button>
            <hr />
            <button onClick={() => { patch({ marginL: 1.75, marginR: 1, marginT: 1, marginB: 1 }); close(); }}>Court margins 1.75″ / 1″ <span className="hint">सिलाई</span></button>
            <button onClick={() => { patch({ guides: !settings.guides }); close(); }}>Stitching guides {settings.guides ? '✓' : ''}</button>
            <button onClick={() => { patch({ spellcheck: !settings.spellcheck }); close(); }}>Legal spell-check {settings.spellcheck ? '✓' : ''}</button>
            <hr />
            <button onClick={() => { p.onSidebar('fonts'); close(); }}>🔤 Font library <span className="hint">फ़ॉन्ट</span></button>
          </>
        )}
      </Menu>

      <Menu label="＋ Insert" title="Templates, variables, cases, index">
        {(close) => (
          <>
            <button onClick={() => { p.onSidebar('templates'); close(); }}>🏛 Court templates <span className="hint">प्रपत्र</span></button>
            <button onClick={() => { p.onSidebar('variables'); close(); }}>🧩 Smart variables</button>
            <button onClick={() => { p.onSidebar('cases'); close(); }}>⚖ My cases <span className="hint">प्रकरण</span></button>
            <button onClick={() => { p.onSidebar('index'); close(); }}>🗂 Index / list of dates</button>
            <button onClick={() => { p.onSidebar('dict'); close(); }}>📖 Legal dictionary</button>
            <hr />
            <button onClick={() => { p.onSheet(); close(); }}>🖋 Verification / Affidavit <span className="hint">सत्यापन</span></button>
          </>
        )}
      </Menu>

      <span style={{ flex: 1 }} />
      <button className="tbtn" onClick={p.onPrint} title="Court-ready PDF / paper">🖨</button>
      <button className="tbtn primary" onClick={p.onExport}>⬇ Export</button>
    </div>
  );
}
