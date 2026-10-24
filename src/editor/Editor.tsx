import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { CourtHeading, CourtParagraph, FnRef, SpellCheckPlugin, VarChip } from './extensions';
import { ALL_ENTRIES } from '../data/legal-dictionary';
import { containsDevanagari, detectKrutiDev } from '../lib/krutidev';
import { moveBlock, dupBlock, deleteBlock } from '../lib/editor-ops';
import { PageSettings } from '../types';

interface Props {
  content: JSONContent;
  settings: PageSettings;
  placeholder: string;
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

export default function EditorPane({ content, settings, placeholder, onReady, onUpdate, onKrutiPaste }: Props) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [ac, setAc] = useState<AcState>({ open: false, items: [], sel: 0, from: 0, to: 0, x: 0, y: 0 });
  const acRef = useRef(ac);
  acRef.current = ac;
  const editorRef = useRef<Editor | null>(null);
  const [gutter, setGutter] = useState<{ top: number; left: number } | null>(null);

  const editor = useEditor({
    content,
    extensions: [
      StarterKit.configure({ paragraph: false, heading: false, link: { openOnClick: false, autolink: true } }),
      CourtParagraph,
      CourtHeading.configure({ levels: [1, 2, 3] }),
      VarChip,
      FnRef,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      SpellCheckPlugin(
        () => settingsRef.current.spellcheck,
        () => settingsRef.current.grammar,
      ),
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
    onSelectionUpdate: ({ editor: e }) => {
      refreshAc(e);
      const { $from } = e.state.selection;
      if ($from.depth >= 1) {
        const pos = $from.before(1);
        const c = e.view.coordsAtPos(pos + 1);
        setGutter({ top: c.top, left: c.left });
      } else setGutter(null);
    },
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
      {gutter && editor && (
        <div className="block-gutter" style={{ top: gutter.top - 6, left: Math.max(4, gutter.left - 46) }}>
          <button title="Move up / ऊपर" onClick={() => moveBlock(editor, -1)}>↑</button>
          <button title="Move down / नीचे" onClick={() => moveBlock(editor, 1)}>↓</button>
          <button title="Duplicate / प्रतिरूप" onClick={() => dupBlock(editor)}>⧉</button>
          <button title="Delete block / ब्लॉक हटाएँ" onClick={() => deleteBlock(editor)}>🗑</button>
        </div>
      )}
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
