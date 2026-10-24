/**
 * Native offline legal dictionary: Latin maxims, Hindi/Urdu procedural &
 * revenue terminology, and statutory phrasing (BNS, BNSS, BSA, CPC, NI Act,
 * Rajasthan Tenancy Act). Feeds autocomplete + the spell-check whitelist so
 * statutory language is never flagged by ordinary spelling engines.
 */

export interface DictEntry {
  term: string;          // insertion text
  lang: 'en' | 'hi';
  tag: string;           // maxim | term | statutory
  meaning?: string;
}

export const MAXIMS: DictEntry[] = [
  'actori sequitur forum rei', 'audi alteram partem', 'bona fide', 'caveat emptor',
  'cessante ratione legis cessat ipsa lex', 'compositio mentis', 'consensus tollit errorem',
  'contra proferentem', 'coram non judice', 'cui bono', 'de die in diem', 'de facto',
  'de jure', 'de novo', 'dictum', 'dolus eventualis', 'ejusdem generis', 'ergo',
  'ex abundanti cautela', 'ex parte', 'ex post facto', 'expressio unius est exclusio alterius',
  'falsus in uno falsus in omnibus', 'functus officio', 'generalia specialibus non derogant',
  'guardian ad litem', 'in camera', 'in limine', 'in loco parentis', 'in pari delicto',
  'in pari materia', 'in situ', 'in toto', 'infra', 'inter alia', 'inter se',
  'ipse dixit', 'ipso facto', 'jus cogens', 'lex loci', 'lex specialis', 'lis pendens',
  'locus standi', 'mala fide', 'mandamus', 'mens rea', 'modius operandi', 'mutatis mutandis',
  'next friend', 'nolle prosequi', 'non est factum', 'nota bene', 'nunc pro tunc',
  'obiter dicta', 'onus probandi', 'parens patriae', 'pari passu', 'per curiam',
  'per incuriam', 'per quod', 'post facto', 'prima facie', 'pro bono', 'pro forma',
  'pro rata', 'pro tempore', 'quantum meruit', 'qui facit per alium facit per se',
  'quo warranto', 'quid pro quo', 'ratio decidendi', 'res gestae', 'res integra',
  'res judicata', 'res sub judice', 'restitutio in integrum', 'semble', 'sine die',
  'sine qua non', 'stare decisis', 'status quo', 'sub judice', 'sub silentio',
  'sui juris', 'supra', 'terra firma', 'ultra vires', 'uti possidetis', 'vel non',
  'versus', 'vice versa', 'vide', 'viz', 'volenti non fit injuria',
].map((t) => ({ term: t, lang: 'en' as const, tag: 'maxim', meaning: 'Latin maxim / legal phrase' }));

export const HINDI_TERMS: DictEntry[] = [
  ['अभियुक्त', 'accused'], ['अभिशंसा', 'impeachment (of evidence)'], ['अनुसंधान', 'investigation'],
  ['अनुसूची', 'schedule'], ['अपील', 'appeal'], ['अयार्जित', 'unearned'], ['अर्जी', 'application'],
  ['अवमानना', 'contempt'], ['अवरोध', 'obstruction'], ['अवास', 'residence'],
  ['आदेश', 'order'], ['आदिवासी', 'tribal'], ['आपराधिक', 'criminal'], ['आय', 'income'],
  ['आवाद', 'populated'], ['आविष्ट', 'possessed'], ['आसामी', 'tenant (tenancy law)'],
  ['इकरारनामा', 'agreement deed'], ['इजलास', 'court bench'], ['इत्तिला', 'intimation'],
  ['इनाम', 'reward'], ['इस्तगासा', 'petition for redress'], ['एतदर्थ', 'for this purpose'],
  ['एवम्', 'thus'], ['ऐलान', 'proclamation'], ['ओसत', 'average'],
  ['कब्जा', 'possession'], ['कबूलियत', 'acceptance (lease)'], ['करार', 'contract'],
  ['काश्तकार', 'cultivator'], ['किराया', 'rent'], ['किस्त', 'instalment'],
  ['कुक्रृत', 'misdeed'], ['कूरता', 'cruelty'], ['खसरा', 'khasra — field register entry'],
  ['खतौनी', 'khatauni — holder register'], ['गवाह', 'witness'], ['गवाही', 'testimony'],
  ['गिरफ्तारी', 'arrest'], ['गुजारा भत्ता', 'maintenance allowance'], ['गैरहाजिरी', 'absence'],
  ['घटना', 'incident'], ['चालान', 'charge-sheet / challan'], ['चिह्न', 'mark'],
  ['जमानत', 'bail'], ['जमाबंदी', 'jamabandi — record of rights'], ['जरिए', 'through / via'],
  ['जवाब', 'reply / written statement'], ['जवाबदेह', 'accountable'], ['जायदाद', 'property'],
  ['जायदादों', 'properties'], ['जिरह', 'cross-examination'], ['जीला', 'district'],
  ['ज्ञात', 'known'], ['ठिकाना', 'address'], ['डिक्री', 'decree'],
  ['तहसील', 'tehsil'], ['तहसीलदार', 'tehsildar'], ['ताबील', 'service (of summons)'],
  ['तालबाना', 'talbana — process fee'], ['तारीख', 'date'], ['तिथि', 'date'],
  ['तुंत', 'immediate'], ['थाना', 'police station'], ['दस्तावेज', 'document'],
  ['दायरा', 'scope'], ['दावा', 'suit / claim'], ['दाखिला', 'filing'],
  ['दिनांक', 'dated'], ['दुर्भावना', 'malice'], ['देनदार', 'liable'],
  ['धरोहर', 'pledge'], ['नक्शा', 'map'], ['नजरबंदी', 'preventive detention'],
  ['न्यायालय', 'court'], ['न्यायिक', 'judicial'], ['नोटिस', 'notice'],
  ['पक्षकार', 'party'], ['पंचायत', 'panchayat'], ['पत्रावली', 'case file'],
  ['परवाना', 'parwana — warrant/process'], ['परिवाद', 'complaint'], ['पैमाइश', 'measurement'],
  ['पोखत', 'possession (cult.)'], ['प्रकरण', 'case'], ['प्रत्यक्ष', 'direct'],
  ['प्रमाण', 'proof'], ['प्रमाणित', 'certified'], ['प्रिवी', 'privy'],
  ['फरियादी', 'complainant'], ['फर्द', 'fard — revenue record copy'], ['बयान', 'bayan — statement'],
  ['बहस', 'arguments'], ['बाकी', 'arrears'], ['बिल्डिंग', 'building'],
  ['भरण पोषण', 'maintenance'], ['भोग', 'occupation'], ['मकदमा', 'case (Urdu)'],
  ['मुचलका', 'muchilka — undertaking bond'], ['मुद्दई', 'plaintiff (Urdu)'], ['मुद्दालैह', 'defendant (Urdu)'],
  ['मुकदमा', 'case / trial'], ['मुरासला', 'murasla — inherited property'], ['मौका', 'place / spot'],
  ['रद करना', 'to cancel'], ['रसीद', 'receipt'], ['रवायत', 'tradition / custom'],
  ['लगान', 'land revenue / rent'], ['लावारिस', 'ownerless'], ['वकील', 'advocate'],
  ['वचनबद्ध', 'committed'], ['वसीयत', 'will'], ['वादी', 'plaintiff / petitioner'],
  ['वादियों', 'plaintiffs'], ['वादिनी', 'plaintiff (f.)'], ['विचारण', 'trial'],
  ['विवरण', 'details'], ['विरुद्ध', 'against'], ['विलय', 'merger'],
  ['विवाद', 'dispute'], ['वेतन', 'salary'], ['व्यवहार', 'civil (usage)'],
  ['शपथ', 'oath'], ['शमन', 'summons (Urdu: shamn)'], ['शिकायत', 'complaint'],
  ['संज्ञेय', 'cognizable'], ['सत्यापन', 'verification'], ['समन', 'summons'],
  ['सम्पत्ति', 'property'], ['सम्मान', 'respect'], ['सहायता', 'assistance'],
  ['साक्ष्य', 'evidence'], ['सिद्ध', 'proved'], ['सिविल', 'civil'],
  ['सुपुर्दगी', 'supurdagi — custody of property'], ['सुरक्षित', 'protected'],
  ['सूची', 'index / list'], ['सूचना', 'information'], ['सोचने', 'consider'],
  ['स्थगन', 'adjournment'], ['स्थल', 'place'], ['स्वीकार', 'admission'],
  ['हक', 'right'], ['हकदार', 'entitled'], ['हस्ताक्षर', 'signature'],
  ['हाजिरी', 'attendance'], ['हिस्सेदारी', 'share'], ['हुकुम', 'order (Urdu)'],
  ['हेतु', 'for'], ['क्षेत्र', 'area'], ['खारिज', 'dismissed'],
].map(([t, m]) => ({ term: t, lang: 'hi' as const, tag: 'term', meaning: m }));

export const STATUTORY: DictEntry[] = [
  // BNS (Bharatiya Nyaya Sanhita, 2023)
  'Section 101 BNS', 'Section 103 BNS', 'Section 109 BNS', 'Section 111 BNS', 'Section 115 BNS',
  'Section 118 BNS', 'Section 126 BNS', 'Section 132 BNS', 'Section 146 BNS', 'Section 152 BNS',
  'Section 157 BNS', 'Section 165 BNS', 'Section 173 BNS', 'Section 189 BNS', 'Section 191 BNS',
  'Section 196 BNS', 'Section 221 BNS', 'Section 234 BNS', 'Section 259 BNS', 'Section 270 BNS',
  'Section 302 BNS', 'Section 306 BNS', 'Section 315 BNS', 'Section 325 BNS', 'Section 336 BNS',
  'Section 340 BNS', 'Section 351 BNS', 'Section 356 BNS',
  // BNSS (Bharatiya Nagarik Suraksha Sanhita, 2023)
  'Section 35 BNSS', 'Section 39 BNSS', 'Section 46 BNSS', 'Section 54 BNSS', 'Section 173 BNSS',
  'Section 175 BNSS', 'Section 193 BNSS', 'Section 200 BNSS', 'Section 223 BNSS', 'Section 229 BNSS',
  'Section 230 BNSS', 'Section 251 BNSS', 'Section 273 BNSS', 'Section 313 BNSS', 'Section 327 BNSS',
  'Section 352 BNSS', 'Section 356 BNSS', 'Section 360 BNSS', 'Section 480 BNSS', 'Section 482 BNSS',
  'Section 483 BNSS', 'Section 503 BNSS', 'Section 528 BNSS',
  // BSA (Bharatiya Sakshya Adhiniyam, 2023)
  'Section 3 BSA', 'Section 5 BSA', 'Section 18 BSA', 'Section 45 BSA', 'Section 60 BSA',
  'Section 65 BSA', 'Section 91 BSA', 'Section 101 BSA', 'Section 106 BSA', 'Section 114 BSA',
  'Section 118 BSA', 'Section 145 BSA', 'Section 154 BSA',
  // CPC
  'Order 39 Rule 1 CPC', 'Order 39 Rule 2 CPC', 'Order 39 Rule 2A CPC', 'Order 6 Rule 16 CPC',
  'Order 7 Rule 11 CPC', 'Order 8 Rule 1 CPC', 'Order 12 Rule 6 CPC', 'Order 16 CPC',
  'Order 17 CPC', 'Order 21 Rule 32 CPC', 'Section 9 CPC', 'Section 12 CPC', 'Section 15 CPC',
  'Section 20 CPC', 'Section 27 CPC', 'Section 80 CPC', 'Section 100 CPC', 'Section 151 CPC',
  'Section 152 CPC',
  // NI Act
  'Section 138 NI Act', 'Section 141 NI Act', 'Section 142 NI Act', 'Section 143A NI Act',
  'Section 148 NI Act', 'dishonour of cheque', 'legal demand notice',
  // Rajasthan tenancy / revenue
  'Section 86 Rajasthan Tenancy Act', 'Section 91 Rajasthan Tenancy Act', 'Section 100 Rajasthan Tenancy Act',
  'Section 134 Rajasthan Tenancy Act', 'Section 150 Rajasthan Tenancy Act', 'Rajasthan Tenancy Act, 1955',
  'Rajasthan Land Revenue Act, 1956', 'Section 76 Rajasthan Land Revenue Act', 'khatedar tenant',
  'Section 47D Rajasthan Tenancy Act',
  // CrPC legacy citations still appearing in pending matters
  'Section 437 CrPC', 'Section 438 CrPC', 'Section 439 CrPC', 'Section 205 CrPC', 'Section 317 CrPC',
  'Section 457 CrPC', 'Section 482 CrPC', 'Section 156(3) CrPC', 'Section 125 CrPC', 'Section 498A IPC',
  // court-room phrasing
  'vakalatnama', 'memo of parties', 'list of dates and events', 'index of documents',
  'affidavit in support', 'verification clause', 'identification certificate', 'certified copy',
  'cause title', 'interim relief', 'ad interim stay', 'ex parte decree', 'written statement',
  'replication', 'rejoinder', 'framing of issues', 'plaintiff evidence', 'defendant evidence',
  'superdari', 'anticipatory bail', 'regular bail', 'exemption from personal appearance',
  'summons of witness', 'commission under Order 26', 'restitution', 'mesne profits',
  'temporary injunction', 'permanent injunction', 'specific performance', 'partition suit',
  'declaration of title', 'recovery of possession', 'partition of joint khata',
].map((t) => ({ term: t, lang: 'en' as const, tag: 'statutory', meaning: 'statutory / procedural phrase' }));

export const ALL_ENTRIES: DictEntry[] = [...MAXIMS, ...HINDI_TERMS, ...STATUTORY];

/** Whitelist so ordinary spell engines never flag statutory language. */
export const LEGAL_EN_WHITELIST: Set<string> = new Set([
  ...STATUTORY.flatMap((s) => s.term.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)),
  ...MAXIMS.flatMap((s) => s.term.toLowerCase().split(/[^a-z]+/).filter(Boolean)),
  'advocate', 'petitioner', 'respondent', 'plaintiff', 'defendant', 'appellant', 'complainant',
  'accused', 'appellant', 'deponent', 'affidavit', 'pleading', 'plaint', 'pars', 'para',
  'annexure', 'annexures', 'exhibit', 'exhibits', 'submissions', 'prayer', 'reliefs',
  'jurisdiction', 'maintainable', 'maintainability', 'cognizable', 'non-cognizable',
  'bailable', 'non-bailable', 'summons', 'warrant', 'fir', 'chargesheet', 'charge-sheet',
  'challan', 'vakalatnama', 'vakalat', 'mukhtar', 'jamabandi', 'khasra', 'khatauni', 'fard',
  'talbana', 'bayan', 'parwana', 'murasla', 'superdari', 'supurdagi', 'khatedar', 'girdawari',
  'mutation', 'intestate', 'testator', 'legacy', 'codicil', 'estoppel', 'waiver',
  'acquittal', 'conviction', 'sentence', 'remand', 'custody', 'interim', 'impugned',
  'impugn', 'rejoinder', 'replication', 'restitution', 'appraisal', 'depose', 'deposed',
  'sub-divisional', 'magistrate', 'sessions', 'tehsil', 'patwari', 'halqa', 'mauza',
  'girdawari', 'nisbat', 'dastavej', 'shajra', 'killa', 'murabba', 'biswa', 'bigha',
  'judgment', 'decree', 'executable', 'execution', 'objection', 'petition', 'application',
  'appellate', 'revisional', 'writ', 'quo', 'warranto', 'mandamus', 'certiorari',
  'prohibition', 'habeas', 'corpus', 'stare', 'decisis', 'obiter', 'ratio',
]);
