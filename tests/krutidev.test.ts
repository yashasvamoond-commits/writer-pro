import { describe, expect, it } from 'vitest';
import { detectKrutiDev, krutiDevToUnicode, unicodeToKruti } from '../src/lib/krutidev';

const SAMPLES = [
  'नमस्ते',
  'कालूराम बनाम प्रीति',
  'न्यायालय न्यायिक मजिस्ट्रेट, भाद्रा',
  'अभियुक्तगण की ओर से प्रवाद का जवाब निम्न प्रकार से अर्ज है:',
  'धारा 498ए, 406, 323, 143 भारतीय दंड संहिता',
  'फौजदारी मुकदमा संख्या 09/2023',
  'पुलिस थाना भादरा में एफआईआर दर्ज है',
  'सत्यापन: हस्ताक्षर दिनांक स्थान खारिज फरमाया जावे',
  'वकील, तारीख, रिपोर्ट, विवाह, दहेज, क्रूरता, गुजारा भत्ता',
  'त्रुटि, कृषि, क्षेत्र, ज्ञान, श्रेणी, वर्ष, धर्म, कर्म',
];

describe('unicode -> kruti dev -> unicode round trip', () => {
  for (const s of SAMPLES) {
    it(`round-trips ${s.slice(0, 18)}...`, () => {
      const kruti = unicodeToKruti(s);
      expect(kruti).not.toEqual(s); // actually converted to legacy encoding
      expect(krutiDevToUnicode(kruti)).toEqual(s.normalize('NFC'));
    });
  }
});

describe('known kruti dev encodings', () => {
  it('encodes नमस्ते as ueLrs', () => {
    expect(unicodeToKruti('नमस्ते')).toEqual('ueLrs');
  });
  it('decodes dk as का', () => {
    expect(krutiDevToUnicode('dk')).toEqual('का');
  });
});

describe('kruti dev auto-detection', () => {
  it('flags pasted kruti dev gibberish', () => {
    const gibberish =
      'U;ka U;k;k;dh; eka kqfLFr vkosnu izLrqr djrk gwW fd vkosnd dk ifjokj gS vkSj mls Fkkuk ls FkhA';
    expect(detectKrutiDev(gibberish).isKruti).toBe(true);
  });
  it('does not flag english or unicode hindi', () => {
    expect(detectKrutiDev('In the Court of Judicial Magistrate First Class, Bhadra').isKruti).toBe(false);
    expect(detectKrutiDev('न्यायालय न्यायिक मजिस्ट्रेट भाद्रा').isKruti).toBe(false);
  });
});
