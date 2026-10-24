/**
 * Subordinate-court template engine (JMIC / SDM / Civil Judge formats).
 * Line DSL:  flags separated by '|' then ':'  — C center, R right, J justify,
 * H1/H2/H3 headings, P1/P2/P3 pleading hierarchy (1. / (a) / (i)), B bold.
 * {{var_key}} tokens become smart-variable chips on insertion.
 */
import { containsDevanagari } from './krutidev';

export interface Block {
  type: 'paragraph' | 'heading';
  level?: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right' | 'justify';
  plev?: 0 | 1 | 2 | 3;
  bold?: boolean;
  text: string;
  lang: 'hi' | 'en';
}

export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  for (const raw of src.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    let rest = line;
    const flags = new Set<string>();
    const m = line.match(/^([A-Z0-9,|]+):(.*)$/s);
    if (m && !line.startsWith('{{')) {
      m[1].split('|').forEach((f) => f && flags.add(f));
      rest = m[2];
    }
    const b: Block = {
      type: flags.has('H1') || flags.has('H2') || flags.has('H3') ? 'heading' : 'paragraph',
      level: flags.has('H1') ? 1 : flags.has('H2') ? 2 : flags.has('H3') ? 3 : undefined,
      align: flags.has('C') ? 'center' : flags.has('R') ? 'right' : flags.has('J') ? 'justify' : 'left',
      plev: flags.has('P1') ? 1 : flags.has('P2') ? 2 : flags.has('P3') ? 3 : 0,
      bold: flags.has('B'),
      text: rest,
      lang: containsDevanagari(rest) ? 'hi' : 'en',
    };
    out.push(b);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Jurisdiction blocks                                                 */
/* ------------------------------------------------------------------ */
export interface Jurisdiction { id: string; label: string; en: string; hi: string }

/** The five standard subordinate-court headers (Hindi + English).
 *  Always inserted RIGHT-ALIGNED at the very top of the document. */
export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: 'jm',
    label: 'JM Court / न्यायिक मजिस्ट्रेट',
    en: 'R:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{place}}\nR:न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी, {{place}}',
    hi: 'R:न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी, {{place}}\nR:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{place}}',
  },
  {
    id: 'acjm',
    label: 'ACJM Court / अतिरिक्त मुख्य न्यायिक मजिस्ट्रेट',
    en: 'R:IN THE COURT OF THE ADDITIONAL CHIEF JUDICIAL MAGISTRATE, {{place}}\nR:न्यायालय अतिरिक्त मुख्य न्यायिक मजिस्ट्रेट, {{place}}',
    hi: 'R:न्यायालय अतिरिक्त मुख्य न्यायिक मजिस्ट्रेट, {{place}}\nR:IN THE COURT OF THE ADDITIONAL CHIEF JUDICIAL MAGISTRATE, {{place}}',
  },
  {
    id: 'adj',
    label: 'ADJ Court / अपर जिला एवं सेशन न्यायाधीश',
    en: 'R:IN THE COURT OF THE ADDITIONAL DISTRICT & SESSIONS JUDGE, {{place}}\nR:न्यायालय अपर जिला एवं सेशन न्यायाधीश, {{place}}',
    hi: 'R:न्यायालय अपर जिला एवं सेशन न्यायाधीश, {{place}}\nR:IN THE COURT OF THE ADDITIONAL DISTRICT & SESSIONS JUDGE, {{place}}',
  },
  {
    id: 'sdm',
    label: 'SDM Court / उपखण्ड अधिकारी',
    en: 'R:BEFORE THE SUB-DIVISIONAL MAGISTRATE / REVENUE OFFICER, {{place}}\nR:सेवा में उपखण्ड अधिकारी (सिविल) एवं राजस्व अधिकारी, {{place}}',
    hi: 'R:सेवा में उपखण्ड अधिकारी (सिविल) एवं राजस्व अधिकारी, {{place}}\nR:BEFORE THE SUB-DIVISIONAL MAGISTRATE / REVENUE OFFICER, {{place}}',
  },
  {
    id: 'aecm',
    label: 'AECM Court / अतिरिक्त कार्यपालक मजिस्ट्रेट',
    en: 'R:IN THE COURT OF THE ADDITIONAL EXECUTIVE MAGISTRATE, {{place}}\nR:न्यायालय अतिरिक्त कार्यपालक मजिस्ट्रेट, {{place}}',
    hi: 'R:न्यायालय अतिरिक्त कार्यपालक मजिस्ट्रेट, {{place}}\nR:IN THE COURT OF THE ADDITIONAL EXECUTIVE MAGISTRATE, {{place}}',
  },
];

/* ------------------------------------------------------------------ */
/* Smart variable keys                                                 */
/* ------------------------------------------------------------------ */
export const VAR_KEYS: { key: string; label: string; hint: string }[] = [
  { key: 'client_name', label: 'Client / प्रार्थी', hint: 'petitioner / applicant / complainant name' },
  { key: 'client_father', label: 'Client father / पिता', hint: "s/o, d/o detail" },
  { key: 'client_address', label: 'Client address / पता', hint: 'village, tehsil, district' },
  { key: 'opp_party', label: 'Opposite party / विपक्षी', hint: 'respondent / accused / defendant' },
  { key: 'court_name', label: 'Court / न्यायालय', hint: 'e.g. Judicial Magistrate First Class, Bhadra' },
  { key: 'case_no', label: 'Case No. / प्रकरण संख्या', hint: 'e.g. 204/2025' },
  { key: 'ps_name', label: 'Police Station / थाना', hint: 'e.g. Bhadra' },
  { key: 'fir_no', label: 'FIR No. / एफआईआर', hint: 'e.g. 218/2022' },
  { key: 'sections', label: 'Under Section(s) / धाराएँ', hint: 'e.g. 498A, 406 IPC / 315(2) BNS' },
  { key: 'date', label: 'Date / दिनांक', hint: 'signing date' },
  { key: 'place', label: 'Place / स्थान', hint: 'e.g. Bhadra' },
  { key: 'advocate_name', label: 'Advocate / वकील', hint: 'counsel name' },
];

/* ------------------------------------------------------------------ */
/* Pleading skeleton library                                           */
/* ------------------------------------------------------------------ */
export interface Skeleton { id: string; cat: 'Criminal' | 'Civil & Revenue'; title: string; desc: string; body: string }

export const SKELETONS: Skeleton[] = [
  {
    id: 'bail-regular',
    cat: 'Criminal',
    title: 'Regular Bail Application (S.480/483 BNSS ≈ S.437/439 CrPC)',
    desc: 'बेल प्रार्थना पत्र — non-bailable offence, jail-superintendency style recitals',
    body:
      'C:IN THE COURT OF THE SESSIONS JUDGE / ADDITIONAL SESSIONS JUDGE, {{court_name}}\n' +
      'C:न्यायालय जिला एवं सेशन न्यायाधीश, {{court_name}}\n' +
      'C:Bail Application No. ____ of 20__\n' +
      'C B:{{client_name}}\n' +
      'C:सुपुत्र {{client_father}}, निवासी {{client_address}}\n' +
      'C:आवेदक / अभियुक्त (Accused-Applicant)\n' +
      'C:बनाम / Versus\n' +
      'C B:राज्य राज्यपाल / State of Rajasthan\n' +
      'C:प्रतिवादी (Respondent)\n' +
      'H2:B:जमानत हेतु प्रार्थना पत्र (धारा 480/483 भा.ना.सं., 2023)\n' +
      'P1:कि आवेदक उपरोक्त नाम व पता वाला व्यक्ति है तथा प्रकरण संख्या {{case_no}} पुलिस थाना {{ps_name}} में धारा {{sections}} में गिरफ्तार किया गया है एवं वर्तमान में जिला कारागार में निरुद्ध है।\n' +
      'P1:कि आवेदक का प्रकरण उक्त धाराओं में पुलिस थाना {{ps_name}} पर एफआईआर संख्या {{fir_no}} के रूप में दर्ज है तथा अनुसंधान जारी है।\n' +
      'P1:कि आवेदक स्थायी निवासी है एवं पलायन का कोई खतरा नहीं है; आवेदक विचारण का सामना करने हेतु बाध्य है।\n' +
      'P1:कि घटना में आवेदक की संलिप्तता संदिग्ध है एवं तथ्यों का कोई स्वतंत्र प्रमाण उपलब्ध नहीं है।\n' +
      'P2:कि आवेदक पूर्व में किसी अपराध में दोषसिद्ध नहीं है।\n' +
      'P2:कि आवेदक जमानत की शर्तों का पूर्ण पालन करेगा एवं धारा 483(3) भा.ना.सं. की शर्तों से बाध्य रहेगा।\n' +
      'P1:कि समान परिस्थितियों में सह-अभियुक्तों को जमानत प्रदान की जा चुकी है।\n' +
      'H3:B:प्रार्थना / PRAYER\n' +
      'P1:कि उपरोक्त परिस्थितियों में आवेदक को प्रकरण संख्या {{case_no}} में धारा 480/483 भा.ना.सं., 2023 (तत्स्थानी धारा 437/439 दं.प्र.सं.) के अंतर्गत जमानत पर रिहा किया जावे।\n' +
      'R:आवेदक / Applicant\n' +
      'R:जिरिए वकील / Through Counsel: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}\n' +
      'R:स्थान: {{place}}',
  },
  {
    id: 'bail-anticipatory',
    cat: 'Criminal',
    title: 'Anticipatory Bail (S.482 BNSS ≈ S.438 CrPC)',
    desc: 'पूर्व जमानत — direction for release on arrest',
    body:
      'C:IN THE COURT OF THE DISTRICT & SESSIONS JUDGE, {{court_name}}\n' +
      'C:न्यायालय जिला एवं सेशन न्यायाधीश, {{court_name}}\n' +
      'C:Anticipatory Bail Application No. ____ of 20__\n' +
      'C B:{{client_name}} सुपुत्र {{client_father}} निवासी {{client_address}}\n' +
      'C:प्रार्थी (Applicant)\n' +
      'C:बनाम / Versus\n' +
      'C B:राज्य राज्यपाल तथा अन्य\n' +
      'H2:B:धारा 482 भा.ना.सं., 2023 (तत्स्थानी धारा 438 दं.प्र.सं.) के अंतर्गत पूर्व जमानत हेतु प्रार्थना पत्र\n' +
      'P1:कि प्रार्थी को यह विश्वास करने का पर्याप्त कारण है कि उसे पुलिस थाना {{ps_name}} द्वारा धारा {{sections}} में गिरफ्तार किया जाना है, जिसकी सम्भावना एफआईआर / इत्तिला से बनती है।\n' +
      'P1:कि प्रार्थी का पता-ठिकाना जगजाहिर है एवं वह न्यायालय की हर कार्रवाई में सहयोग करने को तैयार है।\n' +
      'P1:कि प्रार्थी के विरुद्ध कोई पूर्व आपराधिक इतिहास नहीं है एवं आरोप केवल झूठे एवं कल्पित हैं।\n' +
      'P1:कि गिरफ्तारी की स्थिति में प्रार्थी की प्रतिष्ठा एवं परिवार को अपूरणीय क्षति होगी।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि प्रार्थी की गिरफ्तारी की स्थिति में धारा 482 भा.ना.सं. के अंतर्गत जमानत पर मुक्त किए जाने का निदेश प्रदान किया जावे।\n' +
      'R:प्रार्थी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 'superdari',
    cat: 'Criminal',
    title: 'Superdari Application (S.503 BNSS ≈ S.457 CrPC)',
    desc: 'जब्ती माल की सुपुर्दगी हेतु प्रार्थना',
    body:
      'C:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{court_name}}\n' +
      'C:न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी, {{court_name}}\n' +
      'C:प्रकरण संख्या {{case_no}}\n' +
      'C B:{{client_name}} सुपुत्र {{client_father}} निवासी {{client_address}}\n' +
      'C:प्रार्थी\n' +
      'C:बनाम\n' +
      'C B:राज्य राज्यपाल\n' +
      'H2:B:जब्ती माल की सुपुर्दगी (सुपरदगी) हेतु प्रार्थना पत्र\n' +
      'P1:कि पुलिस थाना {{ps_name}} द्वारा एफआईआर संख्या {{fir_no}} धारा {{sections}} में प्रार्थी का माल (विवरण: ____) जब्त किया गया है जो प्रार्थी का स्वामित्व सम्पत्ति है।\n' +
      'P1:कि माल के स्वामित्व के समर्थन में प्रार्थी द्वारा खरीद पर्ची / फर्द / रसीद संलग्न की जा रही है।\n' +
      'P1:कि माल पड़ती होने से उसका मूल्य दिन-प्रतिदिन घट रहा है एवं रख-रखाव का व्यय भारी है।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि उक्त माल प्रार्थी को सुपुर्दगी मुचलका भरने पर वापस किया जावे एवं मुचलका व जिंदगी बॉण्ड मंजूर किया जावे।\n' +
      'R:प्रार्थी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 'exemption-205-317',
    cat: 'Criminal',
    title: 'Exemption from Personal Appearance (S.205 / S.317 CrPC)',
    desc: 'व्यक्तिगत हाजिरी से छूट — appearance through counsel',
    body:
      'C:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{court_name}}\n' +
      'C:न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी, {{court_name}}\n' +
      'C:प्रकरण संख्या {{case_no}}\n' +
      'C:{{client_name}} बनाम {{opp_party}}\n' +
      'H2:B:धारा 205 / 317 दं.प्र.सं. (तत्स्थानी भा.ना.सं. प्रावधान) के अंतर्गत व्यक्तिगत हाजिरी से छूट हेतु प्रार्थना पत्र\n' +
      'P1:कि प्रार्थी इस प्रकरण में अभियुक्त / पक्षकार है एवं आगामी दिनांक को उसकी व्यक्तिगत हाजिरी अपेक्षित है।\n' +
      'P1:कि प्रार्थी बीमारी / दूरस्थ सेवा / अन्य वैध कारणवश (विवरण: ____) व्यक्तिगत रूप से उपस्थित होने में असमर्थ है, जिसका प्रमाण संलग्न है।\n' +
      'P1:कि प्रार्थी का वकील न्यायालय में उपस्थित रहकर पैरवी करेगा एवं न्यायालय की शर्तों का पालन होगा।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि प्रार्थी को आगामी तारीख हेतु व्यक्तिगत हाजिरी से छूट प्रदान की जावे एवं उपस्थिति वकील द्वारा मंजूर की जावे।\n' +
      'R:प्रार्थी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 'ni-138',
    cat: 'Criminal',
    title: 'Complaint u/s 138 NI Act (dishonour of cheque)',
    desc: 'English complaint with statutory recitals & limitation note',
    body:
      'C:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{court_name}}\n' +
      'C:Complaint under Section 138 of the Negotiable Instruments Act, 1881\n' +
      'C:Complaint No. ____ of 20__\n' +
      'C B:{{client_name}}, s/o {{client_father}}, r/o {{client_address}}\n' +
      'C:... Complainant\n' +
      'C:Versus\n' +
      'C B:{{opp_party}}\n' +
      'C:... Accused\n' +
      'H2:COMPLAINT UNDER SECTION 138 NI ACT\n' +
      'P1:That the complainant and the accused were known to each other and the accused had requested a hand loan of Rs. ____ towards ____.\n' +
      'P1:That in discharge of the said liability the accused issued cheque No. {{cheque_no}} dated ____ drawn on ____ Bank, Branch ____ for Rs. ____ in favour of the complainant.\n' +
      'P1:That the said cheque was presented for encashment through the account of the complainant but the same was returned dishonoured vide memo dated ____ with remarks "____" (funds insufficient).\n' +
      'P1:That the complainant served a legal demand notice dated ____ through registered post within 30 days of the dishonour memo, demanding payment within 15 days.\n' +
      'P1:That despite receipt of the notice the accused failed to make payment within the statutory period of 15 days, hence the cause of action arose on ____.\n' +
      'P1:That the complaint is within limitation and the complainant has complied with the provisions of Section 138 read with Section 142 of the NI Act.\n' +
      'H3:PRAYER\n' +
      'P1:That summoning process be issued against the accused under Section 138 NI Act and the accused be tried, convicted and sentenced as per law, and compensation under Section 143A / 148 NI Act be also awarded.\n' +
      'R:Complainant through counsel: {{advocate_name}}\n' +
      'R:Dated: {{date}}  Place: {{place}}\n' +
      'H2:VERIFICATION\n' +
      'P1:That the contents of paras 1 to 6 are true and correct to my knowledge and the rest are based on legal advice which I believe to be true. Verified at {{place}} on {{date}}.',
  },
  {
    id: 'o39-r12',
    cat: 'Civil & Revenue',
    title: 'Application u/o Order 39 Rules 1 & 2 CPC (temporary injunction)',
    desc: 'अस्थायी निषेधाज्ञा हेतु प्रार्थना पत्र, suit schedule annexed',
    body:
      'C:IN THE COURT OF THE CIVIL JUDGE (J.D.), {{court_name}}\n' +
      'C:न्यायालय सिविल जज (कनिष्ठ श्रेणी), {{court_name}}\n' +
      'C:वाद संख्या ____ of 20__\n' +
      'C B:{{client_name}} सुपुत्र {{client_father}} निवासी {{client_address}}\n' +
      'C:वादी / आवेदक\n' +
      'C:बनाम\n' +
      'C B:{{opp_party}}\n' +
      'C:प्रतिवादी / विपक्षी\n' +
      'H2:B:आदेश 39 नियम 1 व 2 वा.प्र.सं. के अंतर्गत अस्थायी निषेधाज्ञा हेतु प्रार्थना पत्र\n' +
      'P1:कि वादी उपरोक्त वाद में सम्मिलित भूमि / सम्पत्ति (खसरा संख्या ____, खाता संख्या ____, मौजा ____) का वैध भोगधारक व स्वामी है।\n' +
      'P1:कि प्रतिवादी द्वारा बिना किसी अधिकार के वादी के कब्जे में हस्तक्षेप किया जा रहा है एवं निर्माण / फसल नष्ट करने का प्रयास किया जा रहा है।\n' +
      'P1:कि वादी को त्रि-सूत्री सिद्ध करने योग्य प्रथम दृष्टया सुसंगत वाद (prima facie case), संतुलन सुविधा (balance of convenience) व अपूरणीय क्षति (irreparable injury) की शर्तें पूर्ण करने का मामला है।\n' +
      'P1:कि यदि अस्थायी निषेधाज्ञा नहीं दी गई तो वादी को अपूरणीय हानि होगी।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि वाद के निर्णय तक प्रतिवादी को विवादित सम्पत्ति में हस्तक्षेप / निर्माण / कब्जा परिवर्तन से रोका जावे एवं अस्थायी निषेधाज्ञा प्रदान की जावे।\n' +
      'R:वादी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 's151-cpc',
    cat: 'Civil & Revenue',
    title: 'Application u/s 151 CPC (inherent powers)',
    desc: 'न्यायालय की नैहितिक शक्तियाँ — justice-oriented interlocutory',
    body:
      'C:IN THE COURT OF THE {{court_name}}\n' +
      'C:वाद / प्रकरण संख्या {{case_no}}\n' +
      'C:{{client_name}} बनाम {{opp_party}}\n' +
      'H2:B:धारा 151 वा.प्र.सं. के अंतर्गत प्रार्थना पत्र\n' +
      'P1:कि उपरोक्त प्रकरण न्यायालय में विचाराधीन है एवं न्याय के हित में निम्न आवेदन प्रस्तुत करना आवश्यक है।\n' +
      'P1:कि ____ (तथ्य संक्षेप) के कारण न्यायालय की नैहितिक शक्तियों का प्रयोग किए बिना पक्षकारों के बीच न्याय सम्भव नहीं है।\n' +
      'P1:कि कोई वैकल्पिक प्रभावी उपचार उपलब्ध नहीं है एवं आवेदन सद्भावनापूर्ण है।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि धारा 151 वा.प्र.सं. के अंतर्गत ____ आदेश पारित कर न्याय किया जावे।\n' +
      'R:आवेदक जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 'rta-petition',
    cat: 'Civil & Revenue',
    title: 'Petition u/s 86 Rajasthan Tenancy Act, 1955',
    desc: 'राजस्थान भू-अधिधारण अधिनियम — revenue court petition',
    body:
      'C:BEFORE THE SUB-DIVISIONAL MAGISTRATE / REVENUE OFFICER, {{court_name}}\n' +
      'C:सेवा में उपखण्ड अधिकारी (सिविल) एवं राजस्व अधिकारी, {{court_name}}\n' +
      'C:प्रकरण संख्या ____ of 20__\n' +
      'C B:{{client_name}} पुत्र {{client_father}} निवासी {{client_address}}\n' +
      'C:प्रार्थी (खातेदार काश्तकार)\n' +
      'C:बनाम\n' +
      'C B:{{opp_party}} एवं अन्य\n' +
      'C:विपक्षी\n' +
      'H2:B:धारा 86 राजस्थान भू-अधिधारण अधिनियम, 1955 के अंतर्गत प्रार्थना पत्र\n' +
      'P1:कि प्रार्थी मौजा ____, तहसील ____, जिला ____ की भूमि खसरा संख्या ____, खाता संख्या ____ का खानेदार काश्तकार है एवं जमाबंदी / खतौनी में उसका नाम दर्ज है।\n' +
      'P1:कि विपक्षी द्वारा उक्त भूमि में बिना वैध अधिकार के दखल दिया जा रहा है / फसल उठाई जा रही है / फर्द बदलने की धमकी दी जा रही है।\n' +
      'P1:कि प्रार्थी का काश्तकार अधिकार अधिनियम के अंतर्गत संरक्षित है एवं विपक्षी का कोई हक नहीं बनता।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि धारा 86 एवं सम्बद्ध प्रावधानों के अंतर्गत विपक्षी का दखल निवारण कर भूमि का कब्जा प्रार्थी को दिलवाया जावे एवं खर्च दिया जावे।\n' +
      'R:प्रार्थी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 'injunction-suit',
    cat: 'Civil & Revenue',
    title: 'Suit for permanent injunction (plaint skeleton)',
    desc: 'स्थायी निषेधाज्ञा वाद — plaint with cause-title & paras',
    body:
      'C:IN THE COURT OF THE CIVIL JUDGE (J.D.), {{court_name}}\n' +
      'C:वाद संख्या ____ of 20__\n' +
      'C B:{{client_name}} सुपुत्र {{client_father}} निवासी {{client_address}}\n' +
      'C:वादी\n' +
      'C:बनाम\n' +
      'C B:{{opp_party}} सुपुत्र ____ निवासी ____\n' +
      'C:प्रतिवादी\n' +
      'H2:B:स्थायी निषेधाज्ञा हेतु वाद\n' +
      'P1:कि वादी ____ मौजा ____ तहसील ____ जिला ____ की भूमि / मकान संख्या ____ का पंजीकृत व वैध स्वामी एवं भोगधारक है।\n' +
      'P1:कि प्रतिवादी पड़ोसी / अनधिकृत व्यक्ति है जिसने दिनांक ____ को वादी की सम्पत्ति पर जबरन ____ करने का प्रयास किया।\n' +
      'P1:कि वादी ने दिनांक ____ को नोटिस द्वारा तथा पंचायत / थाना {{ps_name}} के माध्यम से प्रतिवादी को रोका किन्तु प्रतिवादी नहीं माना।\n' +
      'P1:कि वादी का कब्जा व स्वामित्व सिद्ध है एवं प्रतिवादी का कोई अधिकार नहीं है।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि प्रतिवादी को वादी की सम्पत्ति में दखल से स्थायी रूप से रोका जावे (स्थायी निषेधाज्ञा)।\n' +
      'P2:कि वाद खर्च व अन्य अनुतोष दिया जावे।\n' +
      'R:वादी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}\n' +
      'H2:B:सत्यापन\n' +
      'P1:कि उपरोक्त मद 1 से 4 तक के कथन वादी के निजी ज्ञान से सच व सही हैं, शेष कानूनी सलाह के आधार पर। सत्यापन दिनांक {{date}} स्थान {{place}} पर किया गया।',
  },
  {
    id: 'jawab-notice',
    cat: 'Civil & Revenue',
    title: 'Jawab / Written Statement (Rajasthan style, as filed in JM Courts)',
    desc: 'जवाब नोटिस बाबत — denial paras modelled on filed drafts',
    body:
      'C:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{court_name}}\n' +
      'C:न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी, {{court_name}}\n' +
      'C:वाद संख्या {{case_no}}\n' +
      'C B:{{opp_party}} बनाम {{client_name}} आदि\n' +
      'H2:B:जवाब नोटिस बाबत\n' +
      'C:माननीय जी,\n' +
      'P1:अभियुक्तगण / प्रतिवादीगण की ओर से प्रवाद का जवाब निम्न प्रकार से अर्ज है:-\n' +
      'P1:यह कि प्रवादी का सम्पूर्ण कथन झूठा, बेबुनियाद व असत्य है, अतः वीकार्य है।\n' +
      'P1:यह कि प्रवादी पैरा 2 में जो कथन किए हैं, सही नहीं होने के कारण वीकार हैं।\n' +
      'P2:यह कि प्रवादी द्वारा बताई गई घटना कभी घटित नहीं हुई।\n' +
      'P2:यह कि प्रवादी का कोई वाद कारण नहीं बनता।\n' +
      'P1:यह कि प्रवादी पैरा 3 में जो कथन किए हैं, गलत बयानी होने के कारण वीकार हैं।\n' +
      'P1:यह कि अन्यथा कथन — ____ (अपने पक्ष के तथ्य)।\n' +
      'P1:अतः जवाब नोटिस प्रस्तुत कर अर्ज है कि प्रवादी द्वारा प्रस्तुत झूठा व आधारहीन प्रवाद खारिज फरमाया जावे।\n' +
      'R:दिनांक: {{date}}\n' +
      'R:अभियुक्तगण / प्रतिवादीगण\n' +
      'R:जरिए वकील: {{advocate_name}}\n' +
      'H2:B:सत्यापन\n' +
      'P1:हम अभियुक्त / प्रतिवादी संख्या 1 जन के हस्ताक्षर नीचे अंकित हैं; जवाब नोटिस की मद संख्या 1 से ____ को सच व सही होना सत्यापित करते हैं। यह सत्यापन आज दिनांक {{date}} स्थान {{place}} में लिखकर सत्यापित किया गया है।',
  },
  {
    id: 'maintenance-144',
    cat: 'Civil & Revenue',
    title: 'Maintenance Application (S.144 BNSS ≈ S.125 CrPC)',
    desc: 'भरण पोषण हेतु प्रार्थना — wife / children / parents',
    body:
      'C:IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, {{court_name}}\n' +
      'C:न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी, {{court_name}}\n' +
      'C:प्रकरण संख्या ____ of 20__\n' +
      'C B:{{client_name}} पत्नी / पुत्र / माता-पिता ____ निवासी {{client_address}}\n' +
      'C:प्रार्थिनी / प्रार्थी\n' +
      'C:बनाम\n' +
      'C B:{{opp_party}} निवासी ____\n' +
      'C:विपक्षी\n' +
      'H2:B:धारा 144 भा.ना.सं., 2023 (तत्स्थानी धारा 125 दं.प्र.सं.) के अंतर्गत भरण पोषण हेतु प्रार्थना पत्र\n' +
      'P1:कि प्रार्थिनी का विवाह विपक्षी से दिनांक ____ को हिन्दू रीति-रिवाज से सम्पन्न हुआ था।\n' +
      'P1:कि विपक्षी द्वारा प्रार्थिनी को दिनांक ____ से भरण पोषण नहीं दिया जा रहा एवं घर से निकाल दिया गया।\n' +
      'P1:कि विपक्षी की मासिक आय लगभग रु. ____ है एवं वह भरण पोषण देने में समर्थ है।\n' +
      'P1:कि प्रार्थिनी के पास निर्वाह का कोई साधन नहीं है।\n' +
      'H3:B:प्रार्थना\n' +
      'P1:कि विपक्षी से प्रार्थिनी हेतु मासिक रु. ____ भरण पोषण एवं वाद खर्च दिलवाया जावे।\n' +
      'R:प्रार्थिनी जरिए वकील: {{advocate_name}}\n' +
      'R:दिनांक: {{date}}',
  },
  {
    id: 'satyapan-hi',
    cat: 'Civil & Revenue',
    title: 'सत्यापन प्रपत्र / Verification (standalone Hindi)',
    desc: 'पैरा रेंज, स्थान, दिनांक, हस्ताक्षर व स्टाम्प ब्लॉक सहित',
    body:
      'H2:B:सत्यापन\n' +
      'P1:कि उपरोक्त मद / पैरा संख्या 1 से {{last_para}} तक के कथन मेरे निजी ज्ञान से सच व सही हैं तथा मेरे वकील की सलाह से लिखे गए शेष कथन मैंने पढ़कर सही माने हैं।\n' +
      'P1:कि इस सत्यापन में कोई तथ्य छिपाया नहीं गया है एवं कोई असत्य कथन नहीं है।\n' +
      'P1:यह सत्यापन आज दिनांक {{date}} स्थान {{place}} में लेखक द्वारा लिखकर मेरे समक्ष सत्यापित किया गया है।\n' +
      'R:B:सत्यापनकर्ता / Deponent\n' +
      'R:हस्ताक्षर: ____________\n' +
      'C:〔न्यायालय स्टाम्प / ओथ कमिश्नर मुहर〕',
  },
  {
    id: 'verification-en',
    cat: 'Civil & Revenue',
    title: 'Verification (standalone English)',
    desc: 'knowledge & belief clauses, place/date, signature & stamp block',
    body:
      'H2:B:VERIFICATION\n' +
      'P1:That the contents of paras 1 to {{last_para}} of the accompanying pleading are true and correct to my personal knowledge; the contents based on legal advice are believed to be true.\n' +
      'P1:That no material fact has been concealed and nothing stated herein is false.\n' +
      'P1:Verified at {{place}} on this {{date}}.\n' +
      'R:B:DEPONENT / VERIFIER\n' +
      'R:Signature: ____________\n' +
      'C:〔Court stamp / Oath Commissioner seal〕',
  },
  {
    id: 'oath-notary',
    cat: 'Civil & Revenue',
    title: 'ओथ कमिश्नर / नोटरी प्रमापन ब्लॉक',
    desc: 'Oath Commissioner / Notary certification with seal spaces',
    body:
      'H3:B:ओथ कमिश्नर / नोटरी प्रमापन\n' +
      'J:कि शपथगृहीता {{client_name}} ने मेरी उपस्थिति में इस शपथ पत्र / सत्यापन को पढ़कर / पढ़वाकर हस्ताक्षर किए एवं अपनी पहचान प्रमाणित की।\n' +
      'R:हस्ताक्षर व मुहर: ____________\n' +
      'R:ओथ कमिश्नर / नोटरी, {{place}}\n' +
      'R:दिनांक: {{date}}\n' +
      'C:〔COMMISSIONER SEAL / नोटरी मुहर〕',
  },
  {
    id: 'affidavit-general',
    cat: 'Civil & Revenue',
    title: 'Affidavit (bilingual, with stamp space)',
    desc: 'शपथ पत्र — deponent clauses + court fee stamp slot',
    body:
      'C:B:AFFIDAVIT / शपथ पत्र\n' +
      'C:〔COURT FEE STAMP Rs. ____ / न्यायालय शुल्क स्टाम्प〕\n' +
      'C B:{{client_name}} सुपुत्र {{client_father}} निवासी {{client_address}}\n' +
      'C:... शपथगृहीता / Deponent\n' +
      'J:कि मैं उपरोक्त नाम व पता वाला व्यक्ति शपथ पर निम्न कथन करता हूँ / I, the above-named deponent, state on oath as under:\n' +
      'P1:कि मैं इस प्रकरण का पक्षकार हूँ एवं तथ्यों से पूर्णतः अवगत हूँ। / That I am a party to the case and fully conversant with the facts.\n' +
      'P1:कि ____ (कथन)। / That ____.\n' +
      'P1:कि यह शपथ पत्र इस प्रकरण की कार्रवाई हेतु प्रयोग किया जावे। / That this affidavit is filed for the purposes of this proceeding.\n' +
      'H3:B:सत्यापन / VERIFICATION\n' +
      'P1:कि उपरोक्त कथन मेरे निजी ज्ञान से सच व सही हैं तथा कोई तथ्य छिपाया नहीं गया है। स्थान {{place}}, दिनांक {{date}}।\n' +
      'R:B:DEPONENT / शपथगृहीता\n' +
      'R:Identified by me: {{advocate_name}} (Advocate)\n' +
      'C:〔SWORN before me on this ____ day of ______ 20__ / Oath Commissioner〕',
  },
];

/* ------------------------------------------------------------------ */
/* One-tap verification / affidavit / identification certificate       */
/* ------------------------------------------------------------------ */
export const VERIFICATION_HI =
  'H2:B:सत्यापन\n' +
  'P1:कि उपरोक्त मद संख्या 1 से {{last_para}} तक के कथन मेरे निजी ज्ञान से सच व सही हैं एवं शेष कथन मेरे वकील की सलाह से सही माने गए हैं। यह सत्यापन आज दिनांक {{date}} स्थान {{place}} में लिखकर सत्यापित किया गया है।';

export const VERIFICATION_EN =
  'H2:B:VERIFICATION\n' +
  'P1:That the contents of paras 1 to {{last_para}} above are true and correct to my personal knowledge and the remainder is based on legal advice believed to be true. Verified at {{place}} on this {{date}}.';

export const AFFIDAVIT_BLOCK =
  'C:B:AFFIDAVIT / शपथ पत्र\n' +
  'C:〔COURT FEE STAMP Rs. ____〕\n' +
  'J:I, {{client_name}}, s/o / d/o {{client_father}}, r/o {{client_address}}, do hereby solemnly affirm and state on oath as under / कि मैं शपथ पूर्वक कथन करता हूँ:\n' +
  'P1:That I am the deponent and fully conversant with the facts of the case. / कि मैं शपथगृहीता हूँ एवं तथ्यों से अवगत हूँ।\n' +
  'R:B:DEPONENT / शपथगृहीता\n' +
  'C:〔SWORN before me on ____ / Oath Commissioner, {{court_name}}〕';

export const IDENTIFICATION_CERT =
  'H3:B:IDENTIFICATION CERTIFICATE / नामजदगी प्रमाण पत्र\n' +
  'J:It is certified that the deponent {{client_name}} is personally known to me and has signed the affidavit in my presence. / यह प्रमाणित किया जाता है कि शपथगृहीता {{client_name}} मुझे व्यक्तिगत रूप से ज्ञात है एवं उसने मेरी मौजूदगी में हस्ताक्षर किए हैं।\n' +
  'R:Identified by: {{advocate_name}}, Advocate\n' +
  'C:〔COURT STAMP / न्यायालय स्टाम्प〕';

/* ------------------------------------------------------------------ */
/* Index / list generators                                             */
/* ------------------------------------------------------------------ */
export interface IndexRow { mark: string; title: string; remark: string }
export interface DateRow { date: string; event: string }

export function indexBlocks(rows: IndexRow[], headingHi = false): Block[] {
  const out: Block[] = headingHi
    ? parseBlocks('C:B:सूची / INDEX')
    : parseBlocks('C:B:INDEX OF DOCUMENTS');
  rows.forEach((r, i) => {
    out.push({ type: 'paragraph', align: 'left', plev: 0, bold: false, lang: 'en', text: `${i + 1}.  ${r.mark}  —  ${r.title}${r.remark ? `  (${r.remark})` : ''}` });
  });
  return out;
}

export function datesEventsBlocks(rows: DateRow[]): Block[] {
  const out = parseBlocks('C:B:LIST OF DATES & EVENTS / तिथियों व घटनाओं की सूची');
  for (const r of rows) {
    out.push({ type: 'paragraph', align: 'left', plev: 1, bold: false, lang: 'en', text: `${r.date}  —  ${r.event}` });
  }
  return out;
}
