/**
 * T050-T051: Token Counter tests
 * T050: Test token counter using whitespace-split heuristic
 * T051: Test token counter accuracy for ~10 token threshold
 */
import { describe, expect, it } from 'bun:test';
import { countTokens, isShortPrompt } from './token-counter.ts';
import { SHORT_PROMPT_THRESHOLD_TOKENS } from '../core/constants.ts';

describe('Token Counter', () => {
  describe('T050: countTokens - whitespace-split heuristic', () => {
    it('should count tokens by splitting on whitespace', () => {
      const result = countTokens('fix the bug');
      expect(result).toBe(3);
    });

    it('should handle multiple spaces between words', () => {
      const result = countTokens('fix   the    bug');
      expect(result).toBe(3);
    });

    it('should handle tabs and newlines', () => {
      const result = countTokens('fix\tthe\nbug');
      expect(result).toBe(3);
    });

    it('should handle leading/trailing whitespace', () => {
      const result = countTokens('  fix the bug  ');
      expect(result).toBe(3);
    });

    it('should return 0 for empty string', () => {
      const result = countTokens('');
      expect(result).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      const result = countTokens('   \t\n   ');
      expect(result).toBe(0);
    });

    it('should count single word correctly', () => {
      const result = countTokens('hello');
      expect(result).toBe(1);
    });

    it('should handle punctuation attached to words', () => {
      // "Fix the bug." should count as 3 tokens (punctuation stays with word)
      const result = countTokens('Fix the bug.');
      expect(result).toBe(3);
    });

    it('should handle hyphenated words as single token', () => {
      const result = countTokens('well-structured prompt');
      expect(result).toBe(2);
    });

    it('should handle contractions as single token', () => {
      const result = countTokens("don't fix it");
      expect(result).toBe(3);
    });
  });

  describe('T051: isShortPrompt - accuracy for ~10 token threshold', () => {
    it('should return true for prompts at or below threshold', () => {
      // Threshold is 10 tokens
      expect(isShortPrompt('one two three')).toBe(true); // 3 tokens
      expect(isShortPrompt('one two three four five six seven eight nine ten')).toBe(true); // 10 tokens
    });

    it('should return false for prompts above threshold', () => {
      expect(isShortPrompt('one two three four five six seven eight nine ten eleven')).toBe(false); // 11 tokens
    });

    it('should use correct threshold value from constants', () => {
      // Verify threshold is 10
      expect(SHORT_PROMPT_THRESHOLD_TOKENS).toBe(10);
    });

    it('should handle edge case: exactly threshold tokens', () => {
      const tenWords = 'a b c d e f g h i j';
      expect(countTokens(tenWords)).toBe(10);
      expect(isShortPrompt(tenWords)).toBe(true);
    });

    it('should return true for empty prompt', () => {
      expect(isShortPrompt('')).toBe(true);
    });

    it('should return true for single word prompt', () => {
      expect(isShortPrompt('help')).toBe(true);
    });

    it('should correctly identify common short prompts', () => {
      expect(isShortPrompt('fix it')).toBe(true);
      expect(isShortPrompt('run tests')).toBe(true);
      expect(isShortPrompt('what is this')).toBe(true);
      expect(isShortPrompt('explain the code')).toBe(true);
    });

    it('should correctly identify longer prompts as not short', () => {
      const longPrompt =
        'Please help me understand how the authentication module works and fix any bugs you find in the JWT validation logic';
      expect(isShortPrompt(longPrompt)).toBe(false);
    });
  });
});
