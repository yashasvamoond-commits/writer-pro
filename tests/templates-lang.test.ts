import { describe, expect, it } from 'vitest';
import { JURISDICTIONS, SKELETONS, filterBlocksLang, parseBlocks } from '../src/lib/templates';
import { bailDraftSrc } from '../src/lib/clerk-draft';
import { extractCaseMeta } from '../src/lib/clerk-extract';

const hasHi = (text: string) => /[\u0900-\u097F]/.test(text);

describe('single-language template insertion', () => {
  it('court headers insert ONLY the chosen language', () => {
    for (const j of JURISDICTIONS) {
      const en = filterBlocksLang(parseBlocks(j.en), 'en');
      const hi = filterBlocksLang(parseBlocks(j.hi), 'hi');
      expect(en.length).toBeGreaterThan(0);
      expect(hi.length).toBeGreaterThan(0);
      expect(en.some((b) => hasHi(b.text))).toBe(false);
      expect(hi.every((b) => hasHi(b.text) || !/[A-Za-z]{2,}/.test(b.text))).toBe(true);
    }
  });

  it('every skeleton bifurcates cleanly into English-only and Hindi-only', () => {
    for (const sk of SKELETONS) {
      const en = filterBlocksLang(parseBlocks(sk.body), 'en');
      const hi = filterBlocksLang(parseBlocks(sk.body), 'hi');
      // English output must contain no Devanagari at all…
      expect(en.some((b) => hasHi(b.text)), `${sk.id} leaks Hindi into EN`).toBe(false);
      // …and Hindi output must not contain English-only prose lines
      const enOnly = hi.filter((b) => !hasHi(b.text) && /[A-Za-z]{3,}/.test(b.text) && !/^[\s{{}}\w\d.,:/()-]*$/.test(b.text.replace(/{{\w+}}/g, '')));
      expect(enOnly.map((b) => b.text), `${sk.id} leaks English into HI`).toEqual([]);
      // both sides still produce a usable document
      expect(en.length + hi.length).toBeGreaterThan(0);
    }
  });

  it('language-neutral lines (variables, numbers, symbols) survive both filters', () => {
    const blocks = parseBlocks('C:{{client_name}}\nC:204/2025\nC:____ · 20__');
    expect(filterBlocksLang(blocks, 'en').length).toBe(3);
    expect(filterBlocksLang(blocks, 'hi').length).toBe(3);
  });

  it('clerk bail draft header is single-language too', () => {
    const meta = extractCaseMeta('IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, JAIPUR — FIR No. 1/2024');
    const en = filterBlocksLang(parseBlocks(bailDraftSrc(meta, 'jm', 'en')), 'en');
    const hi = filterBlocksLang(parseBlocks(bailDraftSrc(meta, 'jm', 'hi')), 'hi');
    expect(en.some((b) => hasHi(b.text))).toBe(false);
    expect(hi.some((b) => /IN THE COURT/i.test(b.text))).toBe(false);
  });
});
