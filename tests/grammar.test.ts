import { describe, expect, it } from 'vitest';
import { checkGrammar } from '../src/lib/grammar';

describe('grammar & citation engine', () => {
  it('fixes a/an article errors', () => {
    const iss = checkGrammar('He filed a application in court.');
    expect(iss[0].fix).toEqual('an application');
  });
  it('flags repeated words', () => {
    const iss = checkGrammar('the the court ordered stay');
    expect(iss.some((i) => i.fix === 'the')).toBe(true);
  });
  it('flags missing space after punctuation', () => {
    const iss = checkGrammar('paras 1,2 and 3');
    expect(iss.some((i) => i.fix === ', 2')).toBe(true);
  });
  it('maps legacy IPC 498A to BNS 80', () => {
    const iss = checkGrammar('offence under 498A IPC is made out');
    const cit = iss.find((i) => i.kind === 'citation');
    expect(cit?.fix).toEqual('80 BNS');
  });
  it('maps legacy CrPC 438 to BNSS 482', () => {
    const iss = checkGrammar('bail under 438 CrPC');
    const cit = iss.find((i) => i.kind === 'citation');
    expect(cit?.fix).toEqual('482 BNSS');
  });
  it('fixes glued Hindi helper verbs', () => {
    const iss = checkGrammar('अभियुक्त ने कियाहै');
    expect(iss.some((i) => i.fix === 'किया है')).toBe(true);
  });
});
