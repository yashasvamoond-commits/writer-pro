import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LineRuleType, Packer, Paragraph, TextRun,
} from 'docx';
import type { JSONContent } from '@tiptap/core';
import { DocRecord } from '../types';
import { numberingPrefixes } from '../editor/insert';

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
  left: AlignmentType.LEFT,
};

function csFont(doc: DocRecord): string {
  return doc.settings.fontHi === 'aparajita' ? 'Aparajita' : 'Mangal';
}

function runsOf(node: JSONContent, doc: DocRecord, prefix = ''): TextRun[] {
  const s = doc.settings;
  const base = {
    size: s.fontSizePt * 2,
    font: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: csFont(doc), eastAsia: csFont(doc) },
  };
  const runs: TextRun[] = [];
  if (prefix) runs.push(new TextRun({ text: prefix, bold: true, ...base }));
  for (const child of node.content || []) {
    if (child.type === 'text') {
      runs.push(
        new TextRun({
          text: child.text || '',
          bold: child.marks?.some((m) => m.type === 'bold'),
          italics: child.marks?.some((m) => m.type === 'italic'),
          underline: child.marks?.some((m) => m.type === 'underline') ? {} : undefined,
          ...base,
        }),
      );
    } else if (child.type === 'varChip') {
      runs.push(new TextRun({ text: child.attrs?.text || `{{${child.attrs?.key}}}`, ...base }));
    } else if (child.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1, ...base }));
    }
  }
  if (!runs.length) runs.push(new TextRun({ text: '', ...base }));
  return runs;
}

function blockToParagraphs(node: JSONContent, doc: DocRecord, prefix: string): Paragraph[] {
  const s = doc.settings;
  const spacing = { line: Math.round(s.lineHeight * 240), lineRule: LineRuleType.AUTO };
  const align = ALIGN[(node.attrs?.textAlign as string) || 'left'] || AlignmentType.LEFT;
  const common = { spacing, alignment: align };
  switch (node.type) {
    case 'heading': {
      const lvl = (node.attrs?.level as 1 | 2 | 3) || 2;
      return [
        new Paragraph({
          ...common,
          heading: lvl === 1 ? HeadingLevel.HEADING_1 : lvl === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          children: runsOf(node, doc, prefix),
        }),
      ];
    }
    case 'horizontalRule':
      return [
        new Paragraph({
          spacing,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
          children: [],
        }),
      ];
    case 'bulletList':
      return (node.content || []).flatMap((li, i) =>
        (li.content || []).map((p) => new Paragraph({ ...common, children: runsOf(p, doc, `${i + 1}. `) })),
      );
    case 'orderedList':
      return (node.content || []).flatMap((li, i) =>
        (li.content || []).map((p) => new Paragraph({ ...common, children: runsOf(p, doc, `${i + 1}. `) })),
      );
    case 'blockquote':
      return (node.content || []).map(
        (p) => new Paragraph({ ...common, indent: { left: 720 }, children: runsOf(p, doc) }),
      );
    default:
      return [new Paragraph({ ...common, children: runsOf(node, doc, prefix) })];
  }
}

/** Clean, Word/LibreOffice-compatible DOCX with court page geometry. */
export async function exportDocx(doc: DocRecord, json: JSONContent): Promise<Blob> {
  const s = doc.settings;
  const prefixes = numberingPrefixes(json);
  const children: Paragraph[] = [];
  (json.content || []).forEach((node, i) => {
    children.push(...blockToParagraphs(node, doc, prefixes[i] || ''));
  });
  const size =
    s.pageSize === 'A4' ? { width: 11906, height: 16838 } : { width: 12240, height: 20160 };
  const margin = {
    top: Math.round(s.marginT * 1440),
    right: Math.round(s.marginR * 1440),
    bottom: Math.round(s.marginB * 1440),
    left: Math.round(s.marginL * 1440),
  };
  const document = new Document({
    creator: 'Writer Pro Legal Drafter',
    title: doc.title,
    description: 'Court-ready pleading exported offline from Writer Pro',
    sections: [{ properties: { page: { size, margin } }, children }],
    styles: {
      default: {
        document: { run: { size: s.fontSizePt * 2, font: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: csFont(doc), eastAsia: csFont(doc) } } },
        heading1: { run: { size: (s.fontSizePt + 2) * 2, bold: true, font: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: csFont(doc), eastAsia: csFont(doc) } } },
        heading2: { run: { size: (s.fontSizePt + 1) * 2, bold: true, font: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: csFont(doc), eastAsia: csFont(doc) } } },
        heading3: { run: { size: s.fontSizePt * 2, bold: true, font: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: csFont(doc), eastAsia: csFont(doc) } } },
      },
    },
  });
  return Packer.toBlob(document);
}
