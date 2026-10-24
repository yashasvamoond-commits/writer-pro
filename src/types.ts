export type PageSize = 'A4' | 'LEGAL';

export interface PageSettings {
  pageSize: PageSize;
  lineHeight: 1.5 | 2.0;
  fontSizePt: number; // court standard: 14
  marginL: number; // inches — 1.75 for stitching
  marginR: number;
  marginT: number;
  marginB: number;
  fontHi: string; // FontDef id (Hindi/Devanagari)
  fontEn: string; // FontDef id (English/Latin)
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
  guides: true,
  spellcheck: true,
};

export interface DocRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** TipTap document JSON */
  content: unknown;
  settings: PageSettings;
  variables: Record<string, string>;
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
