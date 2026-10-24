import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { CourtHeading, CourtParagraph, SpellCheckPlugin, VarChip } from './extensions';
import { ALL_ENTRIES } from '../data/legal-dictionary';
import { containsDevanagari, detectKrutiDev } from '../lib/krutidev';
import { PageSettings } from '../types';

interface Props {
  content: JSONContent;
  settings: PageSettings;
  onReady: (e: Editor) => void;
  onUpdate: (json: JSONContent) => void;
  onKrutiPaste: (text: string) => void;
}

interface AcState {
  open: boolean;
  items: { term: string; meaning?: string; lang: string }[];
  sel: number;
  from: number;
  to: number;
  x: number;
  y: number;
}

export default function EditorPane({ content, settings, onReady, onUpdate, onKrutiPaste }: Props) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [ac, setAc] = useState<AcState>({ open: false, items: [], sel: 0, from: 0, to: 0, x: 0, y: 0 });
  const acRef = useRef(ac);
  acRef.current = ac;
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    content,
    extensions: [
      StarterKit.configure({ paragraph: false, heading: false }),
      CourtParagraph,
      CourtHeading.configure({ levels: [1, 2, 3] }),
      VarChip,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Placeholder.configure({ placeholder: 'यहाँ ड्राफ्ट लिखना आरंभ करें — Start drafting…' }),
      SpellCheckPlugin(() => settingsRef.current.spellcheck),
    ],
    editorProps: {
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain') || '';
        if (text && detectKrutiDev(text).isKruti) {
          onKrutiPaste(text);
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        const a = acRef.current;
        if (!a.open) return false;
        if (event.key === 'ArrowDown') { setAc({ ...a, sel: Math.min(a.sel + 1, a.items.length - 1) }); return true; }
        if (event.key === 'ArrowUp') { setAc({ ...a, sel: Math.max(a.sel - 1, 0) }); return true; }
        if (event.key === 'Escape') { setAc({ ...a, open: false }); return true; }
        if (event.key === 'Enter' || event.key === 'Tab') {
          if (editorRef.current) commitAc(editorRef.current, a);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onUpdate(e.getJSON());
      refreshAc(e);
    },
    onSelectionUpdate: ({ editor: e }) => refreshAc(e),
  });

  function commitAc(e: Editor, a: AcState) {
    const item = a.items[a.sel];
    if (!item) return;
    e.chain().focus().insertContentAt({ from: a.from, to: a.to }, `${item.term} `).run();
    setAc({ ...a, open: false });
  }

  function refreshAc(e: Editor) {
    const { from } = e.state.selection;
    const before = e.state.doc.resolve(from).nodeBefore?.text || '';
    const m = before.match(/([A-Za-zऀ-][A-Za-zऀ-]{1,})$/);
    if (!m) { setAc((s) => (s.open ? { ...s, open: false } : s)); return; }
    const q = m[1].toLowerCase();
    const items = ALL_ENTRIES.filter((en) => en.term.toLowerCase().startsWith(q)).slice(0, 8);
    if (!items.length || q.length < 2) { setAc((s) => (s.open ? { ...s, open: false } : s)); return; }
    const coords = e.view.coordsAtPos(from);
    setAc({ open: true, items, sel: 0, from: from - m[1].length, to: from, x: coords.left, y: coords.bottom + 4 });
  }

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      onReady(editor);
    }
  }, [editor]);

  // keep language attrs honest when text script changes (bilingual coexistence)
  useEffect(() => {
    if (!editor) return;
    const fix = () => {
      const { tr, doc } = editor.state;
      let changed = false;
      doc.descendants((node, pos) => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
        const txt = node.textContent;
        if (!txt.trim()) return;
        const want = containsDevanagari(txt) ? 'hi' : 'en';
        if (node.attrs.lang !== want) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, lang: want });
          changed = true;
        }
      });
      if (changed) editor.view.dispatch(tr);
    };
    fix();
    const id = window.setInterval(fix, 1500);
    return () => window.clearInterval(id);
  }, [editor]);

  useEffect(() => {
    editor?.commands.focus();
  }, [editor]);

  return (
    <>
      <EditorContent editor={editor} />
      {ac.open && (
        <div className="ac-popup" style={{ left: ac.x, top: ac.y }}>
          {ac.items.map((it, i) => (
            <button
              key={it.term}
              className={i === ac.sel ? 'sel' : ''}
              onMouseDown={(ev) => { ev.preventDefault(); if (editor) commitAc(editor, { ...ac, sel: i }); }}
            >
              {it.term}
              <small>{it.meaning}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
