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

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--print');
    });

    it('should build command with --fork-session flag', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--fork-session');
    });

    it('should build command with --resume flag and session ID', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-abc-123',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--resume');
      expect(args).toContain('session-abc-123');
    });

    it('should include the prompt in the command args', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Classify this prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('Classify this prompt');
    });

    it('should preserve special characters in prompt (array-based prevents injection)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test "quotes" and $variables',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      // Array-based approach passes prompt directly - no escaping needed
      expect(args).toContain('Test "quotes" and $variables');
    });

    it('should preserve special characters in sessionId (array-based prevents injection)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123; rm -rf /',
      };

      const { args } = buildClaudeCommand(options);

      // Array-based approach passes sessionId directly - no shell interpretation
      // The malicious payload is passed as a literal string argument, not executed
      expect(args).toContain('session-123; rm -rf /');
    });

    it('should set cwd to /tmp to avoid project hooks', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { cwd } = buildClaudeCommand(options);

      expect(cwd).toBe('/tmp');
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

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--model');
      expect(args.some((arg) => /haiku/i.test(arg))).toBe(true);
    });

    it('should include --model flag with sonnet', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'sonnet',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--model');
      expect(args.some((arg) => /sonnet/i.test(arg))).toBe(true);
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

      const { args: haikuArgs } = buildClaudeCommand(haikuOptions);
      const { args: sonnetArgs } = buildClaudeCommand(sonnetOptions);

      // Claude CLI uses claude-3-5-haiku and claude-sonnet-4-5 format
      expect(haikuArgs.some((arg) => /haiku/i.test(arg))).toBe(true);
      expect(sonnetArgs.some((arg) => /sonnet/i.test(arg))).toBe(true);
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
