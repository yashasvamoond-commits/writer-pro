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
