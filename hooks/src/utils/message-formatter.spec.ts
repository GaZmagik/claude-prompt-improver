/**
 * Message Formatter Tests
 * Tests for user-facing system messages showing prompt improvement status
 */
import { describe, expect, it } from 'bun:test';
import { formatSystemMessage } from './message-formatter.ts';
import type { VisibilityInfo } from '../core/types.ts';

describe('Message Formatter', () => {
  describe('formatSystemMessage - bypassed status', () => {
    it('should format bypass message for short_prompt reason', () => {
      const info: VisibilityInfo = {
        status: 'bypassed',
        bypassReason: 'short_prompt',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⏭️');
      expect(message).toContain('Prompt unchanged');
      expect(message).toContain('too short');
    });

    it('should format bypass message for skip_tag reason', () => {
      const info: VisibilityInfo = {
        status: 'bypassed',
        bypassReason: 'skip_tag',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⏭️');
      expect(message).toContain('Prompt unchanged');
      expect(message).toContain('skip tag detected');
    });

    it('should format bypass message for low_context reason', () => {
      const info: VisibilityInfo = {
        status: 'bypassed',
        bypassReason: 'low_context',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⏭️');
      expect(message).toContain('Prompt unchanged');
      expect(message).toContain('context budget');
    });

    it('should format bypass message for forked_session reason', () => {
      const info: VisibilityInfo = {
        status: 'bypassed',
        bypassReason: 'forked_session',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⏭️');
      expect(message).toContain('Prompt unchanged');
      expect(message).toContain('forked session');
    });

    it('should format bypass message for plugin_disabled reason', () => {
      const info: VisibilityInfo = {
        status: 'bypassed',
        bypassReason: 'plugin_disabled',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⏭️');
      expect(message).toContain('Prompt unchanged');
      expect(message).toContain('plugin disabled');
    });

    it('should format bypass message with unknown reason as generic', () => {
      const info: VisibilityInfo = {
        status: 'bypassed',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⏭️');
      expect(message).toContain('Prompt unchanged');
    });
  });

  describe('formatSystemMessage - applied status', () => {
    it('should format applied message with all fields', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'COMPLEX',
        tokensBefore: 45,
        tokensAfter: 78,
        summary: ['Added XML structure', 'Injected git context', 'Expanded task description'],
        latencyMs: 2300,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('🎯');
      expect(message).toContain('Prompt improved');
      expect(message).toContain('COMPLEX');
      expect(message).toContain('45');
      expect(message).toContain('78');
      expect(message).toContain('Added XML structure');
      expect(message).toContain('Injected git context');
      expect(message).toContain('Expanded task description');
      expect(message).toContain('2.3s');
    });

    it('should format applied message without summary', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'SIMPLE',
        tokensBefore: 30,
        tokensAfter: 42,
        latencyMs: 1500,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('🎯');
      expect(message).toContain('Prompt improved');
      expect(message).toContain('SIMPLE');
      expect(message).toContain('30');
      expect(message).toContain('42');
      expect(message).toContain('1.5s');
      expect(message).not.toContain('Changes:');
    });

    it('should format applied message with partial summary', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'COMPLEX',
        tokensBefore: 50,
        tokensAfter: 95,
        summary: ['Added context injection'],
        latencyMs: 1800,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('🎯');
      expect(message).toContain('Added context injection');
      expect(message).toContain('•');
    });

    it('should format latency in seconds with one decimal', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'COMPLEX',
        tokensBefore: 40,
        tokensAfter: 60,
        latencyMs: 12456,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('12.5s');
    });

    it('should handle latency under 1 second', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'SIMPLE',
        tokensBefore: 20,
        tokensAfter: 25,
        latencyMs: 850,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('0.9s');
    });
  });

  describe('formatSystemMessage - failed status', () => {
    it('should format failure message with error hint', () => {
      const info: VisibilityInfo = {
        status: 'failed',
        errorHint: 'Classification timed out after 5s',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⚠️');
      expect(message).toContain('Improvement failed');
      expect(message).toContain('original prompt');
      expect(message).toContain('Classification timed out after 5s');
    });

    it('should format failure message without error hint', () => {
      const info: VisibilityInfo = {
        status: 'failed',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('⚠️');
      expect(message).toContain('Improvement failed');
      expect(message).toContain('original prompt');
      expect(message).not.toContain('timed out');
    });

    it('should handle generic error hint', () => {
      const info: VisibilityInfo = {
        status: 'failed',
        errorHint: 'Unexpected error during improvement',
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('Unexpected error during improvement');
    });
  });

  describe('formatSystemMessage - edge cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'COMPLEX',
        tokensBefore: 50,
        tokensAfter: 70,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('🎯');
      expect(message).toContain('COMPLEX');
      expect(message).not.toContain('undefined');
      expect(message).not.toContain('null');
    });

    it('should handle empty summary array', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'SIMPLE',
        tokensBefore: 30,
        tokensAfter: 35,
        summary: [],
        latencyMs: 1200,
      };

      const message = formatSystemMessage(info);

      expect(message).not.toContain('Changes:');
    });

    it('should handle zero latency', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'SIMPLE',
        tokensBefore: 20,
        tokensAfter: 25,
        latencyMs: 0,
      };

      const message = formatSystemMessage(info);

      expect(message).toContain('0.0s');
    });
  });

  describe('formatSystemMessage - multiline format', () => {
    it('should use proper line breaks for applied messages', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'COMPLEX',
        tokensBefore: 45,
        tokensAfter: 78,
        summary: ['Added XML structure', 'Injected git context'],
        latencyMs: 2300,
      };

      const message = formatSystemMessage(info);
      const lines = message.split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('🎯');
    });

    it('should indent summary bullets properly', () => {
      const info: VisibilityInfo = {
        status: 'applied',
        classification: 'COMPLEX',
        tokensBefore: 45,
        tokensAfter: 78,
        summary: ['First change', 'Second change'],
        latencyMs: 2300,
      };

      const message = formatSystemMessage(info);

      expect(message).toMatch(/\n\s+•\s+First change/);
      expect(message).toMatch(/\n\s+•\s+Second change/);
    });
  });
});
