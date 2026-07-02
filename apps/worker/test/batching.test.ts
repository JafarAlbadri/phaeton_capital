import { describe, expect, test } from 'bun:test';
import { buildTokenBatches } from '../src/batching';

const post = (chars: number) => ({ content: 'x'.repeat(chars) });

describe('buildTokenBatches', () => {
    test('empty input gives no batches', () => {
        expect(buildTokenBatches([])).toEqual([]);
    });

    test('single post gives one batch', () => {
        expect(buildTokenBatches([post(100)])).toHaveLength(1);
    });

    test('splits when token budget is exceeded', () => {
        // Each post ≈ 3000 tokens (12000 chars); budget 4000 → one per batch
        const batches = buildTokenBatches([post(12000), post(12000), post(12000)]);
        expect(batches).toHaveLength(3);
        for (const b of batches) expect(b).toHaveLength(1);
    });

    test('splits when post-count ceiling is hit', () => {
        const posts = Array.from({ length: 60 }, () => post(4));
        const batches = buildTokenBatches(posts);
        expect(batches).toHaveLength(3);
        expect(batches[0]).toHaveLength(25);
        expect(batches[1]).toHaveLength(25);
        expect(batches[2]).toHaveLength(10);
    });

    test('never drops or duplicates posts', () => {
        const posts = Array.from({ length: 137 }, (_, i) => ({ content: 'y'.repeat((i % 40 + 1) * 120), id: i }));
        const batches = buildTokenBatches(posts);
        const flat = batches.flat();
        expect(flat).toHaveLength(posts.length);
        expect(new Set(flat.map(p => p.id)).size).toBe(posts.length);
    });

    test('a single oversized post still lands in its own batch', () => {
        const batches = buildTokenBatches([post(100_000)]);
        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(1);
    });
});
