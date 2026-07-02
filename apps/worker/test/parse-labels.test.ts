import { describe, expect, test } from 'bun:test';
import { parseLabelArray } from '../src/ai';

const VALID = '[{"id":"a1","ticker":"TSLA","sentiment":0.8,"is_manipulation":false,"confidence":0.9}]';

describe('parseLabelArray', () => {
    test('parses a clean JSON array', () => {
        const r = parseLabelArray(VALID, 'test-model', 1)!;
        expect(r).toHaveLength(1);
        expect(r[0].ticker).toBe('TSLA');
        expect(r[0].ai_model).toBe('test-model');
        expect(r[0].prompt_version).toBe(1);
    });

    test('parses fenced output', () => {
        expect(parseLabelArray('```json\n' + VALID + '\n```', 'm', 1)).toHaveLength(1);
    });

    test('extracts the array out of surrounding prose', () => {
        expect(parseLabelArray('Here are the results:\n' + VALID + '\nHope that helps!', 'm', 1)).toHaveLength(1);
    });

    test('unwraps object-wrapped arrays', () => {
        expect(parseLabelArray('{"results":' + VALID + '}', 'm', 1)).toHaveLength(1);
    });

    test('coerces missing/wrong-typed fields to safe defaults', () => {
        const r = parseLabelArray('[{"id":42,"sentiment":"very bullish"}]', 'm', 1)!;
        expect(r[0].id).toBe('42');
        expect(r[0].ticker).toBe('UNKNOWN');
        expect(r[0].sentiment).toBe(0);
        expect(r[0].is_manipulation).toBe(false);
        expect(r[0].confidence).toBe(0);
    });

    test('returns null for garbage', () => {
        expect(parseLabelArray('I cannot help with that.', 'm', 1)).toBeNull();
        expect(parseLabelArray('{"no":"array here"}', 'm', 1)).toBeNull();
    });
});
