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
  onPrint: () => void;
  toast: (m: string) => void;
}

export default function Toolbar({ editor, settings, patch, onDocs, onExport, onSheet, onSidebar, onPrint, toast }: Props) {
  if (!editor) return null;
  const plev = currentPlev(editor);
  const lang = editor.getAttributes('paragraph')?.lang || 'en';

  const conv = (scope: 'selection' | 'doc') => {
    const dir = convertScope(editor, scope);
    toast(
      dir === 'toUnicode'
        ? 'Kruti Dev → Unicode ho gaya ✓'
        : dir === 'toKruti'
          ? 'Unicode → Kruti Dev 010 ✓'
          : 'Pehle text select karein / select text first',
    );
  };

  return (
    <div className="toolbar">
      <button className="tbtn" onClick={onDocs} title="Drafts / files">📁 Drafts</button>
      <span className="sep" />
      <button className="tbtn" onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</button>
      <button className="tbtn" onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</button>
      <span className="sep" />
      <button className="tbtn" data-on={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></button>
      <button className="tbtn" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></button>
      <button className="tbtn" onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></button>
      <span className="sep" />
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Left">⬅</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center (cause titles)">☰</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Right (signature blocks)">➡</button>
      <button className="tbtn" onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">⇔</button>
      <span className="sep" />
      <button className={`tbtn ${plev === 1 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 1 ? 0 : 1)} title="Para level 1.">1.</button>
      <button className={`tbtn ${plev === 2 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 2 ? 0 : 2)} title="Sub level (a)">(a)</button>
      <button className={`tbtn ${plev === 3 ? 'on' : ''}`} onClick={() => setPlev(editor, plev === 3 ? 0 : 3)} title="Sub level (i)">(i)</button>
      <span className="sep" />
      <button className={`tbtn ${lang === 'hi' ? 'on' : ''}`} onClick={() => toggleLang(editor)} title="Toggle Hindi / English paragraph (फ़ॉन्ट व IME संकेत)">
        {lang === 'hi' ? 'अ Hindi' : 'A English'}
      </button>
      <button className="tbtn warn" onClick={() => conv('selection')} title="Convert selected text Kruti Dev ⇄ Unicode">क⇄U sel</button>
      <button className="tbtn warn" onClick={() => conv('doc')} title="Convert entire document Kruti Dev ⇄ Unicode">क⇄U doc</button>
      <span className="sep" />
      <select className="tbtn" value={settings.fontSizePt} onChange={(e) => patch({ fontSizePt: Number(e.target.value) })} title="Font size (court standard 14pt)">
        {[12, 13, 14, 15, 16].map((n) => <option key={n} value={n}>{n} pt</option>)}
      </select>
      <select className="tbtn" value={settings.lineHeight} onChange={(e) => patch({ lineHeight: Number(e.target.value) as 1.5 | 2.0 })} title="Line spacing">
        <option value={1.5}>1.5 line</option>
        <option value={2}>2.0 line</option>
      </select>
      <select className="tbtn" value={settings.pageSize} onChange={(e) => patch({ pageSize: e.target.value as 'A4' | 'LEGAL' })} title="Paper size">
        <option value="A4">A4</option>
        <option value="LEGAL">Legal</option>
      </select>
      <button className="tbtn" onClick={() => patch({ marginL: 1.75, marginR: 1, marginT: 1, marginB: 1 })} title="Court margins: L 1.75&quot; (stitching), R/T/B 1&quot;">
       Margins 1.75/1
      </button>
      <button className={`tbtn ${settings.guides ? 'on' : ''}`} onClick={() => patch({ guides: !settings.guides })} title="Stitching / margin guides"> Guides</button>
      <button className={`tbtn ${settings.spellcheck ? 'on' : ''}`} onClick={() => patch({ spellcheck: !settings.spellcheck })} title="Legal spell-check (whitelist aware)">✓ Spell</button>
      <span className="sep" />
      <button className="tbtn" onClick={() => onSidebar('templates')}>🏛 Templates</button>
      <button className="tbtn" onClick={() => onSidebar('variables')}>🧩 Variables</button>
      <button className="tbtn" onClick={() => onSidebar('cases')}>⚖ My Cases</button>
      <button className="tbtn" onClick={() => onSidebar('index')}>🗂 Index</button>
      <button className="tbtn" onClick={() => onSidebar('dict')}>📖 Dictionary</button>
      <span className="sep" />
      <button className="tbtn primary" onClick={onSheet}>🖋 Verification / Affidavit</button>
      <button className="tbtn" onClick={onPrint} title="Court-ready PDF / paper via print engine">🖨 PDF / Print</button>
      <button className="tbtn primary" onClick={onExport}>⬇ Export</button>
    </div>
  );
}
