import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { checkGrammar } from '../lib/grammar';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { LEGAL_EN_WHITELIST } from '../data/legal-dictionary';

/** Smart-variable chip: {{key}} placeholder rendered as a live chip. */
export const VarChip = Node.create({
  name: 'varChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      key: { default: 'client_name' },
      text: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-var]' }];
  },
  renderHTML({ node }) {
    const attrs = node.attrs as { key: string; text: string };
    return [
      'span',
      mergeAttributes({
        'data-var': attrs.key,
        class: `var-chip${attrs.text ? '' : ' empty'}`,
      }),
      attrs.text || `{{${attrs.key}}}`,
    ];
  },
});

/** Paragraph carrying lang (hi/en) + pleading level (1. / (a) / (i)). */
export const CourtParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lang: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-lang'),
        renderHTML: (a) => (a.lang ? { 'data-lang': a.lang } : {}),
      },
      plev: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-plev') || 0),
        renderHTML: (a) => (a.plev ? { 'data-plev': String(a.plev) } : {}),
      },
    };
  },
});

export const CourtHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lang: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-lang'),
        renderHTML: (a) => (a.lang ? { 'data-lang': a.lang } : {}),
      },
    };
  },
});

/* ------------------------------------------------------------------ */
/* Legal spell-check (offline, whitelist-aware)                        */
/* ------------------------------------------------------------------ */
// Lazy-loaded (code-split) general English wordlist; the legal whitelist is
// always resident so statutory terms are never flagged, even cold-start.
let EN_WORDS: Set<string> | null = null;
if (typeof window !== 'undefined') {
  void import('an-array-of-english-words').then((m) => {
    EN_WORDS = new Set(m.default as unknown as string[]);
  });
}

export function isKnownWord(w: string): boolean {
  const lw = w.toLowerCase();
  if (LEGAL_EN_WHITELIST.has(lw)) return true;
  if (!EN_WORDS) return true; // dictionary warming: never false-flag on cold start
  if (EN_WORDS.has(lw)) return true;
  // simple morphology: plural / -ed / -ing / -s / possessive
  for (const cut of [/'s$/, /s$/, /es$/, /ed$/, /ing$/, /ly$/]) {
    const stripped = lw.replace(cut, '');
    if (stripped.length > 2 && stripped !== lw && EN_WORDS.has(stripped)) return true;
  }
  return false;
}

/** Footnote / note reference chip: auto-numbered sup marker. */
export const FnRef = Node.create({
  name: 'fnRef',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { n: { default: 1 }, text: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'sup[data-fn]' }];
  },
  renderHTML({ node }) {
    const a = node.attrs as { n: number; text: string };
    return ['sup', mergeAttributes({ 'data-fn': String(a.n), class: 'fn-ref', title: a.text }), `[${a.n}]`];
  },
});

export const SpellCheckPlugin = (enabled: () => boolean, grammarOn: () => boolean) =>
  Extension.create({
    name: 'legalSpellCheck',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('legalSpellCheck'),
          state: {
            init: () => DecorationSet.empty,
            apply(tr, old) {
              if (!tr.docChanged && !tr.getMeta('spellRefresh')) return old;
              if (!enabled()) return DecorationSet.empty;
              const decos: Decoration[] = [];
              tr.doc.descendants((node, pos) => {
                if (!node.isText || !node.text) return;
                const re = /[A-Za-z][A-Za-z'-]{2,}/g;
                let m: RegExpExecArray | null;
                while ((m = re.exec(node.text))) {
                  if (!isKnownWord(m[0])) {
                    decos.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: 'misspell' }));
                  }
                }
                if (grammarOn()) {
                  for (const iss of checkGrammar(node.text)) {
                    if (iss.kind !== 'grammar') continue;
                    decos.push(Decoration.inline(pos + iss.from, pos + iss.to, { class: 'grammar-hit' }));
                  }
                }
              });
              return DecorationSet.create(tr.doc, decos);
            },
          },
          props: {
            decorations(state) {
              return this.getState(state) ?? DecorationSet.empty;
            },
          },
        }),
      ];
    },
  });
