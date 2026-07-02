import { describe, expect, test } from 'bun:test';
import { computeTrustScore, generateDuplicateHash } from '../src/scraper';

describe('computeTrustScore', () => {
    test('young or low-karma accounts are filtered out entirely', () => {
        expect(computeTrustScore(1000, 10)).toBe(0);  // too young
        expect(computeTrustScore(50, 365)).toBe(0);   // too little karma
        expect(computeTrustScore(50, 10)).toBe(0);
    });

    test('established accounts get full trust', () => {
        expect(computeTrustScore(500, 31)).toBe(1.0);
        expect(computeTrustScore(100_000, 3650)).toBe(1.0);
    });

    test('mid-karma accounts scale linearly between 0.3 and 1.0', () => {
        expect(computeTrustScore(100, 31)).toBeCloseTo(0.3);
        expect(computeTrustScore(300, 31)).toBeCloseTo(0.65);
        expect(computeTrustScore(499, 31)).toBeLessThan(1.0);
    });
});

describe('generateDuplicateHash', () => {
    test('same content hashes identically', () => {
        expect(generateDuplicateHash('TSLA to the moon!')).toBe(generateDuplicateHash('TSLA to the moon!'));
    });

    test('normalisation catches bot-farm variants (case, punctuation, spacing)', () => {
        const a = generateDuplicateHash('TSLA to the moon!!! 🚀');
        const b = generateDuplicateHash('tsla TO the MOON');
        expect(a).toBe(b);
    });

    test('different content hashes differently', () => {
        expect(generateDuplicateHash('buy TSLA')).not.toBe(generateDuplicateHash('sell TSLA'));
    });
});
