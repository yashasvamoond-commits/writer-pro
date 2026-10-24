/**
 * Smart clerk engine — 100% offline file reading & conversion.
 *
 *  • reads PDF (text layer, or OCR via bundled tessdata when scanned)
 *  • reads DOCX (word/document.xml + headers/footers via JSZip)
 *  • converts PDF ⇄ DOCX / TXT / HTML / PNG-zip, DOCX → PDF (print engine),
 *    TXT/HTML/images → PDF (print engine), images → OCR text
 * Nothing is uploaded anywhere — pdfjs, JSZip, tesseract.js and the docx
 * builder all run on the tablet itself.
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import Tesseract from 'tesseract.js';
import {
  AlignmentType, Document, LineRuleType, Packer, PageBreak, Paragraph, TextRun,
} from 'docx';
import { classifyText, ClassifyResult } from './court-classify';

GlobalWorkerOptions.workerSrc = workerSrc;

export type FileKind = 'pdf' | 'docx' | 'doc' | 'txt' | 'html' | 'image' | 'other';

export function kindOf(name: string): FileKind {
  const ext = name.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (['txt', 'md', 'rtf'].includes(ext)) return 'txt';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) return 'image';
  return 'other';
}

export interface ReadResult {
  text: string;
  ocr: boolean;
  note?: 'legacy-doc' | 'empty';
  cls: ClassifyResult;
}

/* ------------------------------------------------------------------ */
/* PDF                                                                  */
/* ------------------------------------------------------------------ */
async function openPdf(data: ArrayBuffer) {
  return getDocument({ data }).promise;
}

export async function extractPdfText(file: File, maxPages = 12): Promise<string> {
  const pdf = await openPdf(await file.arrayBuffer());
  const out: string[] = [];
  const pages = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out.push(tc.items.map((it) => ('str' in it ? (it as TextItem).str : '')).join(' '));
  }
  return out.join('\n');
}

/** Render scanned PDF pages to images and OCR them (hin+eng, bundled tessdata). */
export async function ocrPdf(file: File, maxPages = 6, onProgress?: (p: number) => void): Promise<string> {
  const pdf = await openPdf(await file.arrayBuffer());
  const pages = Math.min(pdf.numPages, maxPages);
  const out: string[] = [];
  for (let i = 1; i <= pages; i++) {
    onProgress?.(i / pages);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
    const res = await Tesseract.recognize(canvas.toDataURL('image/png'), 'hin+eng', {
      langPath: `${import.meta.env.BASE_URL}tessdata`.replace(/\/$/, ''),
      gzip: true,
      logger: () => undefined,
    });
    out.push((res.data as unknown as { text: string }).text);
  }
  return out.join('\n');
}

export async function ocrImage(file: File): Promise<string> {
  const res = await Tesseract.recognize(file, 'hin+eng', {
    langPath: `${import.meta.env.BASE_URL}tessdata`.replace(/\/$/, ''),
    gzip: true,
    logger: () => undefined,
  });
  return (res.data as unknown as { text: string }).text;
}

/* ------------------------------------------------------------------ */
/* DOCX / plain text                                                    */
/* ------------------------------------------------------------------ */
function xmlToText(xml: string): string {
  return xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

export async function extractDocxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files).filter(
    (n) => n === 'word/document.xml' || /^word\/(header|footer)\d*\.xml$/.test(n),
  );
  const parts: string[] = [];
  for (const n of names) parts.push(xmlToText(await zip.files[n].async('string')));
  return parts.join('\n');
}

/** Lightweight but faithful DOCX → HTML (paragraph styles, bold/italic/underline, alignment, headings). */
export async function docxToHtmlString(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.files['word/document.xml']?.async('string');
  if (!xml) return '';
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  const paras = dom.getElementsByTagName('w:p');
  const out: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    const jc = p.getElementsByTagName('w:jc')[0]?.getAttribute('w:val') || '';
    const style = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') || '';
    let html = '';
    const runs = p.getElementsByTagName('w:r');
    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      const rPr = run.getElementsByTagName('w:rPr')[0];
      const bold = !!rPr?.getElementsByTagName('w:b')[0];
      const ital = !!rPr?.getElementsByTagName('w:i')[0];
      const undl = !!rPr?.getElementsByTagName('w:u')[0];
      const ts = run.getElementsByTagName('w:t');
      let txt = '';
      for (let k = 0; k < ts.length; k++) txt += ts[k].textContent || '';
      txt = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      if (!txt) continue;
      if (bold) txt = `<b>${txt}</b>`;
      if (ital) txt = `<i>${txt}</i>`;
      if (undl) txt = `<u>${txt}</u>`;
      html += txt;
    }
    const align = jc === 'center' ? 'center' : jc === 'right' ? 'right' : jc === 'both' ? 'justify' : '';
    const hm = style.match(/Heading(\d)/i);
    const tag = hm ? `h${Math.min(6, Number(hm[1]))}` : 'p';
    out.push(`<${tag}${align ? ` style="text-align:${align}"` : ''}>${html || '&nbsp;'}</${tag}>`);
  }
  return out.join('\n');
}

export async function readFileSmart(file: File, onProgress?: (p: number) => void): Promise<ReadResult> {
  const kind = kindOf(file.name);
  try {
    if (kind === 'pdf') {
      let text = await extractPdfText(file);
      let ocr = false;
      if (text.replace(/\s+/g, '').length < 40) {
        text = await ocrPdf(file, 6, onProgress); // scanned → offline OCR
        ocr = true;
      }
      const cls = classifyText(text);
      return { text, ocr, cls, note: text.trim() ? undefined : 'empty' };
    }
    if (kind === 'docx') {
      const text = await extractDocxText(file);
      return { text, ocr: false, cls: classifyText(text), note: text.trim() ? undefined : 'empty' };
    }
    if (kind === 'doc') {
      // Legacy binary .doc cannot be parsed in-browser; only the name is evidence.
      return { text: '', ocr: false, cls: classifyText(file.name.replace(/\.[^.]+$/, ' ')), note: 'legacy-doc' };
    }
    if (kind === 'image') {
      const text = await ocrImage(file);
      return { text, ocr: true, cls: classifyText(text), note: text.trim() ? undefined : 'empty' };
    }
    if (kind === 'txt' || kind === 'html') {
      const text = await file.text();
      return { text, ocr: false, cls: classifyText(text) };
    }
  } catch {
    /* fall through */
  }
  return { text: '', ocr: false, cls: classifyText(file.name.replace(/\.[^.]+$/, ' ')), note: 'legacy-doc' };
}

/* ------------------------------------------------------------------ */
/* Conversions                                                          */
/* ------------------------------------------------------------------ */
const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

/** PDF → DOCX keeping font sizes, alignment and page breaks as found in the PDF. */
export async function pdfToDocx(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  const pdf = await openPdf(await file.arrayBuffer());
  const kids: Paragraph[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i / pdf.numPages);
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((it): it is TextItem => 'str' in it && !!(it as TextItem).str.trim());

    // cluster items into lines by y coordinate
    const lines: TextItem[][] = [];
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      const line = lines.find((l) => Math.abs(Math.round(l[0].transform[5]) - y) <= 2);
      if (line) line.push(it); else lines.push([it]);
    }
    lines.sort((a, b) => b[0].transform[5] - a[0].transform[5]);

    for (const line of lines) {
      line.sort((a, b) => a.transform[4] - b.transform[4]);
      const left = line[0].transform[4];
      const right = Math.max(...line.map((it) => it.transform[4] + it.width));
      const leftGap = left;
      const rightGap = vp.width - right;
      const align = Math.abs(leftGap - rightGap) < 30 ? AlignmentType.CENTER
        : rightGap < 60 && leftGap > 110 ? AlignmentType.RIGHT
        : AlignmentType.LEFT;
      const runs: TextRun[] = [];
      for (const it of line) {
        const sizeHp = Math.max(10, Math.round((it.height || 11) * 2));
        runs.push(new TextRun({
          text: it.str,
          bold: /bold/i.test(String(it.fontName || '')),
          size: sizeHp,
        }));
      }
      kids.push(new Paragraph({ alignment: align, spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 40 }, children: runs }));
    }
    if (i < pdf.numPages) kids.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // scanned PDF → OCR route
  if (!kids.length) {
    const text = await ocrPdf(file, 10, onProgress);
    for (const para of text.split(/\n{1,}/)) {
      kids.push(new Paragraph({ spacing: { line: 276, lineRule: LineRuleType.AUTO }, children: [new TextRun({ text: para, size: 24 })] }));
    }
  }

  const doc = new Document({
    creator: 'Writer Pro Smart Clerk',
    title: baseName(file.name),
    sections: [{ properties: {}, children: kids.length ? kids : [new Paragraph({ children: [new TextRun('')] })] }],
  });
  return Packer.toBlob(doc);
}

export async function pdfToTxt(file: File): Promise<string> {
  let text = await extractPdfText(file, 999);
  if (text.replace(/\s+/g, '').length < 40) text = await ocrPdf(file, 10);
  return text;
}

export async function pdfToHtml(file: File): Promise<string> {
  const text = await pdfToTxt(file);
  const body = text.split('\n').map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || '&nbsp;'}</p>`).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${baseName(file.name)}</title>
<style>body{font-family:'Times New Roman',serif;max-width:800px;margin:24px auto;line-height:1.5;padding:0 12px}p{margin:0 0 6px}</style>
</head><body>\n${body}\n</body></html>`;
}

export async function pdfToPngZip(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  const pdf = await openPdf(await file.arrayBuffer());
  const zip = new JSZip();
  const pages = Math.min(pdf.numPages, 40);
  for (let i = 1; i <= pages; i++) {
    onProgress?.(i / pages);
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport: vp } as never).promise;
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    zip.file(`page-${String(i).padStart(3, '0')}.png`, blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function docxToTxt(file: File): Promise<string> {
  return extractDocxText(file);
}

export async function txtToDocx(text: string, title: string): Promise<Blob> {
  const kids = text.split('\n').map((line) => new Paragraph({
    spacing: { line: 276, lineRule: LineRuleType.AUTO },
    children: [new TextRun({ text: line || '', size: 24 })],
  }));
  const doc = new Document({
    creator: 'Writer Pro Smart Clerk', title,
    sections: [{ properties: {}, children: kids.length ? kids : [new Paragraph({ children: [new TextRun('')] })] }],
  });
  return Packer.toBlob(doc);
}

/* ------------------------------------------------------------------ */
/* Conversion matrix                                                    */
/* ------------------------------------------------------------------ */
export type Target = 'pdf' | 'docx' | 'txt' | 'html' | 'png';

export function targetsFor(kind: FileKind): Target[] {
  switch (kind) {
    case 'pdf': return ['docx', 'txt', 'html', 'png'];
    case 'docx': return ['pdf', 'txt', 'html'];
    case 'txt': case 'html': return ['pdf', 'docx'];
    case 'image': return ['pdf', 'docx', 'txt'];
    default: return [];
  }
}

export const TARGET_LABEL: Record<Target, string> = {
  pdf: 'PDF (print)', docx: 'Word .docx', txt: 'Plain .txt', html: 'Web .html', png: 'PNG pages (zip)',
};
