/**
 * Plugin Scanner Tests
 */
import { describe, it, expect } from 'bun:test';
import {
  detectDeliberationKeywords,
  suggestMemoryThink,
  scanEnhancePlugins,
  scanMcpServers,
} from './plugin-scanner.ts';

describe('plugin-scanner', () => {
  describe('detectDeliberationKeywords', () => {
    it('detects brainstorm', () => {
      expect(detectDeliberationKeywords('brainstorm ideas')).toBe(true);
    });

    it('detects pros and cons', () => {
      expect(detectDeliberationKeywords('what are the pros and cons')).toBe(true);
    });

    it('detects trade-offs', () => {
      expect(detectDeliberationKeywords('consider the trade-offs')).toBe(true);
    });

    it('detects weigh options', () => {
      expect(detectDeliberationKeywords('help me weigh my options')).toBe(true);
    });

    it('detects decide/decision', () => {
      expect(detectDeliberationKeywords('help me decide')).toBe(true);
    });

    it('detects evaluate', () => {
      expect(detectDeliberationKeywords('evaluate the approaches')).toBe(true);
    });

    it('returns false for simple prompts', () => {
      expect(detectDeliberationKeywords('add a button')).toBe(false);
      expect(detectDeliberationKeywords('fix the bug')).toBe(false);
    });
  });

  describe('suggestMemoryThink', () => {
    it('returns suggestion for deliberation prompts', () => {
      const suggestion = suggestMemoryThink('brainstorm architecture');
      expect(suggestion).toContain('memory think');
    });

    it('returns null for non-deliberation prompts', () => {
      expect(suggestMemoryThink('run tests')).toBeNull();
    });
  });

  describe('scanEnhancePlugins', () => {
    it('returns empty array for non-existent directory', async () => {
      const plugins = await scanEnhancePlugins('/nonexistent/path');
      expect(plugins).toEqual([]);
    });
  });

  describe('scanMcpServers', () => {
    it('returns empty array for non-existent files', async () => {
      const servers = await scanMcpServers(['/nonexistent/.mcp.json']);
      expect(servers).toEqual([]);
    });
  });
});
