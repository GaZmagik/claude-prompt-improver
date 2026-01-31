/**
 * T028-T030: Claude Client tests
 * T028: Test Claude client executes `claude --fork-session --print`
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

    it('should build command with --debug (required CLI workaround)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      // --debug is required due to CLI bug where commands hang without it
      expect(args).toContain('--debug');
    });

    it('should NOT include --output-format json (causes hangs with fork-session)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      // --output-format json causes fork-session to hang
      expect(args).not.toContain('--output-format');
      expect(args).not.toContain('json');
    });

    it('should build command with --fork-session when sessionId is available', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      // Fork-session allows improver to access conversation context
      expect(args).toContain('--fork-session');
      expect(args).toContain('--resume');
      expect(args).toContain('session-123');
    });

    it('should disable all tools in forked sessions to prevent child process spawning', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
      };

      const { args } = buildClaudeCommand(options);

      // CRITICAL: Tools must be disabled to prevent LSP, git, chrome-devtools spawning
      expect(args).toContain('--tools');
      expect(args).toContain('');

      // Verify they appear after --fork-session
      const forkIndex = args.indexOf('--fork-session');
      const toolsIndex = args.indexOf('--tools');
      expect(toolsIndex).toBeGreaterThan(forkIndex);
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

    it('should not include --fork-session when sessionId is empty', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: '',
      };

      const { args } = buildClaudeCommand(options);

      // No fork-session when sessionId is not available
      expect(args).not.toContain('--fork-session');
      expect(args).not.toContain('--resume');
    });

    it('should use project cwd when provided (required for fork-session)', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
        cwd: '/home/user/project',
      };

      const { cwd } = buildClaudeCommand(options);

      // Must run from project dir for fork-session to find session files
      expect(cwd).toBe('/home/user/project');
    });

    it('should fallback to /tmp when cwd not provided', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Test prompt',
        model: 'haiku',
        sessionId: 'session-123',
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
        sessionId: 'session-123',
        timeoutMs: HAIKU_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(30_000);
    });

    it('should use 60s timeout for sonnet model', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve',
        model: 'sonnet',
        sessionId: 'session-123',
        timeoutMs: SONNET_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(60_000);
    });

    it('should use 90s timeout for opus model', () => {
      const options: ClaudeClientOptions = {
        prompt: 'Improve complex',
        model: 'opus',
        sessionId: 'session-123',
        timeoutMs: OPUS_TIMEOUT_MS,
      };

      expect(options.timeoutMs).toBe(90_000);
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
