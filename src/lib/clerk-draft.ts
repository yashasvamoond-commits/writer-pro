/**
 * Draft generation & share summaries from clerk-extracted case metadata.
 *
 *  • bailDraftSrc() — a court-ready bail application pre-filled from an
 *    FIR / charge-sheet reading: correct court header for the classified
 *    court, FIR no, PS, sections, parties, incident/arrest/chargesheet dates,
 *    affidavit + prayer. Unknown fields stay as {{smart-variable}} chips so
 *    the advocate fills them once in the Variables panel.
 *  • shareSummary() — a WhatsApp-ready case summary (*bold* markers).
 */
import { JURISDICTIONS } from './templates';
import { fmtDate, splitParties, type CaseMeta, type EventKey } from './clerk-extract';
import type { CourtId } from './court-classify';

const COURT_KEY: Record<Exclude<CourtId, 'misc'>, string> = { jm: 'jm', acjm: 'acjm', adj: 'adj', sdm: 'sdm', aecm: 'aecm' };

export function courtHeaderSrc(court: CourtId, lang: 'en' | 'hi'): string {
  if (court !== 'misc') {
    const j = JURISDICTIONS.find((x) => x.id === COURT_KEY[court]);
    if (j) return lang === 'hi' ? j.hi : j.en;
  }
  return lang === 'hi'
    ? 'R:न्यायालय {{court_name}}, {{place}}'
    : 'R:IN THE COURT OF THE {{court_name}}, {{place}}';
}

function evDate(meta: CaseMeta, key: EventKey): string | undefined {
  return meta.events.find((e) => e.key === key)?.iso;
}

/** Vars derived from the file(s) — everything else stays a chip. */
export function varsFromMeta(meta: CaseMeta): Record<string, string> {
  const v: Record<string, string> = {};
  const parties = splitParties(meta.title);
  if (parties.first) v.client_name = parties.first;
  if (parties.second) v.opp_party = parties.second;
  if (meta.firNo) v.fir_no = meta.firNo;
  if (meta.psName) v.ps_name = meta.psName;
  if (meta.sections.length) v.sections = meta.sections.join(', ');
  if (meta.caseNo) v.case_no = meta.caseNo;
  if (meta.advocate) v.advocate_name = meta.advocate;
  return v;
}

/** Full bail application in the template DSL, pre-filled from metadata. */
export function bailDraftSrc(meta: CaseMeta, court: CourtId, lang: 'en' | 'hi'): string {
  const v = varsFromMeta(meta);
  const fir = v.fir_no || '{{fir_no}}';
  const ps = v.ps_name || '{{ps_name}}';
  const sec = v.sections || '{{sections}}';
  const client = v.client_name || '{{client_name}}';
  const firD = evDate(meta, 'fir');
  const incD = evDate(meta, 'incident');
  const arrD = evDate(meta, 'arrest');
  const chgD = evDate(meta, 'charges') || evDate(meta, 'filed');

  const L: string[] = [courtHeaderSrc(court, lang), ''];

  if (lang === 'hi') {
    L.push('C|B:जमानत अर्जी');
    L.push(`C|B:${client} बनाम ${v.opp_party || '{{opp_party}}'}`);
    if (v.case_no) L.push(`C:(प्रकरण क्रमांक ${v.case_no})`);
    L.push('');
    L.push(`P1|J:कि प्रार्थी ${client} एक शांतिप्रिय एवं कानून का पालन करने वाला नागरिक है और उसे प्राथमिकी संख्या ${fir}${firD ? `, दिनांक ${fmtDate(firD)} को पंजीबद्ध` : ''}, थाना ${ps} में धारा ${sec} के अंतर्गत झूठा फँसाया गया है।`);
    if (incD || arrD) {
      L.push(`P1|J:कि प्रचलित घटना दिनांक ${incD ? fmtDate(incD) : '—'} की बताई गई है${arrD ? ` और प्रार्थी को दिनांक ${fmtDate(arrD)} को गिरफ्तार किया गया, जो तब से न्यायिक अभिरक्षा में है` : ''}।`);
    } else {
      L.push('P1|J:कि प्रार्थी घटना के पश्चात् से न्यायिक अभिरक्षा में निरंतर बना हुआ है।');
    }
    L.push(chgD
      ? `P1|J:कि अनुसंधान पूर्ण हो चुका है एवं अभियोग पत्र दिनांक ${fmtDate(chgD)} को प्रस्तुत किया जा चुका है; प्रार्थी से किसी प्रकार की कोई और बरामदगी या पूछताछ अपेक्षित नहीं है।`
      : 'P1|J:कि प्रार्थी से किसी प्रकार की कोई और बरामदगी या पूछताछ अपेक्षित नहीं है।');
    L.push('P1|J:कि प्रार्थी का समाज में गहरा जुड़ाव है एवं कोई आपराधिक इतिहास नहीं है। प्रार्थी न्यायालय द्वारा लगाई जाने वाली समस्त शर्तों का पालन करने तथा विचारण में पूर्ण सहयोग करने का वचन देता है।');
    L.push('P1|J:अतः प्रार्थना है कि प्रार्थी को विचारण लंबित होने के दौरान जमानत पर छोड़ा जाए। न्यायहित में कोई अन्य उचित राहत भी प्रदान की जाए।');
    L.push('');
    L.push('R:स्थान: {{place}}');
    L.push('R:दिनांक: {{date}}');
    L.push('R:प्रार्थी');
    L.push('R:मार्फत अधिवक्ता');
    L.push(`R:${v.advocate_name || '{{advocate_name}}'}`);
    L.push('');
    L.push('B:शपथ पत्र');
    L.push(`J:मैं ${client}, पुत्र {{client_father}}, निवासी {{client_address}}, सत्य प्रतिज्ञा पर बयान करता हूँ कि संलग्न जमानत अर्जी की अंतर्वस्तु मेरी जानकारी एवं विश्वास के अनुसार सत्य एवं सही है और उसमें कोई सारभूत तथ्य छिपाया नहीं गया है।`);
    L.push('R:शपथ ग्रहिता');
  } else {
    L.push('C|B:APPLICATION FOR BAIL');
    L.push(`C|B:${client} Versus ${v.opp_party || '{{opp_party}}'}`);
    if (v.case_no) L.push(`C:(Case No. ${v.case_no})`);
    L.push('');
    L.push(`P1|J:That the applicant ${client} is a peaceful and law-abiding citizen and has been falsely implicated in FIR No. ${fir}${firD ? `, registered on ${fmtDate(firD)}` : ''}, at Police Station ${ps}, under Section(s) ${sec}.`);
    if (incD || arrD) {
      L.push(`P1|J:That the alleged incident is stated to have occurred on ${incD ? fmtDate(incD) : '—'}${arrD ? `, and the applicant was arrested on ${fmtDate(arrD)} and has been in judicial custody ever since` : ''}.`);
    } else {
      L.push('P1|J:That the applicant has continuously remained in judicial custody in the present case.');
    }
    L.push(chgD
      ? `P1|J:That the investigation is complete and the charge-sheet was filed on ${fmtDate(chgD)}; no further recovery or interrogation is required from the applicant.`
      : 'P1|J:That no further recovery or interrogation is required from the applicant in the present case.');
    L.push('P1|J:That the applicant has deep roots in society and no criminal antecedents. The applicant undertakes to abide by every condition imposed by this Hon\'ble Court and to cooperate fully with the trial.');
    L.push('P1|J:It is, therefore, most respectfully prayed that the applicant be enlarged on bail during the pendency of the trial, in the interest of justice. Any other relief this Hon\'ble Court deems fit may also kindly be granted.');
    L.push('');
    L.push('R:Place: {{place}}');
    L.push('R:Dated: {{date}}');
    L.push('R:APPLICANT');
    L.push('R:Through Counsel');
    L.push(`R:${v.advocate_name || '{{advocate_name}}'}`);
    L.push('');
    L.push('B:AFFIDAVIT');
    L.push(`J:I, ${client}, S/o {{client_father}}, R/o {{client_address}}, do hereby solemnly affirm and state that the contents of the accompanying bail application are true and correct to the best of my knowledge and belief, and nothing material has been concealed therefrom.`);
    L.push('R:DEPONENT');
  }
  return L.join('\n');
}

/* ------------------------------------------------------------------ */
/* WhatsApp-ready share summary                                         */
/* ------------------------------------------------------------------ */
export interface ShareInput {
  court: string; title?: string; caseNo?: string; firNo?: string; psName?: string;
  sections?: string[]; nextDate?: string; decidedDate?: string; docType?: string;
  files: string[]; note?: string;
}

export function shareSummary(s: ShareInput): string {
  const L: string[] = [`⚖ *CASE SUMMARY — ${s.court}*`];
  if (s.title) L.push(`👤 *${s.title}*`);
  if (s.caseNo) L.push(`🗂 Case No: *${s.caseNo}*`);
  if (s.firNo) L.push(`🚔 FIR: ${s.firNo}${s.psName ? ` · PS ${s.psName}` : ''}`);
  if (s.sections?.length) L.push(`📜 Sections: ${s.sections.join(', ')}`);
  if (s.docType) L.push(`📄 Type: ${s.docType}`);
  if (s.nextDate) L.push(`⏰ *Next hearing: ${fmtDate(s.nextDate)}*`);
  if (s.decidedDate) L.push(`✅ Decided on: ${fmtDate(s.decidedDate)}`);
  if (s.note) L.push(`📝 Note: ${s.note}`);
  if (s.files.length) L.push(`🗃 Files (${s.files.length}): ${s.files.slice(0, 6).join(', ')}${s.files.length > 6 ? ' …' : ''}`);
  L.push('');
  L.push('_via Writer Pro Legal Drafter_');
  return L.join('\n');
}
