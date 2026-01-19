/**
 * T015-T016: Error handler tests
 * T015: Test error handler graceful fallback to original prompt
 * T016: Test error logging without blocking prompt
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type ErrorContext, createPassthroughOutput, handleError } from './error-handler.ts';

describe('Error Handler', () => {
  const testDir = join(tmpdir(), `prompt-improver-error-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(join(testDir, '.claude', 'logs'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('T015: handleError - graceful fallback to original prompt', () => {
    it('should return passthrough output on any error', () => {
      const context: ErrorContext = {
        originalPrompt: 'fix the bug',
        error: new Error('Classification API timeout'),
        phase: 'classification',
      };

      const result = handleError(context);

      expect(result.output.continue).toBe(true);
      expect(result.bypassReason).toBe('classification_failed');
    });

    it('should preserve original prompt in passthrough', () => {
      const context: ErrorContext = {
        originalPrompt: 'implement authentication',
        error: new Error('Network error'),
        phase: 'improvement',
      };

      const result = handleError(context);

      // Passthrough means no modification to prompt
      expect(result.output.continue).toBe(true);
      expect(result.output.userMessage).toBeUndefined();
      expect(result.output.additionalContext).toBeUndefined();
    });

    it('should return improvement_failed for improvement phase errors', () => {
      const context: ErrorContext = {
        originalPrompt: 'test prompt',
        error: new Error('Sonnet API error'),
        phase: 'improvement',
      };

      const result = handleError(context);

      expect(result.bypassReason).toBe('improvement_failed');
    });

    it('should return classification_failed for classification phase errors', () => {
      const context: ErrorContext = {
        originalPrompt: 'test prompt',
        error: new Error('Haiku timeout'),
        phase: 'classification',
      };

      const result = handleError(context);

      expect(result.bypassReason).toBe('classification_failed');
    });

    it('should handle non-Error objects gracefully', () => {
      const context: ErrorContext = {
        originalPrompt: 'test prompt',
        error: 'string error' as unknown as Error,
        phase: 'classification',
      };

      const result = handleError(context);

      expect(result.output.continue).toBe(true);
      expect(result.bypassReason).toBe('classification_failed');
    });

    it('should handle null/undefined errors gracefully', () => {
      const context: ErrorContext = {
        originalPrompt: 'test prompt',
        error: null as unknown as Error,
        phase: 'improvement',
      };

      const result = handleError(context);

      expect(result.output.continue).toBe(true);
      expect(result.bypassReason).toBe('improvement_failed');
    });
  });

  describe('T016: handleError - error logging without blocking prompt', () => {
    it('should include error details in result for logging', () => {
      const error = new Error('API rate limit exceeded');
      const context: ErrorContext = {
        originalPrompt: 'test prompt',
        error,
        phase: 'classification',
      };

      const result = handleError(context);

      expect(result.errorMessage).toBe('API rate limit exceeded');
      expect(result.phase).toBe('classification');
    });

    it('should capture error stack if available', () => {
      const error = new Error('Stack trace test');
      const context: ErrorContext = {
        originalPrompt: 'test',
        error,
        phase: 'improvement',
      };

      const result = handleError(context);

      expect(result.errorStack).toBeDefined();
      expect(result.errorStack).toContain('Stack trace test');
    });

    it('should always return continue: true regardless of error severity', () => {
      const fatalError = new Error('FATAL: Database connection lost');
      const context: ErrorContext = {
        originalPrompt: 'important prompt',
        error: fatalError,
        phase: 'classification',
      };

      const result = handleError(context);

      // Even fatal errors should not block the prompt
      expect(result.output.continue).toBe(true);
    });

    it('should include timestamp in error result', () => {
      const before = Date.now();

      const context: ErrorContext = {
        originalPrompt: 'test',
        error: new Error('test error'),
        phase: 'classification',
      };

      const result = handleError(context);

      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('createPassthroughOutput', () => {
    it('should create minimal passthrough output', () => {
      const output = createPassthroughOutput();

      expect(output).toEqual({ continue: true });
    });

    it('should not include any message fields', () => {
      const output = createPassthroughOutput();

      expect(output.systemMessage).toBeUndefined();
      expect(output.userMessage).toBeUndefined();
      expect(output.additionalContext).toBeUndefined();
    });
  });
});
