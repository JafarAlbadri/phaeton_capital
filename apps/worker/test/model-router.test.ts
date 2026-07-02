import { describe, expect, test } from 'bun:test';
import { ModelRouter } from '../src/modelRouter';

const CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

describe('ModelRouter', () => {
    test('all models available initially', () => {
        const r = new ModelRouter(60_000);
        expect(r.availableChain(CHAIN)).toEqual(CHAIN);
    });

    test('rate-limited model is skipped until cooldown expires', () => {
        const r = new ModelRouter(60_000);
        const t0 = 1_000_000;
        r.markRateLimited('gemini-2.5-flash', t0);

        expect(r.availableChain(CHAIN, t0 + 1)).toEqual(['gemini-2.5-flash-lite', 'gemini-2.0-flash']);
        // still cooling one ms before expiry
        expect(r.available('gemini-2.5-flash', t0 + 59_999)).toBe(false);
        // back after expiry
        expect(r.available('gemini-2.5-flash', t0 + 60_000)).toBe(true);
        expect(r.availableChain(CHAIN, t0 + 60_000)).toEqual(CHAIN);
    });

    test('whole chain can cool down, leaving nothing', () => {
        const r = new ModelRouter(60_000);
        const t0 = 5_000;
        for (const m of CHAIN) r.markRateLimited(m, t0);
        expect(r.availableChain(CHAIN, t0 + 1)).toEqual([]);
        expect(r.status(CHAIN, t0 + 1).active).toBeNull();
    });

    test('status reports active model and cooldown seconds', () => {
        const r = new ModelRouter(120_000);
        const t0 = 0;
        r.markRateLimited('gemini-2.5-flash', t0);
        const s = r.status(CHAIN, t0 + 30_000);
        expect(s.active).toBe('gemini-2.5-flash-lite');
        expect(s.cooling).toEqual([{ model: 'gemini-2.5-flash', seconds_left: 90 }]);
    });

    test('re-marking extends the cooldown', () => {
        const r = new ModelRouter(60_000);
        r.markRateLimited('m', 0);
        r.markRateLimited('m', 50_000);
        expect(r.available('m', 100_000)).toBe(false);
        expect(r.available('m', 110_000)).toBe(true);
    });
});
