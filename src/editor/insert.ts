import type { JSONContent } from '@tiptap/core';
import { Block } from '../lib/templates';

const VAR_RE = /\{\{([a-z_0-9]+)\}\}/g;

/** Template blocks -> TipTap JSON, turning {{keys}} into smart-variable chips. */
export function blocksToContent(blocks: Block[], vars: Record<string, string> = {}): JSONContent[] {
  return blocks.map((b) => {
    const content: JSONContent[] = [];
    let last = 0;
    for (const m of b.text.matchAll(VAR_RE)) {
      const idx = m.index ?? 0;
      if (idx > last) content.push(textRun(b.text.slice(last, idx), b.bold));
      const key = m[1];
      content.push({ type: 'varChip', attrs: { key, text: vars[key] || '' } });
      last = idx + m[0].length;
    }
    if (last < b.text.length) content.push(textRun(b.text.slice(last), b.bold));
    if (!content.length) content.push(textRun('', b.bold));
    return {
      type: b.type === 'heading' ? 'heading' : 'paragraph',
      attrs: {
        textAlign: b.align && b.align !== 'left' ? b.align : undefined,
        plev: b.plev || 0,
        lang: b.lang,
        ...(b.type === 'heading' ? { level: b.level ?? 2 } : {}),
      },
      content,
    };
  });
}

function textRun(text: string, bold?: boolean): JSONContent {
  return { type: 'text', text, marks: bold ? [{ type: 'bold' }] : undefined };
}

/** Walk plain text and produce blocks-aware plain string with numbering. */
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
function alpha(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = ALPHA[r] + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || 'a';
}
function roman(n: number): string {
  const map: [number, string][] = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let s = '';
  let x = n;
  for (const [v, sym] of map) while (x >= v) { s += sym; x -= v; }
  return s || 'i';
}

/** Compute "1. / (a) / (i)" prefixes for every top-level node (for exports). */
export function numberingPrefixes(doc: JSONContent): string[] {
  const counters = [0, 0, 0];
  const out: string[] = [];
  for (const node of doc.content || []) {
    const plev = Number(node.attrs?.plev || 0);
    if (node.type === 'paragraph' && plev >= 1 && plev <= 3) {
      counters[plev - 1] += 1;
      for (let i = plev; i < 3; i++) counters[i] = 0;
      out.push(
        plev === 1 ? `${counters[0]}. ` : plev === 2 ? `(${alpha(counters[1])}) ` : `(${roman(counters[2])}) `,
      );
    } else {
      out.push('');
    }
  }
  return out;
}
