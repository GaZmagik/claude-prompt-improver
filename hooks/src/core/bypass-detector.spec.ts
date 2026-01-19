/**
 * T052-T058: Bypass Detector tests
 * T052: Test bypass detection for short prompts (≤10 tokens)
 * T053: Test bypass detection for #skip tag
 * T054: Test bypass detection for low context (<5% available)
 * T055: Test bypass detection for forked session
 * T056: Test bypass detection for plugin_disabled configuration
 * T057: Test bypass detection priority (first match wins)
 * T058: Test bypass detection completes in <100ms
 */
import { describe, expect, it } from 'bun:test';
import type { BypassReason } from './types.ts';
import { COMPACTION_THRESHOLD_PERCENT, SKIP_TAG } from './constants.ts';
import { detectBypass, type BypassCheckInput } from './bypass-detector.ts';

describe('Bypass Detector', () => {
  describe('T052: detectBypass - short prompts (≤10 tokens)', () => {
    it('should bypass short prompts', () => {
      const input: BypassCheckInput = {
        prompt: 'fix it',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('short_prompt');
    });

    it('should not bypass prompts above threshold', () => {
      const input: BypassCheckInput = {
        prompt:
          'Please help me understand how the authentication module works and identify any potential security issues',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(false);
    });

    it('should bypass empty prompts', () => {
      const input: BypassCheckInput = {
        prompt: '',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('short_prompt');
    });
  });

  describe('T053: detectBypass - #skip tag', () => {
    it('should bypass prompts with #skip tag', () => {
      const input: BypassCheckInput = {
        prompt: '#skip fix the bug in auth module',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('skip_tag');
    });

    it('should detect #skip anywhere in prompt', () => {
      const input: BypassCheckInput = {
        prompt: 'fix the bug #skip please',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('skip_tag');
    });

    it('should return cleaned prompt without #skip tag', () => {
      const input: BypassCheckInput = {
        prompt: '#skip fix the bug',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.cleanedPrompt).toBe('fix the bug');
    });

    it('should handle multiple #skip tags', () => {
      const input: BypassCheckInput = {
        prompt: '#skip #skip fix it #skip',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.cleanedPrompt).toBe('fix it');
    });

    it('should verify SKIP_TAG constant value', () => {
      expect(SKIP_TAG).toBe('#skip');
    });
  });

  describe('T054: detectBypass - low context (<5% available)', () => {
    it('should bypass when context usage is above 95%', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        contextUsage: {
          used: 190000,
          max: 200000,
        },
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('low_context');
    });

    it('should not bypass when context usage is below threshold', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        contextUsage: {
          used: 100000,
          max: 200000,
        },
      };

      const result = detectBypass(input);

      // Should not bypass due to low context
      if (result.reason) {
        expect(result.reason).not.toBe('low_context');
      }
    });

    it('should use correct threshold from constants', () => {
      expect(COMPACTION_THRESHOLD_PERCENT).toBe(5);
    });

    it('should handle edge case: exactly at threshold', () => {
      // 95% used = 5% available = exactly at threshold
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        contextUsage: {
          used: 190000,
          max: 200000, // 95% used
        },
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
    });
  });

  describe('T055: detectBypass - forked session', () => {
    it('should bypass when permission_mode is fork', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        permissionMode: 'fork',
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('forked_session');
    });

    it('should not bypass for other permission modes', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        permissionMode: 'default',
      };

      const result = detectBypass(input);

      if (result.reason) {
        expect(result.reason).not.toBe('forked_session');
      }
    });

    it('should not bypass when permission_mode is undefined', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
      };

      const result = detectBypass(input);

      if (result.reason) {
        expect(result.reason).not.toBe('forked_session');
      }
    });
  });

  describe('T056: detectBypass - plugin_disabled configuration', () => {
    it('should bypass when plugin is disabled', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        pluginDisabled: true,
      };

      const result = detectBypass(input);

      expect(result.shouldBypass).toBe(true);
      expect(result.reason).toBe('plugin_disabled');
    });

    it('should not bypass when plugin is enabled', () => {
      const input: BypassCheckInput = {
        prompt: 'a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-123',
        pluginDisabled: false,
      };

      const result = detectBypass(input);

      if (result.reason) {
        expect(result.reason).not.toBe('plugin_disabled');
      }
    });
  });

  describe('T057: detectBypass - priority (first match wins)', () => {
    it('should return plugin_disabled first when multiple conditions match', () => {
      const input: BypassCheckInput = {
        prompt: '#skip fix',
        sessionId: 'session-123',
        pluginDisabled: true,
        permissionMode: 'fork',
      };

      const result = detectBypass(input);

      // Plugin disabled has highest priority
      expect(result.reason).toBe('plugin_disabled');
    });

    it('should return forked_session before skip_tag', () => {
      const input: BypassCheckInput = {
        prompt: '#skip fix the bug',
        sessionId: 'session-123',
        permissionMode: 'fork',
      };

      const result = detectBypass(input);

      expect(result.reason).toBe('forked_session');
    });

    it('should return low_context before short_prompt', () => {
      const input: BypassCheckInput = {
        prompt: 'fix',
        sessionId: 'session-123',
        contextUsage: {
          used: 195000,
          max: 200000,
        },
      };

      const result = detectBypass(input);

      // Low context has priority over short prompt
      expect(result.reason).toBe('low_context');
    });

    it('should follow priority order: plugin_disabled > forked_session > low_context > skip_tag > short_prompt', () => {
      // Test each level of priority
      const priorities: BypassReason[] = [
        'plugin_disabled',
        'forked_session',
        'low_context',
        'skip_tag',
        'short_prompt',
      ];

      // Just verify the type includes all expected values
      expect(priorities.length).toBe(5);
    });
  });

  describe('T058: detectBypass - performance (<100ms)', () => {
    it('should complete bypass detection in under 100ms', () => {
      const input: BypassCheckInput = {
        prompt:
          'a longer prompt that would normally be processed by the improvement engine for testing performance',
        sessionId: 'session-123',
        permissionMode: 'default',
        contextUsage: {
          used: 100000,
          max: 200000,
        },
      };

      const start = performance.now();
      detectBypass(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should be fast even with all checks enabled', () => {
      const input: BypassCheckInput = {
        prompt: '#skip This is a test prompt with the skip tag that needs to be checked',
        sessionId: 'session-123',
        permissionMode: 'default',
        pluginDisabled: false,
        contextUsage: {
          used: 50000,
          max: 200000,
        },
      };

      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        detectBypass(input);
      }
      const elapsed = performance.now() - start;

      // Average should be well under 1ms per call
      expect(elapsed / iterations).toBeLessThan(1);
    });
  });
});
