import { describe, expect, it } from 'vitest';
import { classifyText } from '../src/lib/court-classify';

describe('court classifier', () => {
  it('ACJM heading wins over the JM words inside it', () => {
    expect(classifyText('IN THE COURT OF THE ADDITIONAL CHIEF JUDICIAL MAGISTRATE, JAIPUR').court).toBe('acjm');
    expect(classifyText('न्यायालय अतिरिक्त मुख्य न्यायिक मजिस्ट्रेट, जयपुर').court).toBe('acjm');
    expect(classifyText('Before ACJM Sahib').court).toBe('acjm');
  });
  it('plain Judicial Magistrate → JM', () => {
    expect(classifyText('IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, BHADRA').court).toBe('jm');
    expect(classifyText('न्यायालय न्यायिक मजिस्ट्रेट प्रथम श्रेणी').court).toBe('jm');
    expect(classifyText('JMFC Jaipur case no 204/2025').court).toBe('jm');
  });
  it('ADJ / SDM / AECM headings', () => {
    expect(classifyText('IN THE COURT OF THE ADDITIONAL DISTRICT & SESSIONS JUDGE, JAIPUR').court).toBe('adj');
    expect(classifyText('अपर जिला एवं सेशन न्यायाधीश').court).toBe('adj');
    expect(classifyText('BEFORE THE SUB-DIVISIONAL MAGISTRATE / REVENUE OFFICER').court).toBe('sdm');
    expect(classifyText('सेवा में उपखण्ड अधिकारी (सिविल)').court).toBe('sdm');
    expect(classifyText('IN THE COURT OF THE ADDITIONAL EXECUTIVE MAGISTRATE').court).toBe('aecm');
    expect(classifyText('न्यायालय अतिरिक्त कार्यपालक मजिस्ट्रेट').court).toBe('aecm');
  });
  it('no court heading anywhere → misc, and ONLY then', () => {
    expect(classifyText('Sale deed between Ramesh and Suresh regarding plot no 12').court).toBe('misc');
    expect(classifyText('').court).toBe('misc');
  });
  it('gives confidence + snippet for real matches', () => {
    const r = classifyText('IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, JAIPUR\nState vs X');
    expect(r.confidence).toBeGreaterThan(60);
    expect(r.snippet).toMatch(/JUDICIAL MAGISTRATE/i);
  });
});
