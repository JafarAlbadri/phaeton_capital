import { describe, expect, test } from 'bun:test';
import { signalFromScore } from '../src/recommendation';

describe('signalFromScore', () => {
    test('maps score bands to signals', () => {
        expect(signalFromScore(100)).toBe('STRONG_BUY');
        expect(signalFromScore(66)).toBe('STRONG_BUY');
        expect(signalFromScore(65)).toBe('BUY');
        expect(signalFromScore(56)).toBe('BUY');
        expect(signalFromScore(55)).toBe('HOLD');
        expect(signalFromScore(50)).toBe('HOLD');
        expect(signalFromScore(46)).toBe('HOLD');
        expect(signalFromScore(45)).toBe('SELL');
        expect(signalFromScore(36)).toBe('SELL');
        expect(signalFromScore(35)).toBe('STRONG_SELL');
        expect(signalFromScore(0)).toBe('STRONG_SELL');
    });

    test('signal is always derived from the score — a positive-edge score can never be a sell', () => {
        for (let s = 56; s <= 100; s++) {
            expect(['BUY', 'STRONG_BUY']).toContain(signalFromScore(s));
        }
        for (let s = 0; s <= 45; s++) {
            expect(['SELL', 'STRONG_SELL']).toContain(signalFromScore(s));
        }
    });
});
