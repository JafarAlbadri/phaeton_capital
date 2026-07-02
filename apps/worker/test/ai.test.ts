import { describe, expect, test } from 'bun:test';
import { stripCodeFences } from '../src/ai';

describe('stripCodeFences', () => {
    test('passes plain JSON through untouched', () => {
        expect(stripCodeFences('[{"id":"1"}]')).toBe('[{"id":"1"}]');
    });

    test('strips ```json fences', () => {
        expect(stripCodeFences('```json\n[{"id":"1"}]\n```')).toBe('[{"id":"1"}]');
    });

    test('strips bare ``` fences', () => {
        expect(stripCodeFences('```\n[1,2,3]\n```')).toBe('[1,2,3]');
    });

    test('trims surrounding whitespace', () => {
        expect(stripCodeFences('  \n[1]\n  ')).toBe('[1]');
    });
});
