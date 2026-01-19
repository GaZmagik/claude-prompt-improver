/**
 * T123-T127: Session context tests
 * T123: Test session context forks session with `claude --fork-session`
 * T124: Test session context detects forked sessions via permission_mode
 * T125: Test session context skips when running in forked session
 * T126: Test session context enforces 10s timeout on forking
 * T127: Test session context gracefully skips if configuration disabled
 */
import { describe, expect, it } from 'bun:test';
import {
  detectForkedSession,
  formatSessionContext,
  gatherSessionContext,
  isForkedSession,
  type SessionContext,
} from './session-context.ts';
import { SESSION_FORK_TIMEOUT_MS } from '../core/constants.ts';

describe('Session Context Integration', () => {
  describe('T123: gatherSessionContext - forks session with claude --fork-session', () => {
    it('should invoke claude --fork-session command', async () => {
      let commandExecuted = '';
      await gatherSessionContext({
        _mockCommandExecution: async (cmd: string) => {
          commandExecuted = cmd;
          return { success: true, output: 'Forked session output' };
        },
      });

      expect(commandExecuted).toContain('claude');
      expect(commandExecuted).toContain('--fork-session');
    });

    it('should return session output as context', async () => {
      const result = await gatherSessionContext({
        _mockCommandExecution: async () => ({
          success: true,
          output: 'Improved prompt from forked session',
        }),
      });

      expect(result.success).toBe(true);
      expect(result.context?.output).toContain('Improved prompt');
    });
  });

  describe('T124: detectForkedSession - detects via permission_mode', () => {
    it('should detect forked session from permission_mode=none', () => {
      const stdin = {
        permission_mode: 'none',
      };

      const isForked = detectForkedSession(stdin);

      expect(isForked).toBe(true);
    });

    it('should detect non-forked session from permission_mode=default', () => {
      const stdin = {
        permission_mode: 'default',
      };

      const isForked = detectForkedSession(stdin);

      expect(isForked).toBe(false);
    });

    it('should handle missing permission_mode', () => {
      const stdin = {
        prompt: 'some prompt',
      };

      const isForked = detectForkedSession(stdin);

      expect(isForked).toBe(false);
    });
  });

  describe('T125: isForkedSession - skips when in forked session', () => {
    it('should return true when running in forked session', () => {
      const result = isForkedSession({ permission_mode: 'none' });

      expect(result).toBe(true);
    });

    it('should return false when not in forked session', () => {
      const result = isForkedSession({ permission_mode: 'default' });

      expect(result).toBe(false);
    });
  });

  describe('T126: gatherSessionContext - enforces 10s timeout', () => {
    it('should use correct timeout from constants', () => {
      expect(SESSION_FORK_TIMEOUT_MS).toBe(10000);
    });

    it('should return timeout error when command takes too long', async () => {
      const result = await gatherSessionContext({
        _mockCommandExecution: async () => {
          // Simulate timeout by returning null
          return null;
        },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('timeout');
    });

    it('should complete within timeout for normal operations', async () => {
      const start = performance.now();
      await gatherSessionContext({
        _mockCommandExecution: async () => ({
          success: true,
          output: 'Quick response',
        }),
      });
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('T127: gatherSessionContext - skips if disabled', () => {
    it('should skip when enabled=false', async () => {
      const result = await gatherSessionContext({
        enabled: false,
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('disabled');
    });

    it('should not execute any commands when disabled', async () => {
      let commandExecuted = false;
      await gatherSessionContext({
        enabled: false,
        _mockCommandExecution: async () => {
          commandExecuted = true;
          return { success: true, output: '' };
        },
      });

      expect(commandExecuted).toBe(false);
    });

    it('should skip when running in forked session', async () => {
      const result = await gatherSessionContext({
        stdin: { permission_mode: 'none' },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('already_forked');
    });
  });

  describe('gatherSessionContext - full integration', () => {
    it('should gather complete session context', async () => {
      const result = await gatherSessionContext({
        stdin: { permission_mode: 'default' },
        prompt: 'test prompt',
        _mockCommandExecution: async () => ({
          success: true,
          output: 'Enhanced context from forked session',
        }),
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.output).toContain('Enhanced context');
    });

    it('should handle command failure gracefully', async () => {
      const result = await gatherSessionContext({
        stdin: { permission_mode: 'default' },
        _mockCommandExecution: async () => ({
          success: false,
          output: '',
          error: 'Command failed',
        }),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Command failed');
    });
  });

  describe('formatSessionContext - formats for injection', () => {
    it('should format session context as readable string', () => {
      const context: SessionContext = {
        output: 'Enhanced prompt with additional context',
        forked: true,
      };

      const formatted = formatSessionContext(context);

      expect(formatted).toContain('Enhanced prompt');
    });

    it('should handle empty context gracefully', () => {
      const context: SessionContext = {
        output: '',
        forked: false,
      };

      const formatted = formatSessionContext(context);

      expect(formatted).toBe('');
    });
  });
});
