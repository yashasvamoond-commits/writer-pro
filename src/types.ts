export type PageSize = 'A4' | 'LEGAL' | 'LETTER' | 'CUSTOM';
export type Align = 'left' | 'center' | 'right' | 'justify';

export interface PageSettings {
  pageSize: PageSize;
  lineHeight: number;
  fontSizePt: number; // court standard: 14
  marginL: number; // inches — 1.75 for stitching
  marginR: number;
  marginT: number;
  marginB: number;
  fontHi: string; // FontDef id (Hindi/Devanagari)
  fontEn: string; // FontDef id (English/Latin)
  grammar: boolean;
  uiLang: 'en' | 'hi'; // dedicated software-language switch (never parallel)
  headerText: string;
  footerText: string;
  columns: 1 | 2 | 3;
  watermark: string;
  pageNumbers: boolean;
  customWIn: number;
  customHIn: number;
  defaultAlign: Align;
  spacingBefore: number; // pt before each paragraph
  spacingAfter: number;  // pt after each paragraph
  firstPageDifferent: boolean; // hide header on first page
  guides: boolean;
  spellcheck: boolean;
}

export const DEFAULT_SETTINGS: PageSettings = {
  pageSize: 'A4',
  lineHeight: 1.5,
  fontSizePt: 14,
  marginL: 1.75,
  marginR: 1.0,
  marginT: 1.0,
  marginB: 1.0,
  fontHi: 'mukta',
  fontEn: 'tinos',
  grammar: true,
  uiLang: 'en',
  headerText: '',
  footerText: '',
  columns: 1,
  watermark: '',
  pageNumbers: true,
  customWIn: 8.27,
  customHIn: 11.69,
  defaultAlign: 'left',
  spacingBefore: 0,
  spacingAfter: 8,
  firstPageDifferent: false,
  guides: true,
  spellcheck: true,
};

export interface TextBox {
  id: string;
  xPct: number; // % of sheet width
  yPct: number; // % of sheet height
  wPct: number;
  hPx: number;
  text: string;
  sizePt: number;
  align: 'left' | 'center' | 'right';
  lang: 'hi' | 'en';
}

export interface DocRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** TipTap document JSON */
  content: unknown;
  settings: PageSettings;
  variables: Record<string, string>;
  textBoxes?: TextBox[];
}

export interface CaseInfo {
  cino: string;
  caseNo: string;
  regYear: number;
  type: string;
  typeHi: string;
  court: string;
  courtHi: string;
  district: string;
  petitioner: string;
  petitionerHi: string;
  respondent: string;
  respondentHi: string;
  nextDate: string;
  lastDate: string;
  purpose: string;
  purposeHi: string;
}
