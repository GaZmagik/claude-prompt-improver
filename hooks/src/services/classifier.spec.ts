/**
 * T031-T035: Classifier tests
 * T031: Test classifier returns NONE for well-structured prompts
 * T032: Test classifier returns SIMPLE for moderately unclear prompts
 * T033: Test classifier returns COMPLEX for vague prompts
 * T034: Test classifier defaults to NONE on API failure
 * T035: Test classifier includes reasoning in response
 */
import { describe, expect, it } from 'bun:test';
import {
  buildClassificationPrompt,
  classifyPrompt,
  parseClassificationResponse,
} from './classifier.ts';

describe('Classifier', () => {
  describe('T031: parseClassificationResponse - returns NONE for well-structured prompts', () => {
    it('should parse NONE classification from response', () => {
      const response = 'NONE: The prompt is clear and specific with file paths and actions.';

      const result = parseClassificationResponse(response);

      expect(result.level).toBe('NONE');
    });

    it('should handle NONE with various reasoning formats', () => {
      const responses = [
        'NONE - Well-structured prompt',
        'NONE: Clear and specific',
        'Classification: NONE\nReasoning: Good prompt',
      ];

      for (const response of responses) {
        const result = parseClassificationResponse(response);
        expect(result.level).toBe('NONE');
      }
    });
  });

  describe('T032: parseClassificationResponse - returns SIMPLE for moderately unclear prompts', () => {
    it('should parse SIMPLE classification from response', () => {
      const response =
        'SIMPLE: The prompt mentions testing but lacks specifics about what to test.';

      const result = parseClassificationResponse(response);

      expect(result.level).toBe('SIMPLE');
    });

    it('should handle SIMPLE with various reasoning formats', () => {
      const responses = [
        'SIMPLE - Needs minor clarification',
        'SIMPLE: Could be more specific',
        'Classification: SIMPLE\nReasoning: Vague scope',
      ];

      for (const response of responses) {
        const result = parseClassificationResponse(response);
        expect(result.level).toBe('SIMPLE');
      }
    });
  });

  describe('T033: parseClassificationResponse - returns COMPLEX for vague prompts', () => {
    it('should parse COMPLEX classification from response', () => {
      const response = 'COMPLEX: The prompt is vague with no specifics about which bug or where.';

      const result = parseClassificationResponse(response);

      expect(result.level).toBe('COMPLEX');
    });

    it('should handle COMPLEX with various reasoning formats', () => {
      const responses = [
        'COMPLEX - Very vague, needs clarification',
        'COMPLEX: Multiple interpretations possible',
        'Classification: COMPLEX\nReasoning: No specific details',
      ];

      for (const response of responses) {
        const result = parseClassificationResponse(response);
        expect(result.level).toBe('COMPLEX');
      }
    });
  });

  describe('T034: parseClassificationResponse - defaults to NONE on API failure', () => {
    it('should return NONE for empty response', () => {
      const result = parseClassificationResponse('');

      expect(result.level).toBe('NONE');
      expect(result.reasoning).toContain('default');
    });

    it('should return NONE for unparseable response', () => {
      const result = parseClassificationResponse('This is not a valid classification');

      expect(result.level).toBe('NONE');
    });

    it('should return NONE for null/undefined-like response', () => {
      const result = parseClassificationResponse('null');

      expect(result.level).toBe('NONE');
    });

    it('should return NONE when classification level is invalid', () => {
      const result = parseClassificationResponse('INVALID: Something weird');

      expect(result.level).toBe('NONE');
    });
  });

  describe('T035: parseClassificationResponse - includes reasoning in response', () => {
    it('should extract reasoning after classification level', () => {
      const response = 'COMPLEX: The prompt lacks specifics about the bug location and symptoms.';

      const result = parseClassificationResponse(response);

      expect(result.reasoning).toBe(
        'The prompt lacks specifics about the bug location and symptoms.'
      );
    });

    it('should handle reasoning with colon separator', () => {
      const response = 'SIMPLE: Needs clarification: what type of tests?';

      const result = parseClassificationResponse(response);

      expect(result.reasoning).toContain('clarification');
    });

    it('should handle multiline reasoning', () => {
      const response = `COMPLEX: Multiple issues:
1. No file specified
2. No error details
3. Vague "bug" reference`;

      const result = parseClassificationResponse(response);

      expect(result.reasoning).toContain('Multiple issues');
    });

    it('should provide default reasoning when none given', () => {
      const response = 'NONE';

      const result = parseClassificationResponse(response);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('buildClassificationPrompt', () => {
    it('should include the user prompt in classification request', () => {
      const prompt = buildClassificationPrompt('fix the bug');

      expect(prompt).toContain('fix the bug');
    });

    it('should include classification instructions', () => {
      const prompt = buildClassificationPrompt('test prompt');

      expect(prompt).toContain('NONE');
      expect(prompt).toContain('SIMPLE');
      expect(prompt).toContain('COMPLEX');
    });

    it('should request single-word classification with reasoning', () => {
      const prompt = buildClassificationPrompt('test prompt');

      expect(prompt.toLowerCase()).toContain('classify');
    });
  });

  describe('classifyPrompt integration', () => {
    it('should return classification result with mocked client', async () => {
      const result = await classifyPrompt({
        prompt: 'fix the bug',
        sessionId: 'session-123',
        _mockClaudeResponse: 'COMPLEX: Very vague prompt',
      });

      expect(result.level).toBe('COMPLEX');
      expect(result.reasoning).toContain('vague');
    });

    it('should return NONE on timeout', async () => {
      const result = await classifyPrompt({
        prompt: 'test',
        sessionId: 'session-123',
        _mockClaudeResponse: null, // Simulates timeout/error
      });

      expect(result.level).toBe('NONE');
    });

    it('should include latency in result', async () => {
      const result = await classifyPrompt({
        prompt: 'test prompt',
        sessionId: 'session-123',
        _mockClaudeResponse: 'SIMPLE: Needs clarification',
      });

      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
