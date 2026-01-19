/**
 * Keyword matcher utility tests
 * Tests for shared keyword matching logic
 */
import { describe, expect, it } from 'bun:test';
import { matchKeywords, matchItemsByKeywords } from './keyword-matcher.ts';

describe('Keyword Matcher', () => {
  describe('matchKeywords', () => {
    it('should match single keyword in text', () => {
      const result = matchKeywords('I want to commit my changes', ['commit', 'push']);

      expect(result.matchedKeywords).toContain('commit');
      expect(result.score).toBe(1);
    });

    it('should match multiple keywords in text', () => {
      const result = matchKeywords('Please commit and push to git', ['commit', 'push', 'git']);

      expect(result.matchedKeywords).toContain('commit');
      expect(result.matchedKeywords).toContain('push');
      expect(result.matchedKeywords).toContain('git');
      expect(result.score).toBe(3);
    });

    it('should be case-insensitive', () => {
      const result = matchKeywords('COMMIT changes', ['commit']);

      expect(result.matchedKeywords).toContain('commit');
      expect(result.score).toBe(1);
    });

    it('should return empty array when no keywords match', () => {
      const result = matchKeywords('Hello world', ['commit', 'push']);

      expect(result.matchedKeywords).toEqual([]);
      expect(result.score).toBe(0);
    });

    it('should handle empty keywords array', () => {
      const result = matchKeywords('Some text', []);

      expect(result.matchedKeywords).toEqual([]);
      expect(result.score).toBe(0);
    });

    it('should handle multi-word keywords', () => {
      const result = matchKeywords('Please review my pull request', ['pull request', 'review']);

      expect(result.matchedKeywords).toContain('pull request');
      expect(result.matchedKeywords).toContain('review');
      expect(result.score).toBe(2);
    });
  });

  describe('matchItemsByKeywords', () => {
    interface TestItem {
      name: string;
      keywords: readonly string[];
    }

    const items: TestItem[] = [
      { name: 'commit', keywords: ['commit', 'git', 'push'] },
      { name: 'memory', keywords: ['remember', 'recall', 'memory'] },
      { name: 'review', keywords: ['review', 'pr', 'pull request'] },
    ];

    const getKeywords = (item: TestItem) => item.keywords;

    it('should match items with matching keywords', () => {
      const result = matchItemsByKeywords('I want to commit', items, getKeywords);

      expect(result.length).toBe(1);
      expect(result[0]!.item.name).toBe('commit');
      expect(result[0]!.matchedKeywords).toContain('commit');
    });

    it('should match multiple items', () => {
      const result = matchItemsByKeywords('commit and remember', items, getKeywords);

      expect(result.length).toBe(2);
    });

    it('should sort by score (most matches first)', () => {
      const result = matchItemsByKeywords('commit git push', items, getKeywords);

      expect(result.length).toBe(1);
      expect(result[0]!.item.name).toBe('commit');
      expect(result[0]!.score).toBe(3);
    });

    it('should return empty array when no items match', () => {
      const result = matchItemsByKeywords('hello world', items, getKeywords);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty items', () => {
      const result = matchItemsByKeywords('commit', [], getKeywords);

      expect(result).toEqual([]);
    });

    it('should preserve original item in result', () => {
      const result = matchItemsByKeywords('review my PR', items, getKeywords);

      expect(result.length).toBe(1);
      expect(result[0]!.item).toEqual({
        name: 'review',
        keywords: ['review', 'pr', 'pull request'],
      });
    });
  });
});
