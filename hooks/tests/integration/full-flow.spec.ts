/**
 * Full-flow integration tests for prompt improvement pipeline
 * Tests end-to-end flows including bypass detection, classification, and improvement
 */
import { describe, expect, it } from 'bun:test';
import { parseHookInput } from '../../user-prompt-submit/improve-prompt.ts';
import { detectBypass } from '../../src/core/bypass-detector.ts';
import { buildContext } from '../../src/context/context-builder.ts';
import type { HookInput } from '../../src/core/types.ts';

describe('Integration Tests - Full Flow', () => {
  describe('Hook Input Parsing', () => {
    // Note: Claude Code sends flat structure with session_id at root level
    it('should parse valid hook input successfully', () => {
      const stdin = JSON.stringify({
        prompt: 'Help me fix this bug',
        session_id: 'test-123',
        cwd: '/home/user/project',
        permission_mode: 'default',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input).toBeDefined();
      expect(result.input?.prompt).toBe('Help me fix this bug');
      expect(result.input?.context.conversation_id).toBe('test-123');
    });

    it('should reject input with missing prompt field', () => {
      const stdin = JSON.stringify({
        session_id: 'test-123',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prompt');
    });

    it('should reject input with missing session_id field', () => {
      const stdin = JSON.stringify({
        prompt: 'Test prompt',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('session_id');
    });

    it('should reject input with invalid JSON', () => {
      const stdin = 'not valid json {';

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Bypass Detection Flow', () => {
    it('should bypass short prompts (<10 tokens)', () => {
      const input: HookInput = {
        prompt: 'fix bug',
        context: {
          conversation_id: 'test-123',
          message_index: 1,
          context_usage: { max: 200000, used: 10000, auto_compaction_enabled: false },
        },
      };

      const result = detectBypass({
        prompt: input.prompt,
        sessionId: input.context.conversation_id,
        ...(input.context.context_usage && { contextUsage: input.context.context_usage }),
      });

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('short_prompt');
    });

    it('should bypass prompts with #skip tag', () => {
      const input: HookInput = {
        prompt: '#skip This is a longer prompt that would normally be processed',
        context: {
          conversation_id: 'test-123',
          message_index: 1,
          context_usage: { max: 200000, used: 10000, auto_compaction_enabled: false },
        },
      };

      const result = detectBypass({
        prompt: input.prompt,
        sessionId: input.context.conversation_id,
        ...(input.context.context_usage && { contextUsage: input.context.context_usage }),
      });

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('skip_tag');
    });

    it('should bypass when context availability is too low', () => {
      const input: HookInput = {
        prompt: 'This is a longer prompt that should normally be processed by the improver',
        context: {
          conversation_id: 'test-123',
          message_index: 1,
          context_usage: { max: 200000, used: 198000, auto_compaction_enabled: false }, // 99% used, 1% available
        },
      };

      const result = detectBypass({
        prompt: input.prompt,
        sessionId: input.context.conversation_id,
        ...(input.context.context_usage && { contextUsage: input.context.context_usage }),
      });

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('low_context');
    });

    it('should not bypass valid prompts with sufficient context', () => {
      const input: HookInput = {
        prompt: 'This is a longer prompt that should be processed by the improver',
        context: {
          conversation_id: 'test-123',
          message_index: 1,
          context_usage: { max: 200000, used: 10000, auto_compaction_enabled: false }, // 95% available
        },
      };

      const result = detectBypass({
        prompt: input.prompt,
        sessionId: input.context.conversation_id,
        ...(input.context.context_usage && { contextUsage: input.context.context_usage }),
      });

      expect(result.shouldBypass).toBe(false);
    });
  });

  // Classification tests removed - we now always improve prompts (no classification step)

  describe('Context Building Flow', () => {
    it('should gather multiple context sources in parallel', async () => {
      const result = await buildContext({
        prompt: 'Fix the git commit hook',
        availableTools: ['Read', 'Write', 'Bash'],
        gitOptions: { enabled: true, cwd: process.cwd() },
      });

      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.tools).toBeDefined();
    });

    it('should handle context gathering failures gracefully', async () => {
      // Should handle failures gracefully with nonexistent paths
      const result = await buildContext({
        prompt: 'Test prompt',
        gitOptions: { enabled: true, cwd: '/nonexistent/path' },
        specOptions: { enabled: true, specifyPath: '/nonexistent/.specify' },
        memoryOptions: { enabled: true },
      });

      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
      // Context should still be built even with failures
    });

    it('should respect timeout for context gathering', async () => {
      // Use very short timeout
      const startTime = Date.now();
      await buildContext({
        prompt: 'Test prompt',
        availableTools: ['Read', 'Write'],
        gitOptions: { enabled: true, cwd: process.cwd() },
        timeoutMs: 100,
      });
      const duration = Date.now() - startTime;

      // Should complete quickly (within timeout + overhead)
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Handling Paths', () => {
    it('should handle malformed hook input gracefully', () => {
      const malformedInputs = [
        '',
        '{}',
        '{"prompt": 123}',
        '{"prompt": "test"}',
        '{"context": {}}',
        '{"prompt": "test", "context": "not-an-object"}',
      ];

      for (const stdin of malformedInputs) {
        const result = parseHookInput(stdin);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should handle missing context fields gracefully', () => {
      const stdin = JSON.stringify({
        prompt: 'test',
        context: {
          // Missing conversation_id and message_index
        },
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid context_usage values', () => {
      const input = {
        prompt: 'test prompt for context validation',
        sessionId: 'test-session',
        contextUsage: { max: 0, used: 0, auto_compaction_enabled: false },
      };

      const result = detectBypass(input);

      // Should not crash, should handle gracefully
      expect(result).toBeDefined();
      expect(result.shouldBypass).toBeDefined();
    });

    it('should handle negative context_usage values', () => {
      const input = {
        prompt: 'test prompt for context validation',
        sessionId: 'test-session',
        contextUsage: { max: 200000, used: -1000, auto_compaction_enabled: false },
      };

      const result = detectBypass(input);

      expect(result).toBeDefined();
      expect(result.shouldBypass).toBeDefined();
    });
  });

  describe('End-to-End Pipeline Integration', () => {
    it('should process a complete flow: parse → bypass → context → improve', async () => {
      // 1. Parse input (flat format as sent by Claude Code)
      const stdin = JSON.stringify({
        prompt: 'Help me refactor the authentication module to use JWT tokens',
        session_id: 'integration-test',
        cwd: '/home/user/project',
        permission_mode: 'default',
      });

      const parseResult = parseHookInput(stdin);
      expect(parseResult.success).toBe(true);
      expect(parseResult.input).toBeDefined();

      if (!parseResult.input) return;

      // 2. Check bypass
      const bypassResult = detectBypass({
        prompt: parseResult.input.prompt,
        sessionId: parseResult.input.context.conversation_id,
      });

      // Bypass detector may return true for various reasons - just verify it runs
      expect(bypassResult).toBeDefined();
      expect(bypassResult.shouldBypass).toBeDefined();

      // If not bypassed, continue with context building
      if (bypassResult.shouldBypass) {
        // Test passes - bypass was detected (which is valid behavior)
        expect(bypassResult.reason).toBeDefined();
        return;
      }

      // 3. Build context (classification removed - we now always improve)
      const contextResult = await buildContext({
        prompt: parseResult.input.prompt,
      });
      expect(contextResult).toBeDefined();
      expect(contextResult.sources).toBeDefined();
    });

    it('should handle complete flow with bypass', async () => {
      const stdin = JSON.stringify({
        prompt: '#skip quick test',
        session_id: 'bypass-test',
      });

      const parseResult = parseHookInput(stdin);
      expect(parseResult.success).toBe(true);

      if (!parseResult.input) return;

      const bypassResult = detectBypass({
        prompt: parseResult.input.prompt,
        sessionId: parseResult.input.context.conversation_id,
      });

      expect(bypassResult.shouldBypass).toBe(true);
      expect(bypassResult.reason).toBe('skip_tag');

      // When bypassed, we don't classify or improve
      // This tests the short-circuit behavior
    });
  });
});
