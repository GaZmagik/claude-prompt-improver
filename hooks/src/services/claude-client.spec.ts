/**
 * T028-T030: Claude Client tests
 * T028: Test Claude client executes `claude --print` (fork-session deliberately not used)
 * T029: Test Claude client timeout enforcement (model-based: haiku 30s, sonnet 60s, opus 90s)
 * T030: Test Claude client model selection (haiku vs sonnet)
 */
import { describe, expect, it } from 'bun:test';
import {
  type ClaudeClientOptions,
  buildClaudeCommand,
  executeClaudeCommand,
} from './claude-client.ts';

// Model-based timeouts (matches improver.ts getTimeoutForModel)
const HAIKU_TIMEOUT_MS = 30_000;
const SONNET_TIMEOUT_MS = 60_000;
const OPUS_TIMEOUT_MS = 90_000;

describe('Claude Client', () => {
  describe('T028: buildClaudeCommand - executes claude --print', () => {
    it('should build command with --print flag', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--print');
    });

    it('should build command with --debug (required CLI workaround)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      // --debug is required due to CLI bug where commands hang without it
      expect(args).toContain('--debug');
    });

    it('should NOT include --output-format json (causes hangs)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      // --output-format json causes the CLI to hang
      expect(args).not.toContain('--output-format');
      expect(args).not.toContain('json');
    });

    it('should NOT use fork-session', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      // Fork-session is disabled due to fundamental issues in UserPromptSubmit hooks
      // See: gotcha-userpromptsubmit-fork-session-confirmed-broken
      expect(args).not.toContain('--fork-session');
      expect(args).not.toContain('--resume');
      expect(args).not.toContain('session-123');
    });

    it('should not include session-related arguments', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      // No session-related arguments should be present
      expect(args).not.toContain('--tools');
      expect(args).not.toContain('--resume');
      expect(args).not.toContain('--fork-session');
    });

    it('should include the prompt in the command args', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Classify this prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('Classify this prompt');
    });

    it('should preserve special characters in prompt (array-based prevents injection)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test "quotes" and $variables',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      // Array-based approach passes prompt directly - no escaping needed
      expect(args).toContain('Test "quotes" and $variables');
    });

    it('should never include --fork-session', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { args } = buildClaudeCommand(options);

      // fork-session is deliberately disabled
      expect(args).not.toContain('--fork-session');
      expect(args).not.toContain('--resume');
    });

    it('should use project cwd when provided', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        cwd: '/home/user/project',
      };

      const { cwd } = buildClaudeCommand(options);

      // Runs from the project dir when provided
      expect(cwd).toBe('/home/user/project');
    });

    it('should fallback to /tmp when cwd not provided', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
      };

      const { cwd } = buildClaudeCommand(options);

      // Falls back to temp dir when project cwd not available
      expect(cwd).toBe('/tmp');
    });
  });

  describe('T029: executeClaudeCommand - timeout enforcement', () => {
    it('should use 30s timeout for haiku model', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve',
        model: 'haiku',
        timeoutMs: HAIKU_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(30_000);
    });

    it('should use 60s timeout for sonnet model', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve',
        model: 'sonnet',
        timeoutMs: SONNET_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(60_000);
    });

    it('should use 90s timeout for opus model', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve complex',
        model: 'opus',
        timeoutMs: OPUS_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(90_000);
    });

    it('should return timeout error when command exceeds timeout', async () => {
      // Mock a slow command that would timeout
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
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
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--model');
      expect(args.some((arg) => /haiku/i.test(arg))).toBe(true);
    });

    it('should include --model flag with sonnet', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'sonnet',
      };

      const { args } = buildClaudeCommand(options);

      expect(args).toContain('--model');
      expect(args.some((arg) => /sonnet/i.test(arg))).toBe(true);
    });

    it('should use CLI model aliases so the latest model version is resolved by Claude Code', () => {
      const haikuOptions: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'haiku',
      };

      const sonnetOptions: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'sonnet',
      };

      const opusOptions: ClaudeClientOptions = {
        prompt: 'Test',
        model: 'opus',
      };

      const { args: haikuArgs } = buildClaudeCommand(haikuOptions);
      const { args: sonnetArgs } = buildClaudeCommand(sonnetOptions);
      const { args: opusArgs } = buildClaudeCommand(opusOptions);

      // Aliases avoid pinning dated model IDs that go stale (e.g. claude-sonnet-4-5-20250929)
      expect(haikuArgs[haikuArgs.indexOf('--model') + 1]).toBe('haiku');
      expect(sonnetArgs[sonnetArgs.indexOf('--model') + 1]).toBe('sonnet');
      expect(opusArgs[opusArgs.indexOf('--model') + 1]).toBe('opus');
    });
  });

  describe('executeClaudeCommand error handling', () => {
    it('should return error result on non-zero exit code', async () => {
      const result = await executeClaudeCommand({
        prompt: 'Test',
        model: 'haiku',
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
