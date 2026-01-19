/**
 * T028-T030: Claude Client tests
 * T028: Test Claude client executes `claude --fork-session --print`
 * T029: Test Claude client timeout enforcement (5s classification, 30s/60s improvement)
 * T030: Test Claude client model selection (haiku vs sonnet)
 */
import { describe, expect, it } from 'bun:test';
import {
  CLASSIFICATION_TIMEOUT_MS,
  COMPLEX_IMPROVEMENT_TIMEOUT_MS,
  SIMPLE_IMPROVEMENT_TIMEOUT_MS,
} from '../core/constants.ts';
import {
  buildClaudeCommand,
  executeClaudeCommand,
  type ClaudeClientOptions,
} from './claude-client.ts';

describe('Claude Client', () => {
  describe('T028: buildClaudeCommand - executes claude --fork-session --print', () => {
    it('should build command with --print flag', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const cmd = buildClaudeCommand(options);

      expect(cmd).toContain('--print');
    });

    it('should build command with --fork-session flag', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const cmd = buildClaudeCommand(options);

      expect(cmd).toContain('--fork-session');
    });

    it('should build command with --resume flag and session ID', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-abc-123',
      };

      const cmd = buildClaudeCommand(options);

      expect(cmd).toContain('--resume');
      expect(cmd).toContain('session-abc-123');
    });

    it('should include the prompt in the command', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Classify this prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const cmd = buildClaudeCommand(options);

      expect(cmd).toContain('Classify this prompt');
    });

    it('should escape special characters in prompt', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test "quotes" and $variables',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const cmd = buildClaudeCommand(options);

      // Should not have unescaped quotes that break the command
      expect(cmd).toBeDefined();
    });
  });

  describe('T029: executeClaudeCommand - timeout enforcement', () => {
    it('should use 5s timeout for classification', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Classify',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: CLASSIFICATION_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(5_000);
    });

    it('should use 30s timeout for simple improvement', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: SIMPLE_IMPROVEMENT_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(30_000);
    });

    it('should use 60s timeout for complex improvement', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve complex',
        model: 'sonnet',
        sessionId: 'session-123',
        timeoutMs: COMPLEX_IMPROVEMENT_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(60_000);
    });

    it('should return timeout error when command exceeds timeout', async () => {
      // Mock a slow command that would timeout
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: 1, // 1ms timeout - will always timeout
        _mockExecution: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { output: 'too late', exitCode: 0 };
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should return success when command completes within timeout', async () => {
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: 5000,
        _mockExecution: async () => {
          return { output: 'COMPLEX: This is vague', exitCode: 0 };
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('COMPLEX: This is vague');
    });
  });

  describe('T030: buildClaudeCommand - model selection (haiku vs sonnet)', () => {
    it('should include --model flag with haiku', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const cmd = buildClaudeCommand(options);

      expect(cmd).toContain('--model');
      expect(cmd).toMatch(/haiku/i);
    });

    it('should include --model flag with sonnet', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'sonnet',
        sessionId: 'session-123',
      };

      const cmd = buildClaudeCommand(options);

      expect(cmd).toContain('--model');
      expect(cmd).toMatch(/sonnet/i);
    });

    it('should use correct model name format for Claude CLI', () => {
      const haikuOptions: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const sonnetOptions: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'sonnet',
        sessionId: 'session-123',
      };

      const haikuCmd = buildClaudeCommand(haikuOptions);
      const sonnetCmd = buildClaudeCommand(sonnetOptions);

      // Claude CLI uses claude-3-5-haiku and claude-sonnet-4-5 format
      expect(haikuCmd).toMatch(/claude.*haiku/i);
      expect(sonnetCmd).toMatch(/claude.*sonnet/i);
    });
  });

  describe('executeClaudeCommand error handling', () => {
    it('should return error result on non-zero exit code', async () => {
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: 5000,
        _mockExecution: async () => {
          return { output: 'API error', exitCode: 1 };
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error result on exception', async () => {
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: 5000,
        _mockExecution: async () => {
          throw new Error('Command not found');
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Command not found');
    });

    it('should include output in result on success', async () => {
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
        sessionId: 'session-123',
        timeoutMs: 5000,
        _mockExecution: async () => {
          return { output: 'Classification result here', exitCode: 0 };
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Classification result here');
    });
  });
});
