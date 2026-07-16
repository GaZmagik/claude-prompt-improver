/**
 * T120-T122: Compaction detector tests
 * T120: Test compaction detector calculates available context percentage
 * T121: Test compaction detector skips processing when <5% available
 * T122: Test compaction detector parses context_usage from stdin
 */
import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  type ContextUsage,
  calculateAvailableContext,
  parseContextUsage,
  shouldSkipProcessing,
  extractTokenUsageFromLine,
  calculateContextFromTranscript,
  detectContextWindow,
  resolveContextWindow,
  getUsableContextWindow,
  isContextLowFromTranscript,
  CLAUDE_CONTEXT_WINDOW_TOKENS,
  CLAUDE_CONTEXT_WINDOW_TOKENS_1M,
  AUTOCOMPACT_BUFFER_PERCENT,
} from './compaction-detector.ts';

describe('Compaction Detector', () => {
  describe('T120: calculateAvailableContext - calculates available percentage', () => {
    it('should calculate percentage of available context', () => {
      const usage: ContextUsage = {
        used: 50000,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(50);
    });

    it('should return 0 when fully used', () => {
      const usage: ContextUsage = {
        used: 100000,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(0);
    });

    it('should return 100 when nothing used', () => {
      const usage: ContextUsage = {
        used: 0,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(100);
    });

    it('should handle edge case of zero total', () => {
      const usage: ContextUsage = {
        used: 0,
        total: 0,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(0);
    });

    it('should round to reasonable precision', () => {
      const usage: ContextUsage = {
        used: 33333,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBeCloseTo(66.67, 1);
    });
  });

  describe('T121: shouldSkipProcessing - skips when <5% available', () => {
    it('should skip when less than 5% available', () => {
      const usage: ContextUsage = {
        used: 96000,
        total: 100000,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(true);
    });

    it('should not skip when exactly 5% available', () => {
      const usage: ContextUsage = {
        used: 95000,
        total: 100000,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(false);
    });

    it('should not skip when more than 5% available', () => {
      const usage: ContextUsage = {
        used: 50000,
        total: 100000,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(false);
    });

    it('should skip when total is zero', () => {
      const usage: ContextUsage = {
        used: 0,
        total: 0,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(true);
    });

    it('should accept custom threshold', () => {
      const usage: ContextUsage = {
        used: 85000,
        total: 100000,
      };

      // Default threshold (5%) - should not skip
      expect(shouldSkipProcessing(usage)).toBe(false);

      // Custom threshold (20%) - should skip
      expect(shouldSkipProcessing(usage, 20)).toBe(true);
    });
  });

  describe('T122: parseContextUsage - parses context_usage from stdin', () => {
    it('should parse context_usage from hook stdin', () => {
      const stdin = {
        context_usage: {
          used: 75000,
          total: 200000,
        },
      };

      const usage = parseContextUsage(stdin);

      expect(usage).toBeDefined();
      expect(usage?.used).toBe(75000);
      expect(usage?.total).toBe(200000);
    });

    it('should return undefined when context_usage missing', () => {
      const stdin = {
        prompt: 'some prompt',
      };

      const usage = parseContextUsage(stdin);

      expect(usage).toBeUndefined();
    });

    it('should return undefined when stdin is null', () => {
      const usage = parseContextUsage(null);

      expect(usage).toBeUndefined();
    });

    it('should return undefined when context_usage is malformed', () => {
      const stdin = {
        context_usage: {
          used: 'not a number',
        },
      };

      const usage = parseContextUsage(stdin);

      expect(usage).toBeUndefined();
    });

    it('should handle nested context_usage structure', () => {
      const stdin = {
        session: {
          context_usage: {
            used: 50000,
            total: 100000,
          },
        },
      };

      const usage = parseContextUsage(stdin);

      // Should still find it
      expect(usage).toBeDefined();
    });
  });

  describe('extractTokenUsageFromLine - extracts usage from transcript line', () => {
    it('should extract token usage from assistant message', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          usage: {
            input_tokens: 5000,
            output_tokens: 1000,
            cache_creation_input_tokens: 2000,
            cache_read_input_tokens: 500,
          },
        },
      });

      const usage = extractTokenUsageFromLine(line);

      expect(usage).toBeDefined();
      expect(usage?.inputTokens).toBe(5000);
      expect(usage?.outputTokens).toBe(1000);
      expect(usage?.cacheCreationTokens).toBe(2000);
      expect(usage?.cacheReadTokens).toBe(500);
    });

    it('should return undefined for non-assistant messages', () => {
      const line = JSON.stringify({
        type: 'user',
        message: { content: 'hello' },
      });

      const usage = extractTokenUsageFromLine(line);

      expect(usage).toBeUndefined();
    });

    it('should return undefined for invalid JSON', () => {
      const usage = extractTokenUsageFromLine('not json');

      expect(usage).toBeUndefined();
    });

    it('should handle missing usage field', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: { content: [] },
      });

      const usage = extractTokenUsageFromLine(line);

      expect(usage).toBeUndefined();
    });

    it('should default missing token fields to 0', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          usage: {
            input_tokens: 1000,
            // other fields missing
          },
        },
      });

      const usage = extractTokenUsageFromLine(line);

      expect(usage).toBeDefined();
      expect(usage?.inputTokens).toBe(1000);
      expect(usage?.outputTokens).toBe(0);
      expect(usage?.cacheCreationTokens).toBe(0);
      expect(usage?.cacheReadTokens).toBe(0);
    });
  });

  describe('detectContextWindow - infers window size from model id', () => {
    it('returns the 1M window for models tagged [1m]', () => {
      expect(detectContextWindow('claude-opus-4-8[1m]')).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS_1M);
      expect(detectContextWindow('claude-opus-4-8[1m]')).toBe(1_000_000);
    });

    it('returns the 1M window for other 1m markers', () => {
      expect(detectContextWindow('claude-sonnet-5-1m')).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS_1M);
      expect(detectContextWindow('some-model-1M')).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS_1M);
    });

    it('returns the standard 200K window for ordinary model ids', () => {
      expect(detectContextWindow('claude-opus-4-8')).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS);
      expect(detectContextWindow('claude-sonnet-5')).toBe(200_000);
    });

    it('falls back to the standard window when model is undefined or empty', () => {
      expect(detectContextWindow(undefined)).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS);
      expect(detectContextWindow('')).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS);
    });

    it('does not treat unrelated digits (e.g. 1master) as a 1M marker', () => {
      expect(detectContextWindow('model-1master-v2')).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS);
    });
  });

  describe('resolveContextWindow - precedence of window sources', () => {
    it('uses the configured value first', () => {
      expect(
        resolveContextWindow({ configured: 500_000, envValue: '1000000', model: 'x[1m]' })
      ).toBe(500_000);
    });

    it('uses CLAUDE_CODE_MAX_CONTEXT_TOKENS when no config is set', () => {
      expect(resolveContextWindow({ envValue: '1000000', model: 'claude-opus-4-8' })).toBe(
        1_000_000
      );
    });

    it('ignores a non-numeric or non-positive env value', () => {
      expect(resolveContextWindow({ envValue: 'lots', model: 'claude-opus-4-8' })).toBe(
        CLAUDE_CONTEXT_WINDOW_TOKENS
      );
      expect(resolveContextWindow({ envValue: '0', model: 'claude-opus-4-8' })).toBe(
        CLAUDE_CONTEXT_WINDOW_TOKENS
      );
    });

    it('falls back to model detection when neither config nor env is set', () => {
      expect(resolveContextWindow({ model: 'claude-opus-4-8[1m]' })).toBe(
        CLAUDE_CONTEXT_WINDOW_TOKENS_1M
      );
    });

    it('falls back to the 200K default when nothing is available', () => {
      expect(resolveContextWindow({})).toBe(CLAUDE_CONTEXT_WINDOW_TOKENS);
    });
  });

  describe('calculateContextFromTranscript - respects a 1M window', () => {
    it('does not report low context at 200K used on a 1M window', async () => {
      const dir = join(tmpdir(), `ctx-1m-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 't.jsonl');
      // 200K used: full on a 200K window, but only ~20% of a 1M window
      writeFileSync(
        file,
        `${JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 200_000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })}\n`
      );
      try {
        const usage = await calculateContextFromTranscript(file, CLAUDE_CONTEXT_WINDOW_TOKENS_1M);
        expect(usage).toBeDefined();
        // usable 1M window ~= 775K; 200K used leaves well over the 5% floor
        const available = ((usage!.total - usage!.used) / usage!.total) * 100;
        expect(available).toBeGreaterThan(50);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('getUsableContextWindow - calculates usable context', () => {
    it('should return full window when autocompact disabled', () => {
      const usable = getUsableContextWindow(200000, false);

      expect(usable).toBe(200000);
    });

    it('should deduct buffer when autocompact enabled', () => {
      const usable = getUsableContextWindow(200000, true);

      // 200000 * (1 - 0.225) = 155000
      expect(usable).toBe(155000);
    });

    it('should use default context window', () => {
      const usable = getUsableContextWindow();

      // Default 200K with autocompact buffer
      expect(usable).toBe(Math.round(CLAUDE_CONTEXT_WINDOW_TOKENS * (1 - AUTOCOMPACT_BUFFER_PERCENT)));
    });
  });

  describe('calculateContextFromTranscript - calculates context from file', () => {
    const testDir = join(tmpdir(), 'compaction-detector-test-' + Date.now());
    const testTranscript = join(testDir, 'test-session.jsonl');

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
    });

    afterAll(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true });
      }
    });

    it('should return undefined for non-existent file', async () => {
      const usage = await calculateContextFromTranscript('/non/existent/path.jsonl');

      expect(usage).toBeUndefined();
    });

    it('should calculate usage from transcript with one message', async () => {
      const content = JSON.stringify({
        type: 'assistant',
        message: {
          usage: {
            input_tokens: 10000,
            output_tokens: 2000,
            cache_creation_input_tokens: 5000,
            cache_read_input_tokens: 1000,
          },
        },
      });
      writeFileSync(testTranscript, content);

      const usage = await calculateContextFromTranscript(testTranscript);

      expect(usage).toBeDefined();
      expect(usage?.source).toBe('transcript');
      expect(usage?.messageCount).toBe(1);
      // Total: 10000 + 2000 + 5000 + 1000 = 18000
      expect(usage?.used).toBe(18000);
      // Default usable window with autocompact: 155000
      expect(usage?.total).toBe(155000);
    });

    it('should use last message for context size', async () => {
      // Create transcript with multiple messages
      const lines = [
        JSON.stringify({
          type: 'assistant',
          message: { usage: { input_tokens: 5000, output_tokens: 500 } },
        }),
        JSON.stringify({
          type: 'user',
          message: { content: 'hello' },
        }),
        JSON.stringify({
          type: 'assistant',
          message: { usage: { input_tokens: 15000, output_tokens: 1500 } },
        }),
      ];
      writeFileSync(testTranscript, lines.join('\n'));

      const usage = await calculateContextFromTranscript(testTranscript);

      expect(usage).toBeDefined();
      expect(usage?.messageCount).toBe(2); // 2 assistant messages
      // Uses LAST message: 15000 + 1500 = 16500
      expect(usage?.used).toBe(16500);
    });

    it('should return undefined for transcript with no assistant messages', async () => {
      const content = JSON.stringify({
        type: 'user',
        message: { content: 'hello' },
      });
      writeFileSync(testTranscript, content);

      const usage = await calculateContextFromTranscript(testTranscript);

      expect(usage).toBeUndefined();
    });

    it('should use custom context window', async () => {
      const content = JSON.stringify({
        type: 'assistant',
        message: { usage: { input_tokens: 5000, output_tokens: 500 } },
      });
      writeFileSync(testTranscript, content);

      const usage = await calculateContextFromTranscript(testTranscript, 100000, false);

      expect(usage).toBeDefined();
      expect(usage?.total).toBe(100000); // No autocompact buffer
    });
  });

  describe('isContextLowFromTranscript - convenience check', () => {
    const testDir = join(tmpdir(), 'compaction-low-test-' + Date.now());
    const testTranscript = join(testDir, 'test-session.jsonl');

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
    });

    afterAll(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true });
      }
    });

    it('should return true when context is low', async () => {
      // Create transcript with high usage (147000 of 155000 usable = ~5% left)
      const content = JSON.stringify({
        type: 'assistant',
        message: { usage: { input_tokens: 148000, output_tokens: 0 } },
      });
      writeFileSync(testTranscript, content);

      const isLow = await isContextLowFromTranscript(testTranscript);

      expect(isLow).toBe(true);
    });

    it('should return false when context is not low', async () => {
      // Create transcript with low usage
      const content = JSON.stringify({
        type: 'assistant',
        message: { usage: { input_tokens: 10000, output_tokens: 500 } },
      });
      writeFileSync(testTranscript, content);

      const isLow = await isContextLowFromTranscript(testTranscript);

      expect(isLow).toBe(false);
    });

    it('should return undefined for non-existent file', async () => {
      const isLow = await isContextLowFromTranscript('/non/existent/path.jsonl');

      expect(isLow).toBeUndefined();
    });
  });
});
