import { describe, it, expect } from 'vitest';
import { LipSyncTrait } from '../../traits/LipSyncTrait';

describe('LipSyncTrait Phoneme Mapping', () => {
  const trait = new LipSyncTrait();

  const testMap = (phoneme: string, expectedViseme: string) => {
    // Access private method for testing
    const viseme = (trait as any).mapPhonemeToViseme(phoneme);
    expect(viseme).toBe(expectedViseme);
  };

  it('should map core vowels correctly', () => {
    testMap('aa', 'aa');
    testMap('ɑ', 'aa');
    testMap('iy', 'I');
    testMap('i', 'I');
    testMap('uw', 'U');
    testMap('u', 'U');
  });

  it('should handle stress markers', () => {
    testMap('aa1', 'aa');
    testMap('eh0', 'E');
    testMap('ih2', 'I');
  });

  it('should map common consonants correctly', () => {
    testMap('p', 'PP');
    testMap('b', 'PP');
    testMap('m', 'PP');
    testMap('f', 'FF');
    testMap('v', 'FF');
    testMap('th', 'TH');
    testMap('ð', 'TH');
    testMap('s', 'SS');
    testMap('z', 'SS');
    testMap('hh', 'kk');
  });

  it('should map semivowels and special cases', () => {
    testMap('w', 'U');
    testMap('y', 'I');
    testMap('j', 'I');
    testMap('ɹ', 'RR');
    testMap('er', 'RR');
  });

  it('should return sil for unknown phonemes', () => {
    testMap('xyz', 'sil');
    testMap('123', 'sil');
  });
});
