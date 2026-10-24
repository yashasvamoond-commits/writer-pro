import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, FootnoteReferenceRun,
  Header, HeadingLevel, ImageRun, LineRuleType, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
} from 'docx';
import type { JSONContent } from '@tiptap/core';
import { DocRecord } from '../types';
import { numberingPrefixes } from '../editor/insert';
import { FONT_BY_ID } from '../data/fonts';

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
  left: AlignmentType.LEFT,
};

function csFont(doc: DocRecord): string {
  return FONT_BY_ID[doc.settings.fontHi]?.docx ?? 'Mangal';
}
function enFont(doc: DocRecord): string {
  return FONT_BY_ID[doc.settings.fontEn]?.docx ?? 'Times New Roman';
}

function dataUrlToBytes(src: string): { bytes: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null {
  const m = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const t = m[1] === 'png' ? 'png' : m[1] === 'gif' ? 'gif' : m[1] === 'bmp' ? 'bmp' : 'jpg';
  return { bytes, type: t };
}

interface Ctx {
  doc: DocRecord;
  footnotes: Record<string, { children: Paragraph[] }>;
}

function baseRun(ctx: Ctx) {
  const s = ctx.doc.settings;
  return {
    size: s.fontSizePt * 2,
    font: { ascii: enFont(ctx.doc), hAnsi: enFont(ctx.doc), cs: csFont(ctx.doc), eastAsia: csFont(ctx.doc) },
  };
}

function runsOf(node: JSONContent, ctx: Ctx, prefix = ''): (TextRun | ExternalHyperlink | FootnoteReferenceRun | ImageRun)[] {
  const base = baseRun(ctx);
  const runs: (TextRun | ExternalHyperlink | FootnoteReferenceRun | ImageRun)[] = [];
  if (prefix) runs.push(new TextRun({ text: prefix, bold: true, ...base }));
  for (const child of node.content || []) {
    if (child.type === 'text') {
      const href = child.marks?.find((mk) => mk.type === 'link')?.attrs?.href as string | undefined;
      const color = child.marks?.find((mk) => mk.type === 'textStyle')?.attrs?.color as string | undefined;
      const hl = child.marks?.find((mk) => mk.type === 'highlight')?.attrs?.color as string | undefined;
      const run = new TextRun({
        text: child.text || '',
        bold: child.marks?.some((mk) => mk.type === 'bold'),
        italics: child.marks?.some((mk) => mk.type === 'italic'),
        underline: child.marks?.some((mk) => mk.type === 'underline') ? {} : undefined,
        superScript: child.marks?.some((mk) => mk.type === 'superscript'),
        subScript: child.marks?.some((mk) => mk.type === 'subscript'),
        color: color ? String(color).replace('#', '') : undefined,
        shading: hl ? { type: ShadingType.CLEAR, fill: String(hl).replace('#', '') } : undefined,
        ...base,
      });
      runs.push(href ? new ExternalHyperlink({ children: [run], link: href }) : run);
    } else if (child.type === 'varChip') {
      runs.push(new TextRun({ text: child.attrs?.text || `{{${child.attrs?.key}}}`, ...base }));
    } else if (child.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1, ...base }));
    } else if (child.type === 'fnRef') {
      const n = Number(child.attrs?.n || 1);
      ctx.footnotes[n] = { children: [new Paragraph({ children: [new TextRun({ text: child.attrs?.text || '', ...base })] })] };
      runs.push(new FootnoteReferenceRun(n));
    } else if (child.type === 'image') {
      const img = dataUrlToBytes(String(child.attrs?.src || ''));
      if (img) runs.push(new ImageRun({ data: img.bytes as unknown as Buffer, type: img.type, transformation: { width: 420, height: 300 } }));
    }
  }
  if (!runs.length) runs.push(new TextRun({ text: '', ...base }));
  return runs;
}

function blockToParagraphs(node: JSONContent, ctx: Ctx, prefix: string): (Paragraph | Table)[] {
  const s = ctx.doc.settings;
  const spacing = {
    line: Math.round(s.lineHeight * 240), lineRule: LineRuleType.AUTO,
    before: Math.round((s.spacingBefore ?? 0) * 20), after: Math.round((s.spacingAfter ?? 0) * 20),
  };
  const align = ALIGN[(node.attrs?.textAlign as string) || s.defaultAlign || 'left'] || AlignmentType.LEFT;
  const common = { spacing, alignment: align };
  switch (node.type) {
    case 'heading': {
      const lvl = (node.attrs?.level as 1 | 2 | 3) || 2;
      return [
        new Paragraph({
          ...common,
          heading: lvl === 1 ? HeadingLevel.HEADING_1 : lvl === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          children: runsOf(node, ctx, prefix) as TextRun[],
        }),
      ];
    }
    case 'horizontalRule':
      return [new Paragraph({ spacing, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } }, children: [] })];
    case 'table': {
      const rows = (node.content || []).map((row) =>
        new TableRow({
          children: (row.content || []).map(
            (cell) =>
              new TableCell({
                children: (cell.content || []).map(
                  (p) => new Paragraph({ spacing, children: runsOf(p, ctx) as TextRun[] }),
                ),
              }),
          ),
        }),
      );
      return [new Table({ rows, width: { size: 100, type: 'pct' as never } })];
    }
    case 'bulletList':
    case 'orderedList':
      return (node.content || []).flatMap((li, i) =>
        (li.content || []).map((p) => new Paragraph({ ...common, children: runsOf(p, ctx, `${i + 1}. `) as TextRun[] })),
      );
    case 'blockquote':
      return (node.content || []).map((p) => new Paragraph({ ...common, indent: { left: 720 }, children: runsOf(p, ctx) as TextRun[] }));
    default: {
      const ind = Number(node.attrs?.indent || 0);
      return [new Paragraph({ ...common, indent: ind ? { left: ind * 360 } : undefined, children: runsOf(node, ctx, prefix) as TextRun[] })];
    }
  }
}

/** Clean, Word/LibreOffice-compatible DOCX with court page geometry. */
export async function exportDocx(doc: DocRecord, json: JSONContent): Promise<Blob> {
  const s = doc.settings;
  const prefixes = numberingPrefixes(json);
  const ctx: Ctx = { doc, footnotes: {} };
  const children: (Paragraph | Table)[] = [];
  (json.content || []).forEach((node, i) => {
    children.push(...blockToParagraphs(node, ctx, prefixes[i] || ''));
  });
  const size =
    s.pageSize === 'A4' ? { width: 11906, height: 16838 } :
    s.pageSize === 'LETTER' ? { width: 12240, height: 15840 } :
    s.pageSize === 'CUSTOM' ? { width: Math.round(s.customWIn * 1440), height: Math.round(s.customHIn * 1440) } :
    { width: 12240, height: 20160 };
  const margin = {
    top: Math.round(s.marginT * 1440),
    right: Math.round(s.marginR * 1440),
    bottom: Math.round(s.marginB * 1440),
    left: Math.round(s.marginL * 1440),
  };
  const runFont = { ascii: enFont(doc), hAnsi: enFont(doc), cs: csFont(doc), eastAsia: csFont(doc) };
  // Free text boxes → bordered paragraphs at the end (docx has no absolute-position support)
  for (const b of doc.textBoxes || []) {
    if (!b.text.trim()) continue;
    children.push(new Paragraph({
      spacing: { line: Math.round(s.lineHeight * 240), lineRule: LineRuleType.AUTO },
      alignment: ALIGN[b.align] || AlignmentType.LEFT,
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: '444444', space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '444444', space: 4 },
        left: { style: BorderStyle.SINGLE, size: 6, color: '444444', space: 4 },
        right: { style: BorderStyle.SINGLE, size: 6, color: '444444', space: 4 },
      },
      children: [new TextRun({ text: b.text, size: b.sizePt * 2, font: runFont })],
    }));
  }
  const footerKids: Paragraph[] = [];
  if (s.footerText) footerKids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.footerText, size: s.fontSizePt * 2 - 4, font: runFont })] }));
  if (s.pageNumbers !== false) footerKids.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: s.fontSizePt * 2 - 4, font: runFont })],
  }));
  const document = new Document({
    creator: 'Writer Pro Legal Drafter',
    title: doc.title,
    description: 'Court-ready pleading exported offline from Writer Pro',
    footnotes: ctx.footnotes,
    sections: [
      {
        properties: {
          page: { size, margin },
          titlePage: !!s.firstPageDifferent,
          column: s.columns && s.columns > 1 ? { count: s.columns, space: 720 } : undefined,
        },
        headers: s.headerText
          ? {
              default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: s.headerText, size: s.fontSizePt * 2 - 4, font: runFont })] })] }),
              first: s.firstPageDifferent ? new Header({ children: [new Paragraph({ children: [] })] }) : undefined,
            }
          : undefined,
        footers: footerKids.length ? { default: new Footer({ children: footerKids }) } : undefined,
        children,
      },
    ],
    styles: {
      default: {
        document: { run: { size: s.fontSizePt * 2, font: runFont } },
        heading1: { run: { size: (s.fontSizePt + 2) * 2, bold: true, font: runFont } },
        heading2: { run: { size: (s.fontSizePt + 1) * 2, bold: true, font: runFont } },
        heading3: { run: { size: s.fontSizePt * 2, bold: true, font: runFont } },
      },
    },
  });
  return Packer.toBlob(document);
}
