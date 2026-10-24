# Writer Pro — Legal Drafter

Offline-first, bilingual (हिन्दी / English) word-processor for Indian trial-court
advocates (District Courts, JMIC, Civil & Revenue Courts). Replaces Microsoft
Word's bloat with native support for court-compliant formatting, legacy font
conversion and automated pleading structures.

```
npm install
npm run dev        # develop at http://localhost:5173
npm run build      # type-check + production bundle (dist/)
npm run preview    # serve the production build
npm test           # Kruti Dev engine round-trip & detection tests
```

Android APK packaging (Capacitor): see [`docs/APK-BUILD.md`](docs/APK-BUILD.md).

## Feature map (spec → implementation)

| Spec requirement | Where |
| --- | --- |
| Hindi/English coexistence, no matra/line-height jitter | `src/editor/Editor.tsx` (per-paragraph `data-lang`, absolute-px line boxes) + offline **font library** (`src/data/fonts.ts`): Mukta, Hind, Noto Sans/Serif Devanagari, Martel, Yantra Manav, Rozha One + Tinos/EB Garamond/Lora, plus Mangal/Aparajita system stacks |
| Kruti Dev ⇄ Unicode, one-tap, selection or whole doc | `src/lib/krutidev.ts` + `src/data/kruti-pairs.ts` (forward engine: BharatType MIT; inverse engine built here), toolbar `क⇄U` buttons |
| Auto-detect pasted Kruti Dev + prompt | `detectKrutiDev()` paste interceptor → “Convert Kruti Dev to Unicode?” modal (`src/ui/Overlays.tsx`) |
| Court font presets (14 pt, 1.5/2.0 spacing, 1.75"/1"/1"/1" margins) | Toolbar presets, `src/types.ts` defaults, `--fs/--lh/--m*` CSS vars; per-document font choice in the Fonts panel, mapped to court-PC names in DOCX |
| Bilingual legal dictionaries + autocomplete | `src/data/legal-dictionary.ts` (maxims, Hindi/Urdu revenue & procedural terms, BNS/BNSS/BSA/CPC/NI Act/RTA phrasing), autocomplete popup in editor |
| Spell-check that never flags statutory language | `SpellCheckPlugin` (offline whitelist + code-split EN wordlist), red-squiggle decorations |
| Jurisdiction blocks (JMIC/ADSJ/SDM Bhadra…) | `JURISDICTIONS` in `src/lib/templates.ts`, Templates panel |
| Cause-title generator, memo of parties | `CauseTitleModal` (bilingual, case-no placeholders) |
| Pleading skeleton library (bail, AB, superdari, 205/317, 138 NI, O39 R1&2, S151, RTA, injunction, affidavit, jawab) | `SKELETONS` in `src/lib/templates.ts` (Hindi style modelled on filed Rajasthan drafts) |
| Smart variable sidebar (client, PS, FIR, sections, date…) | `VarChip` node + Variables panel; values propagate to every chip |
| Stitching/margin lock guides | `.sheet.guides` overlay + 1.75" stitching rule |
| Indian paragraph hierarchy 1. / (a) / (i) | `data-plev` attrs + CSS counters; same numbering recomputed for exports (`numberingPrefixes`) |
| One-tap verification/affidavit/ID certificate | Bottom sheet (`BottomSheet`), stamp spaces included |
| Index / list of dates / exhibits P-1, D-1, A-1 | Index panel generators (`indexBlocks`, `datesEventsBlocks`) |
| Clean DOCX export | `src/lib/docx.ts` (page size, twips margins, 1.5/2.0 line spacing, Times + Mangal/Aparajita complex-script fonts) |
| Searchable court-ready PDF (A4/Legal, embedded fonts, margins) | Print engine: dynamic `@page` rule + print CSS (`src/lib/print.ts`) — platform renderer shapes Devanagari and embeds fonts |
| Direct thermal/laser printing (Wi-Fi / USB-OTG) | Android PrintManager via WebView print; see APK-BUILD.md |
| Completely offline | Service worker (`public/sw.js`), bundled fonts/dicts/tables, localStorage drafts, zero runtime network calls |
| Clean grouped UI: collapsible panel with close button + edge handle, File/Convert/View/Insert menus |
| My-cases register (myCases.txt) | `src/lib/cases.ts` parser + Cases panel (next-date sorted, one-tap cause titles) — sample at `docs/sample-mycases.json` |

## Fix (v10.1 — single-language template insertion)

- Templates, court headers, cause titles, verification/affidavit blocks and clerk-generated drafts are authored bilingual internally; **insertion now keeps ONLY the lines of the active software language** (EN switch → English lines only; हिं switch → Hindi lines only). Language-neutral lines (numbers, `{{variable}}` chips, symbols) survive in both. Regression tests walk all 22 skeletons + all 5 court headers asserting zero leakage either way.

## Feature highlights (v10 — timelines, draft generation, WhatsApp summaries)

- **🕒 Case-wise timeline** — a third clerk view groups the register into *cases* (by case no, else FIR no, per court) and lays every date of the case out in order on a colour-coded timeline: FIR registered · incident · arrest · filed/charge-sheet · hearing · decided · bail matters. Labels come from the words surrounding each date (English + Hindi), nearest-keyword wins.
- **✍ Draft generation from metadata** — one tap on a case turns what the clerk read out of the FIR/challan into a **court-ready bail application**: the correct court header for the classified court (or a fill-in header for Miscellaneous), parties, case no, FIR no + registration date, police station, sections, arrest/incident/charge-sheet dates, prayer, place/date and an affidavit — English or Hindi per the language switch. Anything the documents didn't reveal stays as a smart-variable chip to fill once.
- **📤 WhatsApp-ready share summary** — per case: `⚖ *CASE SUMMARY — JM*`, parties, case no, FIR·PS, sections, doc type, **next hearing in bold**, decided date, notes and file list, formatted with WhatsApp `*bold*` markers. Uses the Android share sheet when available, otherwise copies to clipboard ready to paste.

## Feature highlights (v9 — the complete paralegal workbench)

- **👥 Party-wise view** — every file of one client grouped together (client extracted from "X vs Y" / "X वनाम Y" titles, grouped case-insensitively; falls back to advocate name).
- **📦 Filing bundles** — one tap zips a court's selected documents into `JM/ ACJM/ ADJ/ SDM/ AECM/ Misc` folders **with an auto-generated INDEX.docx + INDEX.csv** (parties, case no, FIR/PS, sections, type, next date, notes); "Bundle all" does every court at once. Works even after restart as an index-only bundle.
- **🔔 Android hearing reminders** — real local notifications (no server): for every ledger date within 60 days the clerk schedules **8 pm the evening before** and **9 am on the day** ("आज सुनवाई · Hearing TODAY"), re-synced on each tap; permission requested at runtime.
- **📝 Clerk notes** — attach a note to any file (persists in the register, survives re-scans, appears in CSV/Word exports and bundles).
- **Tap-to-copy** — parties, case no and FIR no copy to clipboard on tap (agenda rows too).
- **Court stats** — each court header shows pending · decided · ⏰ upcoming-dated counts.

## Feature highlights (v8 — Clerk becomes a paralegal)

- **Case intelligence per file** — the clerk now reads out of every document: **case number, FIR number, police station, sections** (IPC/BNS/CrPC/BNSS/NDPS…), **parties (X vs Y)**, **document type** (charge-sheet, bail, judgment, FIR copy, complaint, affidavit, vakalatnama, petition, summons, warrant, reply, order, application), **advocate name**, **next hearing date** and **decided date** — English and Hindi patterns, OCR'd scans included.
- **📅 Agenda** — upcoming hearing dates from everything ever scanned: TODAY highlighted red, ≤3 days amber, ≤7 days gold, next 30 days listed.
- **Persistent court-wise ledger (register)** — every scan adds case no / FIR / parties / next date to the ledger, surviving app restarts; searchable.
- **Register export** — one-tap **CSV** (Excel-ready, with BOM) and a formatted **Word register** with a table per court.
- **🔍 Search** across file names, case numbers, FIR numbers, parties, sections and doc types.
- **✍ Open as draft** — push any read/OCR'd file's text straight into the editor and start drafting on it.

## Feature highlights (v7 — Smart Clerk: court sorter + all-in-one converter)

- **🧑‍⚖ Smart clerk** (first sidebar tab): select files **or a whole folder** from the tablet — every PDF / Word / text / image document is read **on-device** and filed automatically by the court heading written inside it:
  **JM · ACJM · ADJ · SDM · AECM**, and a **Miscellaneous** group created *only* for files that carry no court heading at all.
  - Scanned PDFs & photos go through the bundled offline OCR (hin+eng) before classification.
  - Each file shows the matched heading snippet + confidence, and the OCR badge when it had to be scanned.
  - A persistent **scan ledger** remembers what was found (Android security doesn't allow keeping file access across restarts — re-select to convert).
- **All-in-one converter** (per file, one tap, offline, format preserved as faithfully as the format allows):
  - PDF → **Word .docx** (font sizes, alignment & page breaks carried over; scanned PDFs OCR'd into Word), PDF → TXT / HTML / **PNG pages (zip)**
  - Word → **PDF** (docx-preview render + print engine “Save as PDF”), Word → TXT / HTML (bold, italic, underline, alignment, headings kept)
  - TXT / HTML → PDF or Word · Images → PDF, OCR-Word, OCR-TXT

## Feature highlights (v6 — proper Page Setup dialog)

- **📐 Page setup dialog** (View ▸ Page setup) with four tabs:
  - **Paper & margins** — A4 / Legal / Letter / **custom size in inches**; every margin individually adjustable with −/＋ steppers (0–4″, 0.25″ steps) plus Court / Normal / Narrow / Wide presets.
  - **Spacing & columns** — line spacing 1.0–3.0, paragraph spacing before/after (pt), 1–3 columns.
  - **Alignment** — default alignment for new paragraphs (left/center/right/justify) and one-tap *apply to whole document*.
  - **Header / footer** — header & footer text, watermark, footer page numbers, and **“header not on first page”** (Word-style different first page — hidden on screen/print page 1 and via DOCX `titlePage` first-page header).
- Custom page size flows through screen sheet, print `@page` rule and DOCX section geometry.

## Feature highlights (v5 — free layout & full Word-style toolkit)

- **Free text boxes** — drag anywhere on the page, resize from the corner, per-box font size & alignment; they print exactly where you place them and ride along in DOCX export.
- **Block arrange gutter** — floating ↑ ↓ / duplicate / delete controls next to any paragraph or heading: rearrange the document without cut-paste.
- **Word-style formatting** — paragraph styles (Normal/H1–H3/Quote), 8-level paragraph indent, 7 line-spacing steps, text colour, multi-colour highlight, superscript/subscript, **format painter**.
- **Page layout** — 1/2/3-column flow (screen + DOCX sections), watermark (prints on every page), footer page numbers in DOCX, extended font sizes 10–24 pt.
- **Insert toolbox+** — 44-symbol palette (₹ ॰ । ॥ § ¶ © …), one-click table of contents from headings, today's date.
- **Version history** — snapshots before every export plus manual snapshots (up to 20 per draft), one-tap restore from File ▸ Drafts.

## Feature highlights (v4 — tablet & polish)

- **Tablet / touch-optimised layout**: 44px+ touch targets, wider panels,
  larger type & controls on coarse pointers, no tap-highlight, press feedback.
- **Visual polish**: gradient top bar, animated menus/modals/toasts, softer
  paper sheet with refined shadow, status-bar chips, focus rings, selection.
- **New templates**: standalone सत्यापन / Verification (Hindi + English) and
  Oath Commissioner / Notary certification block with seal spaces.

## Feature highlights (v3)

- **Dedicated language switch** (top-bar EN / हिं): the whole software renders
  fully in ONE language — never a parallel mix.
- **Five court headers** (JM, ACJM, ADJ, SDM, AECM — Hindi + English) always
  inserted right-aligned at the very top of the document.
- **Intensive offline dictionary**: ~1,400 entries (Latin maxims, English legal
  vocabulary, Hindi/Urdu procedural & revenue terms, statutory citations across
  BNS/BNSS/BSA/CPC/CrPC/IPC/NI/TP/Registration/Stamp/Limitation/DV/POCSO/NDPS/
  Rajasthan Tenancy & Land Revenue).
- **Grammar + citation engine** (`src/lib/grammar.ts`): offline rules with
  one-tap fixes; legacy IPC/CrPC citations flagged with BNS/BNSS equivalents.
- **Photo → text OCR** fully offline (bundled hin+eng traineddata, 12 MB) with
  low-confidence word review in the Issues panel.
- **Insert toolbox**: tables, photos/art, hyperlinks, footnotes & note
  references (real DOCX footnotes), repeating header & footer on every printed
  page, find & replace.
- **Status bar**: autosave state, word/para counts, paper & language.

## Notes

- Section citations in templates follow BNSS/BNS/BSA 2023 with legacy CrPC/IPC
  equivalents where practice still uses them; **verify citations before filing**.
- Third-party: `@bharattype/hindi-transliteration` (MIT) for Kruti Dev → Unicode;
  Mukta typeface (SIL OFL) bundled for on-device Devanagari rendering.
- Drafts never leave the device: localStorage + optional `.json` backup export.
