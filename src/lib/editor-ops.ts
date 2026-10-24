import type { Editor, JSONContent } from '@tiptap/core';
import { Block, parseBlocks } from './templates';
import { blocksToContent } from '../editor/insert';
import { krutiDevToUnicode, unicodeToKruti, containsDevanagari } from './krutidev';

export function appendBlocks(editor: Editor, blocks: Block[], vars: Record<string, string> = {}) {
  editor.chain().focus('end').insertContent(blocksToContent(blocks, vars)).run();
}

export function insertBlocksAtCursor(editor: Editor, blocks: Block[], vars: Record<string, string> = {}) {
  editor.chain().focus().insertContent(blocksToContent(blocks, vars)).run();
}

export function insertTextAtCursor(editor: Editor, text: string) {
  editor.chain().focus().insertContent(text).run();
}

export function setPlev(editor: Editor, plev: 0 | 1 | 2 | 3) {
  editor.chain().focus().updateAttributes('paragraph', { plev }).run();
}

export function currentPlev(editor: Editor): number {
  const attrs = editor.getAttributes('paragraph');
  return Number(attrs?.plev || 0);
}

export function toggleLang(editor: Editor) {
  const attrs = editor.getAttributes('paragraph');
  const next = attrs?.lang === 'hi' ? 'en' : 'hi';
  editor.chain().focus().updateAttributes('paragraph', { lang: next }).run();
}

/** Convert the current selection (or whole doc) between Kruti Dev & Unicode.
 *  Direction is auto-detected from the script of the text. */
export function convertScope(editor: Editor, scope: 'selection' | 'doc'): 'toUnicode' | 'toKruti' | null {
  if (scope === 'selection') {
    const { from, to } = editor.state.selection;
    if (from === to) return null;
    const text = editor.state.doc.textBetween(from, to, '\n');
    const out = containsDevanagari(text) ? unicodeToKruti(text) : krutiDevToUnicode(text);
    editor.chain().focus().insertContentAt({ from, to }, out).run();
    return containsDevanagari(text) ? 'toKruti' : 'toUnicode';
  }
  const json = editor.getJSON();
  const dir = containsDevanagari(editor.state.doc.textContent) ? 'toKruti' : 'toUnicode';
  const converted = convertJson(json, dir);
  editor.commands.setContent(converted, { emitUpdate: true });
  return dir;
}

export function convertJson(json: JSONContent, dir: 'toUnicode' | 'toKruti'): JSONContent {
  const conv = dir === 'toUnicode' ? krutiDevToUnicode : unicodeToKruti;
  const walk = (n: JSONContent): JSONContent => {
    const c = { ...n };
    if (c.type === 'text' && c.text) c.text = conv(c.text);
    if (c.content) c.content = c.content.map(walk);
    return c;
  };
  return walk(json);
}

/** Push smart-variable values into every chip in the document. */
export function applyVariables(editor: Editor, vars: Record<string, string>) {
  const { tr, doc } = editor.state;
  let changed = false;
  doc.descendants((node, pos) => {
    if (node.type.name === 'varChip') {
      const text = vars[node.attrs.key] ?? '';
      if (node.attrs.text !== text) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, text });
        changed = true;
      }
    }
  });
  if (changed) editor.view.dispatch(tr);
  return changed;
}

export function docStats(editor: Editor): { words: number; paras: number } {
  const text = editor.state.doc.textContent;
  const words = (text.match(/[\u0900-\u097FA-Za-z0-9]+/g) || []).length;
  let paras = 0;
  editor.state.doc.forEach((n) => {
    if (n.type.name === 'paragraph' && n.textContent.trim()) paras += 1;
  });
  return { words, paras };
}

export { parseBlocks };

/* ---------------- court headers, footnotes, find/replace ---------------- */
import type { Jurisdiction } from './templates';

/** Court header always goes RIGHT-ALIGNED at the very top of the document. */
export function insertCourtHeader(editor: Editor, j: Jurisdiction, lang: 'en' | 'hi', vars: Record<string, string>) {
  const blocks = parseBlocks(lang === 'hi' ? j.hi : j.en);
  editor.chain().insertContentAt(0, blocksToContent(blocks, vars)).run();
}

export function collectFootnotes(editor: Editor): { n: number; text: string }[] {
  const out: { n: number; text: string }[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'fnRef') out.push({ n: node.attrs.n, text: node.attrs.text });
  });
  return out.sort((a, b) => a.n - b.n);
}

export function nextFootnoteNumber(editor: Editor): number {
  return collectFootnotes(editor).length + 1;
}

export function insertNotesList(editor: Editor) {
  const notes = collectFootnotes(editor);
  if (!notes.length) return false;
  const blocks = [
    { type: 'heading' as const, level: 2 as const, align: 'left' as const, plev: 0 as const, bold: true, lang: 'en' as const, text: 'NOTES & REFERENCES / नोट्स व संदर्भ' },
    ...notes.map((n) => ({ type: 'paragraph' as const, align: 'left' as const, plev: 0 as const, bold: false, lang: 'en' as const, text: `${n.n}. ${n.text}` })),
  ];
  editor.chain().focus('end').insertContent(blocksToContent(blocks)).run();
  return true;
}

export function findRanges(editor: Editor, query: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  if (!query) return out;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let i = node.text.toLowerCase().indexOf(query.toLowerCase());
    while (i !== -1) {
      out.push({ from: pos + i, to: pos + i + query.length });
      i = node.text.toLowerCase().indexOf(query.toLowerCase(), i + query.length);
    }
  });
  return out;
}

export function replaceAll(editor: Editor, query: string, replacement: string): number {
  const ranges = findRanges(editor, query).reverse();
  for (const r of ranges) editor.commands.insertContentAt({ from: r.from, to: r.to }, replacement);
  return ranges.length;
}

/* ---------------- free block arrangement (Word-style) ---------------- */
export function moveBlock(editor: Editor, dir: -1 | 1): boolean {
  const { tr, doc } = editor.state;
  const { $from } = editor.state.selection;
  if ($from.depth < 1) return false;
  const index = $from.index(0);
  const target = index + dir;
  if (target < 0 || target >= doc.childCount) return false;
  const node = $from.node(1);
  const start = $from.before(1);
  tr.delete(start, start + node.nodeSize);
  let p = 0;
  for (let i = 0; i < Math.min(target, tr.doc.childCount); i++) p += tr.doc.child(i).nodeSize;
  tr.insert(p, node);
  editor.view.dispatch(tr);
  return true;
}

export function dupBlock(editor: Editor): boolean {
  const { tr } = editor.state;
  const { $from } = editor.state.selection;
  if ($from.depth < 1) return false;
  const node = $from.node(1);
  const start = $from.before(1);
  tr.insert(start + node.nodeSize, node.copy(node.content));
  editor.view.dispatch(tr);
  return true;
}

export function deleteBlock(editor: Editor): boolean {
  const { tr } = editor.state;
  const { $from } = editor.state.selection;
  if ($from.depth < 1 || editor.state.doc.childCount <= 1) return false;
  const node = $from.node(1);
  const start = $from.before(1);
  tr.delete(start, start + node.nodeSize);
  editor.view.dispatch(tr);
  return true;
}

export function setIndent(editor: Editor, delta: number) {
  const cur = Number(editor.getAttributes('paragraph').indent || 0);
  const next = Math.min(8, Math.max(0, cur + delta));
  editor.chain().focus().updateAttributes('paragraph', { indent: next }).run();
}

export function tocBlocks(editor: Editor): Block[] {
  const out: Block[] = [{ type: 'heading', level: 2, align: 'left', plev: 0, bold: true, lang: 'en', text: 'TABLE OF CONTENTS / विषय सूची' }];
  editor.state.doc.forEach((node) => {
    if (node.type.name === 'heading') {
      const lvl = Number(node.attrs.level || 2);
      out.push({ type: 'paragraph', align: 'left', plev: 0, bold: false, lang: 'en', text: `${'  '.repeat(lvl - 1)}• ${node.textContent}` });
    }
  });
  return out;
}

/** Apply an alignment to EVERY paragraph/heading in the document. */
export function applyAlignAll(editor: Editor, align: 'left' | 'center' | 'right' | 'justify') {
  const { tr } = editor.state;
  editor.state.doc.forEach((node, offset) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      tr.setNodeMarkup(offset, undefined, { ...node.attrs, textAlign: align });
    }
  });
  editor.view.dispatch(tr);
}
